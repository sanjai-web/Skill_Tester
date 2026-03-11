import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, LogIn } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

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
                <title>Login | Skill Tester – AI Mock Interview Platform</title>
                <meta name="description" content="Log in to your Skill Tester account and continue practicing AI-powered mock interviews tailored to your resume and job description." />
                <link rel="canonical" href="https://skilltester.app/login" />
                <meta name="robots" content="noindex, follow" />
            </Helmet>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Welcome Back</h2>
                        <p style={{ margin: 0 }}>Log in to continue your interview prep.</p>
                    </div>

                    {error && (
                        <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#ff3b30', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                                        borderRadius: '8px', border: '1px solid var(--color-border)',
                                        backgroundColor: 'rgba(0,0,0,0.2)', color: 'white',
                                        boxSizing: 'border-box'
                                    }}
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                                        borderRadius: '8px', border: '1px solid var(--color-border)',
                                        backgroundColor: 'rgba(0,0,0,0.2)', color: 'white',
                                        boxSizing: 'border-box'
                                    }}
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
                                marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                                opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} /> Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>OR</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }}></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        style={{
                            width: '100%', padding: '0.75rem', borderRadius: '8px',
                            border: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.05)',
                            color: 'white', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem',
                            opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? (
                            <>
                                <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '16px', height: '16px' }} />
                                Continue with Google
                            </>
                        )}
                    </button>

                    <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '1rem' }}>
                        Don't have an account? <Link to="/signup" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
                    </p>
                    <style>
                        {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        `}
                    </style>
                </div>
            </div>
        </>
    );
};

export default Login;
