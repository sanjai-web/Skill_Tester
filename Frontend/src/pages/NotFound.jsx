import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Home } from 'lucide-react';

const NotFound = () => {
    return (
        <>
            <Helmet>
                <title>404 – Page Not Found | Skill Tester</title>
                <meta name="description" content="The page you are looking for does not exist. Return to the Skill Tester homepage to start practicing for your tech interview." />
                <meta name="robots" content="noindex, follow" />
            </Helmet>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '70vh',
                textAlign: 'center',
                gap: '1.5rem',
                padding: '2rem'
            }}>
                <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <AlertTriangle size={40} color="var(--color-warning)" />
                </div>

                <h1 style={{ fontSize: '5rem', fontWeight: 800, margin: 0, lineHeight: 1, color: 'var(--color-text-muted)' }}>
                    404
                </h1>

                <div>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Page Not Found</h2>
                    <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
                    <Link
                        to="/"
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                    >
                        <Home size={18} />
                        Back to Home
                    </Link>
                    <Link
                        to="/login"
                        style={{
                            padding: '0.75rem 1.5rem', borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'transparent', color: 'white',
                            textDecoration: 'none', fontWeight: 500
                        }}
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        </>
    );
};

export default NotFound;
