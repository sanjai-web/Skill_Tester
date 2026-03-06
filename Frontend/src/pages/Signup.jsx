import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

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
            navigate('/dashboard'); // Go directly to dashboard as Google implies email verified
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                    <UserPlus size={48} style={{ color: 'var(--color-primary)', margin: '0 auto' }} />
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Account Created!</h2>
                    {needsEmailConfirmation ? (
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            We've sent a confirmation link to <strong>{email}</strong>.
                            Please click the link to activate your account before logging in.
                        </p>
                    ) : (
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            Your account has been created successfully. You can now log in to start practicing.
                        </p>
                    )}
                    <Link to="/login" className="btn-primary" style={{ marginTop: '1rem', textDecoration: 'none' }}>
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Create Account</h2>
                    <p style={{ margin: 0 }}>Start practicing for your next big role.</p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#ff3b30', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Full Name</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '8px', border: '1px solid var(--color-border)',
                                    backgroundColor: 'rgba(0,0,0,0.2)', color: 'white',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

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
                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Password <span style={{ fontSize: '0.75rem' }}>(min 6 chars)</span></label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
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

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '0.25rem' }}>
                        <input
                            type="checkbox"
                            id="terms-checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            style={{ marginTop: '3px', accentColor: 'var(--color-primary)', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
                        />
                        <label htmlFor="terms-checkbox" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5, cursor: 'pointer' }}>
                            I have read and agree to the{' '}
                            <a
                                href="/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 600 }}
                            >
                                Terms of Service
                            </a>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={!agreedToTerms || isLoading}
                        style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: (!agreedToTerms || isLoading) ? 0.5 : 1, cursor: (!agreedToTerms || isLoading) ? 'not-allowed' : 'pointer' }}
                    >
                        <UserPlus size={18} /> Sign Up
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
                    <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '16px', height: '16px' }} />
                    Continue with Google
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '1rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Signup;
