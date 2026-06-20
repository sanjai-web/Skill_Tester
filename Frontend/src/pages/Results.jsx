import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ChevronLeft, ChevronDown, ChevronUp, CheckCircle, Target,
    TrendingUp, Loader, Award, Brain, BarChart2, MessageSquare,
} from 'lucide-react';
import api from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTION_ORDER = ['self_intro', 'projects', 'experience', 'technical', 'scenario', 'industry', 'soft_skills', 'closing'];
const SECTION_LABELS = {
    self_intro: 'Self Introduction', projects: 'Projects', experience: 'Experience',
    technical: 'Technical Skills', scenario: 'Scenario-Based',
    industry: 'Industry Knowledge', soft_skills: 'Soft Skills', closing: 'Closing',
};
const SECTION_COLORS = {
    self_intro: '#8b5cf6', projects: '#3b82f6', experience: '#06b6d4',
    technical: '#10b981', scenario: '#f59e0b', industry: '#ef4444',
    soft_skills: '#ec4899', closing: '#64748b',
};
const SKILL_LEVEL_COLORS = {
    'Beginner': '#f59e0b', 'Intermediate': '#3b82f6', 'Advanced': '#10b981', 'Expert': '#8b5cf6',
};
const RECO_STYLES = {
    'Strong Yes': { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', text: '#10b981' },
    'Yes':        { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)',  text: '#60a5fa' },
    'Maybe':      { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)',  text: '#f59e0b' },
    'No':         { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',   text: '#ef4444' },
};

// ─── Animated circular score ring ────────────────────────────────────────────
const CircularScore = ({ score, size = 190 }) => {
    const [animated, setAnimated] = useState(false);
    const radius   = (size - 22) / 2;
    const circ     = 2 * Math.PI * radius;
    const color    = score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';
    const offset   = animated ? circ - (score / 100) * circ : circ;

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 350);
        return () => clearTimeout(t);
    }, []);

    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={13} />
                {/* Progress */}
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth={13} strokeLinecap="round"
                    strokeDasharray={circ}
                    style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1.8s cubic-bezier(0.4,0,0.2,1)' }} />
            </svg>
            {/* Center label */}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
                <span style={{ fontSize: '3rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>/ 100</span>
            </div>
        </div>
    );
};

// ─── Horizontal section score bar ────────────────────────────────────────────
const SectionBar = ({ label, score, color, summary, questionCount, animate }) => (
    <div style={{ marginBottom: '1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#e2e8f0' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#475569' }}>{questionCount} Q</span>
                <span style={{ fontWeight: 700, color, fontSize: '0.9rem', minWidth: '38px', textAlign: 'right' }}>{score}</span>
            </div>
        </div>
        <div style={{ height: '5px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
                height: '100%', borderRadius: '99px', backgroundColor: color,
                width: animate ? `${score}%` : '0%',
                transition: 'width 1.3s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: `0 0 6px ${color}55`,
            }} />
        </div>
        {summary && (
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.5 }}>{summary}</p>
        )}
    </div>
);

// ─── Skill level badge ───────────────────────────────────────────────────────
const SkillBadge = ({ skill, level, note }) => {
    const c = SKILL_LEVEL_COLORS[level] || '#64748b';
    return (
        <div style={{
            padding: '0.55rem 0.85rem', borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.87rem', color: '#e2e8f0' }}>{skill}</span>
                <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: '99px',
                    backgroundColor: `${c}20`, color: c, whiteSpace: 'nowrap',
                }}>{level}</span>
            </div>
            {note && <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>{note}</p>}
        </div>
    );
};

