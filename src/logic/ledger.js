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
            // Refund: debit (money going out), then fee debit, then settlement
            const refundAmount = txn.transaction_amount;
            runningBalance -= refundAmount;
            entries.push({
                id: generateId(),
                txnId: txn.transaction_id,
                type: 'refund',
                description: `Refund issued – ${txn.payment_method.replace('_', ' ')} (${txn.order_id})`,
                amount: -refundAmount,
                runningBalance,
                timestamp: txn.timestamp,
            });

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

            const netSettlement = txn.settled_amount;
            runningBalance += netSettlement;
            entries.push({
                id: generateId(),
                txnId: txn.transaction_id,
                type: 'settlement',
                description: `Net refund settlement payout`,
                amount: netSettlement,
                runningBalance,
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

            // 4. Debit – additional charges (difference beyond expected)
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

            // 5. Settlement – net payout
            const expectedBalance = txn.settled_amount;
            const adjustment = expectedBalance - runningBalance;
            if (Math.abs(adjustment) > 0.01) {
                runningBalance = expectedBalance;
            }
            entries.push({
                id: generateId(),
                txnId: txn.transaction_id,
                type: 'settlement',
                description: `Net settlement payout to merchant`,
                amount: txn.settled_amount,
                runningBalance,
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
    const debits = txnEntries.filter((e) => e.type === 'debit').reduce((s, e) => s + Math.abs(e.amount), 0);
    const settlement = txnEntries.filter((e) => e.type === 'settlement').reduce((s, e) => s + e.amount, 0);
    return {
        credits,
        debits,
        settlement,
        balanced: Math.abs(credits - debits - settlement) < 0.02,
    };
};
