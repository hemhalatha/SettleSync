import React, { useState, useMemo } from 'react';
import { webhookEvents, settlementReports, merchantPricing } from '../data/mockData';
import { processTransactions } from '../logic/processing';
import BreakdownModal from './BreakdownModal';

const Dashboard = () => {
    const [selectedTxn, setSelectedTxn] = useState(null);

    const processedData = useMemo(() =>
        processTransactions(webhookEvents, settlementReports, merchantPricing),
        []);

    const stats = useMemo(() => {
        const totalTxns = processedData.length;
        const totalAmount = processedData.reduce((acc, curr) => acc + curr.transaction_amount, 0);
        const totalSettled = processedData.reduce((acc, curr) => acc + curr.settled_amount, 0);
        const anomalies = processedData.filter(txn => txn.attribution.includes('Anomaly')).length;

        return { totalTxns, totalAmount, totalSettled, anomalies };
    }, [processedData]);

    return (
        <div className="container animate-fade-in">
            <header style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Payment Transparency Hub
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>Transparent reconciliation for modern merchants</p>
            </header>

            <div className="stats-grid">
                <div className="card glass-panel stat-card">
                    <span className="stat-label">Total Volume</span>
                    <span className="stat-value">₹{stats.totalAmount.toLocaleString()}</span>
                </div>
                <div className="card glass-panel stat-card">
                    <span className="stat-label">Settled Amount</span>
                    <span className="stat-value" style={{ color: 'var(--success)' }}>₹{stats.totalSettled.toLocaleString()}</span>
                </div>
                <div className="card glass-panel stat-card">
                    <span className="stat-label">Total Transactions</span>
                    <span className="stat-value">{stats.totalTxns}</span>
                </div>
                <div className="card glass-panel stat-card">
                    <span className="stat-label">Anomalies Detected</span>
                    <span className="stat-value" style={{ color: stats.anomalies > 0 ? 'var(--warning)' : 'inherit' }}>{stats.anomalies}</span>
                </div>
            </div>

            <div className="card glass-panel" style={{ padding: '0' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Transaction Ledger</h3>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Showing {processedData.length} recent records</span>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Txn ID</th>
                                <th>Method</th>
                                <th>Amount</th>
                                <th>Settled</th>
                                <th>Diff</th>
                                <th>Attribution</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((txn) => (
                                <tr key={txn.transaction_id}>
                                    <td style={{ fontWeight: 500 }}>{txn.transaction_id}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{txn.payment_method.replace('_', ' ')}</td>
                                    <td>₹{txn.transaction_amount.toFixed(2)}</td>
                                    <td>₹{txn.settled_amount.toFixed(2)}</td>
                                    <td style={{ color: txn.difference > 0 ? 'var(--warning)' : 'inherit' }}>
                                        ₹{txn.difference.toFixed(2)}
                                    </td>
                                    <td>
                                        <span className={`badge ${txn.attribution === 'Correct Settlement' ? 'badge-success' : txn.attribution.includes('Anomaly') ? 'badge-danger' : 'badge-info'}`}>
                                            {txn.attribution}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setSelectedTxn(txn)}>
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <BreakdownModal
                transaction={selectedTxn}
                onClose={() => setSelectedTxn(null)}
            />

            <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <p>&copy; 2026 Payment Breakdown Engine. All attributions are derived from pricing rules.</p>
            </footer>
        </div>
    );
};

export default Dashboard;
