/**
 * Core Processing Logic for Fee Calculation and Attribution
 */

export const calculateExpectedFees = (transaction, pricing) => {
    const { transaction_amount, status } = transaction;

    if (status === 'refund') {
        return {
            mdr: 0,
            gst: 0,
            fixedFees: pricing.refundFee,
            totalExpectedFee: pricing.refundFee
        };
    }

    if (status === 'chargeback') {
        return {
            mdr: 0,
            gst: 0,
            fixedFees: pricing.chargebackFee,
            totalExpectedFee: pricing.chargebackFee
        };
    }

    const mdr = (transaction_amount * pricing.mdrPercentage) / 100;
    const gst = (mdr * pricing.gstPercentage) / 100;
    const totalExpectedFee = mdr + gst;

    return {
        mdr,
        gst,
        fixedFees: 0,
        totalExpectedFee
    };
};

export const classifyDifference = (transaction, totalDeduction, expectedFee) => {
    const difference = totalDeduction - expectedFee;
    const tolerance = 0.01; // Handle small floating point variances

    if (Math.abs(difference) <= tolerance) {
        return {
            category: "Correct Settlement",
            confidence: "High",
            explanation: "The settlement amount matches the expected amount after standard MDR and GST deductions."
        };
    }

    if (transaction.status === 'refund' || transaction.status === 'chargeback') {
        return {
            category: "Gateway-side deduction",
            confidence: "High",
            explanation: `The deduction of ₹${totalDeduction.toFixed(2)} is attributed to gateway processing fees for ${transaction.status} events.`
        };
    }

    if (transaction.payment_method === 'upi' && difference > 0) {
        return {
            category: "Anomaly – requires clarification",
            confidence: "Low",
            explanation: `Customer paid ₹${transaction.transaction_amount}. UPI transactions usually have zero or minimal MDR. The difference of ₹${difference.toFixed(2)} cannot be determined conclusively.`
        };
    }

    if ((transaction.payment_method === 'debit_card' || transaction.payment_method === 'credit_card') && difference > 0) {
        return {
            category: "Card network / issuing bank charges",
            confidence: "Medium",
            explanation: `₹${difference.toFixed(2)} is attributed to card network or issuing bank charges based on standard domestic card payment rules.`
        };
    }

    if ((transaction.payment_method === 'international' || transaction.payment_method === 'emi') && difference > 0) {
        return {
            category: "Bank-level FX / EMI charges",
            confidence: "Medium",
            explanation: `The additional deduction of ₹${difference.toFixed(2)} is attributed to bank-level foreign exchange (FX) or EMI processing charges.`
        };
    }

    return {
        category: "Unclassified Difference",
        confidence: "Low",
        explanation: "The difference cannot be determined conclusively based on available data rules."
    };
};

export const processTransactions = (webhooks, settlements, pricing) => {
    return webhooks.map(webhook => {
        const settlement = settlements.find(s => s.transaction_id === webhook.transaction_id);
        const settledAmount = settlement ? settlement.settled_amount : 0;

        const expected = calculateExpectedFees(webhook, pricing);
        const actualDeduction = webhook.transaction_amount - settledAmount;
        const attribution = classifyDifference(webhook, actualDeduction, expected.totalExpectedFee);

        return {
            ...webhook,
            settled_amount: settledAmount,
            expected_deduction: expected.totalExpectedFee,
            actual_deduction: actualDeduction,
            difference: actualDeduction - expected.totalExpectedFee,
            attribution: attribution.category,
            confidence: attribution.confidence,
            explanation: attribution.explanation,
            breakdown: expected
        };
    });
};