// ─── Q&A accordion item ──────────────────────────────────────────────────────
const QAItem = ({ question, answer, feedback, score, section }) => {
    const [open, setOpen] = useState(false);
    const sc   = SECTION_COLORS[section] || '#64748b';
    const col  = Number(score) >= 7 ? '#10b981' : Number(score) >= 5 ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.5rem' }}>
            <button onClick={() => setOpen(o => !o)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.8rem 1rem', background: open ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                border: 'none', cursor: 'pointer', textAlign: 'left', color: 'white', transition: 'background 0.2s',
            }}>
                <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                    backgroundColor: `${sc}20`, color: sc, whiteSpace: 'nowrap', flexShrink: 0,
                }}>{SECTION_LABELS[section] || section}</span>
                <span style={{ flex: 1, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                    {question?.substring(0, 100)}{question?.length > 100 ? '…' : ''}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                    <span style={{
                        fontSize: '0.78rem', fontWeight: 700, color: col,
                        backgroundColor: `${col}15`, padding: '2px 8px', borderRadius: '6px',
                    }}>{score}/10</span>
                    {open ? <ChevronUp size={14} color="#475569" /> : <ChevronDown size={14} color="#475569" />}
                </div>
            </button>
            {open && (
                <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div>
                        <p style={{ margin: '0 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Question</p>
                        <p style={{ margin: 0, fontSize: '0.87rem', color: '#e2e8f0', lineHeight: 1.6 }}>{question}</p>
                    </div>
                    <div>
                        <p style={{ margin: '0 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Answer</p>
                        <p style={{ margin: 0, fontSize: '0.87rem', color: '#94a3b8', lineHeight: 1.6, fontStyle: answer ? 'normal' : 'italic' }}>
                            {answer || '(No answer recorded)'}
                        </p>
                    </div>
                    {feedback && (
                        <div>
                            <p style={{ margin: '0 0 0.3rem', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evaluator Note</p>
                            <p style={{
                                margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6,
                                padding: '0.5rem 0.8rem', borderLeft: `3px solid ${col}`,
                                backgroundColor: `${col}08`, borderRadius: '0 6px 6px 0',
                            }}>{feedback}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Results Component ──────────────────────────────────────────────────
const Results = () => {
    const { id }       = useParams();
    const navigate     = useNavigate();
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [showAll, setShowAll]     = useState(false);
    const [barsAnim, setBarsAnim]   = useState(false);

    // Inject keyframe for the loader spinner
    useEffect(() => {
        const id = 'results-spin-kf';
        if (document.getElementById(id)) return;
        const s = document.createElement('style');
        s.id = id;
        s.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
        document.head.appendChild(s);
    }, []);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res  = await api.get(`/interviews/${id}`);
                const iv   = res.data.data;
                const qs   = (iv.questions || [])
                    .filter(q => q.question_text && q.section !== 'closing')
                    .sort((a, b) => {
                        const ai = SECTION_ORDER.indexOf(a.section);
                        const bi = SECTION_ORDER.indexOf(b.section);
                        if (ai !== bi) return ai - bi;
                        return new Date(a.created_at) - new Date(b.created_at);
                    });

                setData({
                    role:    iv.role,
                    company: iv.company,
                    score:   typeof iv.score === 'number' ? iv.score : 0,
                    date:    new Date(iv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                    report:  iv.evaluation_report || null,
                    questions: qs,
                });
                setTimeout(() => setBarsAnim(true), 500);
            } catch (e) {
                setError(e.response?.data?.message || 'Failed to load interview results.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '1rem', color: '#64748b' }}>
                <Loader size={40} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ margin: 0, fontSize: '1rem' }}>Building your evaluation report…</p>
            </div>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (error || !data) {
        return (
            <div style={{ maxWidth: '580px', margin: '4rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    {error || 'Results not found.'}
                </div>
                <button onClick={() => navigate('/dashboard')} className="btn-primary">Go to Dashboard</button>
            </div>
        );
    }

    const { role, company, score, date, report, questions } = data;

    // Hiring recommendation (use AI's if available, otherwise derive from score)
    const reco      = report?.hiringRecommendation || (score >= 75 ? 'Yes' : score >= 55 ? 'Maybe' : 'No');
    const recoStyle = RECO_STYLES[reco] || RECO_STYLES['Maybe'];
    const answeredQs = questions.filter(q => q.user_answer);
    const displayed  = showAll ? answeredQs : answeredQs.slice(0, 6);

    // Fallback section scores when no AI report is available
    const fallbackSectionScores = (() => {
        const m = {};
        questions.forEach(q => {
            if (!q.section || q.section === 'closing') return;
            if (!m[q.section]) m[q.section] = { scores: [], count: 0 };
            m[q.section].count++;
            if (typeof q.score === 'number') m[q.section].scores.push(q.score);
        });
        return SECTION_ORDER.filter(s => m[s]).map(s => ({
            section: SECTION_LABELS[s], score: m[s].scores.length
                ? Math.round((m[s].scores.reduce((a, b) => a + b, 0) / m[s].scores.length) * 10) : 0,
            questionCount: m[s].count, summary: '',
        }));
    })();

    const sectionScores = report?.sectionScores?.length > 0 ? report.sectionScores : fallbackSectionScores;
    const strengths     = report?.strengths?.length > 0 ? report.strengths : ['Completed the interview session.'];
    const improvements  = report?.improvements?.length > 0 ? report.improvements : ['Continue practicing to improve your scores.'];

    return (
        <div style={{ maxWidth: '980px', margin: '0 auto', padding: '0 1.5rem 4rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Back ─────────────────────────────────────────────────── */}
            <button onClick={() => navigate('/dashboard')} style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                color: '#64748b', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.88rem', alignSelf: 'flex-start', padding: '0.5rem 0',
            }}>
                <ChevronLeft size={18} /> Back to Dashboard
            </button>

            {/* ── Title ────────────────────────────────────────────────── */}
            <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.35rem' }}>Evaluation Report</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
                    {role}{company ? ` @ ${company}` : ''} &nbsp;·&nbsp; {date} &nbsp;·&nbsp; {answeredQs.length} questions answered
                </p>
            </div>

            {/* ── Hero: Score + Recommendation + Summary ───────────────── */}
            <div className="glass-card" style={{
                padding: '2.5rem', borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))',
                display: 'flex', gap: '2.5rem', alignItems: 'center', flexWrap: 'wrap',
            }}>
                <CircularScore score={score} size={190} />
                <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Overall Score</h2>
                        {/* Hiring recommendation badge */}
                        <span style={{
                            fontSize: '0.78rem', fontWeight: 700, padding: '4px 13px', borderRadius: '99px',
                            backgroundColor: recoStyle.bg, border: `1px solid ${recoStyle.border}`, color: recoStyle.text,
                            display: 'flex', alignItems: 'center', gap: '5px',
                        }}>
                            <Award size={12} /> {reco}
                        </span>
                    </div>

                    {/* Overall summary (AI or fallback) */}
                    <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.75, fontSize: '0.95rem' }}>
                        {report?.overallSummary ||
                            (score >= 75
                                ? 'Strong performance across most areas. You are well-prepared for this role.'
                                : score >= 55
                                    ? 'Solid foundation with clear areas to develop before the actual interview.'
                                    : 'More preparation is needed. Focus on the improvement areas below and practice regularly.')}
                    </p>

                    {/* Interviewer private note */}
                    {report?.interviewerNote && (
                        <p style={{ margin: '0.85rem 0 0', fontSize: '0.82rem', color: '#475569', fontStyle: 'italic' }}>
                            "{report.interviewerNote}"
                        </p>
                    )}
                </div>
            </div>

            {/* ── Section Breakdown + Skills (2 columns) ───────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                {/* Section scores */}
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                    <h3 style={{ margin: '0 0 1.5rem', fontSize: '0.97rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={17} color="#3b82f6" /> Section Breakdown
                    </h3>
                    {sectionScores.length > 0 ? sectionScores.map((s, i) => {
                        const key   = Object.entries(SECTION_LABELS).find(([, v]) => v === s.section)?.[0];
                        const color = SECTION_COLORS[key] || '#3b82f6';
                        return (
                            <SectionBar key={i} label={s.section} score={s.score}
                                color={color} summary={s.summary}
                                questionCount={s.questionCount || '?'} animate={barsAnim} />
                        );
                    }) : (
                        <p style={{ color: '#64748b', fontSize: '0.86rem' }}>No section data available.</p>
                    )}
                </div>

                {/* Right column: Skills + Strengths + Improvements */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Skills identified */}
                    {report?.skillAssessment?.length > 0 && (
                        <div className="glass-card" style={{ padding: '1.75rem' }}>
                            <h3 style={{ margin: '0 0 1.1rem', fontSize: '0.97rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Brain size={17} color="#8b5cf6" /> Skills Identified
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                {report.skillAssessment.map((s, i) => <SkillBadge key={i} {...s} />)}
                            </div>
                        </div>
                    )}

                    {/* Strengths */}
                    <div className="glass-card" style={{ padding: '1.75rem' }}>
                        <h3 style={{ margin: '0 0 1.1rem', fontSize: '0.97rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                            <CheckCircle size={17} /> Key Strengths
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {strengths.map((item, i) => (
                                <li key={i} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start' }}>
                                    <span style={{ color: '#10b981', marginTop: '3px', flexShrink: 0, fontSize: '0.85rem' }}>✓</span>
                                    <span style={{ color: '#cbd5e1', fontSize: '0.87rem', lineHeight: 1.6 }}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Improvements */}
                    <div className="glass-card" style={{ padding: '1.75rem' }}>
                        <h3 style={{ margin: '0 0 1.1rem', fontSize: '0.97rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b' }}>
                            <Target size={17} /> Areas to Improve
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {improvements.map((item, i) => (
                                <li key={i} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start' }}>
                                    <span style={{ color: '#f59e0b', marginTop: '3px', flexShrink: 0, fontSize: '0.85rem' }}>→</span>
                                    <span style={{ color: '#cbd5e1', fontSize: '0.87rem', lineHeight: 1.6 }}>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                </div>
            </div>

            {/* ── Q&A Review ───────────────────────────────────────────── */}
            {answeredQs.length > 0 && (
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                    <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.97rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={17} color="#3b82f6" /> Q&A Review
                        <span style={{ fontSize: '0.73rem', color: '#475569', fontWeight: 400, marginLeft: '0.4rem' }}>
                            ({answeredQs.length} question{answeredQs.length !== 1 ? 's' : ''})
                        </span>
                    </h3>

                    {displayed.map((q, i) => (
                        <QAItem key={q.id || i}
                            question={q.question_text} answer={q.user_answer}
                            feedback={q.ai_feedback} score={q.score} section={q.section} />
                    ))}

                    {answeredQs.length > 6 && (
                        <button onClick={() => setShowAll(v => !v)} style={{
                            width: '100%', padding: '0.65rem', marginTop: '0.5rem', borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.09)', backgroundColor: 'rgba(255,255,255,0.025)',
                            color: '#94a3b8', cursor: 'pointer', fontSize: '0.84rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                        }}>
                            {showAll
                                ? <><ChevronUp size={14} /> Show Less</>
                                : <><ChevronDown size={14} /> Show All {answeredQs.length} Questions</>}
                        </button>
                    )}
                </div>
            )}

            {/* ── CTA ──────────────────────────────────────────────────── */}
            <div className="glass-card" style={{
                padding: '1.75rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '1rem',
            }}>
                <div>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.97rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={17} color="#3b82f6" /> Ready to improve?
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
                        Practice the areas highlighted above to boost your score.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={() => navigate('/setup')} className="btn-primary" style={{ padding: '0.68rem 1.5rem' }}>
                        Practice Again
                    </button>
                    <button onClick={() => navigate('/dashboard')} style={{
                        padding: '0.68rem 1.5rem', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'transparent',
                        color: '#94a3b8', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500,
                    }}>
                        Dashboard
                    </button>
                </div>
            </div>

        </div>
    );
};

export default Results;
