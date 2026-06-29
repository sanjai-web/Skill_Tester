require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy setup for reverse proxies (Render, Heroku, Cloudflare, Nginx, etc.)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
    crossOriginOpenerPolicy: false // Required for Google Login popup to work
}));
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'https://skilltester.app',
        'https://www.skilltester.app',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running' });
});

// Import Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/code', require('./routes/codeRoutes'));
app.use('/api/stt', require('./routes/sttRoutes'));

// Global Error Handler — always returns JSON, never HTML
app.use((err, req, res, next) => {
    // Always log full error on the server for debugging
    console.error(`[${new Date().toISOString()}] ERROR on ${req.method} ${req.originalUrl}:`, err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'An unexpected error occurred. Please try again.',
        // Only show stack trace in development mode
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

app.listen(PORT, async () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);

    // Firebase / Firestore connection check
    try {
        const { db } = require('./config/firebase');
        await db.collection('_healthcheck').limit(1).get();
        console.log('✅ Firebase Firestore connected successfully!');
    } catch (err) {
        console.error('❌ Firebase Firestore connection FAILED:', err.message);
    }
});
// Trigger nodemon restart
