import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineSparkles, HiOutlineOfficeBuilding, HiOutlineCurrencyRupee } from 'react-icons/hi';
import { updateOnboarding } from '../logic/storage';

const steps = [
    { id: 0, title: 'Welcome', icon: HiOutlineSparkles },
    { id: 1, title: 'Bank Details', icon: HiOutlineOfficeBuilding },
    { id: 2, title: 'Pricing Config', icon: HiOutlineCurrencyRupee },
];

const OnboardingPage = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        mdrPercentage: '2.0',
        gstPercentage: '18.0',
        refundFee: '5.0',
        chargebackFee: '50.0',
    });

    const handleNext = () => {
        if (currentStep < 2) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    const handleComplete = (e) => {
        e.preventDefault();
        const updatedUser = updateOnboarding({
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            ifscCode: formData.ifscCode,
        });
        onComplete(updatedUser);
    };

    const updateField = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <div className="onboarding-page">
            <div className="onboarding-container animate-fade-in">
                {/* Progress */}
                <div className="onboarding-progress">
                    {steps.map((step, i) => (
                        <div key={step.id} className={`progress-step ${i <= currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}>
                            <div className="progress-dot">
                                {i < currentStep ? '✓' : i + 1}
                            </div>
                            <span className="progress-label">{step.title}</span>
                            {i < steps.length - 1 && <div className={`progress-line ${i < currentStep ? 'active' : ''}`} />}
                        </div>
                    ))}
                </div>

                {/* Steps */}
                <motion.div
                    key={currentStep}
                    className="onboarding-step-content"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                >
                    {currentStep === 0 && (
                        <div className="onboarding-welcome">
                            <div className="welcome-icon">
                                <HiOutlineSparkles />
                            </div>
                            <h1 className="gradient-text">Welcome to SettleSync</h1>
                            <p className="onboarding-desc">
                                Let's set up your transparency dashboard. We need a few details about
                                your bank account and pricing configuration to get started.
                            </p>
                            <div className="welcome-features">
                                <div className="welcome-feature-item">
                                    <span className="feature-bullet">📊</span>
                                    <span>Real-time transaction reconciliation</span>
                                </div>
                                <div className="welcome-feature-item">
                                    <span className="feature-bullet">🔍</span>
                                    <span>Automated anomaly detection</span>
                                </div>
                                <div className="welcome-feature-item">
                                    <span className="feature-bullet">📒</span>
                                    <span>Double-entry accounting ledger</span>
                                </div>
                            </div>
                            <button className="btn-primary btn-full onboarding-btn" onClick={handleNext}>
                                Get Started →
                            </button>
                        </div>
                    )}

                    {currentStep === 1 && (
                        <div className="onboarding-form-step">
                            <h2>Bank Account Details</h2>
                            <p className="step-desc">Enter your settlement bank account information</p>
                            <form className="onboarding-form">
                                <div className="form-group">
                                    <label>Bank Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        placeholder="e.g. HDFC Bank"
                                        value={formData.bankName}
                                        onChange={(e) => updateField('bankName', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Account Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        placeholder="12 digit account number"
                                        value={formData.accountNumber}
                                        onChange={(e) => updateField('accountNumber', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>IFSC Code</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        placeholder="HDFC0001234"
                                        value={formData.ifscCode}
                                        onChange={(e) => updateField('ifscCode', e.target.value.toUpperCase())}
                                    />
                                </div>
                                <div className="onboarding-nav">
                                    <button type="button" className="btn-secondary" onClick={handleBack}>
                                        ← Back
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={handleNext}
                                        disabled={!formData.bankName || !formData.accountNumber || !formData.ifscCode}
                                    >
                                        Continue →
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="onboarding-form-step">
                            <h2>Pricing Configuration</h2>
                            <p className="step-desc">Confirm your payment gateway pricing rules</p>
                            <form className="onboarding-form" onSubmit={handleComplete}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>MDR Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="form-input"
                                            value={formData.mdrPercentage}
                                            onChange={(e) => updateField('mdrPercentage', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>GST on MDR (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="form-input"
                                            value={formData.gstPercentage}
                                            onChange={(e) => updateField('gstPercentage', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Refund Fee (₹)</label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            className="form-input"
                                            value={formData.refundFee}
                                            onChange={(e) => updateField('refundFee', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Chargeback Fee (₹)</label>
                                        <input
                                            type="number"
                                            step="1"
                                            className="form-input"
                                            value={formData.chargebackFee}
                                            onChange={(e) => updateField('chargebackFee', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="onboarding-nav">
                                    <button type="button" className="btn-secondary" onClick={handleBack}>
                                        ← Back
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Launch Dashboard 🚀
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default OnboardingPage;
