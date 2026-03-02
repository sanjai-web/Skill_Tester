import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Automatically attach the latest Firebase ID Token to every request
api.interceptors.request.use(
    async (config) => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            // getIdToken(true) forces refresh if the token is expired
            const idToken = await currentUser.getIdToken();
            config.headers.Authorization = `Bearer ${idToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
