const express = require('express');
const router = express.Router();
const codeController = require('../controllers/codeController');
const authMiddleware = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

// @route   POST /api/code/run
// @desc    Execute code server-side and return stdout/stderr
// Only authenticated users can run code; rate-limited to prevent abuse
router.post('/run', authMiddleware, apiLimiter, codeController.runCode);

module.exports = router;
