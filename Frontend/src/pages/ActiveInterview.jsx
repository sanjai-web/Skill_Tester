import 'regenerator-runtime/runtime';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Layout, SquareTerminal, X, Send, Loader, Play, ChevronDown } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../services/api';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// Language configs — canRun: true means the backend can execute this language
const LANGUAGES = {
    whiteboard: { label: 'Whiteboard', monacoLang: 'javascript', canRun: false, defaultCode: '// Use this space to draw out your approach\n// No execution in Whiteboard mode\n\n// Time Complexity: O(??)\n// Space Complexity: O(??)\n\nfunction solution() {\n  // your approach here\n}' },
    python: { label: 'Python', monacoLang: 'python', canRun: true, defaultCode: '# Python solution\n\ndef solution():\n    pass\n\nprint(solution())' },
    java: { label: 'Java', monacoLang: 'java', canRun: true, defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
    c: { label: 'C', monacoLang: 'c', canRun: true, defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
    cpp: { label: 'C++', monacoLang: 'cpp', canRun: true, defaultCode: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
};

// 8-section interview structure (mirrors aiService.SECTIONS)
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

const ActiveInterview = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // ── State ──────────────────────────────────────────────────
    const { interviewId, firstQuestion, sections, hasTechJD, role = 'Software Engineer', company = '' } = location.state || {};

    const [isMicOn, setIsMicOn] = useState(false);
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
    const [codingProblem, setCodingProblem] = useState(null); // active coding problem text

    // Section tracking
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [sectionQuestionCount, setSectionQuestionCount] = useState(1);
    // --- Editor state ---
    const [selectedLang, setSelectedLang] = useState('whiteboard');
    const [codeOutput, setCodeOutput] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const recognitionRef = useRef(null);
    const transcriptEndRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const editorCodeRef = useRef(LANGUAGES.whiteboard.defaultCode);
    const selectedVoiceRef = useRef(null); // female voice chosen once per session

    // react-speech-recognition setup
    const {
        transcript: liveTranscript,
        listening: isListening,
        resetTranscript,
        browserSupportsSpeechRecognition,
        isMicrophoneAvailable
    } = useSpeechRecognition();

    // Debugging STT status
    useEffect(() => {
        console.log('[STT Debug] Browser Supports STT:', browserSupportsSpeechRecognition);
        console.log('[STT Debug] Microphone Available:', isMicrophoneAvailable);
        console.log('[STT Debug] Is Listening:', isListening);
    }, [browserSupportsSpeechRecognition, isMicrophoneAvailable, isListening]);

    // When mic stops, commit the spoken text to userInput so it stays for editing/submission
    useEffect(() => {
        if (!isListening && liveTranscript) {
            setUserInput(prev => {
                const prevTrimmed = prev.trim();
                const newTranscript = liveTranscript.trim();
                if (!prevTrimmed) return newTranscript;
                if (!newTranscript) return prevTrimmed;
                return prevTrimmed + ' ' + newTranscript;
            });
        }
        setIsMicOn(isListening);
    }, [isListening, liveTranscript]);


    // --- Timer ---
    useEffect(() => {
        const interval = setInterval(() => setTimer(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // --- Stop camera stream on unmount ---
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // --- Camera Toggle ---
    const toggleCamera = async () => {
        setCameraError(null);
        if (isCamOn) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (videoRef.current) videoRef.current.srcObject = null;
            setIsCamOn(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
                setIsCamOn(true);
            } catch (err) {
                const msg = err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Allow camera access in your browser settings.'
                    : 'Could not access camera: ' + err.message;
                setCameraError(msg);
                console.error('Camera Error:', err);
            }
        }
    };

    // --- Run code via backend (child_process) ---
    const runCode = async () => {
        const lang = LANGUAGES[selectedLang];
        if (!lang.canRun) {
            setCodeOutput({ type: 'info', text: 'Whiteboard mode — no execution. Switch to a programming language to run code.' });
            return;
        }
        setIsRunning(true);
        setCodeOutput(null);
        try {
            const response = await api.post('/code/run', {
                language: selectedLang,
                code: editorCodeRef.current
            });
            const { output, isError } = response.data.data;
            setCodeOutput({ type: isError ? 'error' : 'success', text: output });
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to execute code. Make sure the language compiler is installed on the server.';
            setCodeOutput({ type: 'error', text: msg });
            console.error('Code Run Error:', err);
        } finally {
            setIsRunning(false);
        }
    };

    // --- Submit code + output to AI for evaluation via /code-eval ---
    const submitCodeToAI = async () => {
        const code = editorCodeRef.current;
        const output = codeOutput?.text || '';
        const lang = LANGUAGES[selectedLang].label;

        const sectionId = SECTIONS[currentSectionIndex]?.id || 'technical';
        const problemText = codingProblem || currentQuestion;

        const aiMsg = `Evaluating your ${lang} solution...`;
        setTranscript(prev => [...prev, { from: 'ai', text: aiMsg }]);
        setIsLoading(true);

        try {
            const response = await api.post('/interviews/code-eval', {
                interviewId,
                codingProblem: problemText,
                language: lang,
                code,
                output,
                role,
                company,
                section: sectionId,
                conversationHistory: transcript.slice(-6),
            });

            const { nextQuestion, advanceSection, nextSection } = response.data.data;
            setTranscript(prev => [...prev, { from: 'ai', text: nextQuestion }]);
            setCurrentQuestion(nextQuestion);
            speak(nextQuestion);
            setCodingProblem(null); // clear coding problem
            setShowEditor(false);
            setCodeOutput(null);

            if (advanceSection) {
                const nextIdx = SECTIONS.findIndex(s => s.id === nextSection);
                if (nextIdx !== -1 && nextIdx > currentSectionIndex) {
                    setCurrentSectionIndex(nextIdx);
                } else if (currentSectionIndex < SECTIONS.length - 1) {
                    setCurrentSectionIndex(prev => prev + 1);
                }
                setSectionQuestionCount(1);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Code evaluation failed.';
            setTranscript(prev => [...prev, { from: 'ai', text: errorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Change language ---
    const changeLanguage = (langKey) => {
        setSelectedLang(langKey);
        editorCodeRef.current = LANGUAGES[langKey].defaultCode;
        setCodeOutput(null);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // --- Auto-scroll transcript ---
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    // --- Pick a random female voice once per session ---
    useEffect(() => {
        const pickFemaleVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            // Prefer voices with 'female' in name, or known female voice names
            const femaleKeywords = ['female', 'woman', 'zira', 'hazel', 'susan', 'karen',
                'samantha', 'victoria', 'moira', 'tessa', 'fiona', 'veena',
                'google uk english female', 'google us english female'];
            const femaleVoices = voices.filter(v =>
                femaleKeywords.some(k => v.name.toLowerCase().includes(k)) ||
                (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
            );
            // Fallback: any English voice if no female found
            const pool = femaleVoices.length > 0
                ? femaleVoices
                : voices.filter(v => v.lang.startsWith('en'));
            if (pool.length > 0) {
                // Random pick — ensures a different voice each session
                selectedVoiceRef.current = pool[Math.floor(Math.random() * pool.length)];
            }
        };
        // Voices may load async on Chrome — listen for the event
        if (window.speechSynthesis.getVoices().length > 0) {
            pickFemaleVoice();
        } else {
            window.speechSynthesis.addEventListener('voiceschanged', pickFemaleVoice, { once: true });
        }
    }, []);

    // --- Text-to-Speech ---
    const speak = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
        utterance.rate = 0.95;
        utterance.pitch = 1.1;  // slightly higher pitch for female voice
        window.speechSynthesis.speak(utterance);
    };

    // Speak and display the first question on load
    useEffect(() => {
        if (firstQuestion) {
            setTranscript([{ from: 'ai', text: firstQuestion }]);
            speak(firstQuestion);
        } else if (!interviewId) {
            navigate('/setup');
        }
    }, []);

    // --- Speech-to-Text toggle ---
    const toggleListening = async () => {
        console.log('[STT Debug] Toggle Listening Clicked');
        if (!browserSupportsSpeechRecognition) {
            alert('Speech recognition is not supported in your browser. Try Chrome or Edge.');
            return;
        }

        if (isListening) {
            console.log('[STT Debug] Stopping listen...');
            SpeechRecognition.stopListening();
        } else {
            console.log('[STT Debug] Calling SpeechRecognition.startListening()...');

            // Explicitly request permission to ensure the browser doesn't block it silently
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // We MUST release the track immediately so SpeechRecognition can use the hardware!
                stream.getTracks().forEach(track => track.stop());
            } catch (err) {
                console.error('[STT Debug] Mic Access Denied:', err);
                alert('Microphone access denied. Please click the 🔒 icon in your browser address bar and allow microphone access, then try again.');
                return;
            }

            // clear out the old transcript from the library so it starts fresh
            resetTranscript();

            try {
                // start listening with the library wrapper but without strict en-US so it handles regional accents
                await SpeechRecognition.startListening({ continuous: true });
            } catch (err) {
                console.error('[STT Debug] startListening failed:', err);
            }
        }
    };

    // --- Submit Answer to Backend ---
    const submitAnswer = async (directText) => {
        const answerText = typeof directText === 'string' ? directText : userInput;
        if (!answerText.trim() || isLoading) return;

        const answer = answerText.trim();
        const sectionId = SECTIONS[currentSectionIndex]?.id || 'self_intro';
        const updatedTranscript = [...transcript, { from: 'user', text: answer }];

        setTranscript(updatedTranscript);
        setUserInput('');
        setIsLoading(true);
        SpeechRecognition.stopListening();
        resetTranscript();

        try {
            const response = await api.post('/interviews/next', {
                interviewId,
                currentQuestion,
                answer,
                role,
                company,
                section: sectionId,
                sectionQuestionCount,
                hasTechJD: !!hasTechJD,
                conversationHistory: updatedTranscript.slice(-8),
            });

            const { nextQuestion, advanceSection, nextSection, isCodingProblem } = response.data.data;

            setTranscript(prev => [...prev, { from: 'ai', text: nextQuestion }]);
            setCurrentQuestion(nextQuestion);
            speak(nextQuestion);

            // If AI assigned a coding problem — auto-open the editor
            if (isCodingProblem) {
                setCodingProblem(nextQuestion);  // store full problem text
                setShowEditor(true);
                return; // don't advance section yet — wait for code submission
            }

            if (advanceSection) {
                const nextIdx = SECTIONS.findIndex(s => s.id === nextSection);
                if (nextIdx !== -1 && nextIdx > currentSectionIndex) {
                    setCurrentSectionIndex(nextIdx);
                } else if (currentSectionIndex < SECTIONS.length - 1) {
                    setCurrentSectionIndex(prev => prev + 1);
                }
                setSectionQuestionCount(1);
            } else {
                setSectionQuestionCount(prev => prev + 1);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'AI is unavailable. Please try again.';
            setTranscript(prev => [...prev, { from: 'ai', text: errorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- End Interview ---
    const endInterview = async () => {
        if (isFinishing) return;
        window.speechSynthesis.cancel();

        if (!interviewId) {
            navigate('/dashboard');
            return;
        }

        setIsFinishing(true);
        try {
            const response = await api.post(`/interviews/${interviewId}/finish`);
            navigate(`/results/${response.data.data.interviewId}`);
        } catch (err) {
            console.error('Error finishing interview:', err);
            navigate(`/results/${interviewId}`);
        }
    };

    const currentSection = SECTIONS[currentSectionIndex];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a', overflow: 'hidden' }}>

            {/* Top Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 2rem', backgroundColor: 'rgba(30, 41, 59, 0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--color-primary)' }}>Skilltester.app</h1>
                    <span style={{ color: 'var(--color-text-muted)' }}>|</span>
                    <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 500 }}>
                        {role}{company ? ` @ ${company}` : ''}
                    </h2>
                </div>

                {/* Section pills */}
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {SECTIONS.map((s, idx) => (
                        <div key={s.id} style={{
                            padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600,
                            backgroundColor: idx === currentSectionIndex
                                ? 'var(--color-primary)'
                                : idx < currentSectionIndex
                                    ? 'rgba(16, 185, 129, 0.25)'
                                    : 'rgba(255,255,255,0.07)',
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
                            {/* Editor Toolbar */}
                            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <SquareTerminal size={16} /> Code Editor
                                    </span>

                                    {/* Language Selector */}
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={selectedLang}
                                            onChange={(e) => changeLanguage(e.target.value)}
                                            style={{
                                                appearance: 'none', padding: '0.35rem 2rem 0.35rem 0.75rem',
                                                borderRadius: '6px', border: '1px solid var(--color-border)',
                                                backgroundColor: 'rgba(30, 41, 59, 0.9)', color: 'white',
                                                fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
                                            }}
                                        >
                                            {Object.entries(LANGUAGES).map(([key, lang]) => (
                                                <option key={key} value={key}>{lang.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {/* Run Button — only for real languages, not Whiteboard */}
                                    {LANGUAGES[selectedLang].canRun && (
                                        <button
                                            onClick={runCode}
                                            disabled={isRunning}
                                            title="Run code"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.35rem 0.9rem', borderRadius: '6px',
                                                backgroundColor: 'var(--color-success)',
                                                color: 'white', fontWeight: 600, fontSize: '0.82rem',
                                                opacity: isRunning ? 0.7 : 1
                                            }}
                                        >
                                            {isRunning
                                                ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running...</>
                                                : <><Play size={12} fill="white" /> Run</>}
                                        </button>
                                    )}

                                    {/* Submit to AI — always visible */}
                                    <button
                                        onClick={submitCodeToAI}
                                        disabled={isLoading}
                                        title="Submit code to AI for evaluation"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            padding: '0.35rem 0.9rem', borderRadius: '6px',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white', fontWeight: 600, fontSize: '0.82rem',
                                            opacity: isLoading ? 0.7 : 1
                                        }}
                                    >
                                        {isLoading
                                            ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                                            : <><Send size={12} /> Submit to AI</>}
                                    </button>

                                    {/* Close Editor */}
                                    <button onClick={() => setShowEditor(false)} style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Monaco Editor */}
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <Editor
                                    height="100%"
                                    language={LANGUAGES[selectedLang].monacoLang}
                                    theme="vs-dark"
                                    value={LANGUAGES[selectedLang].defaultCode}
                                    onChange={(val) => { editorCodeRef.current = val || ''; }}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        scrollBeyondLastLine: false,
                                        tabSize: 4,
                                        automaticLayout: true,
                                    }}
                                />
                            </div>

                            {/* Output Panel */}
                            {(codeOutput || isRunning) && (
                                <div style={{
                                    borderTop: '1px solid var(--color-border)',
                                    backgroundColor: '#0d1117',
                                    padding: '0.75rem 1rem',
                                    maxHeight: '160px', overflowY: 'auto',
                                    flexShrink: 0,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Output
                                        </span>
                                        {codeOutput && (
                                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: codeOutput.type === 'success' ? 'var(--color-success)' : codeOutput.type === 'error' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                                                {codeOutput.type === 'success' ? '✓ OK' : codeOutput.type === 'error' ? '✗ Error' : 'ℹ Info'}
                                            </span>
                                        )}
                                    </div>
                                    {isRunning ? (
                                        <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Executing...</p>
                                    ) : (
                                        <pre style={{
                                            margin: 0, fontFamily: 'monospace', fontSize: '0.82rem',
                                            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                            color: codeOutput?.type === 'success' ? '#86efac' : codeOutput?.type === 'error' ? '#fca5a5' : '#94a3b8',
                                        }}>{codeOutput?.text}</pre>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flex: 1, gap: '1rem' }}>
                            {/* Interviewer */}
                            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', backgroundColor: '#1e293b' }}>
                                <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid var(--color-primary)' }}>
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia&backgroundColor=b6e3f4" alt="Interviewer" style={{ width: '100%', height: '100%' }} />
                                </div>
                                <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', backgroundColor: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.9rem' }}>Olivia (AI)</div>
                            </div>
                            {/* Candidate */}
                            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', backgroundColor: '#1e293b', overflow: 'hidden' }}>
                                {/* Live video feed */}
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    style={{
                                        position: 'absolute', inset: 0,
                                        width: '100%', height: '100%',
                                        objectFit: 'cover',
                                        display: isCamOn ? 'block' : 'none',
                                        transform: 'scaleX(-1)', // mirror effect
                                        borderRadius: '16px'
                                    }}
                                />

                                {/* Placeholder shown when camera is off */}
                                {!isCamOn && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>You</span>
                                        </div>
                                        {cameraError ? (
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#f87171', textAlign: 'center', maxWidth: '200px', padding: '0 1rem' }}>{cameraError}</p>
                                        ) : (
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Camera Off</p>
                                        )}
                                    </div>
                                )}

                                {/* Listening badge */}
                                {isListening && (
                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.85)', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', zIndex: 2 }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white', animation: 'pulse 1s infinite' }}></span>
                                        Listening...
                                    </div>
                                )}

                                {/* Label */}
                                <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', backgroundColor: 'rgba(0,0,0,0.6)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', zIndex: 2 }}>You</div>
                            </div>
                        </div>
                    )}

                    {/* Current Question Display
                    {currentQuestion && (
                        <div className="glass-card" style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                {currentSection?.label} — Current Question
                            </p>
                            <p style={{ margin: 0, fontSize: '0.98rem', lineHeight: 1.6 }}>{currentQuestion}</p>
                        </div>
                    )} */}

                    {/* Answer Input */}
                    <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            {isListening && (
                                <div style={{
                                    position: 'absolute', top: '8px', right: '10px', zIndex: 2,
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    fontSize: '0.72rem', color: '#f87171', fontWeight: 600, pointerEvents: 'none',
                                }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1s infinite', display: 'inline-block' }} />
                                    Listening...
                                </div>
                            )}
                            <textarea
                                value={isListening ? liveTranscript : userInput}
                                onChange={(e) => { if (!isListening) setUserInput(e.target.value); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(isListening ? liveTranscript : undefined); } }}
                                placeholder={isListening ? '🎤 Speak now — your words will appear here...' : 'Type your answer or click the mic to speak...'}
                                rows={3}
                                readOnly={isListening}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '8px', resize: 'none',
                                    fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.6,
                                    color: 'white', boxSizing: 'border-box',
                                    border: isListening ? '1.5px solid rgba(239,68,68,0.7)' : '1px solid var(--color-border)',
                                    backgroundColor: isListening ? 'rgba(239,68,68,0.05)' : 'rgba(0,0,0,0.3)',
                                    boxShadow: isListening ? '0 0 0 3px rgba(239,68,68,0.15)' : 'none',
                                    transition: 'border 0.2s, box-shadow 0.2s, background-color 0.2s',
                                }}
                            />
                        </div>
                        <button onClick={() => submitAnswer(isListening ? liveTranscript : undefined)} disabled={!(isListening ? liveTranscript : userInput).trim() || isLoading}
                            style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (!userInput.trim() || isLoading) ? 0.5 : 1 }}>
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
                <button
                    onClick={toggleListening}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isListening ? 'var(--color-danger)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                <button
                    onClick={toggleCamera}
                    title={isCamOn ? 'Turn off camera' : 'Turn on camera'}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isCamOn ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', border: isCamOn ? '2px solid rgba(255,255,255,0.3)' : 'none' }}>
                    {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>

                <button
                    onClick={() => setShowEditor(!showEditor)}
                    title="Toggle Code Editor"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: showEditor ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <SquareTerminal size={20} />
                </button>

                {!showTranscript && (
                    <button onClick={() => setShowTranscript(true)} title="Show Transcript"
                        style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Layout size={20} />
                    </button>
                )}

                <button
                    onClick={endInterview}
                    disabled={isFinishing}
                    style={{ padding: '0 1.5rem', height: '48px', borderRadius: '24px', backgroundColor: 'var(--color-danger)', color: 'white', fontWeight: 600, marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isFinishing ? 0.7 : 1 }}>
                    {isFinishing ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Ending...</> : '⏹ End Interview'}
                </button>
            </div>

        </div>
    );
};

export default ActiveInterview;
