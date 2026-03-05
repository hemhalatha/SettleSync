import { getDashboardStats } from './src/logic/firestoreService.js';
import { generateLedgerEntries } from './src/logic/ledger.js';
import { webhookEvents, settlementReports, merchantPricing } from './src/data/mockData.js';
import { processTransactions } from './src/logic/processing.js';

const processed = processTransactions(webhookEvents, settlementReports, merchantPricing);

// 1. Get Dashboard Stats
const dashStats = getDashboardStats(processed);

// 2. Get Ledger Stats (simulating LedgerPage.jsx logic)
const entries = generateLedgerEntries(processed);
const rawCredits = entries.filter((e) => e.type === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
const rawRefunds = entries.filter((e) => e.type === 'refund').reduce((s, e) => s + Math.abs(e.amount || 0), 0);
const ledgerCredits = rawCredits - rawRefunds;
const ledgerSettlements = entries.filter((e) => e.type === 'settlement').reduce((s, e) => s + (e.amount || 0), 0);

console.log('--- Comparison ---');
console.log(`Total Sales (Dashboard): ₹${dashStats.totalVolume}`);
console.log(`Total Sales (Ledger):    ₹${ledgerCredits}`);
console.log(`Difference:              ₹${dashStats.totalVolume - ledgerCredits}`);

console.log(`\nReceived (Dashboard):    ₹${dashStats.totalSettled}`);
console.log(`Received (Ledger):       ₹${ledgerSettlements}`);
console.log(`Difference:              ₹${dashStats.totalSettled - ledgerSettlements}`);

if (Math.abs(dashStats.totalVolume - ledgerCredits) < 0.01 && Math.abs(dashStats.totalSettled - ledgerSettlements) < 0.01) {
    console.log('\n✅ CONSISTENCY VERIFIED: All pages show identical totals.');
} else {
    console.log('\n❌ DISCREPANCY DETECTED: Totals do not match.');
    process.exit(1);
}
