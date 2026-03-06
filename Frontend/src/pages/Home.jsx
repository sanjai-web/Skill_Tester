import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bot, Code, Zap, FileText, CheckCircle, ChevronDown, Play, MessageSquare, Target, Menu, X } from 'lucide-react';

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

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div style={{ borderBottom: '1px solid var(--glass-border)', padding: '1.5rem 0' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', color: 'var(--color-text-main)', fontSize: '1.2rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
                {question}
                <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }} />
            </button>
            {isOpen && <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem', lineHeight: 1.6 }}>{answer}</p>}
        </div>
    );
};

const Navbar = () => {
    return (
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', borderBottom: '1px solid var(--glass-border)', backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={24} color="var(--color-primary)" />
                <span style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(to right, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', color: 'transparent' }}>SkillTester</span>
            </div>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }} className="desktop-menu">
                <a href="#features" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>Features</a>
                <a href="#how-it-works" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>How it Works</a>
                <a href="#pricing" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>Pricing</a>
                <a href="#faq" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>FAQ</a>
                <Link to="/login" className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', textDecoration: 'none' }}>Log In</Link>
            </div>
        </nav>
    );
};

const LandingPage = () => {
    return (
        <>
            <Helmet>
                <title>Skill Tester | AI Mock Interviews for Software Engineers</title>
                <meta name="description" content="SkillTester is an AI-powered mock interview platform for developers. Practice technical and behavioral questions, write live code, and get instant feedback." />
                <link rel="canonical" href="https://skilltester.app/" />
                <meta name="robots" content="index, follow" />
                <script type="application/ld+json">{`
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "How does the AI mock interview work?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Our AI analyzes the job description and your resume to generate questions an actual hiring manager would ask. During the interview, it listens to your voice, processes your code, and dynamically asks follow-up questions." }
                },
                {
                  "@type": "Question",
                  "name": "Can I practice data structures and algorithms?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Yes! Our integrated code editor supports multiple languages. The AI will give you an algorithmic challenge and watch as you code, offering hints if you get stuck." }
                },
                {
                  "@type": "Question",
                  "name": "Is the code editor suitable for live coding interviews?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. We use a real execution engine that compiles and runs your code. It's the same environment you'll face in a real technical screen." }
                },
                {
                  "@type": "Question",
                  "name": "How accurate is the feedback?",
                  "acceptedAnswer": { "@type": "Answer", "text": "The AI provides highly granular feedback. It evaluates code space/time complexity, catches bugs, and even assesses your communication clarity on behavioral questions." }
                }
              ]
            }
            `}</script>
            </Helmet>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6rem', paddingBottom: '4rem' }}>
                <Navbar />

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

                {/* How it Works Section */}
                <section id="how-it-works" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '0 1rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2.5rem' }}>How it works</h2>
                        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>Three simple steps to interview mastery.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {[
                            { icon: <Target size={32} color="var(--color-primary)" />, step: "1", title: "Target Your Goal", desc: "Upload your resume and paste a job description. We tailor the interview specifically to your exact needs." },
                            { icon: <Play size={32} color="var(--color-accent)" />, step: "2", title: "Start the Interview", desc: "Join an interactive session with our AI avatar. Answer behavioral and technical coding questions in real-time." },
                            { icon: <MessageSquare size={32} color="var(--color-secondary)" />, step: "3", title: "Get Instant Feedback", desc: "Receive highly detailed feedback on your communication, code optimality, and areas for improvement." }
                        ].map((feat, i) => (
                            <div key={i} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: 'white', zIndex: 10 }}>{feat.step}</div>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {feat.icon}
                                </div>
                                <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{feat.title}</h3>
                                <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>{feat.desc}</p>
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

                {/* FAQ Section */}
                <section id="faq" style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '0 1rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2.5rem' }}>Frequently Asked Questions</h2>
                        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>Everything you need to know about SkillTester.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <FAQItem question="How does the AI mock interview work?" answer="Our AI analyzes the job description and your resume to generate questions an actual hiring manager would ask. During the interview, it listens to your voice, processes your code, and dynamically asks follow-up questions." />
                        <FAQItem question="Can I practice data structures and algorithms?" answer="Yes! Our integrated code editor supports multiple languages. The AI will give you an algorithmic challenge and watch as you code, offering hints if you get stuck." />
                        <FAQItem question="Is the code editor suitable for live coding interviews?" answer="Absolutely. We use a real execution engine that compiles and runs your code. It's the same environment you'll face in a real technical screen." />
                        <FAQItem question="How accurate is the feedback?" answer="The AI provides highly granular feedback. It evaluates code space/time complexity, catches bugs, and even assesses your communication clarity on behavioral questions." />
                    </div>
                </section>

                {/* Footer with SEO Links */}
                <footer style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem', marginTop: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>© 2026 SkillTester.app</span>
                        <Link to="/terms" style={{ color: 'var(--color-text-main)', textDecoration: 'none' }}>Terms of Service</Link>
                        <Link to="/privacy" style={{ color: 'var(--color-text-main)', textDecoration: 'none' }}>Privacy Policy</Link>
                        <Link to="/seo-tutorial" style={{ color: 'var(--color-text-main)', textDecoration: 'none' }}>SEO Tutorial</Link>
                        <a href="#features" style={{ color: 'var(--color-text-main)', textDecoration: 'none' }}>Features</a>
                        <a href="#how-it-works" style={{ color: 'var(--color-text-main)', textDecoration: 'none' }}>How it Works</a>
                    </p>
                </footer>
            </div>
        </>
    );
};

export default LandingPage;
