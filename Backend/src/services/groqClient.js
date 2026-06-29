const { getGroqClient } = require('../config/groq');

// Export singleton Groq client instance with failover rotation logic
const groq = getGroqClient();

module.exports = groq;
