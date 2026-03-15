const admin = require('firebase-admin');
require('dotenv').config();

if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
        // Handle escaped newlines (\n) if present, or use the raw string
        privateKey = privateKey.replace(/\\n/g, '\n').trim();
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}


const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
