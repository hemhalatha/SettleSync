/**
 * SettleSync Webhook Server
 * 
 * Receives payment events from Razorpay (or simulated ones),
 * processes them through the reconciliation engine,
 * and stores results in Firebase Firestore.
 * 
 * Workflow:
 *   Gateway → POST /webhooks/razorpay → Process → Firestore → Frontend (real-time)
 */
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Firebase Admin Init ────────────────────────────────────
let db = null;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';

if (existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        initializeApp({ credential: cert(serviceAccount) });
        db = getFirestore();
        console.log('✅ Firebase Admin connected to project:', serviceAccount.project_id);
    } catch (err) {
        console.warn('⚠️  Firebase init failed:', err.message);
    }
} else {
    console.warn('⚠️  No service account found at', serviceAccountPath);
    console.warn('   Server will run in memory-only mode (data not persisted)');
}

// ─── In-Memory Store (fallback when no Firestore) ───────────
const memoryStore = { transactions: [] };

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json());

// ─── Default Merchant Pricing ───────────────────────────────
const DEFAULT_PRICING = {
    mdrPercentage: 2.0,
    gstPercentage: 18.0,
    refundFee: 5.0,
    chargebackFee: 50.0,
};

// ─── Transaction Processing ─────────────────────────────────
function processTransaction(rawEvent, pricing = DEFAULT_PRICING) {
    const amount = Number(rawEvent.transaction_amount || rawEvent.amount || 0);
    const method = rawEvent.payment_method || rawEvent.method || 'unknown';
    const status = rawEvent.status || 'captured';
    const txnId = rawEvent.transaction_id || rawEvent.id || `pay_${crypto.randomBytes(7).toString('hex').slice(0, 14)}`;
    const orderId = rawEvent.order_id || rawEvent.notes?.order_id || `order_${crypto.randomBytes(7).toString('hex').slice(0, 14)}`;

    // Calculate expected deductions
    const mdr = amount * (pricing.mdrPercentage / 100);
    const gst = mdr * (pricing.gstPercentage / 100);
    const totalExpectedDeduction = mdr + gst;
    const expectedSettlement = amount - totalExpectedDeduction;

    // Settled amount from gateway (or calculated)
    let settledAmount = Number(rawEvent.settled_amount || 0);
    if (settledAmount === 0) {
        settledAmount = expectedSettlement;
    }
    // Never let settled exceed the original amount
    settledAmount = Math.min(settledAmount, amount);

    const actualDeduction = amount - settledAmount;
    const difference = Math.abs(actualDeduction - totalExpectedDeduction);

    // Attribution
    let attribution = 'Correct Settlement';
    let explanation = 'All fees match expected rates. Payment verified.';
    let confidence = 'High';

    if (status === 'refund' || status === 'refunded') {
        attribution = 'Refund Processed';
        explanation = `Refund of ₹${amount} processed. Refund fee of ₹${pricing.refundFee} applied.`;
        settledAmount = amount - pricing.refundFee;
    } else if (difference > amount * 0.05) {
        attribution = 'Needs Review';
        explanation = `Difference of ₹${difference.toFixed(2)} exceeds 5% threshold. Possible extra charges from payment network.`;
        confidence = 'Low';
    } else if (difference > 0.5) {
        attribution = 'Minor Difference';
        explanation = `Small variance of ₹${difference.toFixed(2)} detected. Likely rounding or network fees.`;
        confidence = 'Medium';
    }

    return {
        transaction_id: txnId,
        order_id: orderId,
        transaction_amount: amount,
        payment_method: method,
        status,
        settled_amount: Math.round(settledAmount * 100) / 100,
        expected_deduction: Math.round(totalExpectedDeduction * 100) / 100,
        actual_deduction: Math.round(actualDeduction * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        attribution,
        explanation,
        confidence,
        breakdown: {
            mdr: Math.round(mdr * 100) / 100,
            gst: Math.round(gst * 100) / 100,
            fixedFees: 0,
        },
        timestamp: rawEvent.timestamp || rawEvent.created_at
            ? new Date(rawEvent.timestamp || rawEvent.created_at * 1000).toISOString()
            : new Date().toISOString(),
        source: 'webhook',
    };
}

// ─── Store Transaction ──────────────────────────────────────
async function storeTransaction(userId, processed) {
    const record = {
        ...processed,
        userId,
        processedAt: new Date().toISOString(),
    };

    if (db) {
        try {
            const ref = await db.collection('transactions').add(record);
            console.log(`  📝 Stored in Firestore: ${ref.id}`);
            return { ...record, id: ref.id };
        } catch (err) {
            console.error('  ❌ Firestore write failed:', err.message);
        }
    }

    // Fallback to memory
    record.id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    memoryStore.transactions.push(record);
    console.log(`  📝 Stored in memory: ${record.id}`);
    return record;
}

// ─── Webhook Signature Verification ─────────────────────────
function verifyRazorpaySignature(body, signature, secret) {
    if (!secret || !signature) return true; // Skip if not configured
    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');
    return expectedSig === signature;
}

// ─── Routes ─────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        firebase: db ? 'connected' : 'not configured',
        uptime: process.uptime(),
        transactions: memoryStore.transactions.length,
    });
});

