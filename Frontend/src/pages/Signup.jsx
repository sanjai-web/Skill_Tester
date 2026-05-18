import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const { register, loginWithGoogle } = useContext(AuthContext);
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

    const handleSignup = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const result = await register(name, email, password);

        setIsLoading(false);
        if (result.success) {
            setIsSuccess(true);
            setNeedsEmailConfirmation(result.emailConfirmationRequired || false);
        } else {
            setError(result.message);
        }
    };

    if (isSuccess) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-section)' }}>
                <Navbar />
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 1rem' }}>
                    <div className="tv-card" style={{ width: '100%', maxWidth: '420px', padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', alignItems: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                            <UserPlus size={32} style={{ color: 'var(--color-success)' }} />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-text-dark)', marginBottom: '0.5rem' }}>Account Created!</h2>
                        {needsEmailConfirmation ? (
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                We've sent a confirmation link to <strong style={{ color: 'var(--color-text-dark)' }}>{email}</strong>.<br/><br/>
                                Please click the link to activate your account before logging in.
                            </p>
                        ) : (
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                                Your account has been created successfully. You can now log in to start practicing.
                            </p>
                        )}
                        <Link to="/login" className="btn-primary" style={{ marginTop: '1.5rem', textDecoration: 'none', width: '100%' }}>
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>Sign Up Free | Tech Vedhu Skill Tester</title>
                <meta name="description" content="Create a free Tech Vedhu Skill Tester account." />
                <link rel="canonical" href="https://skilltester.app/signup" />
            </Helmet>
            
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg-section)' }}>
                <Navbar />
                
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 1rem' }}>
                    <div className="tv-card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                            <h2 style={{ fontSize: '1.8rem', color: 'var(--tv-primary)', marginBottom: '0.5rem' }}>Create Account</h2>
                            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>Start practicing for your next big role.</p>
                        </div>

                        {error && (
                            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)', fontWeight: 600 }}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="tv-input"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                            </div>

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
                                <label style={{ fontSize: '0.9rem', color: 'var(--color-text-dark)', fontWeight: 600 }}>Password <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>(min 6 chars)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-light)' }} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength={6}
                                        className="tv-input"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    id="terms-checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    style={{ marginTop: '3px', accentColor: 'var(--tv-primary)', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
                                />
                                <label htmlFor="terms-checkbox" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5, cursor: 'pointer' }}>
                                    I have read and agree to the{' '}
                                    <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tv-primary)', textDecoration: 'underline', fontWeight: 600 }}>
                                        Terms of Service
                                    </a>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={!agreedToTerms || isLoading}
                                style={{ 
                                    marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', width: '100%',
                                    opacity: (!agreedToTerms || isLoading) ? 0.7 : 1, cursor: (!agreedToTerms || isLoading) ? 'not-allowed' : 'pointer' 
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={18} /> Sign Up
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
                            Already have an account? <Link to="/login" style={{ color: 'var(--tv-primary)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Signup;
