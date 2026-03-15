const Razorpay = require('razorpay');
require('dotenv').config();

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

const paymentService = {
    async createOrder(amount, currency = 'INR') {
        const options = {
            amount: amount * 100, // amount in the smallest currency unit (e.g., cents/paise)
            currency,
            receipt: `receipt_${Date.now()}`
        };

        try {
            const order = await razorpayInstance.orders.create(options);
            return order;
        } catch (error) {
            console.error('Full Razorpay Error:', error);
            throw new Error(error.message || 'Unknown Razorpay error occurred');
        }
    },

    verifySignature(orderId, paymentId, signature) {
        const crypto = require('crypto');
        const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

        const generatedSignature = crypto
            .createHmac('sha256', secret)
            .update(orderId + '|' + paymentId)
            .digest('hex');

        return generatedSignature === signature;
    }
};

module.exports = paymentService;
