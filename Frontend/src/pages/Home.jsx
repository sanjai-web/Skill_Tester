import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Code, Zap, FileText, CheckCircle } from 'lucide-react';

const PricingCard = ({ title, price, features, recommended = false, buttonText }) => (
    <div className={`glass-card ${recommended ? 'recommended-tier' : ''}`} style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        position: 'relative',
        border: recommended ? '2px solid var(--color-primary)' : 'var(--glass-border)',
        transform: recommended ? 'scale(1.05)' : 'none',
        zIndex: recommended ? 10 : 1
    }}>
        {recommended && (
            <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 'bold'
            }}>RECOMMENDED</div>
        )}
        <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{title}</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '3rem', fontWeight: 800 }}>${price}</span>
                {price !== '0' && <span style={{ color: 'var(--color-text-muted)' }}>/ one-time</span>}
            </div>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {features.map((feature, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle size={18} color="var(--color-success)" />
                    <span style={{ color: 'var(--color-text-muted)' }}>{feature}</span>
                </li>
            ))}
        </ul>

        <button className="btn-primary" style={{ width: '100%', marginTop: 'auto', backgroundColor: recommended ? 'var(--color-primary)' : 'transparent', border: '1px solid var(--color-primary)', color: recommended ? 'white' : 'var(--color-primary)' }}>
            {buttonText}
        </button>
    </div>
);

const LandingPage = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem', paddingBottom: '4rem' }}>

            {/* Hero Section */}
            <section style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                paddingTop: '4rem',
                maxWidth: '800px',
                margin: '0 auto',
                gap: '1.5rem'
            }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 16px',
                    borderRadius: '30px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: 'var(--color-primary)',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    marginBottom: '1rem'
                }}>
                    <Zap size={16} /> Welcome to the future of interviewing
                </div>

                <h1 style={{ fontSize: '4rem', lineHeight: 1.1, backgroundImage: 'linear-gradient(to right, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                    Master Your Next Tech Interview with AI
                </h1>

                <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', maxWidth: '600px' }}>
                    Practice technical and behavioral questions tailored to your resume and exact job description. Get real-time feedback, code pair with an AI, and land your dream job faster.
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <Link to="/login" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem', textDecoration: 'none' }}>Get Started for Free</Link>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2.5rem' }}>Why choose our AI platform?</h2>
                    <p style={{ fontSize: '1.1rem' }}>Comprehensive tools to help you prepare effectively.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {[
                        { icon: <FileText size={32} color="var(--color-primary)" />, title: "Resume & Job Targeted", desc: "Upload your PDF resume and target job description. The AI generates specific, relevant questions just like a real engineering manager." },
                        { icon: <Code size={32} color="var(--color-accent)" />, title: "Integrated Code Editor", desc: "Solve algorithmic and system design problems in a built-in code editor while communicating with your AI interviewer." },
                        { icon: <Bot size={32} color="var(--color-secondary)" />, title: "Adaptive Voice AI", desc: "Speak directly to the AI. It extracts meaning, asks natural follow-up questions, and dynamically adapts the interview flow." }
                    ].map((feat, i) => (
                        <div key={i} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '12px',
                                backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {feat.icon}
                            </div>
                            <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{feat.title}</h3>
                            <p style={{ margin: 0 }}>{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                    <h2 style={{ fontSize: '2.5rem' }}>Simple, transparent pricing</h2>
                    <p style={{ fontSize: '1.1rem' }}>Start for free, upgrade when you need more practice.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', alignItems: 'center' }}>
                    <PricingCard
                        title="Free Tier"
                        price="0"
                        features={["1 AI mock interview", "Basic text feedback", "Adaptive questions"]}
                        buttonText="Start Free"
                    />
                    <PricingCard
                        title="Basic"
                        price="1"
                        features={["3 AI mock interviews", "Detailed performance report", "Timer & voice mode enabled"]}
                        buttonText="Buy Basic"
                    />
                    <PricingCard
                        title="Intermediate"
                        price="3"
                        features={["10 AI mock interviews", "Advanced technical questions", "Code editor integration", "Analytics dashboard"]}
                        recommended={true}
                        buttonText="Get Recommended"
                    />
                    <PricingCard
                        title="Pro"
                        price="5"
                        features={["23 AI mock interviews", "Priority AI generation", "Unlimited resume updates", "Priority email support"]}
                        buttonText="Get Pro"
                    />
                </div>
            </section>

            {/* Footer with SEO Links */}
            <footer style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem', marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center' }}>
                    <span>© 2026 SkillTester.app</span>
                    <a href="/terms" style={{ color: 'var(--color-text-main)', textDecoration: 'none' }}>Terms of Service</a>
                    <a href="/seo-tutorial" style={{ color: 'var(--color-text-main)', textDecoration: 'none' }}>SEO Tutorial</a>
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