// ┌──────────────────────────────────────────────────────────┐
// │ REAL WEBHOOK ENDPOINT — Receives events from Razorpay   │
// └──────────────────────────────────────────────────────────┘
app.post('/webhooks/razorpay', async (req, res) => {
    console.log('\n📨 Webhook received:', req.body?.event || 'unknown event');

    // Verify signature
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret && signature && !verifyRazorpaySignature(req.body, signature, secret)) {
        console.log('  ❌ Signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    try {
        const event = req.body;
        const entity = event?.payload?.payment?.entity || event?.payload?.refund?.entity || {};

        // Map Razorpay event to our format
        const rawTransaction = {
            transaction_id: entity.id || `rzp_${Date.now()}`,
            order_id: entity.order_id || entity.notes?.order_id || '',
            transaction_amount: (entity.amount || 0) / 100, // Razorpay sends in paise
            payment_method: entity.method || 'unknown',
            status: event?.event?.includes('refund') ? 'refund' : (entity.status || 'captured'),
            settled_amount: 0, // Will be calculated
            timestamp: entity.created_at ? new Date(entity.created_at * 1000).toISOString() : new Date().toISOString(),
        };

        const processed = processTransaction(rawTransaction);
        const userId = event?.account_id || entity?.notes?.merchant_id || 'default_merchant';
        const stored = await storeTransaction(userId, processed);

        console.log(`  ✅ Processed: ${stored.transaction_id} → ₹${stored.transaction_amount} → ${stored.attribution}`);
        res.json({ status: 'ok', transaction_id: stored.transaction_id });
    } catch (err) {
        console.error('  ❌ Webhook processing error:', err.message);
        res.status(500).json({ error: 'Processing failed' });
    }
});

// ┌──────────────────────────────────────────────────────────┐
// │ SIMULATE — Test the full pipeline without a real gateway │
// └──────────────────────────────────────────────────────────┘
app.post('/api/simulate', async (req, res) => {
    const methods = ['upi', 'credit_card', 'debit_card', 'net_banking', 'wallet'];
    const body = req.body || {};

    // Generate Razorpay-style IDs
    const rndId = crypto.randomBytes(7).toString('hex').slice(0, 14);

    const rawTransaction = {
        transaction_id: body.transaction_id || `pay_${rndId}`,
        order_id: body.order_id || `order_${rndId}`,
        transaction_amount: body.amount || [499, 999, 1250, 2499, 3750, 5200, 7500, 12000][Math.floor(Math.random() * 8)],
        payment_method: body.method || methods[Math.floor(Math.random() * methods.length)],
        status: body.status || 'captured',
        settled_amount: body.settled_amount || 0,
        timestamp: new Date().toISOString(),
    };

    console.log(`\n🧪 Simulating payment: ₹${rawTransaction.transaction_amount} via ${rawTransaction.payment_method}`);

    const processed = processTransaction(rawTransaction);
    const userId = body.userId || 'default_merchant';
    const stored = await storeTransaction(userId, processed);

    console.log(`  ✅ Simulated & stored: ${stored.transaction_id}`);
    res.json({ status: 'ok', transaction: stored });
});

