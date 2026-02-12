import React, { useState } from 'react';
import { updateOnboarding } from '../logic/storage';

const OnboardingPage = ({ onComplete }) => {
    const [formData, setFormData] = useState({
        bankName: '',
        accountNumber: '',
        ifscCode: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const updatedUser = updateOnboarding(formData);
        onComplete(updatedUser);
    };

    return (
        <div className="onboarding-container animate-fade-in">
            <div className="onboarding-header">
                <h1 style={{ background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '2.5rem' }}>
                    Complete Your Profile
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    We need a few details to set up your transparency dashboard
                </p>
            </div>

            <div className="card glass-panel">
                <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
                    <div className="form-group">
                        <label>Bank Name</label>
                        <input
                            type="text"
                            className="form-input"
                            required
                            placeholder="e.g. HDFC Bank"
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
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
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
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
                            onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>
                    <button type="submit" className="btn-primary btn-full" style={{ padding: '1rem' }}>
                        Set Up Dashboard
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OnboardingPage;
