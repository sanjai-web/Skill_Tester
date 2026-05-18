import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, LogIn } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const { login, loginWithGoogle } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setError(null);
        setIsLoading(true);
        const result = await loginWithGoogle();
        setIsLoading(false);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const result = await login(email, password);

        setIsLoading(false);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <>
            <Helmet>
                <title>Login | Tech Vedhu Skill Tester</title>
                <meta name="description" content="Log in to your Tech Vedhu Skill Tester account." />
                <link rel="canonical" href="https://skilltester.app/login" />
            </Helmet>
            
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-section)' }}>
                <Navbar />
                
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 1rem' }}>
                    <div className="tv-card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--tv-primary)', marginBottom: '0.5rem' }}>Welcome Back</h2>
                            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Log in to continue your upskilling journey.</p>
                        </div>

                        {error && (
                            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)', fontWeight: 600 }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="tv-input"
                                        placeholder="name@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)', fontWeight: 600 }}>Password</label>
                                    <a href="#" style={{ fontSize: '0.8rem', color: 'var(--tv-primary)', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</a>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="tv-input"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn-primary" 
                                disabled={isLoading}
                                style={{ 
                                    marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', width: '100%',
                                    opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <LogIn size={18} /> Sign In
                                    </>
                                )}
                            </button>
                        </form>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontWeight: 500 }}>OR</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            style={{
                                width: '100%', padding: '0.75rem', borderRadius: '8px',
                                border: '1px solid var(--color-border-strong)', backgroundColor: 'white',
                                color: 'var(--color-text-dark)', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem',
                                opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={e => !isLoading && (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            onMouseLeave={e => !isLoading && (e.currentTarget.style.backgroundColor = 'white')}
                        >
                            <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px', height: '18px' }} />
                            Continue with Google
                        </button>

                        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--color-text-dark)' }}>
                            Don't have an account? <Link to="/signup" style={{ color: 'var(--tv-primary)', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;