// ┌──────────────────────────────────────────────────────────┐
// │ REST API — Fetch transactions (fallback for non-realtime)│
// └──────────────────────────────────────────────────────────┘
app.get('/api/transactions/:userId', async (req, res) => {
    const userId = req.params.userId;

    if (db) {
        try {
            const snapshot = await db.collection('transactions')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();
            const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.json({ transactions });
        } catch (err) {
            console.error('Firestore read error:', err.message);
        }
    }

    // Fallback to memory
    const transactions = memoryStore.transactions
        .filter(t => t.userId === userId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ transactions });
});

// Seed demo data
app.post('/api/seed/:userId', async (req, res) => {
    const userId = req.params.userId;
    const demoEvents = [
        { transaction_id: 'pay_Lm3nK8pQr1sT', order_id: 'order_Lm3nK8pQr1sT', transaction_amount: 1499, payment_method: 'upi', status: 'captured', settled_amount: 1463.62, timestamp: '2026-01-15T09:12:34Z' },
        { transaction_id: 'pay_Np5oL2qRs4uV', order_id: 'order_Np5oL2qRs4uV', transaction_amount: 4250, payment_method: 'credit_card', status: 'captured', settled_amount: 4149.70, timestamp: '2026-01-18T14:28:51Z' },
        { transaction_id: 'pay_Qr7pM4rSt6wX', order_id: 'order_Qr7pM4rSt6wX', transaction_amount: 899, payment_method: 'debit_card', status: 'captured', settled_amount: 877.80, timestamp: '2026-01-22T11:45:09Z' },
        { transaction_id: 'pay_St9qN6sTu8yZ', order_id: 'order_St9qN6sTu8yZ', transaction_amount: 12500, payment_method: 'net_banking', status: 'captured', settled_amount: 12205, timestamp: '2026-02-03T16:33:22Z' },
        { transaction_id: 'pay_Uv2rO8tUv0aB', order_id: 'order_Uv2rO8tUv0aB', transaction_amount: 2199, payment_method: 'upi', status: 'refund', settled_amount: 2194, timestamp: '2026-02-10T10:05:47Z' },
        { transaction_id: 'pay_Wx4sP0uVw2cD', order_id: 'order_Wx4sP0uVw2cD', transaction_amount: 650, payment_method: 'wallet', status: 'captured', settled_amount: 634.66, timestamp: '2026-02-18T18:20:13Z' },
        { transaction_id: 'pay_Yz6tQ2vWx4eF', order_id: 'order_Yz6tQ2vWx4eF', transaction_amount: 7800, payment_method: 'credit_card', status: 'captured', settled_amount: 7615.80, timestamp: '2026-03-01T13:55:38Z' },
        { transaction_id: 'pay_Ab8uR4wXy6gH', order_id: 'order_Ab8uR4wXy6gH', transaction_amount: 3150, payment_method: 'upi', status: 'captured', settled_amount: 3075.66, timestamp: '2026-03-05T08:41:02Z' },
    ];

    console.log(`\n🌱 Seeding ${demoEvents.length} demo transactions for ${userId}`);
    const results = [];
    for (const event of demoEvents) {
        const processed = processTransaction(event);
        const stored = await storeTransaction(userId, processed);
        results.push(stored);
    }

    res.json({ status: 'ok', count: results.length, transactions: results });
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║          SettleSync Webhook Server               ║
╠══════════════════════════════════════════════════╣
║  Server:     http://localhost:${PORT}              ║
║  Webhook:    POST /webhooks/razorpay             ║
║  Simulate:   POST /api/simulate                  ║
║  Health:     GET  /api/health                    ║
║  Firebase:   ${db ? '✅ Connected' : '❌ Not configured (memory mode)'}        ║
╚══════════════════════════════════════════════════╝
  `);
});
