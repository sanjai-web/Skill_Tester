const authService = require('../services/authService');
const { db } = require('../config/firebase');

// POST /api/auth/register  — creates the user in Firebase Auth + Firestore
exports.register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ status: 'error', message: 'Please provide name, email, and password' });
        }
        if (password.length < 6) {
            return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
        }

        const user = await authService.registerUser(email, password, name);
        res.status(201).json({
            status: 'success',
            message: 'User registered successfully. Please sign in.',
            data: { uid: user.uid, email: user.email, name: user.name },
        });
    } catch (error) {
        console.error('Register Error:', error.message);
        // Map Firebase Auth error codes to friendly messages
        const msg = error.code === 'auth/email-already-exists'
            ? 'An account with this email already exists.'
            : error.message || 'Registration failed. Please try again.';
        res.status(400).json({ status: 'error', message: msg });
    }
};

// GET /api/auth/me  — returns the current user's profile from Firestore
exports.getMe = async (req, res) => {
    try {
        const doc = await db.collection('users').doc(req.user.id).get();
        if (!doc.exists) {
            return res.status(404).json({ status: 'error', message: 'User profile not found.' });
        }
        res.status(200).json({ status: 'success', data: doc.data() });
    } catch (error) {
        console.error('GetMe Error:', error.message);
        res.status(500).json({ status: 'error', message: 'Could not fetch user profile.' });
    }
};
