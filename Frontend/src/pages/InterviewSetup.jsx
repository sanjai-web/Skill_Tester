import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Briefcase, Building, FileText, Loader, CheckCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import api from '../services/api';

// Point PDF.js worker to the bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

/**
 * Extracts plain text from a PDF File object using PDF.js (client-side).
 * @param {File} file - The PDF File object
 * @returns {Promise<string>} Extracted plain text
 */
const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText.trim();
};

const InterviewSetup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ company: '', role: '', description: '', resume: null });
    const [resumeText, setResumeText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [parseSuccess, setParseSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const handleFileChange = async (e) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        setError(null);
        setParseSuccess(false);
        setResumeText('');

        if (file.type !== 'application/pdf') {
            setError('Only PDF files are allowed.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be under 5MB.');
            return;
        }

        setFormData({ ...formData, resume: file });
        setIsParsing(true);

        try {
            const extracted = await extractTextFromPDF(file);


            if (!extracted || extracted.length < 20) {
                setError('Could not extract readable text from this PDF. It may be a scanned/image-based PDF. Try a different file.');
                setIsParsing(false);
                return;
            }

            setResumeText(extracted);
            setParseSuccess(true);
        } catch (err) {
            console.error('PDF Extraction Error:', err);
            setError('Failed to read PDF: ' + err.message);
        } finally {
            setIsParsing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // Send extracted text as JSON — no file upload needed
            const response = await api.post('/interviews/init', {
                company: formData.company,
                role: formData.role,
                description: formData.description,
                resumeText: resumeText,       // ← client-extracted text sent directly
            });

            const { interviewId, firstQuestion, sections, hasTechJD, role, company } = response.data.data;

            navigate('/interview/active', {
                state: { interviewId, firstQuestion, sections, hasTechJD, role, company }
            });
        } catch (err) {
            const code = err.response?.data?.code;
            if (code === 'QUOTA_EXCEEDED') {
                setShowUpgradeModal(true);
            } else {
                setError(err.response?.data?.message || 'Failed to start interview. Please try again.');
            }
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>

            {/* Upgrade Plan Modal */}
            {showUpgradeModal && (
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
                            Upgrade to continue practising and unlock unlimited interviews.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                onClick={() => navigate('/pricing')}
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
                                    color: 'white', fontWeight: 500, border: '1px solid var(--color-border)',
                                    cursor: 'pointer',
                                }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Configure Your Interview</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                    Provide the job details and your resume to generate targeted AI questions.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {error && (
                    <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)', color: '#ff3b30', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Target Company (Optional)</label>
                        <div style={{ position: 'relative' }}>
                            <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', boxSizing: 'border-box' }}
                                placeholder="e.g. Google, Stripe"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Job Role *</label>
                        <div style={{ position: 'relative' }}>
                            <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input
                                type="text"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', boxSizing: 'border-box' }}
                                placeholder="e.g. Senior Frontend Engineer"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Job Description *</label>
                    <div style={{ position: 'relative' }}>
                        <FileText size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-muted)' }} />
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', minHeight: '150px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                            placeholder="Paste the requirements or description here to help the AI frame better technical questions..."
                            required
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Upload Resume (PDF) <span style={{ fontWeight: 400, fontSize: '0.82rem' }}>(Optional — improves question relevance)</span></label>

                    <label style={{
                        border: `2px dashed ${parseSuccess ? 'var(--color-success)' : 'var(--color-border)'}`,
                        borderRadius: '12px', padding: '3rem',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                        backgroundColor: parseSuccess ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.1)',
                        cursor: isParsing ? 'wait' : 'pointer', transition: 'all 0.3s',
                    }}>
                        <input type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />

                        {isParsing ? (
                            <>
                                <Loader size={48} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
                                <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-main)' }}>Reading PDF...</p>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Extracting text from your resume</p>
                            </>
                        ) : parseSuccess ? (
                            <>
                                <CheckCircle size={48} color="var(--color-success)" />
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: 'var(--color-text-main)' }}>
                                        ✅ {formData.resume?.name}
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-success)' }}>
                                        {resumeText.length.toLocaleString()} characters extracted successfully
                                    </p>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        Click to replace
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <UploadCloud size={48} color="var(--color-text-muted)" />
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: 'var(--color-text-main)' }}>
                                        Click to upload or drag and drop
                                    </p>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>PDF only (Max 5MB) — skip if you don't have one ready</p>
                                </div>
                            </>
                        )}
                    </label>

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => navigate('/dashboard')} style={{ padding: '0.75rem 2rem', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'white', fontWeight: 500 }}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading || isParsing}
                        style={{ padding: '0.75rem 2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (isLoading || isParsing) ? 0.6 : 1 }}>
                        {isLoading ? (
                            <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating Questions...</>
                        ) : 'Continue to Interview ➜'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default InterviewSetup;
