import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Clock, Award, BarChart2, Loader, CheckCircle, Zap } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [interviews, setInterviews] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const handleStartInterview = () => {
        if ((subscription?.interviews_remaining ?? 1) <= 0) {
            setShowUpgradeModal(true);
        } else {
            navigate('/setup');
        }
    };

    const handleUpgrade = async (planId) => {
        try {
            // 1. Create Order
            const { data: orderRes } = await api.post('/payments/create-order', { planId });
            
            if (orderRes.status !== 'success') {
                throw new Error(orderRes.message || 'Failed to create payment order.');
            }

            const { orderId, amount, currency } = orderRes.data;

            // 2. Open Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: amount,
                currency: currency,
                name: 'Skill Tester',
                description: `Upgrade to ${planId} plan`,
                order_id: orderId,
                handler: async (response) => {
                    try {
                        // 3. Verify Payment
                        const { data: verifyRes } = await api.post('/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planId: planId
                        });

                        if (verifyRes.status === 'success') {
                            alert(`Success! Your account has been upgraded to ${planId}.`);
                            // Move to dashboard and refresh
                            navigate('/dashboard');
                            window.location.reload();
                        } else {
                            alert('Payment verification failed.');
                        }
                    } catch (err) {
                        console.error('Verification Error:', err);
                        alert('Error verifying payment: ' + (err.response?.data?.message || err.message));
                    }
                },
                prefill: {
                    name: user?.name || '',
                    email: user?.email || '',
                },
                theme: {
                    color: '#3b82f6',
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                alert('Payment failed: ' + response.error.description);
            });
            rzp.open();

        } catch (err) {
            console.error('Upgrade Error:', err);
            alert('Could not initiate upgrade: ' + (err.response?.data?.message || err.message));
        }
    };


    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [interviewsRes, subRes] = await Promise.all([
                    api.get('/interviews'),
                    api.get('/interviews/subscription')
                ]);
                setInterviews(interviewsRes.data.data || []);
                setSubscription(subRes.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const avgScore = interviews.filter(i => i.score).length > 0
        ? Math.round(interviews.filter(i => i.score).reduce((sum, i) => sum + i.score, 0) / interviews.filter(i => i.score).length)
        : null;

    const planLabel = subscription?.plan_id
        ? subscription.plan_id.charAt(0).toUpperCase() + subscription.plan_id.slice(1)
        : 'Free';

    return (
        <>
            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                            Welcome back, {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'} 👋
                        </h1>
                        <p style={{ margin: 0, fontSize: '1.1rem' }}>Ready to conquer your next interview?</p>
                    </div>
                    <button
                        onClick={handleStartInterview}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
                        <Play size={20} fill="white" /> Start Interview
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
                        <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
                        <p style={{ marginTop: '1rem' }}>Loading your dashboard...</p>
                    </div>
                ) : error ? (
                    <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#ff3b30', padding: '1rem', borderRadius: '8px' }}>
                        {error}
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Award size={24} color="var(--color-primary)" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Current Plan</p>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{planLabel}</h3>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={24} color="var(--color-success)" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Interviews Remaining</p>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                                        {subscription?.interviews_remaining ?? '—'}
                                        {subscription?.interviews_remaining === 0 && (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginLeft: '0.5rem' }}>Upgrade to continue</span>
                                        )}
                                    </h3>
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BarChart2 size={24} color="var(--color-secondary)" />
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Avg. Score</p>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{avgScore !== null ? `${avgScore}%` : 'N/A'}</h3>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Plans Section */}
                        <div id="subscription-plans" style={{ scrollMarginTop: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                Subscription Plans
                            </h2>
                            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>
                                Your current plan: <strong style={{ color: 'var(--color-primary)' }}>{planLabel}</strong> · {subscription?.interviews_remaining ?? 0} interview{subscription?.interviews_remaining !== 1 ? 's' : ''} remaining
                            </p>

                            {(() => {
                                const plans = [
                                    { id: 'free', label: 'Free', price: 0, interviews: 1, features: ['1 AI mock interview', 'Basic text feedback', 'Adaptive questions'] },
                                    { id: 'basic', label: 'Basic', price: 89, interviews: 3, features: ['3 AI mock interviews', 'Detailed performance report', 'Voice mode'] },
                                    { id: 'intermediate', label: 'Intermediate', price: 250, interviews: 10, features: ['10 AI mock interviews', 'Advanced technical questions', 'Code editor', 'Analytics'], recommended: true },
                                    { id: 'pro', label: 'Pro', price: 479, interviews: 23, features: ['23 AI mock interviews', 'Priority AI generation', 'Unlimited resume uploads', 'Priority email support'] },
                                ];
                                const currentPlanId = subscription?.plan_id || 'free';

                                return (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                        {plans.map(plan => {
                                            const isCurrent = plan.id === currentPlanId;
                                            return (
                                                <div key={plan.id} className="glass-card" style={{
                                                    padding: '1.5rem',
                                                    display: 'flex', flexDirection: 'column', gap: '1rem',
                                                    position: 'relative',
                                                    border: isCurrent ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                                }}>
                                                    {isCurrent && (
                                                        <div style={{
                                                            position: 'absolute', top: '-11px', left: '1rem',
                                                            backgroundColor: 'var(--color-primary)', color: 'white',
                                                            padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700
                                                        }}>YOUR PLAN</div>
                                                    )}
                                                    {plan.recommended && !isCurrent && (
                                                        <div style={{
                                                            position: 'absolute', top: '-11px', left: '1rem',
                                                            backgroundColor: 'var(--color-accent)', color: 'white',
                                                            padding: '2px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700
                                                        }}>RECOMMENDED</div>
                                                    )}
                                                    <div>
                                                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{plan.label}</h3>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                            <span style={{ fontSize: '2rem', fontWeight: 800 }}>₹{plan.price}</span>
                                                            {plan.price > 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>one-time</span>}
                                                        </div>
                                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                                                            {plan.interviews} interview{plan.interviews > 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                                        {plan.features.map((f, i) => (
                                                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.82rem' }}>
                                                                <CheckCircle size={14} color="var(--color-success)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                <span style={{ color: 'var(--color-text-muted)' }}>{f}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <button
                                                        onClick={() => handleUpgrade(plan.id)}
                                                        disabled={isCurrent || plan.id === 'free'}
                                                        style={{
                                                            padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem',
                                                            backgroundColor: isCurrent ? 'rgba(59,130,246,0.15)' : plan.recommended ? 'var(--color-primary)' : 'transparent',
                                                            border: isCurrent ? '1px solid var(--color-primary)' : plan.recommended ? 'none' : '1px solid var(--color-border)',
                                                            color: isCurrent ? 'var(--color-primary)' : 'white',
                                                            cursor: isCurrent || plan.id === 'free' ? 'default' : 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                                                        }}>
                                                        {isCurrent ? 'Current Plan' : plan.id === 'free' ? 'Default' : (
                                                            <><Zap size={14} /> Upgrade</>
                                                        )}
                                                    </button>

                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        <div>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                Recent Interviews
                            </h2>

                            {interviews.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {interviews.map((interview) => (
                                        <div key={interview.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>{interview.role}</h3>
                                                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                                    {interview.company || 'General'} • {new Date(interview.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                        {interview.status === 'completed' ? 'Score' : 'Status'}
                                                    </p>
                                                    {interview.status === 'completed' && interview.score ? (
                                                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: interview.score > 70 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                                            {interview.score}%
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                                                            {interview.status}
                                                        </span>
                                                    )}
                                                </div>
                                                {interview.status === 'completed' && (
                                                    <button
                                                        onClick={() => navigate(`/results/${interview.id}`)}
                                                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'white', fontSize: '0.9rem' }}>
                                                        View Results
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>You haven't taken any mock interviews yet.</p>
                                    <button onClick={handleStartInterview} className="btn-primary">Start Your First Interview</button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Upgrade Modal */}
            {
                showUpgradeModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(6px)',
                    }}>
                        <div className="glass-card" style={{
                            maxWidth: '480px', width: '90%', padding: '2.5rem',
                            textAlign: 'center', borderRadius: '20px',
                            border: '1px solid rgba(249,115,22,0.4)',
                            backgroundColor: 'rgba(15,23,42,0.95)',
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                Interview Credits Exhausted
                            </h2>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
                                You've used all your interview credits on the current plan.
                                Upgrade to continue practising and unlock more interviews.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button
                                    onClick={() => {
                                        setShowUpgradeModal(false);
                                        document.getElementById('subscription-plans')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    style={{
                                        padding: '0.75rem 2rem', borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #f97316, #ef4444)',
                                        color: 'white', fontWeight: 700, fontSize: '1rem',
                                        border: 'none', cursor: 'pointer',
                                    }}>
                                    ⬆ Upgrade Plan
                                </button>
                                <button
                                    onClick={() => setShowUpgradeModal(false)}
                                    style={{
                                        padding: '0.75rem 2rem', borderRadius: '10px',
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                        color: 'white', fontWeight: 500,
                                        border: '1px solid var(--color-border)', cursor: 'pointer',
                                    }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default Dashboard;
