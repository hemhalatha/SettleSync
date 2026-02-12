import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineInformationCircle, HiOutlineX } from 'react-icons/hi';

const icons = {
    success: HiOutlineCheckCircle,
    error: HiOutlineExclamationCircle,
    info: HiOutlineInformationCircle,
};

const Toast = ({ type = 'info', message, onClose, duration = 4000 }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const Icon = icons[type] || icons.info;

    return (
        <AnimatePresence>
            <motion.div
                className={`toast toast-${type}`}
                initial={{ opacity: 0, x: 80, y: 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 80 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
                <Icon className="toast-icon" />
                <span className="toast-message">{message}</span>
                <button className="toast-close" onClick={onClose}>
                    <HiOutlineX />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default Toast;
