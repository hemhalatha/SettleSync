/**
 * Settlement Report Generator
 * Aggregates processed transactions into structured settlement reports.
 */

/**
 * Generates a comprehensive settlement report.
 *
 * @param {Array} processedTransactions - Transactions from processing.js
 * @param {Object} reconciliationResults - Results from reconciliation engine (optional)
 * @returns {Object} Settlement report
 */
export const generateSettlementReport = (processedTransactions, reconciliationResults = null) => {
    const txns = processedTransactions.filter((t) => t.status !== 'refund');
    const refunds = processedTransactions.filter((t) => t.status === 'refund');

    // ── Aggregate totals ──
    const totalVolume = txns.reduce((s, t) => s + (Number(t.transaction_amount) || 0), 0);
    const totalMDR = txns.reduce((s, t) => s + (t.breakdown?.mdr || 0), 0);
    const totalGST = txns.reduce((s, t) => s + (t.breakdown?.gst || 0), 0);
    const totalAdditionalCharges = txns.reduce((s, t) => s + (t.difference > 0 ? t.difference : 0), 0);
    const totalDeductions = totalMDR + totalGST + totalAdditionalCharges;
    const netSettlement = txns.reduce((s, t) => s + (Number(t.settled_amount) || 0), 0);

    // ── Refund summary ──
    const totalRefunds = refunds.reduce((s, t) => s + (Number(t.transaction_amount) || 0), 0);
    const totalRefundFees = refunds.reduce((s, t) => s + (t.breakdown?.fixedFees || 0), 0);

    // ── Per-method breakdown ──
    const methodBreakdown = buildMethodBreakdown(processedTransactions);

    // ── Transaction classification ──
    const correctCount = processedTransactions.filter(
        (t) => t.attribution === 'Correct Settlement'
    ).length;
    const anomalyCount = processedTransactions.filter(
        (t) => (t.attribution || '').includes('Anomaly')
    ).length;
    const surchargeCount = processedTransactions.filter(
        (t) => t.attribution === 'Service Surcharge' || t.attribution === 'Currency Conversion / Cross-border Fee'
    ).length;
    const waiverCount = processedTransactions.filter(
        (t) => (t.attribution || '').includes('Waiver') || (t.attribution || '').includes('Credit')
    ).length;

    // ── Build report ──
    return {
        generatedAt: new Date().toISOString(),
        period: detectPeriod(processedTransactions),
        summary: {
            totalTransactions: processedTransactions.length,
            totalVolume: round(totalVolume),
            totalMDR: round(totalMDR),
            totalGST: round(totalGST),
            totalAdditionalCharges: round(totalAdditionalCharges),
            totalDeductions: round(totalDeductions),
            netSettlement: round(netSettlement),
            effectiveRate: totalVolume > 0
                ? round((totalDeductions / totalVolume) * 100)
                : 0,
        },
        refunds: {
            count: refunds.length,
            totalAmount: round(totalRefunds),
            totalFees: round(totalRefundFees),
        },
        classification: {
            correct: correctCount,
            anomalies: anomalyCount,
            surcharges: surchargeCount,
            waivers: waiverCount,
        },
        methodBreakdown,
        reconciliation: reconciliationResults
            ? {
                matchRate: reconciliationResults.summary.matchRate,
                totalVariance: reconciliationResults.summary.totalVariance,
                issues: reconciliationResults.summary.amountMismatch +
                    reconciliationResults.summary.missingSettlement +
                    reconciliationResults.summary.extraSettlement,
            }
            : null,
        transactions: processedTransactions.map((t) => ({
            id: t.transaction_id,
            orderId: t.order_id,
            amount: t.transaction_amount,
            method: t.payment_method,
            status: t.status,
            settled: t.settled_amount,
            mdr: t.breakdown?.mdr || 0,
            gst: t.breakdown?.gst || 0,
            difference: t.difference || 0,
            attribution: t.attribution,
            severity: t.severity || 'info',
        })),
    };
};

/**
 * Groups transactions by payment method and aggregates.
 */
const buildMethodBreakdown = (transactions) => {
    const methods = {};

    transactions.forEach((t) => {
        const method = t.payment_method || 'other';
        if (!methods[method]) {
            methods[method] = {
                method: method.replace(/_/g, ' '),
                count: 0,
                volume: 0,
                totalMDR: 0,
                totalGST: 0,
                netSettlement: 0,
            };
        }
        methods[method].count += 1;
        methods[method].volume += Number(t.transaction_amount) || 0;
        methods[method].totalMDR += t.breakdown?.mdr || 0;
        methods[method].totalGST += t.breakdown?.gst || 0;
        methods[method].netSettlement += Number(t.settled_amount) || 0;
    });

    return Object.values(methods).map((m) => ({
        ...m,
        volume: round(m.volume),
        totalMDR: round(m.totalMDR),
        totalGST: round(m.totalGST),
        netSettlement: round(m.netSettlement),
    }));
};

/**
 * Detects the date range covered by transactions.
 */
const detectPeriod = (transactions) => {
    if (!transactions.length) return { from: null, to: null };
    const timestamps = transactions.map((t) => new Date(t.timestamp).getTime());
    return {
        from: new Date(Math.min(...timestamps)).toISOString().split('T')[0],
        to: new Date(Math.max(...timestamps)).toISOString().split('T')[0],
    };
};

/**
 * Formats a settlement report as CSV string.
 */
export const reportToCSV = (report) => {
    const headers = [
        'Transaction ID', 'Order ID', 'Amount (₹)', 'Method', 'Status',
        'Settled (₹)', 'MDR (₹)', 'GST (₹)', 'Difference (₹)', 'Attribution', 'Severity'
    ];

    const rows = report.transactions.map((t) => [
        t.id, t.orderId, t.amount, t.method, t.status,
        t.settled, t.mdr.toFixed(2), t.gst.toFixed(2),
        t.difference.toFixed(2), t.attribution, t.severity,
    ]);

    // Summary rows at top
    const summaryRows = [
        ['Settlement Report', '', '', '', '', '', '', '', '', '', ''],
        [`Period: ${report.period.from} to ${report.period.to}`, '', '', '', '', '', '', '', '', '', ''],
        [`Generated: ${new Date(report.generatedAt).toLocaleString()}`, '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        [`Total Volume`, '', report.summary.totalVolume, '', '', '', '', '', '', '', ''],
        [`Total Deductions`, '', report.summary.totalDeductions, '', '', '', '', '', '', '', ''],
        [`Net Settlement`, '', report.summary.netSettlement, '', '', '', '', '', '', '', ''],
        [`Effective Rate`, '', `${report.summary.effectiveRate}%`, '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
    ];

    const allRows = [...summaryRows, headers, ...rows];
    return allRows.map((row) => row.join(',')).join('\n');
};

const round = (n) => Math.round(n * 100) / 100;
