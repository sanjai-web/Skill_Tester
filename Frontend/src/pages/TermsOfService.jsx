import React from 'react';

const TermsOfService = () => {
    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.5rem', color: 'var(--color-text)', lineHeight: 1.8 }}>
            <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Terms of Service</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Last updated: March 06, 2026</p>

            <p>These Terms of Service ("Terms") govern your use of our website located at <strong>https://www.skilltester.app</strong> (the "Service") operated by SkillTester ("we", "us", "our", "Company").</p>
            <p>By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.</p>

            <Section title="1. Accounts">
                <p>When you create an account with us, you must provide accurate, complete, and current information at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.</p>
                <p>You are responsible for safeguarding your password and for any activities or actions under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use.</p>
            </Section>

            <Section title="2. User Content">
                <p>Our Service allows you to upload, link to, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.</p>
                <p>By posting Content on the Service, you grant us the right and license to use, modify, publicly perform, publicly display, reproduce, and distribute such Content on and through the Service. You retain all rights to your own Content.</p>
            </Section>

            <Section title="3. Intellectual Property">
                <p>The Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of SkillTester and its licensors. The Service is protected by copyright, trademark, and other laws of both India and foreign countries.</p>
            </Section>

            <Section title="4. Links To Other Web Sites">
                <p>Our Service may contain links to third-party web sites or services that are not owned or controlled by SkillTester. SkillTester has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services.</p>
            </Section>

            <Section title="5. Termination">
                <p>We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. All provisions of the Terms which by their nature should survive termination shall survive termination.</p>
            </Section>

            <Section title="6. Disclaimer">
                <p>Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
            </Section>

            <Section title="7. Governing Law">
                <p>These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.</p>
            </Section>

            <Section title="8. Changes">
                <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect.</p>
            </Section>

            <Section title="9. Refund Policy and Plan Details">
                <p>All payments made to SkillTester are final. <strong>No refund for the money will be provided under any circumstances once the transaction is completed.</strong> This includes but is not limited to change of mind, dissatisfaction with the service, technical issues, or any other reason.</p>
                <p>The plan details displayed on the website including feature descriptions such as "Detailed performance report", "Voice mode", "Advanced technical questions", "Code editor", "Analytics", "Priority AI", "Unlimited resume uploads", "Priority email support" and similar listed benefits are provided only for illustrative and marketing purposes. <strong>The plan details shown are provided for illustration purposes; purchasing any paid plan entitles you solely to a specific number of additional interview credits according to the purchased bundle.</strong></p>
            </Section>

            <Section title="10. Limitation of Liability">
                <p>In no event shall SkillTester, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
            </Section>

            <Section title="11. Contact Us">
                <p>If you have any questions about these Terms, please contact us at <strong>support@skilltester.app</strong>.</p>
            </Section>

            <Section title="12. Additional Provisions">
                <p><strong>12.1 Force Majeure.</strong> We shall not be liable for any failure or delay in performance due to circumstances beyond our reasonable control.</p>
                <p><strong>12.2 Assignment.</strong> We may assign these Terms without your consent.</p>
                <p><strong>12.3 Severability.</strong> If any provision is held invalid, the remainder shall continue in full force.</p>
                <p><strong>12.4 Entire Agreement.</strong> These Terms constitute the entire agreement between you and us regarding the Service.</p>
            </Section>

            <Section title="13. Acceptable Use Policy">
                <p>You agree not to use the Service:</p>
                <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li>In any way that violates any applicable national or international law or regulation.</li>
                    <li>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way.</li>
                    <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent.</li>
                    <li>To impersonate or attempt to impersonate SkillTester, another user, or any other person or entity.</li>
                    <li>In any manner that could disable, overburden, damage, or impair the site.</li>
                </ul>
            </Section>

            <Section title="14. Beta Features and Experimental Services">
                <p>From time to time we may offer beta features, experimental tools, or preview functionalities. These are provided "as-is" without any warranty and may be discontinued at any time without notice or liability.</p>
            </Section>

            <Section title="15. Data Processing and Privacy">
                <p>While we take reasonable measures to protect your data, we make no representations or warranties regarding the absolute security of any information you provide. Continued use of the Service constitutes acceptance of this risk.</p>
            </Section>

            <Section title="16. Final Clause – No Additional Guarantees">
                <p>By continuing to use SkillTester.app after reading these terms you explicitly acknowledge that all representations made on marketing materials, landing pages, dashboard previews, testimonials, feature lists, pricing tables, or any other public-facing content are not contractual promises. <strong>The only deliverable you receive upon payment is an increase in your interview credit balance corresponding to the purchased plan.</strong></p>
            </Section>

            <Section title="17. AI-Generated Content Disclaimer">
                <p>SkillTester uses artificial intelligence (AI) models, including large language models, to generate interview questions, evaluate user responses, and produce feedback reports. You acknowledge and agree that:</p>
                <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li>AI-generated questions, feedback, scores, and evaluations are <strong>automated outputs</strong> and do not constitute professional career counselling, HR advice, or employment guarantees.</li>
                    <li>AI responses may occasionally be inaccurate, incomplete, or inconsistent. We do not warrant the accuracy of any AI-generated content.</li>
                    <li>Interview practice on SkillTester does not guarantee success in real job interviews or any employment outcome.</li>
                    <li>You agree not to use AI-generated feedback as the sole basis for major career decisions.</li>
                </ul>
            </Section>

            <Section title="18. Cookie Policy">
                <p>SkillTester uses cookies and similar tracking technologies to improve your experience on the Service. Cookies are small data files stored on your device. We use the following types of cookies:</p>
                <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li><strong>Essential Cookies:</strong> Required for the Service to function correctly, including authentication session management.</li>
                    <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the Service so we can improve it.</li>
                    <li><strong>Preference Cookies:</strong> Remember your settings and preferences across sessions.</li>
                </ul>
                <p>By using the Service, you consent to the use of cookies as described above. You may disable cookies through your browser settings, but this may affect the functionality of the Service.</p>
            </Section>

            <Section title="19. Age Restrictions">
                <p>The Service is intended for users who are at least <strong>13 years of age</strong>. By creating an account or using the Service, you represent and warrant that you are 13 years of age or older. If you are under 18 years of age, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf.</p>
                <p>We do not knowingly collect personal information from children under 13 years of age. If we discover that a child under 13 has provided us with personal information, we will delete such information from our systems immediately.</p>
            </Section>

            <Section title="20. User Conduct and Community Standards">
                <p>When using SkillTester, you are expected to behave respectfully and professionally. You agree not to:</p>
                <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li>Submit harmful, abusive, threatening, defamatory, or otherwise objectionable content during interview sessions.</li>
                    <li>Attempt to manipulate, hack, reverse-engineer, or exploit any part of the Service or its AI systems.</li>
                    <li>Use automated scripts, bots, or tools to interact with the Service in ways not intended for human users.</li>
                    <li>Share, sell, or transfer your account or interview credits to any other person.</li>
                    <li>Reproduce, copy, or redistribute the AI-generated content, feedback reports, or interview questions for commercial purposes without prior written consent.</li>
                </ul>
                <p>Violation of these conduct standards may result in immediate account suspension or permanent ban without refund.</p>
            </Section>

            <Section title="21. Third-Party Services and Integrations">
                <p>SkillTester integrates with several third-party services to deliver its functionality, including but not limited to:</p>
                <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li><strong>Firebase (Google):</strong> Used for user authentication and database storage. Subject to Google's Privacy Policy.</li>
                    <li><strong>Groq / AI Providers:</strong> Used to power AI interview question generation and response evaluation.</li>
                    <li><strong>Razorpay:</strong> Used for payment processing. Your payment data is handled directly by Razorpay and subject to their terms and privacy policy.</li>
                    <li><strong>Wandbox:</strong> Used for executing code submissions in supported programming languages.</li>
                </ul>
                <p>By using SkillTester, you also agree to be bound by the applicable terms and policies of these third-party services. SkillTester is not responsible for the conduct, content, or privacy practices of any third-party provider.</p>
            </Section>

            <Section title="22. Dispute Resolution">
                <p>In the event of any dispute, controversy, or claim arising out of or relating to these Terms or the Service, you agree to first attempt to resolve the dispute informally by contacting us at <strong>support@skilltester.app</strong>.</p>
                <p>If the dispute cannot be resolved informally within 30 days, both parties agree to submit the dispute to binding arbitration in accordance with the laws of India. The arbitration shall be conducted in the English language. The decision of the arbitrator shall be final and binding on both parties.</p>
                <p>You waive any right to participate in a class-action lawsuit or class-wide arbitration against SkillTester.</p>
            </Section>

            <Section title="23. Service Availability and Maintenance">
                <p>We strive to keep SkillTester available 24/7, but we do not guarantee uninterrupted access to the Service. The Service may be temporarily unavailable due to:</p>
                <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li>Scheduled maintenance windows (we will try to notify users in advance where possible).</li>
                    <li>Unplanned outages or technical failures in our infrastructure or third-party service providers.</li>
                    <li>Events beyond our reasonable control (force majeure).</li>
                </ul>
                <p>SkillTester shall not be liable for any loss or inconvenience caused by service downtime or unavailability. Interview credits will <strong>not</strong> be refunded or compensated due to service interruptions.</p>
            </Section>

            <Section title="24. Privacy Summary">
                <p>Your privacy is important to us. By using SkillTester, you acknowledge the following key points about how we handle your data:</p>
                <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <li><strong>Information Collected:</strong> We collect your name, email address, interview responses, scores, and device information when you use the Service.</li>
                    <li><strong>How It Is Used:</strong> Your data is used to deliver interview sessions, generate AI feedback, manage your subscription, and improve the Service.</li>
                    <li><strong>Data Sharing:</strong> We do not sell your personal data. We share data with third-party service providers (Firebase, Groq, Razorpay) solely to operate the Service.</li>
                    <li><strong>Data Retention:</strong> Your account data is retained for as long as your account is active. You may request deletion by contacting support@skilltester.app.</li>
                    <li><strong>Security:</strong> We use industry-standard encryption and secure storage practices, but cannot guarantee absolute security.</li>
                </ul>
                <p>For full details, please refer to our Privacy Policy (available separately on the website).</p>
            </Section>

            <Section title="25. Indemnification">
                <p>You agree to indemnify, defend and hold harmless SkillTester, its affiliates, officers, directors, employees and agents from any and all claims, liabilities, damages, losses, costs or expenses (including reasonable attorneys’ fees) arising out of or related to your use of the Service, violation of these Terms, or any breach of your representations.</p>
            </Section>

            <Section title="26. Service Modification and Termination">
                <p>We reserve the right to modify, suspend, or discontinue all or part of the Service at any time, with or without notice. We may also terminate your account for any reason, including violation of these Terms. Upon termination, your access to the Service will be revoked and any remaining interview credits will be forfeited.</p>
            </Section>

            <Section title="27. Data Breach Notification">
                <p>In the unlikely event of a data breach affecting your personal information, we will promptly notify affected users in accordance with applicable law and take reasonable steps to mitigate the breach.</p>
            </Section>

            <Section title="28. Export Control">
                <p>You acknowledge that the Service and any related software may be subject to export control laws and regulations. You agree not to export or re-export the Service in violation of any applicable export or sanctions laws.</p>
            </Section>

            <Section title="29. Accessibility">
                <p>We strive to make the Service accessible to all users. If you encounter accessibility barriers, please contact us at support@skilltester.app so we can address the issue.</p>
            </Section>

            <Section title="30. Marketing and Communications">
                <p>By using the Service you consent to receive occasional marketing communications from SkillTester about new features, promotions, or updates. You may opt out at any time via the unsubscribe link in the email.</p>
            </Section>

            <Section title="31. User Data Rights">
                <p>You have the right to access, correct, delete, or export your personal data stored by SkillTester. To exercise these rights, contact support@skilltester.app. We will respond within a reasonable timeframe and comply with applicable data protection laws.
                </p>
            </Section>

            <Section title="32. Compliance with Laws">
                <p>You agree to comply with all applicable local, national, and international laws while using the Service. Any illegal use of the Service will result in immediate termination and may be reported to authorities.
                </p>
            </Section>

            <Section title="33. No Waiver">
                <p>Failure by SkillTester to enforce any provision of these Terms shall not be deemed a waiver of that provision or any other provision.
                </p>
            </Section>

            <Section title="34. Assignment">
                <p>SkillTester may assign or transfer its rights and obligations under these Terms without your consent. You may not assign or transfer your rights without our prior written consent.
                </p>
            </Section>

            <Section title="35. International Users">
                <p>The Service is intended for users worldwide. By using the Service, you consent to the transfer of your data to the United States where our servers are located, and you agree to comply with any local regulations applicable to you.
                </p>
            </Section>

            <Section title="36. Feedback">
                <p>We welcome feedback, suggestions, and ideas about the Service. By submitting feedback, you grant SkillTester a perpetual, royalty‑free, worldwide license to use, modify, and commercialize such feedback without any compensation to you.
                </p>
            </Section>

            <p style={{ marginTop: '3rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                © 2026 SkillTester.app – All Rights Reserved. These terms are subject to change without further notice.
            </p>
        </div>
    );
};

const Section = ({ title, children }) => (
    <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary)' }}>{title}</h2>
        <div style={{ color: 'var(--color-text-muted)' }}>{children}</div>
    </div>
);

export default TermsOfService;
