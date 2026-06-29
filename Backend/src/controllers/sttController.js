
const { toFile } = require('groq-sdk');
const { getGroqClient } = require('../config/groq');


/**
 * POST /api/stt/transcribe
 * Accepts a raw audio blob (webm/ogg/mp4/wav) from the browser MediaRecorder.
 * Sends it to Groq Whisper for transcription.
 * Returns: { transcript: "..." }
 *
 * Accuracy improvements:
 *  - Uses whisper-large-v3 (full model — more accurate than turbo for interview speech)
 *  - Injects an interview-context prompt so Whisper biases toward tech/interview vocabulary
 *  - temperature: 0 forces deterministic (least hallucination-prone) output
 */
exports.transcribeAudio = async (req, res, next) => {
    try {
        const groq = getGroqClient();
        if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No audio data received.' });
        }

        // Determine MIME type from the upload; default to webm
        const mimeType = req.file.mimetype || 'audio/webm';

        // Map MIME to an extension Whisper accepts
        const extMap = {
            'audio/webm': 'webm',
            'audio/ogg':  'ogg',
            'audio/mp4':  'mp4',
            'audio/mpeg': 'mp3',
            'audio/wav':  'wav',
            'audio/wave': 'wav',
            'audio/x-wav':'wav',
        };
        const ext = extMap[mimeType] || 'webm';
        const filename = `audio.${ext}`;

        // Context prompt — biases Whisper toward interview/tech vocabulary.
        // Whisper uses this as a prior: words in the prompt are more likely to appear in the output.
        // This dramatically reduces hallucinations like "thank you for watching" on silence.
        const interviewPrompt =
            'This is a technical job interview. The candidate is answering questions about software ' +
            'engineering, programming, projects, experience, system design, algorithms, data structures, ' +
            'React, Node.js, Python, JavaScript, TypeScript, databases, APIs, cloud computing, and career goals. ' +
            'The candidate may speak in Indian English, mix English with Tamil (Tanglish), and mention Tamil names ' +
            'like Sukesh, Karthik, Selva, Murugan, etc. Please transcribe all spoken words, names, and mixed language accurately.';

        // Convert buffer → File-like object for Groq SDK
        const audioFile = await toFile(req.file.buffer, filename, { type: mimeType });

        const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-large-v3',   // Full model — significantly more accurate than turbo
            prompt: interviewPrompt,     // Domain context → reduces hallucination, improves vocab matching
            response_format: 'json',
            temperature: 0,             // Deterministic — least likely to hallucinate
        });

        const text = (transcription.text || '').trim();
        console.log(`[STT] Whisper transcribed ${req.file.buffer.length} bytes → "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
        return res.status(200).json({ status: 'success', data: { transcript: text } });
    } catch (error) {
        console.error('[STT] Groq Whisper error:', error.message || error);
        return res.status(500).json({ status: 'error', message: error.message || 'Groq Whisper transcription failed.' });
    }
};
