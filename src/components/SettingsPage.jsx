import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    HiOutlineOfficeBuilding,
    HiOutlineCurrencyRupee,
    HiOutlineShieldCheck,
    HiOutlineSave,
} from 'react-icons/hi';
import { updateUserSettings, getCurrentUser, updateOnboarding } from '../logic/storage';
import { merchantPricing } from '../data/mockData';

const SettingsPage = ({ user, setUser, showToast }) => {
    const currentUser = getCurrentUser() || user;

    const [bankDetails, setBankDetails] = useState({
        bankName: currentUser?.bankDetails?.bankName || '',
        accountNumber: currentUser?.bankDetails?.accountNumber || '',
        ifscCode: currentUser?.bankDetails?.ifscCode || '',
    });

    const [saving, setSaving] = useState(false);

    const handleSaveBankDetails = (e) => {
        e.preventDefault();
        setSaving(true);
        setTimeout(() => {
            const updated = updateOnboarding(bankDetails);
            if (updated) {
                setUser(updated);
                showToast('success', 'Bank details updated successfully');
            }
            setSaving(false);
        }, 500);
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title gradient-text">Settings</h1>
                    <p className="page-subtitle">Manage your account and configuration</p>
                </div>
            </div>

            <div className="settings-grid">
                {/* Bank Details */}
                <motion.div
                    className="card glass-panel settings-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="settings-card-header">
                        <HiOutlineOfficeBuilding className="settings-section-icon" />
                        <h3>Bank Account Details</h3>
                    </div>
                    <form onSubmit={handleSaveBankDetails} className="settings-form">
                        <div className="form-group">
                            <label>Bank Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={bankDetails.bankName}
                                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                placeholder="e.g. HDFC Bank"
                            />
                        </div>
                        <div className="form-group">
                            <label>Account Number</label>
                            <input
                                type="text"
                                className="form-input"
                                value={bankDetails.accountNumber}
                                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                placeholder="12 digit account number"
                            />
                        </div>
                        <div className="form-group">
                            <label>IFSC Code</label>
                            <input
                                type="text"
                                className="form-input"
                                value={bankDetails.ifscCode}
                                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                                placeholder="HDFC0001234"
                            />
                        </div>
                        <button type="submit" className="btn-primary btn-with-icon" disabled={saving}>
                            <HiOutlineSave /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </motion.div>

                {/* Pricing Rules */}
                <motion.div
                    className="card glass-panel settings-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="settings-card-header">
                        <HiOutlineCurrencyRupee className="settings-section-icon" />
                        <h3>Pricing Configuration</h3>
                    </div>
                    <div className="pricing-rules">
                        <div className="pricing-rule">
                            <span className="pricing-label">MDR Rate</span>
                            <span className="pricing-value">{merchantPricing.mdrPercentage}%</span>
                        </div>
                        <div className="pricing-rule">
                            <span className="pricing-label">GST on MDR</span>
                            <span className="pricing-value">{merchantPricing.gstPercentage}%</span>
                        </div>
                        <div className="pricing-rule">
                            <span className="pricing-label">Refund Fee</span>
                            <span className="pricing-value">₹{merchantPricing.refundFee}</span>
                        </div>
                        <div className="pricing-rule">
                            <span className="pricing-label">Chargeback Fee</span>
                            <span className="pricing-value">₹{merchantPricing.chargebackFee}</span>
                        </div>
                    </div>
                    <p className="settings-note">
                        Pricing rules are set by your payment gateway. Contact support to update.
                    </p>
                </motion.div>

                {/* Account Info */}
                <motion.div
                    className="card glass-panel settings-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="settings-card-header">
                        <HiOutlineShieldCheck className="settings-section-icon" />
                        <h3>Account Information</h3>
                    </div>
                    <div className="account-info">
                        <div className="account-info-row">
                            <span className="account-label">Username</span>
                            <span className="account-value">{currentUser?.username || 'N/A'}</span>
                        </div>
                        <div className="account-info-row">
                            <span className="account-label">Email</span>
                            <span className="account-value">{currentUser?.email || 'N/A'}</span>
                        </div>
                        <div className="account-info-row">
                            <span className="account-label">Status</span>
                            <span className="badge badge-success">Active</span>
                        </div>
                        <div className="account-info-row">
                            <span className="account-label">Onboarded</span>
                            <span className={`badge ${currentUser?.onboarded ? 'badge-success' : 'badge-warning'}`}>
                                {currentUser?.onboarded ? 'Complete' : 'Pending'}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default SettingsPage;
