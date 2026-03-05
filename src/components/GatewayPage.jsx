import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineGlobeAlt,
    HiOutlineLightningBolt,
    HiOutlineStatusOnline,
    HiOutlineClipboardCopy,
    HiOutlinePlay,
    HiOutlineRefresh,
    HiOutlineCheck,
    HiOutlineExclamation,
    HiOutlineX,
} from 'react-icons/hi';
import { subscribeToTransactions } from '../logic/firestoreService';
import { processIncomingWebhook } from '../logic/firestoreService';
import { getCurrentUser } from '../logic/storage';
import { runReconciliation, getStatusMeta } from '../logic/reconciliation';
import { webhookEvents, settlementReports, merchantPricing, gatewayConfig } from '../data/mockData';

const GatewayPage = ({ user: userProp, showToast }) => {
    const user = userProp || getCurrentUser();
    const [transactions, setTransactions] = useState([]);
    const [eventFeed, setEventFeed] = useState([]);
    const [reconResults, setReconResults] = useState(null);
    const [isConnected, setIsConnected] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showSimForm, setShowSimForm] = useState(false);

    // Simulation form state
    const [simAmount, setSimAmount] = useState('1500');
    const [simMethod, setSimMethod] = useState('upi');
    const [simStatus, setSimStatus] = useState('success');

    // Subscribe to transactions
    useEffect(() => {
        const uid = user?.uid || user?.username || 'demo';
        const unsub = subscribeToTransactions(uid, (data) => {
            setTransactions(data);
            // Seed event feed from transactions
            setEventFeed(data.slice(0, 20).map((t, i) => ({
                id: `EVT_${String(i + 1).padStart(3, '0')}`,
                transaction_id: t.transaction_id,
                type: t.status === 'refund' ? 'refund' : 'payment.captured',
                amount: t.transaction_amount,
                method: t.payment_method,
                status: t.status,
                timestamp: t.timestamp,
                processed: true,
            })));
        });
        return () => typeof unsub === 'function' && unsub();
    }, [user]);

    // Run reconciliation
    const handleReconciliation = useCallback(() => {
        const result = runReconciliation(webhookEvents, settlementReports, merchantPricing);
        setReconResults(result);
        showToast?.('success', `Reconciliation complete: ${result.summary.matchRate}% match rate`);
    }, [showToast]);

    // Simulate webhook
    const handleSimulate = useCallback(async () => {
        setIsSimulating(true);
        const payload = {
            transaction_id: `TXN_SIM_${Date.now()}`,
            order_id: `ORD_SIM_${Math.floor(Math.random() * 9999)}`,
            transaction_amount: parseFloat(simAmount) || 1000,
            payment_method: simMethod,
            status: simStatus,
            timestamp: new Date().toISOString(),
            settled_amount: (parseFloat(simAmount) || 1000) * 0.975, // Simulate ~2.5% deduction
        };

        try {
            const uid = user?.uid || user?.username || 'demo';
            const processed = await processIncomingWebhook(uid, payload, merchantPricing);

            setEventFeed((prev) => [{
                id: `EVT_${Date.now()}`,
                transaction_id: processed.transaction_id,
                type: simStatus === 'refund' ? 'refund' : 'payment.captured',
                amount: processed.transaction_amount,
                method: processed.payment_method,
                status: processed.status,
                timestamp: processed.timestamp,
                processed: true,
                isNew: true,
            }, ...prev]);

            showToast?.('success', `Webhook simulated: ₹${payload.transaction_amount} via ${simMethod}`);
        } catch {
            showToast?.('error', 'Failed to simulate webhook');
        } finally {
            setIsSimulating(false);
            setShowSimForm(false);
        }
    }, [simAmount, simMethod, simStatus, user, showToast]);

    // Copy webhook URL
    const handleCopyUrl = useCallback(() => {
        navigator.clipboard.writeText(gatewayConfig.webhookUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, []);

    // Recon summary stats
    const reconSummaryCards = useMemo(() => {
        if (!reconResults) return [];
        const s = reconResults.summary;
        return [
            { label: 'Match Rate', value: `${s.matchRate}%`, color: s.matchRate >= 90 ? '#10b981' : '#f59e0b' },
            { label: 'Matched', value: s.matched, color: '#10b981' },
            { label: 'Mismatches', value: s.amountMismatch, color: '#f59e0b' },
            { label: 'Missing', value: s.missingSettlement, color: '#ef4444' },
            { label: 'Variance', value: `₹${s.totalVariance.toFixed(2)}`, color: '#8b5cf6' },
        ];
    }, [reconResults]);

    return (
        <div className="page-container" id="gateway-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <HiOutlineGlobeAlt style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Gateway Connector
                    </h1>
                    <p className="page-subtitle">
                        Connect your payment gateway, receive webhook events, and reconcile settlements
                    </p>
                </div>
            </div>

            {/* Connection Status & Webhook URL */}
            <div className="gateway-grid">
                <motion.div
                    className="gateway-card connection-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="gateway-card-header">
                        <HiOutlineStatusOnline
                            style={{ fontSize: '1.4rem', color: isConnected ? '#10b981' : '#ef4444' }}
                        />
                        <h3>Connection Status</h3>
                    </div>
                    <div className="connection-status-block">
                        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                            <span className="status-dot" />
                            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                        <div className="gateway-name">
                            <strong>{gatewayConfig.name}</strong>
                            <span className="gateway-mode">{gatewayConfig.mode}</span>
                        </div>
                    </div>

                    <div className="webhook-url-block">
                        <label>Webhook Endpoint</label>
                        <div className="url-copy-row">
                            <code className="webhook-url">{gatewayConfig.webhookUrl}</code>
                            <button
                                className="btn-icon-sm"
                                onClick={handleCopyUrl}
                                title="Copy URL"
                            >
                                {copied ? <HiOutlineCheck /> : <HiOutlineClipboardCopy />}
                            </button>
                        </div>
                    </div>

                    <button
                        className={`gateway-toggle-btn ${isConnected ? 'disconnect' : 'connect'}`}
                        onClick={() => {
                            setIsConnected(!isConnected);
                            showToast?.(isConnected ? 'info' : 'success',
                                isConnected ? 'Gateway disconnected' : 'Gateway connected');
                        }}
                    >
                        {isConnected ? 'Disconnect' : 'Connect Gateway'}
                    </button>
                </motion.div>

                {/* Simulate Webhook */}
                <motion.div
                    className="gateway-card simulate-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="gateway-card-header">
                        <HiOutlineLightningBolt style={{ fontSize: '1.4rem', color: '#f59e0b' }} />
                        <h3>Event Simulator</h3>
                    </div>
                    <p className="sim-description">
                        Simulate incoming payment gateway events to test your webhook processing pipeline.
                    </p>

                    <AnimatePresence>
                        {showSimForm ? (
                            <motion.div
                                className="sim-form"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <div className="sim-field">
                                    <label>Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={simAmount}
                                        onChange={(e) => setSimAmount(e.target.value)}
                                        className="sim-input"
                                        id="sim-amount"
                                    />
                                </div>
                                <div className="sim-field">
                                    <label>Method</label>
                                    <select
                                        value={simMethod}
                                        onChange={(e) => setSimMethod(e.target.value)}
                                        className="sim-input"
                                        id="sim-method"
                                    >
                                        <option value="upi">UPI</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="debit_card">Debit Card</option>
                                        <option value="international">International</option>
                                        <option value="net_banking">Net Banking</option>
                                    </select>
                                </div>
                                <div className="sim-field">
                                    <label>Status</label>
                                    <select
                                        value={simStatus}
                                        onChange={(e) => setSimStatus(e.target.value)}
                                        className="sim-input"
                                        id="sim-status"
                                    >
                                        <option value="success">Success</option>
                                        <option value="refund">Refund</option>
                                    </select>
                                </div>
                                <div className="sim-actions">
                                    <button
                                        className="btn-primary"
                                        onClick={handleSimulate}
                                        disabled={isSimulating}
                                        id="sim-fire"
                                    >
                                        {isSimulating ? (
                                            <><span className="spinner-sm" /> Processing...</>
                                        ) : (
                                            <><HiOutlinePlay /> Fire Event</>
                                        )}
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setShowSimForm(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <button
                                className="btn-primary sim-trigger"
                                onClick={() => setShowSimForm(true)}
                                id="sim-open"
                            >
                                <HiOutlineLightningBolt /> Simulate Webhook Event
                            </button>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Reconciliation Section */}
            <motion.div
                className="gateway-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="section-header">
                    <h2><HiOutlineRefresh style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} /> Reconciliation</h2>
                    <button className="btn-primary" onClick={handleReconciliation} id="run-recon">
                        <HiOutlineRefresh /> Run Reconciliation
                    </button>
                </div>

                {reconResults && (
                    <>
                        {/* Summary Cards */}
                        <div className="recon-summary-grid">
                            {reconSummaryCards.map((card, i) => (
                                <motion.div
                                    key={card.label}
                                    className="recon-stat-card"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.06 }}
                                >
                                    <span className="recon-stat-value" style={{ color: card.color }}>
                                        {card.value}
                                    </span>
                                    <span className="recon-stat-label">{card.label}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Results Table */}
                        <div className="recon-table-wrapper">
                            <table className="recon-table">
                                <thead>
                                    <tr>
                                        <th>Transaction ID</th>
                                        <th>Status</th>
                                        <th>Webhook Amt</th>
                                        <th>Settled Amt</th>
                                        <th>Expected</th>
                                        <th>Variance</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reconResults.results.map((r) => {
                                        const meta = getStatusMeta(r.status);
                                        return (
                                            <tr key={r.transaction_id}>
                                                <td className="mono">{r.transaction_id}</td>
                                                <td>
                                                    <span
                                                        className="recon-badge"
                                                        style={{ color: meta.color, background: meta.bg }}
                                                    >
                                                        {meta.icon} {meta.label}
                                                    </span>
                                                </td>
                                                <td>₹{r.webhook_amount?.toLocaleString('en-IN') ?? '—'}</td>
                                                <td>₹{r.settled_amount?.toLocaleString('en-IN') ?? '—'}</td>
                                                <td>₹{r.expected_settlement?.toFixed(2) ?? '—'}</td>
                                                <td style={{
                                                    color: r.variance === 0 ? '#10b981'
                                                        : r.variance < 0 ? '#ef4444' : '#f59e0b',
                                                    fontWeight: 600,
                                                }}>
                                                    {r.variance > 0 ? '+' : ''}{r.variance !== null ? `₹${r.variance.toFixed(2)}` : '—'}
                                                </td>
                                                <td className="details-cell">{r.details}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {!reconResults && (
                    <div className="recon-empty">
                        <HiOutlineRefresh className="recon-empty-icon" />
                        <p>Click <strong>"Run Reconciliation"</strong> to match webhook events against settlement reports and detect mismatches.</p>
                    </div>
                )}
            </motion.div>

            {/* Live Event Feed */}
            <motion.div
                className="gateway-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <div className="section-header">
                    <h2>
                        <HiOutlineStatusOnline style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
                        Live Event Feed
                    </h2>
                    <span className="feed-count">{eventFeed.length} events</span>
                </div>

                <div className="event-feed">
                    <AnimatePresence>
                        {eventFeed.slice(0, 15).map((evt) => (
                            <motion.div
                                key={evt.id}
                                className={`event-item ${evt.isNew ? 'event-new' : ''}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                layout
                            >
                                <div className="event-icon-wrapper">
                                    {evt.status === 'refund' ? (
                                        <HiOutlineX className="event-icon refund" />
                                    ) : evt.processed ? (
                                        <HiOutlineCheck className="event-icon success" />
                                    ) : (
                                        <HiOutlineExclamation className="event-icon pending" />
                                    )}
                                </div>
                                <div className="event-details">
                                    <div className="event-main">
                                        <span className="event-type">{evt.type}</span>
                                        <span className="event-amount">₹{evt.amount?.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="event-meta">
                                        <span className="event-id">{evt.transaction_id}</span>
                                        <span className="event-method">{evt.method?.replace('_', ' ')}</span>
                                        <span className="event-time">
                                            {new Date(evt.timestamp).toLocaleString('en-IN', {
                                                hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
                                            })}
                                        </span>
                                    </div>
                                </div>
                                <span className={`event-status-badge ${evt.status}`}>
                                    {evt.status}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {eventFeed.length === 0 && (
                        <div className="event-feed-empty">
                            <p>No webhook events received yet. Use the simulator above to generate test events.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default GatewayPage;
