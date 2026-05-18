import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MonitorPlay, Users, Headphones, CheckCircle, ChevronDown, PlayCircle, Star, Briefcase } from 'lucide-react';
import api from '../services/api';
import { auth } from '../services/firebase';
import Navbar from '../components/Navbar';

// Reuse pricing card, customized for TechVedhu look
const PricingCard = ({ title, price, features, recommended = false, buttonText, onUpgrade }) => {
    const isFree = price === "0" || price === 0;
    return (
        <div className="tv-card" style={{
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'relative',
            border: recommended ? '2px solid var(--tv-primary)' : '1px solid var(--color-border)',
            transform: recommended ? 'scale(1.03)' : 'none',
            zIndex: recommended ? 10 : 1
        }}>
            {recommended && (
                <div style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--tv-primary)',
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(26,58,143,0.2)'
                }}>RECOMMENDED</div>
            )}
            <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--tv-primary)' }}>{title}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-text-main)', fontFamily: 'var(--font-heading)' }}>{isFree ? '₹0' : `₹${price}`}</span>
                </div>
                {!isFree && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>One-time payment</p>}
            </div>

            <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 0' }}></div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                {features.map((feature, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <CheckCircle size={20} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ color: 'var(--color-text-dark)', fontSize: '0.95rem' }}>{feature}</span>
                    </li>
                ))}
            </ul>

            <button
                className={recommended ? "btn-primary" : "btn-outline"}
                onClick={onUpgrade}
                style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem' }}>
                {buttonText}
            </button>
        </div>
    );
};

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div style={{ borderBottom: '1px solid var(--color-border)', padding: '1.25rem 0' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', color: 'var(--color-text-dark)', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}
            >
                {question}
                <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease', color: 'var(--tv-primary)' }} />
            </button>
            {isOpen && <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem', lineHeight: 1.6, fontSize: '0.95rem' }}>{answer}</p>}
        </div>
    );
};

const LandingPage = () => {
    const navigate = useNavigate();

    const handleUpgrade = async (planId) => {
        const user = auth.currentUser;
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            const { data: orderRes } = await api.post('/payments/create-order', { planId });
            if (orderRes.status !== 'success') throw new Error(orderRes.message || 'Failed to create order.');
            
            const { orderId, amount, currency } = orderRes.data;
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: amount,
                currency: currency,
                name: 'Tech Vedhu',
                description: `Skill Tester - ${planId} plan`,
                order_id: orderId,
                handler: async (response) => {
                    try {
                        const { data: verifyRes } = await api.post('/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            planId: planId
                        });
                        if (verifyRes.status === 'success') {
                            alert(`Success! Upgraded to ${planId}.`);
                            navigate('/dashboard');
                            window.location.reload();
                        } else alert('Payment verification failed.');
                    } catch (err) { alert('Error: ' + (err.response?.data?.message || err.message)); }
                },
                prefill: { name: user.displayName || '', email: user.email || '' },
                theme: { color: '#1a3a8f' },
            };
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) { alert('Payment failed: ' + response.error.description); });
            rzp.open();
        } catch (err) { alert('Could not initiate upgrade: ' + (err.response?.data?.message || err.message)); }
    };

    return (
        <>
            <Helmet>
                <title>Skill Tester by Tech Vedhu | Master Your Next Tech Interview</title>
                <meta name="description" content="SkillTester by Tech Vedhu is an AI-powered mock interview platform. Practice technical and behavioral questions, and get instant feedback." />
            </Helmet>

            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
                <Navbar />

                {/* ─── Hero Section ─── */}
                <section style={{ backgroundColor: 'var(--color-bg)', paddingTop: '4rem', paddingBottom: '3rem' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
                        
                        <div style={{ flex: '1 1 500px' }} className="animate-fade-in-up">
                            <h1 style={{ fontSize: '3.5rem', lineHeight: 1.15, color: 'var(--color-text-main)', marginBottom: '1.5rem' }}>
                                Learn Just Like You Would be in the <span style={{ color: 'var(--tv-primary)' }}>Best Tech Companies in India</span>
                            </h1>
                            <p style={{ fontSize: '1.1rem', color: 'var(--color-text-dark)', marginBottom: '2rem', maxWidth: '550px' }}>
                                Work-experience-based learning personalized way programs to Supercharge your career and land your dream tech job
                            </p>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <li style={{ fontSize: '1.05rem', color: 'var(--color-text-dark)' }}>
                                    <strong style={{ color: 'var(--tv-primary)' }}>Build</strong> professional projects with professionals.
                                </li>
                                <li style={{ fontSize: '1.05rem', color: 'var(--color-text-dark)' }}>
                                    <strong style={{ color: 'var(--tv-primary)' }}>Master</strong> the current cutting-edge technologies
                                </li>
                                <li style={{ fontSize: '1.05rem', color: 'var(--color-text-dark)' }}>
                                    <strong style={{ color: 'var(--tv-primary)' }}>Crack</strong> your dream role at the best tech companies
                                </li>
                            </ul>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                <PlayCircle size={32} color="var(--tv-primary)" />
                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--tv-primary)', fontFamily: 'var(--font-heading)' }}>
                                    Upskill with Tech Vedhu
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <Link to="/login" className="btn-outline" style={{ minWidth: '200px' }}>Explore Programs</Link>
                                <Link to="/login" className="btn-primary" style={{ minWidth: '200px' }}>Book Your Free Trial, Now</Link>
                            </div>
                        </div>

                        {/* Hero Image placeholder (since we don't have the exact image) */}
                        <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                             <div style={{
                                 width: '100%', maxWidth: '500px', aspectRatio: '1/1',
                                 background: 'linear-gradient(135deg, #e8edf8, #f4f6fb)',
                                 borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                 position: 'relative'
                             }}>
                                 {/* Decorative elements to mimic the screenshot */}
                                 <div style={{ position: 'absolute', top: '10%', right: '10%', background: 'var(--tv-primary)', color: 'white', padding: '8px', borderRadius: '50%' }}><MonitorPlay size={20} /></div>
                                 <div style={{ position: 'absolute', bottom: '20%', left: '5%', background: 'white', padding: '12px 20px', borderRadius: '12px', boxShadow: 'var(--card-shadow)', display: 'flex', gap: '1rem' }}>
                                     <div>
                                         <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Registered</div>
                                         <div style={{ color: 'var(--tv-primary)', fontWeight: 800, fontSize: '1.1rem' }}>10.7k</div>
                                     </div>
                                     <div style={{ width: '1px', background: 'var(--color-border)' }}></div>
                                     <div>
                                         <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Languages</div>
                                         <div style={{ color: '#f97316', fontWeight: 800, fontSize: '1.1rem' }}>10+</div>
                                     </div>
                                 </div>
                                 <Briefcase size={120} color="var(--tv-primary)" style={{ opacity: 0.1 }} />
                             </div>
                        </div>

                    </div>
                </section>

                {/* ─── Stats Bar ─── */}
                <section className="tv-stats-bar">
                    <div className="tv-stats-inner">
                        <div className="tv-stat-item">
                            <span className="tv-stat-number">1000+</span>
                            <span className="tv-stat-label">Learning hours</span>
                        </div>
                        <div className="tv-stat-item">
                            <span className="tv-stat-number">92%</span>
                            <span className="tv-stat-label">Of learners noted a positive<br/>impact on productivity</span>
                        </div>
                        <div className="tv-stat-item">
                            <span className="tv-stat-number">50%</span>
                            <span className="tv-stat-label">Average salary hike</span>
                        </div>
                        <div className="tv-stat-item">
                            <span className="tv-stat-number">100+</span>
                            <span className="tv-stat-label">Hiring partners</span>
                        </div>
                    </div>
                </section>

                {/* ─── Why Choose Us (Features) ─── */}
                <section id="features" className="tv-section" style={{ backgroundColor: 'var(--color-bg)' }}>
                    <h2 className="tv-section-title" style={{ marginBottom: '3rem' }}>Why Choose Us</h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                        {[
                            { icon: <MonitorPlay size={32} color="var(--tv-primary)" />, title: "Live interactive class", desc: "Engage directly with AI-driven interactive coding sessions that simulate real interviews." },
                            { icon: <Briefcase size={32} color="var(--tv-primary)" />, title: "Gain working experience", desc: "Solve real-world company problems sourced directly from active hiring pipelines." },
                            { icon: <Headphones size={32} color="var(--tv-primary)" />, title: "1-1 assistance", desc: "Get detailed voice feedback and code reviews just like a real engineering manager." },
                            { icon: <Users size={32} color="var(--tv-primary)" />, title: "Expert advice", desc: "Actionable steps to improve your space/time complexity and communication." },
                            { icon: <CheckCircle size={32} color="var(--tv-primary)" />, title: "Mock assessment", desc: "Timed coding challenges integrated with a complete execution environment." },
                            { icon: <Star size={32} color="var(--tv-primary)" />, title: "Placement guaranteed", desc: "Build the confidence you need to crack your dream role at top tech companies." }
                        ].map((feat, i) => (
                            <div key={i} className="tv-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    {feat.icon}
                                </div>
                                <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--color-text-dark)' }}>{feat.title}</h3>
                                <p style={{ margin: 0, fontSize: '0.95rem' }}>{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ─── Companies Marquee ─── */}
                <section style={{ backgroundColor: 'var(--color-bg-section)', padding: '4rem 0', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2rem', color: 'var(--tv-primary)', fontFamily: 'var(--font-heading)', marginBottom: '3rem' }}>Our Learners Work at</h2>
                    
                    <div className="tv-marquee-wrapper">
                        <div className="tv-marquee-track">
                            {/* Duplicated for smooth infinite scroll */}
                            {["Microsoft", "Amazon", "Walmart", "Cognizant", "Accenture", "Zoho"].map((company, i) => (
                                <div key={i} className="tv-marquee-logo">
                                    <span style={{ color: company === "Amazon" ? "#ff9900" : company === "Zoho" ? "#eab308" : "var(--tv-primary)" }}>✦</span> 
                                    {company}
                                </div>
                            ))}
                            {["Microsoft", "Amazon", "Walmart", "Cognizant", "Accenture", "Zoho"].map((company, i) => (
                                <div key={i+10} className="tv-marquee-logo">
                                    <span style={{ color: company === "Amazon" ? "#ff9900" : company === "Zoho" ? "#eab308" : "var(--tv-primary)" }}>✦</span> 
                                    {company}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Pricing Section ─── */}
                <section id="pricing" className="tv-section">
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 className="tv-section-title" style={{ fontSize: '2.25rem', color: 'var(--tv-primary)' }}>Internship Based / Certificate Program</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'center', maxWidth: '1000px', margin: '0 auto' }}>
                        <PricingCard
                            title="Free Access"
                            price="0"
                            features={["1 AI mock interview", "Basic text feedback", "Adaptive questions"]}
                            buttonText="Start Free Trial"
                            onUpgrade={() => navigate('/login')}
                        />
                        <PricingCard
                            title="Pro Program"
                            price="250"
                            features={["10 AI mock interviews", "Advanced technical questions", "Code editor integration", "Analytics dashboard"]}
                            recommended={true}
                            buttonText="Enroll Now"
                            onUpgrade={() => handleUpgrade('intermediate')}
                        />
                    </div>
                </section>

                {/* ─── FAQ Section ─── */}
                <section id="faq" className="tv-section" style={{ maxWidth: '800px', paddingTop: '2rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 className="tv-section-title" style={{ color: 'var(--color-text-dark)' }}>Frequently Asked Questions</h2>
                    </div>
                    <div className="tv-card" style={{ padding: '0 2rem' }}>
                        <FAQItem question="How does the AI mock interview work?" answer="Our AI analyzes the job description and your resume to generate questions an actual hiring manager would ask. During the interview, it listens to your voice, processes your code, and dynamically asks follow-up questions." />
                        <FAQItem question="Can I practice data structures and algorithms?" answer="Yes! Our integrated code editor supports multiple languages. The AI will give you an algorithmic challenge and watch as you code, offering hints if you get stuck." />
                        <FAQItem question="Is the code editor suitable for live coding interviews?" answer="Absolutely. We use a real execution engine that compiles and runs your code. It's the same environment you'll face in a real technical screen." />
                    </div>
                </section>

                {/* ─── Footer ─── */}
                <footer style={{ backgroundColor: 'var(--tv-primary-dark)', padding: '3rem 0 2rem 0', marginTop: 'auto' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                            <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>Home</Link>
                            <Link to="/terms" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>Terms of Service</Link>
                            <Link to="/privacy" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>Privacy Policy</Link>
                            <a href="#features" style={{ color: 'white', textDecoration: 'none', fontSize: '0.95rem' }}>Features</a>
                        </div>
                        <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textAlign: 'center' }}>
                            © {new Date().getFullYear()} Tech Vedhu SkillTester. All rights reserved. <br/>
                            <span style={{ opacity: 0.7, marginTop: '8px', display: 'block' }}>Billing Label: TN SOFTWARE SYSTEMS</span>
                        </div>
                    </div>
                </footer>

            </div>
        </>
    );
};

export default LandingPage;
