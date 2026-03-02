import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, LogOut, LayoutDashboard } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="glass-card" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 2rem',
            margin: '1rem',
            position: 'sticky',
            top: '1rem',
            zIndex: 50
        }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={28} color="var(--color-primary)" />
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Skilltester.app</h2>
            </Link>

            <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {user ? (
                    // Logged-in navigation
                    <>
                        <Link to="/dashboard" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <LayoutDashboard size={16} /> Dashboard
                        </Link>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.9rem', color: 'white'
                            }}>
                                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                                    {user.name || user.email}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 1rem', borderRadius: '8px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'transparent', color: 'var(--color-text-muted)',
                                fontSize: '0.85rem', cursor: 'pointer'
                            }}>
                            <LogOut size={14} /> Logout
                        </button>
                    </>
                ) : (
                    // Guest navigation
                    <>
                        <Link to="/" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>Home</Link>
                        <Link to="/#features" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>Features</Link>
                        <Link to="/#pricing" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>Pricing</Link>
                        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)', margin: '0 0.5rem' }}></div>
                        <Link to="/login" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>Log in</Link>
                        <Link to="/signup" className="btn-primary" style={{ textDecoration: 'none' }}>Sign up</Link>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Navbar;
