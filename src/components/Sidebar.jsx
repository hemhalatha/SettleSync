import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineViewGrid,
    HiOutlineCreditCard,
    HiOutlineBookOpen,
    HiOutlineChartBar,
    HiOutlineCog,
    HiOutlineLogout,
    HiOutlineMenu,
    HiOutlineX,
} from 'react-icons/hi';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
    { path: '/transactions', label: 'All Payments', icon: HiOutlineCreditCard },
    { path: '/ledger', label: 'Payment History', icon: HiOutlineBookOpen },
    { path: '/reports', label: 'Reports', icon: HiOutlineChartBar },
    { path: '/settings', label: 'Settings', icon: HiOutlineCog },
];

const Sidebar = ({ user, onLogout }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    };

    const sidebarContent = (
        <>
            {/* Brand */}
            <div className="sidebar-brand">
                <motion.div
                    className="brand-icon"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                        <rect width="34" height="34" rx="10" fill="url(#brandGrad)" />
                        <path d="M10 17L15 22L24 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                            <linearGradient id="brandGrad" x1="0" y1="0" x2="34" y2="34">
                                <stop stopColor="#6366f1" />
                                <stop offset="1" stopColor="#a855f7" />
                            </linearGradient>
                        </defs>
                    </svg>
                </motion.div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            className="brand-text"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                        >
                            SettleSync
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navItems.map((item, i) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
                        }
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? item.label : ''}
                    >
                        <motion.div
                            whileHover={{ x: 5 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', width: '100%' }}
                        >
                            <item.icon className="sidebar-icon" />
                            {!collapsed && <span>{item.label}</span>}
                        </motion.div>
                    </NavLink>
                ))}
            </nav>

            {/* User section */}
            <div className="sidebar-footer">
                <motion.div
                    className={`sidebar-user ${collapsed ? 'collapsed' : ''}`}
                    style={{ flexDirection: collapsed ? 'column' : 'row' }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                    <div className="user-avatar">{getInitials(user?.username)}</div>
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.div
                                className="user-info"
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -5 }}
                                transition={{ duration: 0.2 }}
                            >
                                <span className="user-name">{user?.username}</span>
                                <span className="user-role">Premium Merchant</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
                <button
                    className={`sidebar-logout ${collapsed ? 'collapsed' : ''}`}
                    onClick={onLogout}
                    title="Logout"
                >
                    <HiOutlineLogout className="sidebar-icon" />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <HiOutlineX /> : <HiOutlineMenu />}
            </button>

            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="sidebar-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Desktop sidebar */}
            <motion.aside
                className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
                animate={{ width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
                <button
                    className="sidebar-collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    <motion.svg
                        width="14" height="14" viewBox="0 0 16 16" fill="none"
                        animate={{ rotate: collapsed ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </motion.svg>
                </button>
                {sidebarContent}
            </motion.aside>
        </>
    );
};

export default Sidebar;
