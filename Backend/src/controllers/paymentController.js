const paymentService = require('../services/paymentService');
const { db } = require('../config/firebase');

exports.createOrder = async (req, res, next) => {
    try {
        const { planId } = req.body;
        if (!planId) {
            return res.status(400).json({ status: 'error', message: 'Please provide a planId.' });
        }

        const planPrices = { basic: 89, intermediate: 250, pro: 479 };
        const amount = planPrices[planId];
        if (!amount) {
            return res.status(400).json({ status: 'error', message: `Invalid plan: "${planId}". Valid options are: basic, intermediate, pro.` });
        }

        try {
            // Change currency to INR as it's standard for Razorpay India accounts
            const order = await paymentService.createOrder(amount, 'INR');
            
            // Store the order details in Firestore to prevent planId tampering during verification
            await db.collection('orders').doc(order.id).set({
                user_id: req.user.id,
                plan_id: planId,
                amount: amount,
                status: 'created',
                created_at: new Date().toISOString()
            });

            res.status(200).json({
                status: 'success',
                data: { orderId: order.id, amount: order.amount, currency: order.currency }
            });
        } catch (razorpayError) {
            console.error('Razorpay Order Error Details:', razorpayError);
            res.status(502).json({ 
                status: 'error', 
                message: `Payment gateway error: ${razorpayError.message}`,
                details: razorpayError.description || null 
            });
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

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ status: 'error', message: 'Missing payment verification fields.' });
        }

        const isValid = paymentService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) {
            return res.status(400).json({ status: 'error', message: 'Payment verification failed. Signature mismatch.' });
        }

        // Fetch the original order to get the trusted planId
        const orderDoc = await db.collection('orders').doc(razorpay_order_id).get();
        if (!orderDoc.exists) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }
        
        const trustedPlanId = orderDoc.data().plan_id;
        if (orderDoc.data().user_id !== userId) {
             return res.status(403).json({ status: 'error', message: 'Unauthorized order.' });
        }

        const planLimits = { basic: 3, intermediate: 10, pro: 23 };
        const newInterviewsCount = planLimits[trustedPlanId] || 0;

        // Update subscription info in the user's Firestore document
        await db.collection('users').doc(userId).update({
            plan_id: trustedPlanId,
            interviews_remaining: newInterviewsCount,
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
        });

        // Mark order as paid
        await db.collection('orders').doc(razorpay_order_id).update({
            status: 'paid',
            completed_at: new Date().toISOString()
        });

        res.status(200).json({ status: 'success', message: `Subscription upgraded to ${trustedPlanId} successfully!` });
    } catch (error) {
        console.error('verifyPayment Error:', error.message);
        next(error);
    }
};
