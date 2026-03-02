import React, { createContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
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
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();
            setToken(idToken);

            // Fetch Firestore profile
            const res = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            setUser(res.data.data);

            return { success: true };
        } catch (error) {
            const msg = getFirebaseErrorMessage(error.code);
            return { success: false, message: msg };
        }
    };

    const register = async (name, email, password) => {
        try {
            // 1. Call backend to create user in Firebase Auth + Firestore
            await api.post('/auth/register', { name, email, password });

            // 2. Sign in immediately after registration
            const result = await login(email, password);
            return result;
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
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
