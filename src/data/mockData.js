export const merchantPricing = {
  mdrPercentage: 2.0, // 2% MDR
  gstPercentage: 18.0, // 18% GST on MDR
  refundFee: 5.0, // Fixed ₹5 per refund
  chargebackFee: 50.0, // Fixed ₹50 per chargeback
};

export const webhookEvents = [
  {
    transaction_id: "TXN_001",
    order_id: "ORD_101",
    transaction_amount: 1000.0,
    payment_method: "upi",
    status: "success",
    timestamp: "2026-01-02T10:00:00Z",
  },
  {
    transaction_id: "TXN_002",
    order_id: "ORD_102",
    transaction_amount: 5000.0,
    payment_method: "credit_card",
    status: "success",
    timestamp: "2026-01-02T10:05:00Z",
  },
  {
    transaction_id: "TXN_003",
    order_id: "ORD_103",
    transaction_amount: 1200.0,
    payment_method: "debit_card",
    status: "success",
    timestamp: "2026-01-02T10:10:00Z",
  },
  {
    transaction_id: "TXN_004",
    order_id: "ORD_104",
    transaction_amount: 15000.0,
    payment_method: "international",
    status: "success",
    timestamp: "2026-01-02T10:15:00Z",
  },
  {
    transaction_id: "TXN_005",
    order_id: "ORD_105",
    transaction_amount: 2000.0,
    payment_method: "upi",
    status: "refund",
    timestamp: "2026-01-02T10:20:00Z",
  },
  {
    transaction_id: "TXN_006",
    order_id: "ORD_106",
    transaction_amount: 500.0,
    payment_method: "upi",
    status: "success",
    timestamp: "2026-01-02T10:25:00Z",
  }
];

export const settlementReports = [
  {
    transaction_id: "TXN_001",
    settled_amount: 976.4, // 1000 - (2% MDR + 18% GST on MDR) = 1000 - 23.6 = 976.4
    settlement_date: "2026-01-03",
  },
  {
    transaction_id: "TXN_002",
    settled_amount: 4850.0, // 5000 - (2% MDR + 18% GST) = 4882. Difference = 32. attributed to card network.
    settlement_date: "2026-01-03",
  },
  {
    transaction_id: "TXN_003",
    settled_amount: 1150.0, // 1200 - 28.32 = 1171.68. Difference = 21.68. attributed to card network.
    settlement_date: "2026-01-03",
  },
  {
    transaction_id: "TXN_004",
    settled_amount: 14200.0, // 15000 - expected. Large difference. international FX.
    settlement_date: "2026-01-03",
  },
  {
    transaction_id: "TXN_005",
    settled_amount: 1940.0, // Refund: 2000 - fixed refund fee.
    settlement_date: "2026-01-03",
  },
  {
    transaction_id: "TXN_006",
    settled_amount: 480.0, // UPI but difference > 0. Anomaly.
    settlement_date: "2026-01-03",
  }
];
