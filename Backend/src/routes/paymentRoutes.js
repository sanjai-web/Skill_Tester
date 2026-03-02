const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/payments/create-order
router.post('/create-order', authMiddleware, paymentController.createOrder);

// @route   POST /api/payments/verify
router.post('/verify', authMiddleware, paymentController.verifyPayment);

module.exports = router;
