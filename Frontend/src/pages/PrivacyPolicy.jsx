import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Shield } from 'lucide-react';

const PrivacyPolicy = () => {
    return (
        <>
            <Helmet>
                <title>Privacy Policy | Skill Tester – AI Mock Interview Platform</title>
                <meta name="description" content="Read the Skill Tester Privacy Policy. Learn how we collect, use, and protect your personal data when you use our AI-powered mock interview platform." />
                <link rel="canonical" href="https://skilltester.app/privacy" />
                <meta property="og:title" content="Privacy Policy | Skill Tester" />
                <meta property="og:description" content="Learn how Skill Tester collects, uses, and protects your personal information." />
                <meta property="og:url" content="https://skilltester.app/privacy" />
                <meta name="robots" content="index, follow" />
            </Helmet>

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem 4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Shield size={32} color="var(--color-primary)" />
                    <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Privacy Policy</h1>
                </div>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    <strong>Last updated:</strong> March 6, 2026
                </p>

                <section>
                    <h2>1. Introduction</h2>
                    <p>
                        Welcome to <strong>Skill Tester</strong> ("we", "us", or "our"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI‑powered mock interview platform at <a href="https://skilltester.app" style={{ color: 'var(--color-primary)' }}>skilltester.app</a>.
                    </p>
                </section>

                <section>
                    <h2>2. Information We Collect</h2>
                    <p>We collect the following categories of information:</p>
                    <ul style={{ color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li><strong>Account Information:</strong> Name, email address, and password when you register.</li>
                        <li><strong>Authentication Data:</strong> OAuth tokens if you sign in via Google.</li>
                        <li><strong>Interview Data:</strong> Resume content, job descriptions, your recorded answers, and AI-generated feedback.</li>
                        <li><strong>Usage Data:</strong> Pages visited, features used, and browser/device information via Google Analytics.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. How We Use Your Information</h2>
                    <p>We use the collected information to:</p>
                    <ul style={{ color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li>Provide, operate, and maintain the Skill Tester platform.</li>
                        <li>Generate personalized AI interview questions based on your resume and job description.</li>
                        <li>Deliver AI-generated performance feedback and analytics.</li>
                        <li>Improve our services through aggregated, anonymized usage analysis.</li>
                        <li>Send transactional emails (e.g., email confirmation, password reset).</li>
                    </ul>
                </section>

                <section>
                    <h2>4. Data Sharing & Disclosure</h2>
                    <p>
                        We do <strong>not</strong> sell your personal data. We may share data with trusted third-party service providers including:
                    </p>
                    <ul style={{ color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li><strong>Firebase / Google:</strong> Authentication and database services.</li>
                        <li><strong>Google Analytics:</strong> Anonymized usage tracking.</li>
                        <li><strong>AI API Providers:</strong> For generating interview questions and feedback (data submitted is used only for your session).</li>
                    </ul>
                </section>

                <section>
                    <h2>5. Data Retention</h2>
                    <p>
                        We retain your account data for as long as your account is active. Interview session data is retained for up to 12 months to allow you to review your history. You may request deletion of your account and associated data at any time by contacting us.
                    </p>
                </section>

                <section>
                    <h2>6. Security</h2>
                    <p>
                        We implement industry-standard security measures including HTTPS encryption, Firebase security rules, and access controls to protect your data. However, no method of transmission over the Internet is 100% secure.
                    </p>
                </section>

                <section>
                    <h2>7. Your Rights</h2>
                    <p>Depending on your jurisdiction, you may have the right to:</p>
                    <ul style={{ color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.5rem' }}>
                        <li>Access the personal data we hold about you.</li>
                        <li>Request correction of inaccurate data.</li>
                        <li>Request deletion of your data (right to be forgotten).</li>
                        <li>Object to or restrict certain processing of your data.</li>
                    </ul>
                    <p>To exercise these rights, please contact us at <a href="mailto:privacy@skilltester.app" style={{ color: 'var(--color-primary)' }}>privacy@skilltester.app</a>.</p>
                </section>

                <section>
                    <h2>8. Cookies</h2>
                    <p>
                        We use session cookies for authentication and Google Analytics cookies for usage tracking. You may disable cookies in your browser settings, though this may affect some functionality of the platform.
                    </p>
                </section>

                <section>
                    <h2>9. Children's Privacy</h2>
                    <p>
                        Skill Tester is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
                    </p>
                </section>

                <section>
                    <h2>10. Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. Continued use of the platform after changes constitutes acceptance of the revised policy.
                    </p>
                </section>

                <section>
                    <h2>11. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at:<br />
                        <a href="mailto:privacy@skilltester.app" style={{ color: 'var(--color-primary)' }}>privacy@skilltester.app</a>
                    </p>
                </section>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <Link to="/" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>← Back to Home</Link>
                        <Link to="/terms" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Terms of Service</Link>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        © 2026 SkillTester.app | Billing Label: <strong>TN SOFTWARE SYSTEMS</strong>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PrivacyPolicy;
