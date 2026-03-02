const { auth } = require('../config/firebase');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized: No token provided' });
    }

    const idToken = authHeader.split(' ')[1];

    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = { id: decodedToken.uid, email: decodedToken.email };
        next();
    } catch (error) {
        console.error('Firebase Token Verification Error:', error.message);
        return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid or expired token' });
    }
};

module.exports = authMiddleware;
