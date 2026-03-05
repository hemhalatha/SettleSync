/**
 * Default merchant pricing — standard Razorpay rates
 */
export const merchantPricing = {
  mdrPercentage: 2.0,
  gstPercentage: 18.0,
  refundFee: 5.0,
  chargebackFee: 50.0,
};

/**
 * Gateway configuration
 */
export const gatewayConfig = {
  name: 'Razorpay',
  mode: 'Test Mode',
  webhookUrl: 'http://localhost:3001/webhooks/razorpay',
  supportedEvents: ['payment.captured', 'payment.failed', 'refund.created', 'settlement.processed'],
};

/**
 * Simulated webhook events — matches real Razorpay payment entity structure
 * These represent raw payment events as received from the gateway.
 */
export const webhookEvents = [
  {
    transaction_id: "pay_Qw8kT3nXp1mBcD",
    order_id: "order_Qw8jR2kVn0lAaC",
    transaction_amount: 1499.00,
    payment_method: "upi",
    status: "captured",
    timestamp: "2026-01-15T09:12:34Z",
  },
  {
    transaction_id: "pay_Rx4mU7pYr3oCeF",
    order_id: "order_Rx4lS5nWq2nBdE",
    transaction_amount: 4250.00,
    payment_method: "credit_card",
    status: "captured",
    timestamp: "2026-01-18T14:28:51Z",
  },
  {
    transaction_id: "pay_Sy9nV2qZs8pDgH",
    order_id: "order_Sy9mT6oXr7oCfG",
    transaction_amount: 899.00,
    payment_method: "debit_card",
    status: "captured",
    timestamp: "2026-01-22T11:45:09Z",
  },
  {
    transaction_id: "pay_Tz3oW5rAt4qEhJ",
    order_id: "order_Tz3nU8pYs9pDgI",
    transaction_amount: 12500.00,
    payment_method: "net_banking",
    status: "captured",
    timestamp: "2026-02-03T16:33:22Z",
  },
  {
    transaction_id: "pay_Ua7pX9sBu6rFiK",
    order_id: "order_Ua7oV3qZt5qEhJ",
    transaction_amount: 2199.00,
    payment_method: "upi",
    status: "refund",
    timestamp: "2026-02-10T10:05:47Z",
  },
  {
    transaction_id: "pay_Vb2qY4tCv1sGjL",
    order_id: "order_Vb2pW7rAu0rFiK",
    transaction_amount: 650.00,
    payment_method: "wallet",
    status: "captured",
    timestamp: "2026-02-18T18:20:13Z",
  },
  {
    transaction_id: "pay_Wc6rZ8uDw5tHkM",
    order_id: "order_Wc6qX2sBv4sGjL",
    transaction_amount: 7800.00,
    payment_method: "credit_card",
    status: "captured",
    timestamp: "2026-03-01T13:55:38Z",
  },
  {
    transaction_id: "pay_Xd1sA3vEx9uInN",
    order_id: "order_Xd1rY6tCw8tHkM",
    transaction_amount: 3150.00,
    payment_method: "upi",
    status: "captured",
    timestamp: "2026-03-05T08:41:02Z",
  },
];

/**
 * Simulated settlement reports — what the gateway actually deposited.
 * These come from the bank settlement file, matched by transaction_id.
 */
export const settlementReports = [
  {
    transaction_id: "pay_Qw8kT3nXp1mBcD",
    settled_amount: 1463.62,   // 1499 - (29.98 MDR + 5.40 GST) = 1463.62
    settlement_date: "2026-01-17",
  },
  {
    transaction_id: "pay_Rx4mU7pYr3oCeF",
    settled_amount: 4120.00,   // 4250 - 85 MDR - 15.30 GST = 4149.70, but actual = 4120 → ₹29.70 extra network fee
    settlement_date: "2026-01-20",
  },
  {
    transaction_id: "pay_Sy9nV2qZs8pDgH",
    settled_amount: 877.80,    // 899 - (17.98 + 3.24) = 877.78 → close match
    settlement_date: "2026-01-24",
  },
  {
    transaction_id: "pay_Tz3oW5rAt4qEhJ",
    settled_amount: 12205.00,  // 12500 - 250 MDR - 45 GST = 12205 — exact match
    settlement_date: "2026-02-05",
  },
  {
    transaction_id: "pay_Ua7pX9sBu6rFiK",
    settled_amount: 2194.00,   // Refund: 2199 - ₹5 refund fee = 2194
    settlement_date: "2026-02-12",
  },
  {
    transaction_id: "pay_Vb2qY4tCv1sGjL",
    settled_amount: 634.66,    // 650 - (13 + 2.34) = 634.66
    settlement_date: "2026-02-20",
  },
  {
    transaction_id: "pay_Wc6rZ8uDw5tHkM",
    settled_amount: 7615.80,   // 7800 - (156 + 28.08) = 7615.92, actual = 7615.80 → minor rounding
    settlement_date: "2026-03-03",
  },
  // pay_Xd1sA3vEx9uInN intentionally missing — settlement pending
];
