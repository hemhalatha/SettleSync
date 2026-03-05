/**
 * Reconciliation Engine
 * Matches webhook events against settlement reports and detects mismatches.
 */

/**
 * Classification constants
 */
export const RECON_STATUS = {
    MATCHED: 'matched',
    AMOUNT_MISMATCH: 'amount_mismatch',
    MISSING_SETTLEMENT: 'missing_settlement',
    EXTRA_SETTLEMENT: 'extra_settlement',
};

const STATUS_META = {
    [RECON_STATUS.MATCHED]: {
        label: 'Matched',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.12)',
        icon: '✓',
    },
    [RECON_STATUS.AMOUNT_MISMATCH]: {
        label: 'Amount Mismatch',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.12)',
        icon: '⚠',
    },
    [RECON_STATUS.MISSING_SETTLEMENT]: {
        label: 'Missing Settlement',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.12)',
        icon: '✗',
    },
    [RECON_STATUS.EXTRA_SETTLEMENT]: {
        label: 'Extra Settlement',
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.12)',
        icon: '?',
    },
};

export const getStatusMeta = (status) => STATUS_META[status] || STATUS_META[RECON_STATUS.MATCHED];

/**
 * Runs full reconciliation between webhook events and settlement reports.
 *
 * @param {Array} webhookEvents   - Raw gateway webhook payloads
 * @param {Array} settlementReports - Settlement data from the gateway
 * @param {Object} pricing        - Merchant pricing config
 * @returns {{ results: Array, summary: Object }}
 */
export const runReconciliation = (webhookEvents, settlementReports, pricing) => {
    const settlementMap = {};
    settlementReports.forEach((s) => {
        settlementMap[s.transaction_id] = s;
    });

    const webhookMap = {};
    webhookEvents.forEach((w) => {
        webhookMap[w.transaction_id] = w;
    });

    const results = [];

    // 1. Process every webhook event
    webhookEvents.forEach((event) => {
        const settlement = settlementMap[event.transaction_id];

        if (!settlement) {
            // Webhook exists, but no corresponding settlement
            results.push({
                transaction_id: event.transaction_id,
                order_id: event.order_id,
                status: RECON_STATUS.MISSING_SETTLEMENT,
                webhook_amount: event.transaction_amount,
                settled_amount: null,
                expected_settlement: calculateExpectedSettlement(event, pricing),
                variance: event.transaction_amount, // full amount is unresolved
                payment_method: event.payment_method,
                timestamp: event.timestamp,
                details: 'Gateway received the payment but no settlement record exists. Follow up with the payment gateway.',
            });
            return;
        }

        // Compare settled amount with expected
        const expectedSettlement = calculateExpectedSettlement(event, pricing);
        const variance = settlement.settled_amount - expectedSettlement;
        const isMatched = Math.abs(variance) < 0.50; // ₹0.50 tolerance

        results.push({
            transaction_id: event.transaction_id,
            order_id: event.order_id,
            status: isMatched ? RECON_STATUS.MATCHED : RECON_STATUS.AMOUNT_MISMATCH,
            webhook_amount: event.transaction_amount,
            settled_amount: settlement.settled_amount,
            expected_settlement: expectedSettlement,
            variance: Number(variance.toFixed(2)),
            payment_method: event.payment_method,
            timestamp: event.timestamp,
            settlement_date: settlement.settlement_date,
            details: isMatched
                ? 'Settlement amount matches expected deductions within tolerance.'
                : `Variance of ₹${Math.abs(variance).toFixed(2)} detected. Expected ₹${expectedSettlement.toFixed(2)} but received ₹${settlement.settled_amount.toFixed(2)}.`,
        });
    });

    // 2. Detect extra settlements (settlement exists but no webhook)
    settlementReports.forEach((settlement) => {
        if (!webhookMap[settlement.transaction_id]) {
            results.push({
                transaction_id: settlement.transaction_id,
                order_id: null,
                status: RECON_STATUS.EXTRA_SETTLEMENT,
                webhook_amount: null,
                settled_amount: settlement.settled_amount,
                expected_settlement: null,
                variance: settlement.settled_amount,
                payment_method: null,
                timestamp: settlement.settlement_date,
                details: 'Settlement record exists but no corresponding webhook event was received.',
            });
        }
    });

    // 3. Build summary
    const summary = buildReconciliationSummary(results);

    return { results, summary };
};

/**
 * Calculates the expected settlement for a single event based on pricing.
 */
const calculateExpectedSettlement = (event, pricing) => {
    const { mdrPercentage, gstPercentage, refundFee } = pricing;

    if (event.status === 'refund') {
        return event.transaction_amount - (refundFee || 0);
    }

    const mdr = (event.transaction_amount * mdrPercentage) / 100;
    const gst = (mdr * gstPercentage) / 100;
    return event.transaction_amount - mdr - gst;
};

/**
 * Builds a summary object from reconciliation results.
 */
const buildReconciliationSummary = (results) => {
    const total = results.length;
    const matched = results.filter((r) => r.status === RECON_STATUS.MATCHED).length;
    const amountMismatch = results.filter((r) => r.status === RECON_STATUS.AMOUNT_MISMATCH).length;
    const missingSettlement = results.filter((r) => r.status === RECON_STATUS.MISSING_SETTLEMENT).length;
    const extraSettlement = results.filter((r) => r.status === RECON_STATUS.EXTRA_SETTLEMENT).length;

    const totalVariance = results
        .filter((r) => r.status === RECON_STATUS.AMOUNT_MISMATCH)
        .reduce((sum, r) => sum + Math.abs(r.variance), 0);

    const matchRate = total > 0 ? ((matched / total) * 100).toFixed(1) : '0.0';

    return {
        total,
        matched,
        amountMismatch,
        missingSettlement,
        extraSettlement,
        totalVariance: Number(totalVariance.toFixed(2)),
        matchRate: Number(matchRate),
    };
};

/**
 * Quick reconciliation health check (for dashboard card).
 */
export const getReconciliationHealth = (webhookEvents, settlementReports, pricing) => {
    const { summary } = runReconciliation(webhookEvents, settlementReports, pricing);
    return {
        matchRate: summary.matchRate,
        totalIssues: summary.amountMismatch + summary.missingSettlement + summary.extraSettlement,
        totalVariance: summary.totalVariance,
        status: summary.matchRate >= 95 ? 'healthy' : summary.matchRate >= 75 ? 'warning' : 'critical',
    };
};
