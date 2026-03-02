const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/auth/register  — creates user in Firebase Auth + Firestore
router.post('/register', authController.register);

// @route   GET  /api/auth/me  — returns the current user's Firestore profile
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
