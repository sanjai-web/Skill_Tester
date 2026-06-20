const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const sttController = require('../controllers/sttController');

// Accept up to 10MB audio blobs (a 30-second webm chunk is typically 200-400KB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

// @route  POST /api/stt/transcribe
// @desc   Transcribe an audio chunk using Groq Whisper
// @auth   Required
router.post('/transcribe', authMiddleware, upload.single('audio'), sttController.transcribeAudio);

module.exports = router;
