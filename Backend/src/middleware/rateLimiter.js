const rateLimit = require('express-rate-limit');

// Generic API Rate Limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.' }
});

// Stricter Rate Limiter for AI Endpoints (prevent abuse)
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 AI requests per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'AI request limit reached, please try again later.' }
});

module.exports = { apiLimiter, aiLimiter };
