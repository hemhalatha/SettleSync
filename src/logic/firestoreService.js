/**
 * Firestore Service Layer
 * Provides real-time synchronization and transaction processing.
 */
import {
    db,
    isFirebaseConfigured
} from '../firebase';
import {
    collection,
    doc,
    addDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    getDocs,
    limit
} from 'firebase/firestore';
import { webhookEvents, settlementReports, merchantPricing } from '../data/mockData';
import { processSingleTransaction, processTransactions } from './processing';

// ─── Constants ──────────────────────────────────────────────
const COLLECTIONS = {
    TRANSACTIONS: 'transactions',
    MERCHANTS: 'merchants',
    LEDGER: 'ledger'
};

// ─── Real-time Listeners ────────────────────────────────────

/**
 * Subscribes to high-fidelity transaction updates
 */
export const subscribeToTransactions = (userId, callback) => {
    if (!isFirebaseConfigured()) {
        // Fallback: return mock data immediately
        const mock = processTransactions(webhookEvents, settlementReports, merchantPricing);
        callback(mock);
        return () => { }; // No-op unsubscription
    }

    const q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
    });
};

/**
 * Subscribes to merchant profile (bank details, pricing)
 */
export const subscribeToMerchantProfile = (userId, callback) => {
    if (!isFirebaseConfigured()) {
        callback({ bankDetails: {}, pricing: merchantPricing });
        return () => { };
    }

    return onSnapshot(doc(db, COLLECTIONS.MERCHANTS, userId), (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        } else {
            callback(null);
        }
    });
};

// ─── Webhook Ingestion Logic ────────────────────────────────

/**
 * Real Webhook Ingestor
 * Simulates an original PG webhook payload being received and processed.
 */
export const processIncomingWebhook = async (userId, payload, merchantPricing) => {
    // 1. Process the raw data through our transparency engine
    const processed = processSingleTransaction(payload, merchantPricing);

    if (!isFirebaseConfigured()) {
        console.log('Local Mode: Webhook processed', processed);
        return processed;
    }

    // 2. Save to Firestore
    try {
        const txnRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
            ...processed,
            userId,
            processedAt: new Date().toISOString()
        });

        // 3. (Optional) In a real app, you'd also write to a ledger collection here
        // for double-entry accounting integrity.

        return { ...processed, id: txnRef.id };
    } catch (error) {
        console.error('Failed to ingest webhook to Firestore:', error);
        throw error;
    }
};

// ─── Data Management ────────────────────────────────────────

/**
 * Seed Firestore with initial mock data (first run only)
 */
export const seedInitialData = async (userId, customPricing = null) => {
    if (!isFirebaseConfigured()) return;

    const profileRef = doc(db, COLLECTIONS.MERCHANTS, userId);
    await setDoc(profileRef, {
        bankDetails: {
            bankName: 'SettleSync Mock Bank',
            accountNumber: 'XXXX XXXX 1234',
            ifscCode: 'SYNC0001337'
        },
        pricing: customPricing || merchantPricing,
        onboarded: true
    }, { merge: true });

    // Only seed if empty
    const q = query(collection(db, COLLECTIONS.TRANSACTIONS), where('userId', '==', userId), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
        const initialBatch = processTransactions(webhookEvents, settlementReports, merchantPricing);
        for (const txn of initialBatch) {
            await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
                ...txn,
                userId,
                processedAt: new Date().toISOString()
            });
        }
    }
};

/**
 * Update Bank/Account Details
 */
export const updateMerchantDetails = async (userId, details) => {
    if (!isFirebaseConfigured()) return details;

    await updateDoc(doc(db, COLLECTIONS.MERCHANTS, userId), {
        bankDetails: details
    });
    return details;
};

// ─── Legacy/Local Getters (for compatibility during dev) ─────
export const getProcessedTransactions = () => {
    return processTransactions(webhookEvents, settlementReports, merchantPricing);
};

export const getDashboardStats = (data = []) => {
    const transactions = data.length > 0 ? data : getProcessedTransactions();
    const totalTxns = transactions.length;
    const totalVolume = transactions.reduce((s, t) => s + t.transaction_amount, 0);
    const totalSettled = transactions.reduce((s, t) => s + t.settled_amount, 0);
    const totalDeductions = transactions.reduce((s, t) => s + t.actual_deduction, 0);
    const anomalies = transactions.filter((t) => t.attribution.includes('Anomaly')).length;

    return { totalTxns, totalVolume, totalSettled, totalDeductions, anomalies };
};

export const filterTransactions = (data, filters = {}) => {
    let filtered = [...data];

    if (filters.method && filters.method !== 'all') {
        filtered = filtered.filter((t) => t.payment_method === filters.method);
    }

    if (filters.status && filters.status !== 'all') {
        if (filters.status === 'anomaly') {
            filtered = filtered.filter((t) => t.attribution.includes('Anomaly'));
        } else if (filters.status === 'correct') {
            filtered = filtered.filter((t) => t.attribution === 'Correct Settlement');
        }
    }

    if (filters.sortBy) {
        filtered.sort((a, b) => {
            const dir = filters.sortDir === 'asc' ? 1 : -1;
            if (filters.sortBy === 'amount') return (a.transaction_amount - b.transaction_amount) * dir;
            if (filters.sortBy === 'date') return (new Date(a.timestamp) - new Date(b.timestamp)) * dir;
            return 0;
        });
    }

    return filtered;
};
export const getMonthlyTrends = (data = []) => {
    // In a real app, this would perform a time-series aggregation in Firestore
    // For this demo, we use a mix of real data and mock trends
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, i) => ({
        month,
        volume: 4000 + Math.random() * 2000 + (data.length * 10),
        settled: 3800 + Math.random() * 1800 + (data.length * 9),
    }));
};

export const getDeductionCategories = (data = []) => {
    const transactions = data.length > 0 ? data : getProcessedTransactions();
    const categories = {};

    transactions.forEach(t => {
        const cat = t.attribution || 'Other';
        categories[cat] = (categories[cat] || 0) + (t.actual_deduction || 0);
    });

    return Object.entries(categories).map(([category, amount]) => ({
        category,
        amount
    })).sort((a, b) => b.amount - a.amount);
};

export const getPaymentMethodDistribution = (data = []) => {
    const transactions = data.length > 0 ? data : getProcessedTransactions();
    const methods = {};

    transactions.forEach(t => {
        const method = t.payment_method || 'other';
        if (!methods[method]) {
            methods[method] = { name: method.replace('_', ' '), value: 0, count: 0 };
        }
        methods[method].value += t.transaction_amount;
        methods[method].count += 1;
    });

    return Object.values(methods);
};
