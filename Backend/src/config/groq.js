const Groq = require('groq-sdk');

// Parse keys from GROQ_API_KEYS if present, otherwise default to GROQ_API_KEY as a single-item array
const keys = (() => {
    if (process.env.GROQ_API_KEYS) {
        return process.env.GROQ_API_KEYS.split(',')
            .map(k => k.trim())
            .filter(Boolean);
    }
    if (process.env.GROQ_API_KEY) {
        return [process.env.GROQ_API_KEY.trim()];
    }
    return [];
})();

let currentIndex = 0;

/**
 * Returns a dynamically selected Groq API key from the available pool.
 * Rotates through keys using a round-robin strategy.
 * @returns {string}
 */
function getApiKey() {
    if (keys.length === 0) {
        return '';
    }
    const key = keys[currentIndex];
    currentIndex = (currentIndex + 1) % keys.length;
    return key;
}

/**
 * Wrapper class around Groq SDK client to support automatic failover/retry.
 * If a request fails, it rotates to the next API key and retries the request.
 */
class GroqClientWrapper {
    constructor() {
        this.chat = {
            completions: {
                create: async (params) => {
                    return this._executeWithRetry((client) => client.chat.completions.create(params));
                }
            }
        };
        this.audio = {
            transcriptions: {
                create: async (params) => {
                    return this._executeWithRetry((client) => client.audio.transcriptions.create(params));
                }
            }
        };
    }

    async _executeWithRetry(fn) {
        let attempts = Math.max(1, keys.length);
        let lastError;
        for (let i = 0; i < attempts; i++) {
            const apiKey = getApiKey();
            if (!apiKey) {
                throw new Error('No GROQ_API_KEY or GROQ_API_KEYS found in environment variables.');
            }
            const client = new Groq({ apiKey });
            try {
                return await fn(client);
            } catch (err) {
                // Log key failure (masking key for security)
                const maskedKey = apiKey.length > 8 ? `...${apiKey.slice(-6)}` : '***';
                console.error(`❌ Groq request failed using API Key ${maskedKey}: ${err.message}`);
                lastError = err;
                if (keys.length <= 1) {
                    break; // No other keys to try
                }
                console.log(`🔄 Rotating API keys. Retrying request...`);
            }
        }
        throw lastError;
    }
}

/**
 * Returns a wrapper client instance that delegates to rotated keys with retries.
 * @returns {GroqClientWrapper}
 */
function getGroqClient() {
    if (keys.length === 0) {
        console.warn('⚠️ Warning: No GROQ_API_KEY or GROQ_API_KEYS found in environment variables.');
    }
    return new GroqClientWrapper();
}

module.exports = {
    getApiKey,
    getGroqClient
};
