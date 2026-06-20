import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Layout, SquareTerminal, X, Send, Loader, Play, ChevronDown } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../services/api';

// Language configs
const LANGUAGES = {
    whiteboard: { label: 'Whiteboard', monacoLang: 'javascript', canRun: false, defaultCode: 'This is Whiteboard For your RoughWork' },
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

const cleanRepeatedHallucinations = (text) => {
    if (!text) return '';

    // 1. Check for known Whisper silence/noise hallucinations
    // Whisper often generates these phrases on silence or background noise.
    const normalized = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?!]/g, "").replace(/\s+/g, " ").trim();
    const HALLUCINATIONS = [
        // YouTube/social media artifacts
        'thank you for watching', 'thanks for watching', 'please subscribe',
        'like and subscribe', 'dont forget to subscribe', 'hit the subscribe button',
        'subtitles by', 'subtitle by', 'english translation by', 'closed captions by',
        'transcribed by', 'transcription by',
        // Common silence hallucinations
        'i am so kids', 'cannot get graduated', 'dressings to that',
        'cant get my dress on', 'get my dress on',
        'thank you so much for watching', 'thank you so much',
        'see you in the next video', 'see you next time',
        'this video is brought to you',
        // Music/noise artifacts
        'music playing', 'background music', 'applause',
        // Common short noise hallucinations (only if that is the ENTIRE transcript)
    ];

    for (const h of HALLUCINATIONS) {
        if (normalized === h || normalized.startsWith(h + ' ') || normalized.endsWith(' ' + h)) {
            return '';
        }
    }

    // Also reject if the entire transcript is very short (< 3 words) AND is a known filler
    const SHORT_NOISE = ['um', 'uh', 'hmm', 'hm', 'mm', 'mhm', 'ah', 'oh', 'ok', 'okay'];
    const wordList = normalized.split(/\s+/).filter(Boolean);
    if (wordList.length <= 2 && wordList.every(w => SHORT_NOISE.includes(w))) {
        return '';
    }

    // 2. Remove consecutive word repetitions (e.g. "I I am am working")
    const words = text.split(/\s+/);
    const cleaned = [];
    let count = 0;
    for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?!]/g, '');
        const prevWord = cleaned[cleaned.length - 1]?.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?!]/g, '');

        if (word === prevWord && word.length > 1) {
            count++;
            if (count < 2) cleaned.push(words[i]); // Allow max 1 repetition
        } else {
            count = 0;
            cleaned.push(words[i]);
        }
    }
    return cleaned.join(' ');
};

