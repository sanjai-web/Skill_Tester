import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, ChevronLeft, CheckCircle, AlertTriangle, TrendingUp, Loader } from 'lucide-react';
import api from '../services/api';

const Results = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await api.get(`/interviews/${id}`);
                const interview = response.data.data;
                const questions = interview.questions || [];

                // Build structured report from interview data
                const strengths = [];
                const weaknesses = [];

                questions.forEach(q => {
                    try {
                        const feedback = typeof q.ai_feedback === 'string' ? JSON.parse(q.ai_feedback) : q.ai_feedback;
                        if (feedback) {
                            const score = Number(feedback.score || 0);
                            const text = feedback.feedback || feedback;
                            if (score >= 7) {
                                strengths.push(text);
                            } else {
                                weaknesses.push(text);
                            }
                        }
                    } catch (e) {
                        if (q.ai_feedback) weaknesses.push(q.ai_feedback);
                    }
                });

                setReport({
                    role: interview.role,
                    company: interview.company,
                    score: interview.score || 70,
                    strengths: strengths.length > 0 ? strengths : ['Completed the interview session successfully.'],
                    weaknesses: weaknesses.length > 0 ? weaknesses : ['Continue practicing to improve your scores.'],
                    questionsAnswered: questions.length,
                    date: new Date(interview.created_at).toLocaleDateString()
                });
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load interview results.');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [id]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--color-text-muted)' }}>
                <Loader size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                <p>Loading your results...</p>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
                <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#ff3b30', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    {error || 'Results not found.'}
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn-primary">Go to Dashboard</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ChevronLeft size={20} /> Back to Dashboard
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>Interview Analysis</h1>
                    <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                        {report.role}{report.company ? ` @ ${report.company}` : ''} · {report.date}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        {report.questionsAnswered} question{report.questionsAnswered !== 1 ? 's' : ''} answered
                    </p>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Overall Score</h2>
                <div style={{
                    fontSize: '5rem', fontWeight: 800,
                    color: report.score >= 70 ? 'var(--color-success)' : report.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)',
                    lineHeight: 1, marginBottom: '1rem'
                }}>
                    {report.score}%
                </div>
                <p style={{ maxWidth: '600px', margin: '0 auto', fontSize: '1rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    {report.score >= 80
                        ? 'Excellent performance! You are well-prepared for this role.'
                        : report.score >= 60
                            ? 'Good effort. Review the areas below to sharpen your performance.'
                            : 'Keep practicing. Focus on the improvement areas below for a stronger next attempt.'}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

                <div className="glass-card" style={{ padding: '2rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--color-success)' }}>
                        <CheckCircle size={24} /> Key Strengths
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {report.strengths.map((item, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <span style={{ color: 'var(--color-success)', marginTop: '2px' }}>•</span>
                                <span style={{ color: 'var(--color-text-main)', lineHeight: 1.5 }}>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="glass-card" style={{ padding: '2rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--color-warning)' }}>
                        <AlertTriangle size={24} /> Areas to Improve
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {report.weaknesses.map((item, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <span style={{ color: 'var(--color-warning)', marginTop: '2px' }}>•</span>
                                <span style={{ color: 'var(--color-text-main)', lineHeight: 1.5 }}>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>

            <div className="glass-card" style={{ padding: '2rem', marginTop: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                    <TrendingUp size={24} /> Recommended Next Steps
                </h3>
                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
                    Practice the areas highlighted above in your next interview session. Use the <strong>Intermediate</strong> or <strong>Pro</strong> tier to generate more in-depth technical questions targeted at {report.role} roles.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/setup')} className="btn-primary">
                        Practice Again
                    </button>
                    <button onClick={() => navigate('/dashboard')} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'white' }}>
                        View Dashboard
                    </button>
                </div>
            </div>

        </div>
    );
};

export default Results;
