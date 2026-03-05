// Mock Data
const webhookEvents = [
    { transaction_id: "tx1", transaction_amount: 1000, status: "captured", settled_amount: 980 },
    { transaction_id: "tx2", transaction_amount: 500, status: "refund", settled_amount: -505 }, // 500 + 5 fee
];

// 1. Dashboard Logic (from firestoreService.js)
const dashVolume = webhookEvents.reduce((s, t) => {
    if (t.status === 'refund') return s - (t.transaction_amount || 0);
    return s + (t.transaction_amount || 0);
}, 0);

const dashSettled = webhookEvents.reduce((s, t) => s + (t.settled_amount || 0), 0);

// 2. Ledger Logic (simulating LedgerPage.jsx)
// Entries for tx1
const entries = [
    { type: 'credit', amount: 1000, txnId: 'tx1' },
    { type: 'debit', amount: -20, txnId: 'tx1' },
    { type: 'settlement', amount: 980, txnId: 'tx1' },
    // Entries for tx2
    { type: 'refund', amount: -500, txnId: 'tx2' },
    { type: 'debit', amount: -5, txnId: 'tx2' },
    { type: 'settlement', amount: -505, txnId: 'tx2' },
];

const rawCredits = entries.filter((e) => e.type === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
const rawRefunds = entries.filter((e) => e.type === 'refund').reduce((s, e) => s + Math.abs(e.amount || 0), 0);
const ledgerCredits = rawCredits - rawRefunds;

const ledgerSettlements = entries.filter((e) => e.type === 'settlement').reduce((s, e) => s + (e.amount || 0), 0);

console.log('--- Consistency Check ---');
console.log(`Dashboard Sales: ₹${dashVolume}`);
console.log(`Ledger Sales:    ₹${ledgerCredits}`);
console.log(`Dash Received:   ₹${dashSettled}`);
console.log(`Ledger Received: ₹${ledgerSettlements}`);

if (dashVolume === ledgerCredits && dashSettled === ledgerSettlements) {
    console.log('\n✅ CONSISTENCY VERIFIED: Mathematical models are aligned.');
} else {
    console.log('\n❌ DISCREPANCY DETECTED!');
    process.exit(1);
}
