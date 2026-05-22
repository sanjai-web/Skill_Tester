import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Layout, SquareTerminal, X, Send, Loader, Play, ChevronDown } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../services/api';

// Language configs
const LANGUAGES = {
    whiteboard: { label: 'Whiteboard', monacoLang: 'javascript', canRun: false, defaultCode: '// Use this space to draw out your approach\n// No execution in Whiteboard mode\n\n// Time Complexity: O(??)\n// Space Complexity: O(??)\n\nfunction solution() {\n  // your approach here\n}' },
    python: { label: 'Python', monacoLang: 'python', canRun: true, defaultCode: '# Python solution\n\ndef solution():\n    pass\n\nprint(solution())' },
    java: { label: 'Java', monacoLang: 'java', canRun: true, defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
    c: { label: 'C', monacoLang: 'c', canRun: true, defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
    cpp: { label: 'C++', monacoLang: 'cpp', canRun: true, defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
};

const SECTIONS = [
    { id: 'self_intro', label: 'Intro' },
    { id: 'projects', label: 'Projects' },
    { id: 'experience', label: 'Experience' },
    { id: 'technical', label: 'Technical' },
    { id: 'scenario', label: 'Scenario' },
    { id: 'industry', label: 'Industry' },
    { id: 'soft_skills', label: 'Soft Skills' },
    { id: 'closing', label: 'Closing' },
];

// ── Wave Animation Component ──────────────────────────────────
const WaveRings = ({ isActive, color = '#3b82f6', size = 120 }) => {
    if (!isActive) return null;
    const rings = [1, 2, 3];
    return (
        <>
            {rings.map((i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        width: `${size + i * 30}px`,
                        height: `${size + i * 30}px`,
                        borderRadius: '50%',
                        border: `2px solid ${color}`,
                        opacity: 0,
                        animation: `waveRing 1.8s ease-out ${i * 0.4}s infinite`,
                        pointerEvents: 'none',
                    }}
                />
            ))}
        </>
    );
};

const ActiveInterview = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { interviewId, firstQuestion, sections, hasTechJD, role = 'Software Engineer', company = '' } = location.state || {};

    const [isCamOn, setIsCamOn] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [showTranscript, setShowTranscript] = useState(true);
    const [timer, setTimer] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [transcript, setTranscript] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(firstQuestion || '');
    const [codingProblem, setCodingProblem] = useState(null);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [sectionQuestionCount, setSectionQuestionCount] = useState(1);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [selectedLang, setSelectedLang] = useState('whiteboard');
    const [codeOutput, setCodeOutput] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');

    // ── Core STT refs ──────────────────────────────────────────
    // Single source of truth: are we supposed to be listening?
    const wantListeningRef = useRef(false);
    const recognitionRef = useRef(null);
    const committedTextRef = useRef('');
    const restartTimerRef = useRef(null);
    const consecutiveErrorsRef = useRef(0);

    const transcriptEndRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const editorCodeRef = useRef(LANGUAGES.whiteboard.defaultCode);
    const selectedVoiceRef = useRef(null);

    // ── Inject keyframe animation once ────────────────────────
    useEffect(() => {
        const styleId = 'wave-ring-keyframes';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @keyframes waveRing {
                0%   { transform: scale(0.95); opacity: 0.7; }
                100% { transform: scale(1.6);  opacity: 0; }
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0.4; }
            }
        `;
        document.head.appendChild(style);
    }, []);

    // ── STT: create & start a recognition instance ─────────────
    const startRecognitionInstance = useCallback(() => {
        if (!wantListeningRef.current) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Tear down any old instance
        if (recognitionRef.current) {
            try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch (_) {}
            recognitionRef.current = null;
        }

        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.maxAlternatives = 1;
        recognitionRef.current = rec;

        rec.onstart = () => {
            console.log('[STT] Started');
            consecutiveErrorsRef.current = 0;
            setIsListening(true);
        };

        rec.onresult = (event) => {
            consecutiveErrorsRef.current = 0; // got audio — reset error count
            let interim = '';
            let finalChunk = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) finalChunk += r[0].transcript;
                else interim += r[0].transcript;
            }
            if (finalChunk) {
                committedTextRef.current = (committedTextRef.current + ' ' + finalChunk).trim();
            }
            setLiveTranscript((committedTextRef.current + ' ' + interim).trim());
        };

        rec.onerror = (event) => {
            console.warn('[STT] Error:', event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                // Hard stop — user denied mic
                wantListeningRef.current = false;
                setIsListening(false);
                alert('Microphone access denied. Please allow microphone access in your browser settings.');
            } else {
                consecutiveErrorsRef.current += 1;
            }
            // onerror is always followed by onend — let onend handle restart logic
        };

        rec.onend = () => {
            console.log('[STT] Ended. wantListening:', wantListeningRef.current, 'errors:', consecutiveErrorsRef.current);

            if (!wantListeningRef.current) {
                // ── Intentional stop ──────────────────────────
                setIsListening(false);
                const finalText = committedTextRef.current.trim();
                if (finalText) {
                    setUserInput(prev => prev.trim() ? prev.trim() + ' ' + finalText : finalText);
                }
                committedTextRef.current = '';
                setLiveTranscript('');
                return;
            }

            // ── Auto-restart with backoff ─────────────────────
            // Cap consecutive errors to avoid infinite thrashing
            const errors = consecutiveErrorsRef.current;
            if (errors >= 5) {
                console.warn('[STT] Too many consecutive errors — stopping.');
                wantListeningRef.current = false;
                setIsListening(false);
                return;
            }

            const delay = errors > 0 ? Math.min(500 * errors, 3000) : 100;
            console.log(`[STT] Restarting in ${delay}ms…`);
            restartTimerRef.current = setTimeout(startRecognitionInstance, delay);
        };

        try {
            rec.start();
        } catch (err) {
            console.error('[STT] start() threw:', err);
            // Will not fire onend automatically — schedule retry manually
            if (wantListeningRef.current) {
                restartTimerRef.current = setTimeout(startRecognitionInstance, 500);
            }
        }
    }, []); // no deps — reads refs only

    // ── STT: toggle ────────────────────────────────────────────
    const toggleListening = useCallback(async () => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
            return;
        }

        if (wantListeningRef.current) {
            // ── STOP ──────────────────────────────────────────
            console.log('[STT] User STOP');
            wantListeningRef.current = false;
            clearTimeout(restartTimerRef.current);

            const rec = recognitionRef.current;
            if (rec) {
                // Remove onend first so our custom flush logic below runs instead
                rec.onend = () => {
                    setIsListening(false);
                    const finalText = committedTextRef.current.trim();
                    if (finalText) {
                        setUserInput(prev => prev.trim() ? prev.trim() + ' ' + finalText : finalText);
                    }
                    committedTextRef.current = '';
                    setLiveTranscript('');
                    recognitionRef.current = null;
                };
                try { rec.stop(); } catch (_) {
                    try { rec.abort(); } catch (__) {}
                    // If stop/abort both fail, manually trigger the flush
                    setIsListening(false);
                    const finalText = committedTextRef.current.trim();
                    if (finalText) setUserInput(prev => prev.trim() ? prev.trim() + ' ' + finalText : finalText);
                    committedTextRef.current = '';
                    setLiveTranscript('');
                    recognitionRef.current = null;
                }
            } else {
                setIsListening(false);
            }
        } else {
            // ── START ─────────────────────────────────────────
            console.log('[STT] User START');

            // Request mic permission explicitly
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => t.stop());
            } catch (err) {
                alert('Microphone access denied. Click the 🔒 icon in your browser address bar, allow microphone access, then try again.');
                return;
            }

            committedTextRef.current = '';
            consecutiveErrorsRef.current = 0;
            setLiveTranscript('');
            wantListeningRef.current = true;
            startRecognitionInstance();
        }
    }, [startRecognitionInstance]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wantListeningRef.current = false;
            clearTimeout(restartTimerRef.current);
            if (recognitionRef.current) {
                try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch (_) {}
            }
        };
    }, []);

    // ── Timer ──────────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // ── Camera cleanup ─────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, []);

    const toggleCamera = async () => {
        setCameraError(null);
        if (isCamOn) {
            if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCamOn(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                streamRef.current = stream;
                if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
                setIsCamOn(true);
            } catch (err) {
                setCameraError(err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Allow camera access in your browser settings.'
                    : 'Could not access camera: ' + err.message);
            }
        }
    };

    const runCode = async () => {
        const lang = LANGUAGES[selectedLang];
        if (!lang.canRun) { setCodeOutput({ type: 'info', text: 'Whiteboard mode — no execution.' }); return; }
        setIsRunning(true); setCodeOutput(null);
        try {
            const response = await api.post('/code/run', { language: selectedLang, code: editorCodeRef.current });
            const { output, isError } = response.data.data;
            setCodeOutput({ type: isError ? 'error' : 'success', text: output });
        } catch (err) {
            setCodeOutput({ type: 'error', text: err.response?.data?.message || 'Failed to execute code.' });
        } finally { setIsRunning(false); }
    };

    const submitCodeToAI = async () => {
        const code = editorCodeRef.current;
        const output = codeOutput?.text || '';
        const lang = LANGUAGES[selectedLang].label;
        const sectionId = SECTIONS[currentSectionIndex]?.id || 'technical';
        const problemText = codingProblem || currentQuestion;
        setTranscript(prev => [...prev, { from: 'ai', text: `Evaluating your ${lang} solution...` }]);
        setIsLoading(true);
        try {
            const response = await api.post('/interviews/code-eval', {
                interviewId, codingProblem: problemText, language: lang, code, output, role, company,
                section: sectionId, conversationHistory: transcript.slice(-6),
            });
            const { nextQuestion, advanceSection, nextSection } = response.data.data;
            setTranscript(prev => [...prev, { from: 'ai', text: nextQuestion }]);
            setCurrentQuestion(nextQuestion);
            speak(nextQuestion);
            setCodingProblem(null); setShowEditor(false); setCodeOutput(null);
            if (advanceSection) {
                const nextIdx = SECTIONS.findIndex(s => s.id === nextSection);
                setCurrentSectionIndex(nextIdx !== -1 && nextIdx > currentSectionIndex ? nextIdx : prev => Math.min(prev + 1, SECTIONS.length - 1));
                setSectionQuestionCount(1);
            }
        } catch (err) {
            setTranscript(prev => [...prev, { from: 'ai', text: err.response?.data?.message || 'Code evaluation failed.' }]);
        } finally { setIsLoading(false); }
    };

    const changeLanguage = (langKey) => {
        setSelectedLang(langKey);
        editorCodeRef.current = LANGUAGES[langKey].defaultCode;
        setCodeOutput(null);
    };

    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript]);

    useEffect(() => {
        const pickFemaleVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            const keywords = ['female', 'woman', 'zira', 'hazel', 'susan', 'karen', 'samantha', 'victoria', 'moira', 'tessa', 'fiona', 'veena', 'google uk english female'];
            const pool = voices.filter(v => keywords.some(k => v.name.toLowerCase().includes(k)) || (v.lang.startsWith('en') && v.name.toLowerCase().includes('female')));
            const final = pool.length > 0 ? pool : voices.filter(v => v.lang.startsWith('en'));
            if (final.length > 0) selectedVoiceRef.current = final[Math.floor(Math.random() * final.length)];
        };
        if (window.speechSynthesis.getVoices().length > 0) pickFemaleVoice();
        else window.speechSynthesis.addEventListener('voiceschanged', pickFemaleVoice, { once: true });
    }, []);

    const speak = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
        utterance.rate = 0.95; utterance.pitch = 1.1;
        utterance.onstart = () => setIsAiSpeaking(true);
        utterance.onend = () => setIsAiSpeaking(false);
        utterance.onerror = () => setIsAiSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        if (firstQuestion) { setTranscript([{ from: 'ai', text: firstQuestion }]); speak(firstQuestion); }
        else if (!interviewId) navigate('/setup');
    }, []);

    const submitAnswer = async (directText) => {
        const answerText = typeof directText === 'string' ? directText : userInput;
        if (!answerText.trim() || isLoading) return;
        const answer = answerText.trim();
        const sectionId = SECTIONS[currentSectionIndex]?.id || 'self_intro';
        const updatedTranscript = [...transcript, { from: 'user', text: answer }];
        setTranscript(updatedTranscript);
        setUserInput('');
        setIsLoading(true);

        // Stop mic if running
        if (wantListeningRef.current) {
            wantListeningRef.current = false;
            clearTimeout(restartTimerRef.current);
            if (recognitionRef.current) {
                try { recognitionRef.current.onend = null; recognitionRef.current.abort(); } catch (_) {}
                recognitionRef.current = null;
            }
            setIsListening(false);
        }
        committedTextRef.current = '';
        setLiveTranscript('');

        try {
            const response = await api.post('/interviews/next', {
                interviewId, currentQuestion, answer, role, company, section: sectionId,
                sectionQuestionCount, hasTechJD: !!hasTechJD, conversationHistory: updatedTranscript.slice(-8),
            });
            const { nextQuestion, advanceSection, nextSection, isCodingProblem } = response.data.data;
            setTranscript(prev => [...prev, { from: 'ai', text: nextQuestion }]);
            setCurrentQuestion(nextQuestion);
            speak(nextQuestion);
            if (isCodingProblem) { setCodingProblem(nextQuestion); setShowEditor(true); return; }
            if (advanceSection) {
                const nextIdx = SECTIONS.findIndex(s => s.id === nextSection);
                setCurrentSectionIndex(nextIdx !== -1 && nextIdx > currentSectionIndex ? nextIdx : prev => Math.min(prev + 1, SECTIONS.length - 1));
                setSectionQuestionCount(1);
            } else setSectionQuestionCount(prev => prev + 1);
        } catch (err) {
            setTranscript(prev => [...prev, { from: 'ai', text: err.response?.data?.message || 'AI is unavailable. Please try again.' }]);
        } finally { setIsLoading(false); }
    };

    const endInterview = async () => {
        if (isFinishing) return;
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
        if (!interviewId) { navigate('/dashboard'); return; }
        setIsFinishing(true);
        try {
            const response = await api.post(`/interviews/${interviewId}/finish`);
            navigate(`/results/${response.data.data.interviewId}`);
        } catch (_) { navigate(`/results/${interviewId}`); }
    };

    const currentSection = SECTIONS[currentSectionIndex];
    const displayText = isListening ? liveTranscript : userInput;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a', overflow: 'hidden' }}>

            {/* Top Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 2rem', backgroundColor: 'rgba(30, 41, 59, 0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--color-primary)' }}>Skilltester.app</h1>
                    <span style={{ color: 'var(--color-text-muted)' }}>|</span>
                    <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 500 }}>{role}{company ? ` @ ${company}` : ''}</h2>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {SECTIONS.map((s, idx) => (
                        <div key={s.id} style={{
                            padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600,
                            backgroundColor: idx === currentSectionIndex ? 'var(--color-primary)' : idx < currentSectionIndex ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.07)',
                            color: idx <= currentSectionIndex ? 'white' : 'var(--color-text-muted)',
                            border: idx === currentSectionIndex ? '1px solid var(--color-primary)' : '1px solid transparent',
                            transition: 'all 0.3s',
                        }}>{s.label}</div>
                    ))}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'monospace', minWidth: '60px', textAlign: 'right' }}>{formatTime(timer)}</div>
            </header>

            {/* Main Content */}
            <div style={{ display: 'flex', flex: 1, padding: '1rem', gap: '1rem', overflow: 'hidden' }}>

                {/* Left Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {showEditor ? (
                        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <SquareTerminal size={16} /> Code Editor
                                    </span>
                                    <div style={{ position: 'relative' }}>
                                        <select value={selectedLang} onChange={(e) => changeLanguage(e.target.value)}
                                            style={{ appearance: 'none', padding: '0.35rem 2rem 0.35rem 0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'rgba(30, 41, 59, 0.9)', color: 'white', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                                            {Object.entries(LANGUAGES).map(([key, lang]) => <option key={key} value={key}>{lang.label}</option>)}
                                        </select>
                                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {LANGUAGES[selectedLang].canRun && (
                                        <button onClick={runCode} disabled={isRunning} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '6px', backgroundColor: 'var(--color-success)', color: 'white', fontWeight: 600, fontSize: '0.82rem', opacity: isRunning ? 0.7 : 1 }}>
                                            {isRunning ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running...</> : <><Play size={12} fill="white" /> Run</>}
                                        </button>
                                    )}
                                    <button onClick={submitCodeToAI} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '6px', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, fontSize: '0.82rem', opacity: isLoading ? 0.7 : 1 }}>
                                        {isLoading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Send size={12} /> Submit to AI</>}
                                    </button>
                                    <button onClick={() => setShowEditor(false)} style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
                                </div>
                            </div>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <Editor height="100%" language={LANGUAGES[selectedLang].monacoLang} theme="vs-dark"
                                    value={LANGUAGES[selectedLang].defaultCode}
                                    onChange={(val) => { editorCodeRef.current = val || ''; }}
                                    options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, tabSize: 4, automaticLayout: true }} />
                            </div>
                            {(codeOutput || isRunning) && (
                                <div style={{ borderTop: '1px solid var(--color-border)', backgroundColor: '#0d1117', padding: '0.75rem 1rem', maxHeight: '160px', overflowY: 'auto', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output</span>
                                        {codeOutput && <span style={{ fontSize: '0.7rem', fontWeight: 600, color: codeOutput.type === 'success' ? 'var(--color-success)' : codeOutput.type === 'error' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{codeOutput.type === 'success' ? '✓ OK' : codeOutput.type === 'error' ? '✗ Error' : 'ℹ Info'}</span>}
                                    </div>
                                    {isRunning ? <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Executing...</p>
                                        : <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: codeOutput?.type === 'success' ? '#86efac' : codeOutput?.type === 'error' ? '#fca5a5' : '#94a3b8' }}>{codeOutput?.text}</pre>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flex: 1, gap: '1rem' }}>
                            {/* ── AI Interviewer card ── */}
                            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', backgroundColor: '#1e293b' }}>
                                {/* Wave rings — AI speaking */}
                                <WaveRings isActive={isAiSpeaking} color="#3b82f6" size={120} />

                                <div style={{
                                    width: '120px', height: '120px', borderRadius: '50%',
                                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', position: 'relative', zIndex: 1,
                                    border: isAiSpeaking ? '3px solid #60a5fa' : '3px solid var(--color-primary)',
                                    transition: 'border-color 0.3s',
                                    boxShadow: isAiSpeaking ? '0 0 20px rgba(59,130,246,0.5)' : 'none',
                                }}>
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia&backgroundColor=b6e3f4" alt="Interviewer" style={{ width: '100%', height: '100%' }} />
                                </div>

                                {isAiSpeaking && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '4px', alignItems: 'flex-end', height: '20px', zIndex: 1 }}>
                                        {[0, 1, 2, 3, 4].map(i => (
                                            <div key={i} style={{
                                                width: '4px', borderRadius: '2px', backgroundColor: '#60a5fa',
                                                animation: `waveBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                                                height: `${8 + Math.sin(i) * 6}px`,
                                            }} />
                                        ))}
                                    </div>
                                )}

                                <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', backgroundColor: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                                    Olivia (AI){isAiSpeaking ? ' 🔊' : ''}
                                </div>
                            </div>

                            {/* ── Candidate card ── */}
                            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', backgroundColor: '#1e293b', overflow: 'hidden' }}>
                                {/* Wave rings — user speaking */}
                                {isListening && <WaveRings isActive color="#22c55e" size={isCamOn ? 0 : 100} />}

                                <video ref={videoRef} autoPlay muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: isCamOn ? 'block' : 'none', transform: 'scaleX(-1)', borderRadius: '16px' }} />

                                {!isCamOn && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                                        <div style={{
                                            width: '100px', height: '100px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: isListening ? '3px solid #22c55e' : '3px solid transparent',
                                            boxShadow: isListening ? '0 0 20px rgba(34,197,94,0.5)' : 'none',
                                            transition: 'border-color 0.3s, box-shadow 0.3s',
                                        }}>
                                            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>You</span>
                                        </div>
                                        {cameraError
                                            ? <p style={{ margin: 0, fontSize: '0.75rem', color: '#f87171', textAlign: 'center', maxWidth: '200px', padding: '0 1rem' }}>{cameraError}</p>
                                            : <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Camera Off</p>}
                                    </div>
                                )}

                                {/* Green ring on video feed when listening */}
                                {isCamOn && isListening && (
                                    <div style={{ position: 'absolute', inset: 0, borderRadius: '16px', border: '3px solid #22c55e', boxShadow: '0 0 20px rgba(34,197,94,0.4)', zIndex: 2, pointerEvents: 'none' }} />
                                )}

                                {isListening && (
                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: 'rgba(34,197,94,0.85)', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 3 }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white', animation: 'pulse 1s infinite' }} />
                                        Listening...
                                    </div>
                                )}

                                {isListening && (
                                    <div style={{ position: 'absolute', bottom: '3rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '3px', alignItems: 'flex-end', height: '20px', zIndex: 3 }}>
                                        {[0, 1, 2, 3, 4].map(i => (
                                            <div key={i} style={{
                                                width: '4px', borderRadius: '2px', backgroundColor: '#4ade80',
                                                height: `${6 + Math.random() * 10}px`,
                                                animation: `waveBar 0.5s ease-in-out ${i * 0.1}s infinite alternate`,
                                            }} />
                                        ))}
                                    </div>
                                )}

                                <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', backgroundColor: 'rgba(0,0,0,0.6)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', zIndex: 2 }}>You</div>
                            </div>
                        </div>
                    )}

                    {/* Answer Input */}
                    <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            {isListening && (
                                <div style={{ position: 'absolute', top: '8px', right: '10px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, pointerEvents: 'none' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 1s infinite', display: 'inline-block' }} />
                                    Listening...
                                </div>
                            )}
                            <textarea
                                value={displayText}
                                onChange={(e) => { if (!isListening) setUserInput(e.target.value); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(isListening ? liveTranscript : undefined); } }}
                                placeholder={isListening ? '🎤 Speak now — your words will appear here...' : 'Type your answer or click the mic to speak...'}
                                rows={3}
                                readOnly={isListening}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '8px', resize: 'none',
                                    fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.6,
                                    color: 'white', boxSizing: 'border-box',
                                    border: isListening ? '1.5px solid rgba(34,197,94,0.7)' : '1px solid var(--color-border)',
                                    backgroundColor: isListening ? 'rgba(34,197,94,0.05)' : 'rgba(0,0,0,0.3)',
                                    boxShadow: isListening ? '0 0 0 3px rgba(34,197,94,0.15)' : 'none',
                                    transition: 'border 0.2s, box-shadow 0.2s, background-color 0.2s',
                                }}
                            />
                        </div>
                        <button onClick={() => submitAnswer(isListening ? liveTranscript : undefined)}
                            disabled={!displayText.trim() || isLoading}
                            style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!displayText.trim() || isLoading) ? 0.5 : 1 }}>
                            {isLoading ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
                        </button>
                    </div>
                </div>

                {/* Right Panel - Transcript */}
                {showTranscript && (
                    <div className="glass-card" style={{ width: '350px', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', color: '#1e293b' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600 }}>Transcript</span>
                            <button onClick={() => setShowTranscript(false)} style={{ color: '#64748b' }}><X size={18} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {transcript.map((msg, idx) => (
                                <div key={idx}>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem', color: msg.from === 'ai' ? '#2563eb' : '#16a34a' }}>
                                        {msg.from === 'ai' ? 'Olivia (AI)' : 'You'}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>{msg.text}</p>
                                </div>
                            ))}
                            {isLoading && (
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem', color: '#2563eb' }}>Olivia (AI)</div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Thinking...</p>
                                </div>
                            )}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', backgroundColor: 'rgba(30, 41, 59, 0.9)' }}>
                <button onClick={toggleListening} title={isListening ? 'Stop listening' : 'Start voice input'}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isListening ? '#dc2626' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: isListening ? '0 0 0 3px rgba(220,38,38,0.3)' : 'none', transition: 'all 0.2s' }}>
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button onClick={toggleCamera} title={isCamOn ? 'Turn off camera' : 'Turn on camera'}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isCamOn ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: isCamOn ? '2px solid rgba(255,255,255,0.3)' : 'none' }}>
                    {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
                <button onClick={() => setShowEditor(!showEditor)} title="Toggle Code Editor"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: showEditor ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <SquareTerminal size={20} />
                </button>
                {!showTranscript && (
                    <button onClick={() => setShowTranscript(true)} title="Show Transcript"
                        style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Layout size={20} />
                    </button>
                )}
                <button onClick={endInterview} disabled={isFinishing}
                    style={{ padding: '0 1.5rem', height: '48px', borderRadius: '24px', backgroundColor: 'var(--color-danger)', color: 'white', fontWeight: 600, marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isFinishing ? 0.7 : 1 }}>
                    {isFinishing ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Ending...</> : '⏹ End Interview'}
                </button>
            </div>

            {/* waveBar keyframe — injected inline since we can't use a .css file here */}
            <style>{`
                @keyframes waveBar {
                    from { transform: scaleY(0.4); }
                    to   { transform: scaleY(1.4); }
                }
            `}</style>
        </div>
    );
};

export default ActiveInterview;
