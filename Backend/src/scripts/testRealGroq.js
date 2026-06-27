/**
 * testRealGroq.js
 *
 * Makes 4 consecutive simple API requests to verify that all 4 configured
 * Groq API keys are valid and connecting to the live Groq API successfully.
 */

require('dotenv').config();
const groq = require('../services/groqClient');

async function run() {
    console.log('🧪 Testing real connection to Groq API using rotated keys...\n');

    // We will trigger 4 requests. With 4 keys, this should rotate through every key once.
    const numberOfKeysToTest = 4;

    for (let i = 1; i <= numberOfKeysToTest; i++) {
        console.log(`\n📡 [Request #${i}] Sending chat completion...`);
        try {
            const response = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Respond with exactly one word: Success.' }],
                max_tokens: 10
            });
            console.log(`✅ [Request #${i}] Success! Response: "${response.choices[0]?.message?.content?.trim()}"`);
        } catch (error) {
            console.error(`❌ [Request #${i}] Failed:`, error.message || error);
        }
    }

    console.log('\n🏁 Connection test complete.');
}

run();
