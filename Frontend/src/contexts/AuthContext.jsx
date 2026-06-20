import React, { createContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../services/firebase';
import api from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Listen for Firebase auth state changes (handles page refresh automatically)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const idToken = await firebaseUser.getIdToken();
                setToken(idToken);

                // Fetch full profile from Firestore via backend
                try {
                    const res = await api.get('/auth/me', {
                        headers: { Authorization: `Bearer ${idToken}` }
                    });
                    setUser(res.data.data);
                } catch {
                    // Fallback to Firebase auth data if Firestore not ready yet
                    setUser({ id: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || 'User' });
                }
            } else {
                setUser(null);
                setToken(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        // Step 1: Firebase Auth — hard failure (wrong password, user not found, etc.)
        let userCredential;
        try {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            return { success: false, message: getFirebaseErrorMessage(error.code) };
        }

        // Step 2: Get ID token
        const idToken = await userCredential.user.getIdToken();
        setToken(idToken);

        // Step 3: Fetch Firestore profile — soft failure (backend down = use Firebase fallback)
        try {
            const res = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            setUser(res.data.data);
        } catch {
            // Backend unreachable — fall back to Firebase user data, same as onAuthStateChanged
            const fb = userCredential.user;
            setUser({ id: fb.uid, email: fb.email, name: fb.displayName || 'User' });
        }

        return { success: true };
    };

    const register = async (name, email, password) => {
        try {
            await api.post('/auth/register', { name, email, password });
            const result = await login(email, password);
            return result;
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const loginWithGoogle = async () => {
        // Step 1: Firebase Google popup — hard failure
        let result;
        try {
            const provider = new GoogleAuthProvider();
            result = await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Google Login Error:', error);
            return { success: false, message: getFirebaseErrorMessage(error.code) };
        }

        const firebaseUser = result.user;
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);

        // Step 2: Sync with backend — soft failure
        try {
            await api.post('/auth/google', {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || 'Google User'
            }, { headers: { Authorization: `Bearer ${idToken}` } });
        } catch (err) {
            console.warn('Backend Google sync failed (non-fatal):', err.message);
        }

        // Step 3: Fetch Firestore profile — soft failure
        try {
            const res = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            setUser(res.data.data);
        } catch {
            setUser({ id: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.displayName || 'User' });
        }

        return { success: true };
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

function getFirebaseErrorMessage(code) {
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'Invalid email or password. Please try again.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        default:
            return 'Authentication failed. Please try again.';
    }
}
