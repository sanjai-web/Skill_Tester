const express = require('express');
const router = express.Router();
const multer = require('multer');
const interviewController = require('../controllers/interviewController');
const authMiddleware = require('../middleware/authMiddleware');
const { aiLimiter } = require('../middleware/rateLimiter');

// Setup Multer for memory storage (direct buffer access)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// @route   GET /api/interviews
// @desc    Get all interviews for the logged-in user
router.get('/', authMiddleware, interviewController.getUserInterviews);

// @route   GET /api/interviews/subscription
// @desc    Get the current user's subscription info
router.get('/subscription', authMiddleware, interviewController.getUserSubscription);

// @route   GET /api/interviews/:id
// @desc    Get a single interview with all its questions/answers
router.get('/:id', authMiddleware, interviewController.getInterviewById);

// @route   POST /api/interviews/init
// @desc    Parse resume (file) and generate initial interview questions
router.post('/init', authMiddleware, aiLimiter, upload.single('resume'), interviewController.initializeInterview);

// @route   POST /api/interviews/next
// @desc    Send user answer, get evaluation, and next question
router.post('/next', authMiddleware, aiLimiter, interviewController.evaluateAnswer);

// @route   POST /api/interviews/code-eval
// @desc    Evaluate a coding submission and advance the section
router.post('/code-eval', authMiddleware, aiLimiter, interviewController.evaluateCodingSubmission);

// @route   POST /api/interviews/:id/finish
// @desc    Mark interview as complete and generate final score
router.post('/:id/finish', authMiddleware, interviewController.finishInterview);

module.exports = router;

