import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineInformationCircle, HiOutlineX } from 'react-icons/hi';

const config = {
    success: { icon: HiOutlineCheckCircle, color: 'var(--success)', bg: 'var(--success-bg)' },
    error: { icon: HiOutlineExclamationCircle, color: '#fb7185', bg: 'rgba(244,63,94,0.1)' },
    info: { icon: HiOutlineInformationCircle, color: '#818cf8', bg: 'var(--primary-light)' },
};

const Toast = ({ type = 'info', message, onClose, duration = 4000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const { icon: Icon, color, bg } = config[type] || config.info;

    return (
        <motion.div
            className={`toast toast-${type}`}
            initial={{ opacity: 0, x: 80, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: bg, color, flexShrink: 0 }}>
                <Icon style={{ fontSize: '1.15rem' }} />
            </div>
            <div style={{ flex: 1 }}>
                <p className="toast-message">{message}</p>
            </div>
            <button
                onClick={onClose}
                className="toast-close"
                aria-label="Close notification"
            >
                <HiOutlineX />
            </button>
        </motion.div>
    );
};

export default Toast;