const ActiveInterview = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Get sessionStorage saved state to survive page refreshes
    const savedState = (() => {
        try {
            const saved = sessionStorage.getItem('active_interview_state');
            return saved ? JSON.parse(saved) : null;
        } catch (_) {
            return null;
        }
    })();

    const stateSource = location.state || savedState || {};
    const {
        interviewId,
        firstQuestion,
        sections,
        hasTechJD,
        role = 'Software Engineer',
        company = ''
    } = stateSource;

    const [isCamOn, setIsCamOn] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [showTranscript, setShowTranscript] = useState(true);
    const [timer, setTimer] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinishing, setIsFinishing] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [transcript, setTranscript] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(() => {
        return location.state?.firstQuestion || savedState?.currentQuestion || '';
    });
    const [codingProblem, setCodingProblem] = useState(null);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(() => {
        return savedState?.currentSectionIndex || 0;
    });
    const [sectionQuestionCount, setSectionQuestionCount] = useState(() => {
        return savedState?.sectionQuestionCount || 1;
    });
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [selectedLang, setSelectedLang] = useState('whiteboard');
    const [codeOutput, setCodeOutput] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [sttStatus, setSttStatus] = useState('idle'); // 'idle', 'connecting', 'listening', 'denied', 'error'
    const [modelLoading, setModelLoading] = useState(false);
    const [modelProgress, setModelProgress] = useState(0);
    const [modelReady, setModelReady] = useState(true);
    const [sttMode, setSttMode] = useState('server'); // 'browser' or 'server' — Whisper ('server') is the default on all platforms

    // ─────────────────────────────────────────────────────────────
    // SPEECH RECOGNITION REFS (Native Web Speech API)
    // ─────────────────────────────────────────────────────────────
    const wantListeningRef = useRef(false);
    const recognitionRef = useRef(null);
    const isAiSpeakingRef = useRef(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Initialize browser support check on mount.
    // NOTE: Whisper (server mode) works on ALL browsers — no browser check needed for it.
    // The browser check below only affects the fallback Native Browser mode.
    useEffect(() => {
        const checkBrowserSTTSupport = async () => {
            // Whisper is the default and works everywhere — always start as ready.
            // Only check native browser STT support for users who manually switch to that mode.
            const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognitionClass) {
                // Native browser STT unsupported (Firefox, Brave without Google services).
                // Whisper mode still works fine — just mark native as unsupported.
                setSttStatus('unsupported');
            } else {
                setSttStatus('ready');
            }
        };
        checkBrowserSTTSupport();
    }, []);

    const transcriptEndRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const editorCodeRef = useRef(LANGUAGES.whiteboard.defaultCode);
    const selectedVoiceRef = useRef(null);

    // ── Inject keyframe animations once ───────────────────────
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
            @keyframes waveBar {
                from { transform: scaleY(0.4); }
                to   { transform: scaleY(1.4); }
            }
        `;
        document.head.appendChild(style);
    }, []);

    // ─────────────────────────────────────────────────────────────
    // LOCAL NATIVE SPEECH ENGINE
    // ─────────────────────────────────────────────────────────────
    const startRecognitionInstance = useCallback(() => {
        if (!wantListeningRef.current) return;

        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionClass) {
            setSttStatus('unsupported');
            return;
        }

        try {
            const recognition = new SpeechRecognitionClass();
            recognitionRef.current = recognition;

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-IN';

            recognition.onstart = () => {
                setIsListening(true);
                setSttStatus('listening');
                console.log('[SpeechRecognition] Started listening.');
            };

            recognition.onresult = (e) => {
                if (isAiSpeakingRef.current) return; // Ignore results if AI is currently speaking

                let interimText = '';
                let finalText = '';

                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    const result = e.results[i];
                    if (result.isFinal) {
                        // Confidence filter: discard very low-confidence finals (< 0.5)
                        // A confidence of 0 usually means the API couldn't determine it
                        const confidence = result[0].confidence;
                        if (confidence !== undefined && confidence > 0 && confidence < 0.3) {
                            console.log(`[STT] Discarded low-confidence result (${confidence.toFixed(2)}):`, result[0].transcript);
                            continue;
                        }
                        const cleaned = cleanRepeatedHallucinations(result[0].transcript);
                        if (cleaned) finalText += cleaned + ' ';
                    } else {
                        interimText += result[0].transcript;
                    }
                }

                finalText = finalText.trim();
                if (finalText) {
                    setUserInput(prev => {
                        const trimmedPrev = prev.trim();
                        return trimmedPrev ? trimmedPrev + ' ' + finalText : finalText;
                    });
                    setLiveTranscript('');
                } else if (interimText) {
                    setLiveTranscript(interimText.trim());
                }
            };

            recognition.onerror = (e) => {
                console.error('[SpeechRecognition] Error:', e.error);
                if (e.error === 'not-allowed') {
                    setSttStatus('denied');
                    alert('Microphone access denied. Please allow microphone access in your browser settings.');
                    wantListeningRef.current = false;
                    setIsListening(false);
                } else if (e.error === 'service-not-allowed') {
                    setSttStatus('denied');
                    alert('Speech Recognition service is not allowed. If you are using Brave, please go to settings, search for "Google Services", and enable "Use Google Services for speech-to-text". Otherwise, please use Chrome, Safari, or Edge.');
                    wantListeningRef.current = false;
                    setIsListening(false);
                } else if (e.error === 'network') {
                    setSttStatus('error: network');
                    setIsListening(false);
                    wantListeningRef.current = false;
                    const confirmSwitch = window.confirm(
                        'Speech Recognition returned a network error.\n\n' +
                        'This is common in Brave browser, custom Chromium browsers, or on restricted networks.\n\n' +
                        'Would you like to switch to "Whisper Cloud" voice input mode instead? (Requires configured GROQ_API_KEY)'
                    );
                    if (confirmSwitch) {
                        setSttMode('server');
                        setSttStatus('ready');
                    }
                } else if (e.error === 'aborted') {
                    // Handled gracefully by the onend restart behavior
                } else if (e.error === 'no-speech') {
                    // Expected when user is quiet. Let it fall through to onend to restart.
                } else {
                    // Prevent infinite restart loops for other unexpected critical errors
                    setSttStatus(`error: ${e.error}`);
                    wantListeningRef.current = false;
                    setIsListening(false);
                }
            };

            recognition.onend = () => {
                console.log('[SpeechRecognition] Stopped listening.');
                // Auto-restart if user wants listening and AI is silent
                if (wantListeningRef.current) {
                    if (isAiSpeakingRef.current) {
                        setSttStatus('silent'); // Renders as "Waiting for speech..."
                    } else {
                        console.log('[SpeechRecognition] Auto-restarting continuous listener...');
                        try {
                            recognition.start();
                        } catch (err) {
                            console.error('[SpeechRecognition] Auto-restart failed:', err);
                        }
                    }
                } else {
                    setIsListening(false);
                    setSttStatus('ready');
                }
            };

            recognition.start();

        } catch (err) {
            console.error('[SpeechRecognition] Initiation error:', err);
            setSttStatus(`error: ${err.message}`);
            setIsListening(false);
            wantListeningRef.current = false;
        }
    }, []);

    const toggleServerListening = useCallback(async () => {
        if (isListening) {
            // STOP RECORDING
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try {
                    mediaRecorderRef.current.stop();
                } catch (err) {
                    console.error('[Server STT] Error stopping MediaRecorder:', err);
                }
            }
            setIsListening(false);
            setSttStatus('ready');
        } else {
            // START RECORDING
            // Interrupt any running AI text-to-speech immediately
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            setIsAiSpeaking(false);
            isAiSpeakingRef.current = false;

            try {
                // Request higher audio quality for better Whisper accuracy
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        channelCount: { ideal: 1 }, // Mono is sufficient for speech; reduces file size
                        // Removed hard sampleRate: 16000 to prevent OverconstrainedError on some systems/browsers
                    }
                });
                audioChunksRef.current = [];

                // Pick the best supported MIME type
                // audio/webm;codecs=opus gives the best quality/size tradeoff
                let mimeType = '';
                const preferredTypes = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/ogg;codecs=opus',
                    'audio/ogg',
                    'audio/mp4',
                ];
                for (const type of preferredTypes) {
                    if (MediaRecorder.isTypeSupported(type)) {
                        mimeType = type;
                        break;
                    }
                }

                const options = mimeType ? { mimeType } : undefined;
                const recorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        audioChunksRef.current.push(e.data);
                    }
                };

                recorder.onstop = async () => {
                    // Stop all tracks on the stream to release the microphone
                    stream.getTracks().forEach(track => track.stop());

                    if (audioChunksRef.current.length === 0) {
                        console.warn('[Server STT] No audio chunks captured.');
                        return;
                    }

                    // Combine all chunks into a single blob.
                    // KEY FIX: Sending a single complete blob (not fragments) dramatically
                    // improves Whisper accuracy — it needs full sentence context.
                    const finalMime = mimeType || recorder.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
                    console.log(`[Server STT] Sending ${(audioBlob.size / 1024).toFixed(1)}KB audio blob for transcription`);

                    setIsLoading(true);
                    setSttStatus('connecting');

                    try {
                        const formData = new FormData();
                        // Extract base extension without codec params (webm;codecs=opus → webm)
                        const baseType = finalMime.split(';')[0];
                        const ext = baseType.split('/')[1] || 'webm';
                        formData.append('audio', audioBlob, `audio.${ext}`);

                        const response = await api.post('/stt/transcribe', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });

                        if (response.data?.status === 'success' && response.data.data?.transcript) {
                            const rawText = response.data.data.transcript.trim();
                            // Run hallucination filter on Whisper output too
                            const newText = cleanRepeatedHallucinations(rawText);
                            if (newText) {
                                setUserInput(prev => {
                                    const trimmedPrev = prev.trim();
                                    return trimmedPrev ? trimmedPrev + ' ' + newText : newText;
                                });
                            }
                        }
                    } catch (err) {
                        console.error('[Server STT] Transcription error:', err);
                        if (err.response?.status === 400 || err.response?.data?.message?.includes('restricted') || err.message?.includes('restricted')) {
                            alert(
                                'Transcription failed: The backend GROQ_API_KEY is restricted.\n\n' +
                                'Please update c:\\interviewer\\Skill_Tester\\Backend\\.env with a valid Groq API Key to use this feature.'
                            );
                        } else {
                            alert('Transcription failed: ' + (err.response?.data?.message || err.message));
                        }
                    } finally {
                        setIsLoading(false);
                        setSttStatus('ready');
                    }
                };

                // KEY FIX: No timeslice argument → recorder collects into one blob.
                // The old recorder.start(250) was splitting audio into 250ms fragments,
                // which meant each Whisper call had almost no context. Sending the
                // complete recording gives Whisper the full sentence to decode.
                recorder.start();
                setIsListening(true);
                setSttStatus('listening');
                console.log('[Server STT] Started recording with mimeType:', mimeType || 'default (browser chosen)');
            } catch (err) {
                console.error('[Server STT] Media stream error:', err);
                alert('Could not access microphone: ' + err.message);
                setIsListening(false);
                setSttStatus('ready');
            }
        }
    }, [isListening]);

    const toggleListening = useCallback(() => {
        if (sttMode === 'server') {
            toggleServerListening();
            return;
        }

        if (sttStatus === 'brave-blocked') {
            const confirmSwitch = window.confirm(
                'Speech Recognition is blocked by Brave Browser by default (as it relies on Google cloud services).\n\n' +
                'Would you like to switch to "Whisper Cloud" voice input mode instead?'
            );
            if (confirmSwitch) {
                setSttMode('server');
                setSttStatus('ready');
                setTimeout(() => toggleServerListening(), 100);
            }
            return;
        }

        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionClass) {
            alert('Speech Recognition is not supported in this browser. Please switch to "Whisper Cloud" mode above.');
            return;
        }

        if (wantListeningRef.current) {
            // ─── STOP ───────────────────────────────────────────
            wantListeningRef.current = false;
            setIsListening(false);
            setSttStatus('ready');

            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) {}
            }
            setLiveTranscript('');
        } else {
            // ─── START ──────────────────────────────────────────
            // Interrupt any running AI text-to-speech immediately
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            setIsAiSpeaking(false);
            isAiSpeakingRef.current = false;

            setLiveTranscript('');
            wantListeningRef.current = true;
            startRecognitionInstance();
        }
    }, [startRecognitionInstance, sttStatus, sttMode, toggleServerListening]);

    // ── Speech recognition cleanup on unmount ───────────────────
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) {}
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try { mediaRecorderRef.current.stop(); } catch (_) {}
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

    // Warn candidate before refreshing/leaving the active interview
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isFinishing) return;
            e.preventDefault();
            e.returnValue = ''; // Trigger native browser confirmation dialog
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isFinishing]);

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
            setCodingProblem(null); setShowEditor(false); setCodeOutput(null);

            // Speak the AI feedback first; only advance the section AFTER speech ends
            // so the user sees/hears the evaluation before the phase tab jumps.
            if (advanceSection) {
                speakThenAdvance(nextQuestion, nextSection);
            } else {
                speak(nextQuestion);
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

        utterance.onstart = () => {
            setIsAiSpeaking(true);
            isAiSpeakingRef.current = true;
        };

        utterance.onend = () => {
            setIsAiSpeaking(false);
            isAiSpeakingRef.current = false;
        };

        utterance.onerror = () => {
            setIsAiSpeaking(false);
            isAiSpeakingRef.current = false;
        };

        window.speechSynthesis.speak(utterance);
    };

    // Speaks the AI text and only advances the section tab AFTER speech finishes,
    // so the user hears the evaluation feedback before the phase changes.
    const speakThenAdvance = (text, nextSection) => {
        if (!('speechSynthesis' in window)) {
            // No TTS — advance immediately
            const nextIdx = SECTIONS.findIndex(s => s.id === nextSection);
            setCurrentSectionIndex(prev =>
                nextIdx !== -1 && nextIdx > prev ? nextIdx : Math.min(prev + 1, SECTIONS.length - 1)
            );
            setSectionQuestionCount(1);
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (selectedVoiceRef.current) utterance.voice = selectedVoiceRef.current;
        utterance.rate = 0.95; utterance.pitch = 1.1;

        utterance.onstart = () => {
            setIsAiSpeaking(true);
            isAiSpeakingRef.current = true;
        };

        const advanceSection = () => {
            setIsAiSpeaking(false);
            isAiSpeakingRef.current = false;
            const nextIdx = SECTIONS.findIndex(s => s.id === nextSection);
            setCurrentSectionIndex(prev =>
                nextIdx !== -1 && nextIdx > prev ? nextIdx : Math.min(prev + 1, SECTIONS.length - 1)
            );
            setSectionQuestionCount(1);
        };

        utterance.onend = advanceSection;
        utterance.onerror = advanceSection;

        window.speechSynthesis.speak(utterance);
    };

    // Keep saved state synced in sessionStorage to survive page refreshes
    useEffect(() => {
        if (interviewId) {
            try {
                sessionStorage.setItem('active_interview_state', JSON.stringify({
                    interviewId,
                    firstQuestion,
                    sections,
                    hasTechJD,
                    role,
                    company,
                    currentSectionIndex,
                    sectionQuestionCount,
                    currentQuestion
                }));
            } catch (_) { }
        }
    }, [interviewId, currentSectionIndex, sectionQuestionCount, currentQuestion]);

    useEffect(() => {
        const initOrRestore = async () => {
            if (location.state && firstQuestion) {
                // Fresh start
                setTranscript([{ from: 'ai', text: firstQuestion }]);
                speak(firstQuestion);
            } else if (interviewId) {
                // Restoring from a page refresh!
                setIsLoading(true);
                try {
                    const res = await api.get(`/interviews/${interviewId}`);
                    const interview = res.data.data;
                    const questions = interview.questions || [];

                    // Reconstruct transcript from Q&A history
                    const reconstructed = [];
                    // Sort questions by created_at time
                    questions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                    questions.forEach(q => {
                        if (q.question_text) {
                            reconstructed.push({ from: 'ai', text: q.question_text });
                        }
                        if (q.user_answer) {
                            reconstructed.push({ from: 'user', text: q.user_answer });
                        }
                    });
                    setTranscript(reconstructed);

                    // Find if the last question is pending an answer
                    const lastQ = questions[questions.length - 1];
                    if (lastQ && !lastQ.user_answer) {
                        setCurrentQuestion(lastQ.question_text);
                    }
                } catch (err) {
                    console.error("Failed to restore interview transcript:", err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                navigate('/setup');
            }
        };

        initOrRestore();
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

        // Stop STT engine if running
        if (wantListeningRef.current) {
            wantListeningRef.current = false;
            setIsListening(false);
            setSttStatus('ready');
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) {}
            }
        }
        setLiveTranscript('');

        try {
            const response = await api.post('/interviews/next', {
                interviewId, currentQuestion, answer, role, company, section: sectionId,
                sectionQuestionCount, hasTechJD: !!hasTechJD, conversationHistory: updatedTranscript.slice(-8),
            });
            const { nextQuestion, advanceSection, nextSection, isCodingProblem, isAnswerRelevant } = response.data.data;
            setTranscript(prev => [...prev, { from: 'ai', text: nextQuestion }]);
            setCurrentQuestion(nextQuestion);
            speak(nextQuestion);
            if (isCodingProblem) { setCodingProblem(nextQuestion); setShowEditor(true); return; }
            if (advanceSection) {
                const nextIdx = SECTIONS.findIndex(s => s.id === nextSection);
                setCurrentSectionIndex(nextIdx !== -1 && nextIdx > currentSectionIndex ? nextIdx : prev => Math.min(prev + 1, SECTIONS.length - 1));
                setSectionQuestionCount(1);
            } else {
                if (isAnswerRelevant !== false) {
                    setSectionQuestionCount(prev => prev + 1);
                }
            }
        } catch (err) {
            setTranscript(prev => [...prev, { from: 'ai', text: err.response?.data?.message || 'AI is unavailable. Please try again.' }]);
        } finally { setIsLoading(false); }
    };

    const endInterview = async () => {
        if (isFinishing) return;

        const confirmEnd = window.confirm("Are you sure you want to end the interview? This will submit your answers for grading and generate your final report.");
        if (!confirmEnd) return;

        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);

        // Clear saved session state so they don't resume a finished interview
        try { sessionStorage.removeItem('active_interview_state'); } catch (_) { }

        if (!interviewId) { navigate('/dashboard'); return; }
        setIsFinishing(true);
        try {
            const response = await api.post(`/interviews/${interviewId}/finish`);
            navigate(`/results/${response.data.data.interviewId}`);
        } catch (_) { navigate(`/results/${interviewId}`); }
    };

    const currentSection = SECTIONS[currentSectionIndex];
    const displayText = isListening
        ? (userInput.trim() ? userInput.trim() + ' ' + liveTranscript : liveTranscript)
        : userInput;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a', overflow: 'hidden' }}>

            {/* Top Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 2rem', backgroundColor: 'rgba(30, 41, 59, 0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--color-primary)' }}>Skilltester.app</h1>
                    <span style={{ color: 'var(--color-text-muted)' }}>|</span>
                    <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 500 }}>{role}{company ? ` @ ${company}` : ''}</h2>
                    <span style={{ color: 'var(--color-text-muted)' }}>|</span>
                    <span style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontFamily: 'monospace' }} title="Time elapsed in interview">
                        ⏱️ {formatTime(timer)}
                    </span>
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
                                    {codingProblem && (
                                        <button onClick={submitCodeToAI} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.9rem', borderRadius: '6px', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 600, fontSize: '0.82rem', opacity: isLoading ? 0.7 : 1 }}>
                                            {isLoading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Send size={12} /> Submit to AI</>}
                                        </button>
                                    )}
                                    <button onClick={() => setShowEditor(false)} style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
                                </div>
                            </div>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                {/* BUG 3 FIX: value bound to editorCodeRef.current so content persists across editor close/re-open */}
                                <Editor height="100%" language={LANGUAGES[selectedLang].monacoLang} theme="vs-dark"
                                    value={editorCodeRef.current}
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
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Voice Mode Selector Toggle */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    🎙️ Voice Input Mode:
                                </span>
                                <div style={{ display: 'flex', gap: '2px', backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px', borderRadius: '6px' }}>
                                    <button
                                        onClick={() => { if (!isListening) setSttMode('server'); }}
                                        disabled={isListening}
                                        title="Powered by Groq Whisper AI — works on all browsers (Chrome, Edge, Firefox, Brave, Safari)"
                                        style={{
                                            fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '4px', border: 'none', cursor: isListening ? 'not-allowed' : 'pointer',
                                            backgroundColor: sttMode === 'server' ? 'var(--color-primary)' : 'transparent',
                                            color: sttMode === 'server' ? 'white' : '#94a3b8',
                                            fontWeight: 600, transition: 'all 0.2s',
                                        }}>✨ Whisper AI (All Browsers)</button>
                                    <button
                                        onClick={() => { if (!isListening) setSttMode('browser'); }}
                                        disabled={isListening}
                                        title="Uses your browser's built-in speech engine — real-time, but Chrome/Edge only"
                                        style={{
                                            fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '4px', border: 'none', cursor: isListening ? 'not-allowed' : 'pointer',
                                            backgroundColor: sttMode === 'browser' ? 'rgba(148,163,184,0.2)' : 'transparent',
                                            color: sttMode === 'browser' ? 'white' : '#94a3b8',
                                            fontWeight: 600, transition: 'all 0.2s',
                                        }}>Browser Native (Chrome/Edge)</button>
                                </div>
                            </div>
                            <div style={{ position: 'relative', width: '100%' }}>
                                {isListening && (
                                    <div style={{ position: 'absolute', top: '8px', right: '10px', zIndex: 2, display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'none' }}>
                                        {sttMode === 'server' ? (
                                            sttStatus === 'connecting' ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#facc15', fontWeight: 600, backgroundColor: 'rgba(250,204,21,0.12)', padding: '2px 7px', borderRadius: '10px' }}>
                                                    <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} />
                                                    Transcribing...
                                                </span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, backgroundColor: 'rgba(34,197,94,0.12)', padding: '2px 7px', borderRadius: '10px' }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 1s infinite', display: 'inline-block' }} />
                                                    Recording...
                                                </span>
                                            )
                                        ) : (
                                            sttStatus === 'brave-blocked' ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600, backgroundColor: 'rgba(239,68,68,0.12)', padding: '2px 7px', borderRadius: '10px' }} title="Brave blocks Speech Recognition. Please use Google Chrome, Microsoft Edge, or Safari.">
                                                    ⚠️ Brave Blocked
                                                </span>
                                            ) : sttStatus === 'connecting' || sttStatus === 'reconnecting' ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#facc15', fontWeight: 600, backgroundColor: 'rgba(250,204,21,0.12)', padding: '2px 7px', borderRadius: '10px' }}>
                                                    <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} />
                                                    {sttStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
                                                </span>
                                            ) : sttStatus === 'listening' ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#4ade80', fontWeight: 600, backgroundColor: 'rgba(34,197,94,0.12)', padding: '2px 7px', borderRadius: '10px' }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e', animation: 'pulse 1s infinite', display: 'inline-block' }} />
                                                    Listening...
                                                </span>
                                            ) : sttStatus === 'silent' ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#86efac', fontWeight: 600, backgroundColor: 'rgba(34,197,94,0.12)', padding: '2px 7px', borderRadius: '10px' }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#a7f3d0', display: 'inline-block' }} />
                                                    Waiting for speech...
                                                </span>
                                            ) : sttStatus === 'denied' ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600, backgroundColor: 'rgba(239,68,68,0.12)', padding: '2px 7px', borderRadius: '10px' }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                                                    Mic Blocked
                                                </span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600, backgroundColor: 'rgba(239,68,68,0.12)', padding: '2px 7px', borderRadius: '10px' }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                                                    {sttStatus.startsWith('error') ? 'Speech Error' : 'Listening...'}
                                                </span>
                                            )
                                        )}
                                    </div>
                                )}
                                <textarea
                                    value={displayText}
                                    onChange={(e) => { if (!isListening) setUserInput(e.target.value); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(displayText); } }}
                                    placeholder={
                                        sttMode === 'server'
                                            ? (sttStatus === 'connecting'
                                                ? '✨ Transcribing your speech via Whisper AI...'
                                                : (isListening
                                                    ? '🎤 Recording... click the mic button again when done speaking.'
                                                    : '🎤 Click the mic to start recording — works on all browsers'))
                                            : (sttStatus === 'unsupported'
                                                ? '⚠️ Browser speech recognition is not supported here. Please switch to Whisper AI mode above.'
                                                : (isListening
                                                    ? '🎤 Listening in real-time... (Chrome/Edge only)'
                                                    : 'Type your answer or click the mic to speak... (Chrome/Edge only)'))
                                    }
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
                        </div>
                        <button onClick={() => submitAnswer(displayText)}
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
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(30, 41, 59, 0.9)' }}>
                {modelLoading && (
                    <div style={{ fontSize: '0.8rem', color: '#facc15', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Downloading local speech model: {modelProgress}% (first-time setup)
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={toggleListening} disabled={modelLoading} title={modelLoading ? `Loading speech model: ${modelProgress}%` : (isListening ? 'Stop listening' : 'Start voice input')}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: modelLoading ? 'rgba(255,255,255,0.05)' : (isListening ? '#22c55e' : '#dc2626'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: isListening ? '0 0 0 3px rgba(34,197,94,0.3)' : 'none', transition: 'all 0.2s', cursor: modelLoading ? 'not-allowed' : 'pointer' }}>
                        {isListening ? <Mic size={20} /> : <MicOff size={20} />}
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
            </div>

            {/* waveBar keyframe now injected in the shared useEffect above — this tag is no longer needed but kept for safety */}
        </div>
    );
};

export default ActiveInterview;
