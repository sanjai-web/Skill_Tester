import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

/* ── TechVedhu-style bird logo (inline SVG) ── */
const TechVedhuLogo = () => (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 28 C10 18, 20 8, 36 6 C30 12, 26 16, 24 20 C28 18, 32 16, 36 14 C32 22, 26 28, 20 30 C22 26, 22 22, 20 20 C18 24, 14 28, 8 28Z" fill="white" />
        <circle cx="30" cy="10" r="3" fill="#f97316" />
    </svg>
);

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
        setMobileOpen(false);
    };

    const navLinkStyle = {
        color: 'rgba(255,255,255,0.9)',
        textDecoration: 'none',
        fontWeight: 500,
        fontSize: '0.92rem',
        padding: '0.3rem 0.1rem',
        borderBottom: '2px solid transparent',
        transition: 'border-color 0.2s, color 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
    };

    return (
        <>
            <header style={{
                backgroundColor: 'var(--navbar-bg)',
                height: 'var(--navbar-height)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
                width: '100%',
                boxSizing: 'border-box',
            }}>
                <div style={{
                    maxWidth: '1200px',
                    width: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    {/* Logo */}
                    <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <TechVedhuLogo />
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em', fontFamily: 'var(--font-heading)' }}>
                                SKILL TESTER
                            </span>
                            <span style={{ fontSize: '0.62rem', opacity: 0.8, letterSpacing: '0.08em', fontWeight: 500 }}>
                                POWERED BY TECH VEDHU
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <nav style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }} className="desktop-nav">
                        {user ? (
                            <>
                                <Link to="/dashboard" style={navLinkStyle}>
                                    <LayoutDashboard size={15} /> Dashboard
                                </Link>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{
                                        width: '34px', height: '34px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #f97316, #fbbf24)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: '0.85rem', color: 'white',
                                        flexShrink: 0,
                                    }}>
                                        {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.88rem', fontWeight: 500 }}>
                                        {user.name || user.email?.split('@')[0]}
                                    </span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                                        padding: '0.45rem 1rem', borderRadius: '6px',
                                        border: '1.5px solid rgba(255,255,255,0.5)',
                                        backgroundColor: 'transparent', color: 'rgba(255,255,255,0.9)',
                                        fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <LogOut size={14} /> Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/" style={navLinkStyle}
                                    onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.7)'}
                                    onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                                >Home</Link>
                                <a href="/#features" style={navLinkStyle}
                                    onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.7)'}
                                    onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                                >Features</a>
                                <a href="/#pricing" style={navLinkStyle}
                                    onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.7)'}
                                    onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                                >Pricing</a>
                                <a href="/#faq" style={navLinkStyle}
                                    onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.7)'}
                                    onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                                >FAQ</a>
                                <Link to="/login" className="btn-white-outline" style={{ textDecoration: 'none' }}>
                                    Login / Signup
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        style={{ color: 'white', display: 'none', padding: '0.25rem' }}
                        className="mobile-menu-btn"
                        aria-label="Toggle menu"
                    >
                        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Mobile Menu Drawer */}
            {mobileOpen && (
                <div style={{
                    position: 'fixed', top: 'var(--navbar-height)', left: 0, right: 0,
                    backgroundColor: 'var(--navbar-bg)', zIndex: 99,
                    padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}>
                    {user ? (
                        <>
                            <Link to="/dashboard" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, fontSize: '1rem' }}>
                                <LayoutDashboard size={16} /> Dashboard
                            </Link>
                            <button onClick={handleLogout} style={{ ...navLinkStyle, fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: 'fit-content' }}>
                                <LogOut size={16} /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, fontSize: '1rem' }}>Home</Link>
                            <a href="/#features" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, fontSize: '1rem' }}>Features</a>
                            <a href="/#pricing" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, fontSize: '1rem' }}>Pricing</a>
                            <a href="/#faq" onClick={() => setMobileOpen(false)} style={{ ...navLinkStyle, fontSize: '1rem' }}>FAQ</a>
                            <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-primary" style={{ textDecoration: 'none', width: 'fit-content' }}>
                                Login / Signup
                            </Link>
                        </>
                    )}
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .mobile-menu-btn { display: flex !important; }
                }
            `}</style>
        </>
    );
};

export default Navbar;
