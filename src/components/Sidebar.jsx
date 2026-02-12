import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
    { path: '/transactions', label: 'Transactions', icon: HiOutlineCreditCard },
    { path: '/ledger', label: 'Ledger', icon: HiOutlineBookOpen },
    { path: '/reports', label: 'Reports', icon: HiOutlineChartBar },
    { path: '/settings', label: 'Settings', icon: HiOutlineCog },
];

const Sidebar = ({ user, onLogout }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const sidebarContent = (
        <>
            {/* Brand */}
            <div className="sidebar-brand">
                <div className="brand-icon">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <rect width="28" height="28" rx="8" fill="url(#brandGrad)" />
                        <path d="M8 14L12 18L20 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                            <linearGradient id="brandGrad" x1="0" y1="0" x2="28" y2="28">
                                <stop stopColor="#818cf8" />
                                <stop offset="1" stopColor="#c084fc" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                {!collapsed && (
                    <motion.span
                        className="brand-text"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                    >
                        SettleSync
                    </motion.span>
                )}
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`
                        }
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? item.label : ''}
                    >
                        <item.icon className="sidebar-icon" />
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* User section */}
            <div className="sidebar-footer">
                <div className={`sidebar-user ${collapsed ? 'collapsed' : ''}`}>
                    <div className="user-avatar">{getInitials(user?.username)}</div>
                    {!collapsed && (
                        <div className="user-info">
                            <span className="user-name">{user?.username}</span>
                            <span className="user-role">Merchant</span>
                        </div>
                    )}
                </div>
                <button
                    className={`sidebar-logout ${collapsed ? 'collapsed' : ''}`}
                    onClick={onLogout}
                    title="Logout"
                >
                    <HiOutlineLogout className="sidebar-icon" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
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
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                <button
                    className="sidebar-collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
                    >
                        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                {sidebarContent}
            </aside>
        </>
    );
};

export default Sidebar;
