const paymentService = require('../services/paymentService');
const { db } = require('../config/firebase');

exports.createOrder = async (req, res, next) => {
    try {
        const { planId } = req.body;
        if (!planId) {
            return res.status(400).json({ status: 'error', message: 'Please provide a planId.' });
        }

        const planPrices = { basic: 1, intermediate: 3, pro: 5 };
        const amount = planPrices[planId];
        if (!amount) {
            return res.status(400).json({ status: 'error', message: `Invalid plan: "${planId}". Valid options are: basic, intermediate, pro.` });
        }

        try {
            const order = await paymentService.createOrder(amount, 'USD');
            res.status(200).json({
                status: 'success',
                data: { orderId: order.id, amount: order.amount, currency: order.currency }
            });
        } catch (razorpayError) {
            console.error('Razorpay Order Error:', razorpayError.message);
            res.status(502).json({ status: 'error', message: `Payment gateway error: ${razorpayError.message}` });
        }
    } catch (error) {
        console.error('createOrder Error:', error.message);
        next(error);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
        const userId = req.user.id;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
            return res.status(400).json({ status: 'error', message: 'Missing payment verification fields.' });
        }

        const isValid = paymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            return res.status(400).json({ status: 'error', message: 'Payment verification failed. Signature mismatch.' });
        }

        const planLimits = { basic: 3, intermediate: 10, pro: 23 };
        const newInterviewsCount = planLimits[planId] || 0;

        // Update subscription info in the user's Firestore document
        await db.collection('users').doc(userId).update({
            plan_id: planId,
            interviews_remaining: newInterviewsCount,
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
        });

        res.status(200).json({ status: 'success', message: `Subscription upgraded to ${planId} successfully!` });
    } catch (error) {
        console.error('verifyPayment Error:', error.message);
        next(error);
    }
};
