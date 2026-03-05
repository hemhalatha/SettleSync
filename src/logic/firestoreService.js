/**
 * Firestore Service Layer
 * Provides real-time synchronization and transaction processing.
 * 
 * IMPORTANT: Mock data is cached once at module level so every page
 * sees the same data. This prevents the "data changes page to page" bug.
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

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// ─── Cached Mock Data (processed ONCE, shared across all pages) ────
let _cachedMockData = null;
function getCachedMockData() {
    if (!_cachedMockData) {
        _cachedMockData = processTransactions(webhookEvents, settlementReports, merchantPricing);
    }
    return _cachedMockData;
}

// ─── Real-time Listeners ────────────────────────────────────

/**
 * Subscribes to transaction updates.
 * With Firebase: real-time from Firestore.
 * Without Firebase: returns cached mock data (same every time).
 */
export const subscribeToTransactions = (userId, callback) => {
    if (!isFirebaseConfigured()) {
        callback(getCachedMockData());
        return () => { };
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
 * Subscribes to merchant profile
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

// ─── Legacy/Local Getters (use cached data for consistency) ──
export const getProcessedTransactions = () => {
    return getCachedMockData();
};

export const getDashboardStats = (data = []) => {
    const transactions = Array.isArray(data) && data.length > 0 ? data : getProcessedTransactions();

    const totalTxns = transactions.length;

    // Total Volume: Sales minus Refunds
    const totalVolume = transactions.reduce((s, t) => {
        if (t.status === 'refund') return s - (Number(t.transaction_amount) || 0);
        return s + (Number(t.transaction_amount) || 0);
    }, 0);

    // Total Settled: Net sum of payouts (Positive bank deposits - Negative refund payouts)
    const totalSettled = transactions.reduce((s, t) => {
        if (t.status === 'refund') return s - (Number(t.settled_amount) || 0);
        return s + (Number(t.settled_amount) || 0);
    }, 0);

    const totalDeductions = transactions.reduce((s, t) => s + (Number(t.actual_deduction) || 0), 0);
    const anomalies = transactions.filter((t) => (t.attribution || '').includes('Anomaly')).length;

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
    const transactions = Array.isArray(data) && data.length > 0 ? data : getProcessedTransactions();

    // Group transactions by month
    const monthMap = {};
    transactions.forEach((t) => {
        const date = new Date(t.timestamp);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleString('en-US', { month: 'short' });
        if (!monthMap[key]) {
            monthMap[key] = { month: label, volume: 0, settled: 0, fees: 0 };
        }
        const amount = Number(t.transaction_amount) || 0;
        const settled = Number(t.settled_amount) || 0;

        if (t.status === 'refund') {
            monthMap[key].volume -= amount;
        } else {
            monthMap[key].volume += amount;
        }

        if (t.status === 'refund') {
            monthMap[key].settled -= settled;
        } else {
            monthMap[key].settled += settled;
        }
        monthMap[key].fees += Number(t.actual_deduction) || 0;
    });

    const sorted = Object.keys(monthMap).sort();
    if (sorted.length > 0) {
        return sorted.map((k) => ({
            month: monthMap[k].month,
            volume: Math.round(monthMap[k].volume * 100) / 100,
            settled: Math.round(monthMap[k].settled * 100) / 100,
            fees: Math.round(monthMap[k].fees * 100) / 100,
        }));
    }

    // Fallback: return consistent sample data (no randomness)
    return [
        { month: 'Jan', volume: 24700, settled: 23596, fees: 1104 },
        { month: 'Feb', volume: 28100, settled: 26874, fees: 1226 },
        { month: 'Mar', volume: 31400, settled: 30042, fees: 1358 },
        { month: 'Apr', volume: 27800, settled: 26596, fees: 1204 },
        { month: 'May', volume: 33200, settled: 31762, fees: 1438 },
        { month: 'Jun', volume: 29500, settled: 28228, fees: 1272 },
    ];
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
    const transactions = Array.isArray(data) && data.length > 0 ? data : getProcessedTransactions();
    const methods = {};

    transactions.forEach(t => {
        const method = t.payment_method || 'other';
        if (!methods[method]) {
            methods[method] = { name: method.replace('_', ' '), value: 0, count: 0 };
        }
        methods[method].value += (Number(t.transaction_amount) || 0);
        methods[method].count += 1;
    });

    return Object.values(methods);
};
