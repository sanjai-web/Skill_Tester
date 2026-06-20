const admin = require('firebase-admin');
require('dotenv').config();

let db;
let auth;

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (projectId && clientEmail && privateKey) {
    if (!admin.apps.length) {
        privateKey = privateKey.trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        // Replace all backslashes with newlines to repair typos like \a instead of \n
        privateKey = privateKey.replace(/\\/g, '\n');
        const lines = privateKey.split('\n').map(l => l.trim()).filter(Boolean);
        privateKey = lines.join('\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }
    db = admin.firestore();
    auth = admin.auth();
} else {
    console.warn('⚠️ FIREBASE_PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY is missing. Initializing mock offline Firestore.');
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: projectId || 'mock-project-id'
        });
    }
    db = admin.firestore();
    auth = {
        verifyIdToken: async () => ({ uid: 'mock-uid' })
    };
}

module.exports = { admin, db, auth };
