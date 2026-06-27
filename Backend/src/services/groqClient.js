const Groq = require('groq-sdk');
require('dotenv').config();

const keys = [];

// 1. Parse comma-separated keys from GROQ_API_KEYS
if (process.env.GROQ_API_KEYS) {
    process.env.GROQ_API_KEYS.split(',').map(k => k.trim()).forEach(k => {
        if (k && !keys.includes(k)) {
            keys.push(k);
        }
    });
}

// 2. Parse numbered keys GROQ_API_KEY_1, GROQ_API_KEY_2, etc. up to 10
for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k && !keys.includes(k.trim())) {
        keys.push(k.trim());
    }
}

// 3. Fallback to single GROQ_API_KEY
if (keys.length === 0 && process.env.GROQ_API_KEY) {
    keys.push(process.env.GROQ_API_KEY.trim());
}

if (keys.length === 0) {
    console.warn('⚠️ Warning: No GROQ API keys detected in environment variables!');
} else {
    console.log(`🚀 Loaded ${keys.length} Groq API key(s) for round-robin rotation.`);
}

// Initialize client instances for each valid key
const clients = keys.map(key => new Groq({ apiKey: key }));

let currentIndex = 0;

/**
 * Dynamically resolves a property path on an object (e.g., 'chat.completions.create')
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

/**
 * Executes a Groq SDK method with round-robin rotation and automatic failover retries.
 * @param {string} apiPath - Dot-separated method path, e.g. 'chat.completions.create'
 * @param {object} options - Arguments to pass to the method
 * @returns {Promise<any>}
 */
async function executeWithFailover(apiPath, options) {
    if (clients.length === 0) {
        throw new Error('No Groq API clients initialized. Please configure GROQ_API_KEY or GROQ_API_KEYS.');
    }

    let lastError = null;
    const totalClients = clients.length;

    // We attempt to call the API on each client at most once per request
    for (let attempt = 0; attempt < totalClients; attempt++) {
        // Select the next client index using round-robin rotation
        const clientIndex = currentIndex;
        currentIndex = (currentIndex + 1) % totalClients;

        const client = clients[clientIndex];
        console.log(`[Groq Rotation] Routing request to key #${clientIndex + 1} of ${totalClients} on '${apiPath}'`);

        try {
            // Find the SDK method
            const method = getNestedValue(client, apiPath);
            if (typeof method !== 'function') {
                throw new Error(`Method ${apiPath} not found on Groq client.`);
            }

            // Find the parent context so that `this` bindings remain correct (e.g., chat.completions)
            const pathParts = apiPath.split('.');
            const parentPath = pathParts.slice(0, -1).join('.');
            const parentContext = parentPath ? getNestedValue(client, parentPath) : client;

            // Execute the API call
            return await method.call(parentContext, options);
        } catch (error) {
            console.error(`❌ [Groq Rotation] Request failed on key #${clientIndex + 1}:`, error.message || error);
            lastError = error;
            // Continue the loop to try the next available key
        }
    }

    console.error('❌ [Groq Rotation] All configured Groq API keys failed.');
    throw lastError || new Error('All Groq API keys failed to execute the request.');
}

// Emulated Groq SDK instance interface
const groq = {
    chat: {
        completions: {
            create: async (options) => {
                return executeWithFailover('chat.completions.create', options);
            }
        }
    },
    audio: {
        transcriptions: {
            create: async (options) => {
                return executeWithFailover('audio.transcriptions.create', options);
            }
        }
    }
};

module.exports = groq;
