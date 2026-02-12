import React from 'react';

const BreakdownModal = ({ transaction, onClose }) => {
    if (!transaction) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Transparency Report</h2>
                    <button className="btn-primary" onClick={onClose}>Close</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <p className="stat-label">Transaction ID</p>
                        <p style={{ fontWeight: 600 }}>{transaction.transaction_id}</p>
                    </div>
                    <div>
                        <p className="stat-label">Payment Method</p>
                        <p style={{ textTransform: 'capitalize' }}>{transaction.payment_method.replace('_', ' ')}</p>
                    </div>
                    <div>
                        <p className="stat-label">Amount</p>
                        <p style={{ fontWeight: 700, fontSize: '1.25rem' }}>₹{transaction.transaction_amount.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="stat-label">Settled Amount</p>
                        <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--success)' }}>₹{transaction.settled_amount.toFixed(2)}</p>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '1rem 0' }} />

                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Deduction Breakdown</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>Expected Fees (MDR + GST)</span>
                        <span>- ₹{transaction.expected_deduction.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: transaction.difference > 0 ? 'var(--warning)' : 'inherit' }}>
                        <span>Additional Attribution</span>
                        <span>- ₹{transaction.difference.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--glass-border)' }}>
                        <span>Total Actual Deduction</span>
                        <span>₹{transaction.actual_deduction.toFixed(2)}</span>
                    </div>
                </div>

                <div className="explanation-box">
                    <p className="stat-label" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Attribution Analysis</p>
                    <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{transaction.attribution}</p>
                    <p style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-main)' }}>{transaction.explanation}</p>
                    <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="stat-label">Confidence:</span>
                        <span className={`badge badge-${transaction.confidence.toLowerCase() === 'high' ? 'success' : transaction.confidence.toLowerCase() === 'medium' ? 'info' : 'warning'}`}>
                            {transaction.confidence}
                        </span>
                    </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.5rem', fontStyle: 'italic' }}>
                    * This report is based on current pricing rules and available settlement data.
                </p>
            </div>
        </div >
    );
};

export default BreakdownModal;
