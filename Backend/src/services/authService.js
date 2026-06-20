const { auth, db } = require('../config/firebase');

const authService = {
    async registerUser(email, password, name) {
        // 1. Create user in Firebase Auth
        const userRecord = await auth.createUser({ email, password, displayName: name });

        // 2. Create Firestore user doc
        await db.collection('users').doc(userRecord.uid).set({
            id: userRecord.uid,
            email,
            name,
            plan_id: 'free',
            interviews_remaining: 4,
            subscription_status: 'active',
            created_at: new Date().toISOString(),
        });

        return { uid: userRecord.uid, email, name };
    },
};

module.exports = authService;
