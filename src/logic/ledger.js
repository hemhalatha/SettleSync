/**
 * Double-Entry Ledger Generation
 * Creates accounting entries from processed transactions
 */

let entryCounter = 0;
const generateId = () => `LED_${String(++entryCounter).padStart(4, '0')}`;

export const generateLedgerEntries = (processedTransactions) => {
    entryCounter = 0;
    const entries = [];
    let runningBalance = 0;

    const sorted = [...processedTransactions].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    sorted.forEach((txn) => {
        if (txn.status === 'refund') {
            // Refund: money is deducted from balance, then fee, then payout (out of system)
            // 1. Refund Amount (Debit from account)
            runningBalance -= txn.transaction_amount;
            entries.push({
                id: generateId(),
                txnId: txn.transaction_id,
                type: 'refund',
                description: `Refund issued – ${txn.payment_method.replace('_', ' ')} (${txn.order_id})`,
                amount: -txn.transaction_amount,
                runningBalance,
                timestamp: txn.timestamp,
            });

            // 2. Refund Fee (Debit from account)
            if (txn.breakdown && txn.breakdown.fixedFees > 0) {
                runningBalance -= txn.breakdown.fixedFees;
                entries.push({
                    id: generateId(),
                    txnId: txn.transaction_id,
                    type: 'debit',
                    description: `Refund processing fee`,
                    amount: -txn.breakdown.fixedFees,
                    runningBalance,
                    timestamp: txn.timestamp,
                });
            }

            // 3. Settlement (Money leaving the merchant's escrow/account to customer)
            // This clears the negative "debt" for this transaction in the ledger
            // The payout should cover the refund amount plus any fees.
            const totalToClear = Math.abs(runningBalance);
            runningBalance += totalToClear;
            entries.push({
                id: generateId(),
                txnId: txn.transaction_id,
                type: 'settlement',
                description: `Refund settlement payout`,
                amount: -totalToClear, // Displayed as money out in the table
                runningBalance: Math.abs(runningBalance) < 0.01 ? 0 : runningBalance,
                timestamp: txn.timestamp,
            });
        } else {
            // Normal transaction: credit, then deductions, then settlement
            // 1. Credit – payment received
            runningBalance += txn.transaction_amount;
            entries.push({
                id: generateId(),
                txnId: txn.transaction_id,
                type: 'credit',
                description: `Payment received – ${txn.payment_method.replace('_', ' ')} (${txn.order_id})`,
                amount: txn.transaction_amount,
                runningBalance,
                timestamp: txn.timestamp,
            });

            // 2. Debit – MDR
            if (txn.breakdown && txn.breakdown.mdr > 0) {
                runningBalance -= txn.breakdown.mdr;
                entries.push({
                    id: generateId(),
                    txnId: txn.transaction_id,
                    type: 'debit',
                    description: `MDR @ ${txn.breakdown.mdr > 0 ? ((txn.breakdown.mdr / txn.transaction_amount) * 100).toFixed(1) : 0}%`,
                    amount: -txn.breakdown.mdr,
                    runningBalance,
                    timestamp: txn.timestamp,
                });
            }

            // 3. Debit – GST on MDR
            if (txn.breakdown && txn.breakdown.gst > 0) {
                runningBalance -= txn.breakdown.gst;
                entries.push({
                    id: generateId(),
                    txnId: txn.transaction_id,
                    type: 'debit',
                    description: `GST on MDR @ 18%`,
                    amount: -txn.breakdown.gst,
                    runningBalance,
                    timestamp: txn.timestamp,
                });
            }

            // 4. Debit – additional charges
            if (txn.difference > 0.01) {
                runningBalance -= txn.difference;
                entries.push({
                    id: generateId(),
                    txnId: txn.transaction_id,
                    type: 'debit',
                    description: `Additional charges – ${txn.attribution}`,
                    amount: -txn.difference,
                    runningBalance,
                    timestamp: txn.timestamp,
                });
            }

            // 5. Settlement – payout to bank account
            const totalAvailable = Math.abs(runningBalance);
            runningBalance -= totalAvailable;
            entries.push({
                id: generateId(),
                txnId: txn.transaction_id,
                type: 'settlement',
                description: `Net payout to bank account`,
                amount: totalAvailable,
                runningBalance: Math.abs(runningBalance) < 0.01 ? 0 : runningBalance,
                timestamp: txn.timestamp,
            });
        }
    });

    return entries;
};

export const getLedgerEntriesForTransaction = (allEntries, txnId) => {
    return allEntries.filter((e) => e.txnId === txnId);
};

export const validateLedgerBalance = (entries, txnId) => {
    const txnEntries = entries.filter((e) => e.txnId === txnId);
    const credits = txnEntries.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
    const debits = txnEntries.filter((e) => e.type === 'debit' || e.type === 'refund').reduce((s, e) => s + e.amount, 0);
    const settlement = txnEntries.filter((e) => e.type === 'settlement').reduce((s, e) => s + Math.abs(e.amount), 0);
    return {
        credits,
        debits,
        settlement,
        balanced: Math.abs(credits + debits - settlement) < 0.02,
    };
};
