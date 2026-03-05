import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.group('SettleSync Render Crash');
        console.error('Error:', error);
        console.error('Info:', errorInfo);
        console.groupEnd();
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-screen" style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-dark, #0f172a)',
                    color: '#fff',
                    padding: '2rem',
                    textAlign: 'center',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <div style={{
                        padding: '2rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '1rem',
                        maxWidth: '600px'
                    }}>
                        <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Application Debug Mode</h1>
                        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                            We've caught a rendering exception. This usually happens due to missing data or library conflicts.
                        </p>
                        <div style={{
                            textAlign: 'left',
                            background: '#000',
                            padding: '1rem',
                            borderRadius: '0.5rem',
                            overflowX: 'auto',
                            fontSize: '0.8rem',
                            marginBottom: '1.5rem',
                            border: '1px solid #334155'
                        }}>
                            <code style={{ color: '#fca5a5' }}>{this.state.error?.toString()}</code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'var(--primary, #6366f1)',
                                color: '#fff',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
