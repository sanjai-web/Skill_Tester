/**
 * embeddingService.js
 *
 * Local TF-IDF keyword vectorizer — replaces the Gemini embedding API.
 * Produces a deterministic, normalized sparse vector from text tokens.
 * Zero external calls, works offline, sufficient for small question banks.
 *
 * Vector dimension: 512 (hashed vocabulary slots)
 */

const VECTOR_DIMENSION = 512;

// Common English stopwords to strip before vectorizing
const STOPWORDS = new Set([
    'a', 'an', 'the', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and',
    'or', 'but', 'not', 'with', 'this', 'that', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'from', 'by', 'as', 'if', 'then',
    'than', 'so', 'what', 'how', 'when', 'where', 'which', 'who', 'why',
    'your', 'you', 'we', 'they', 'he', 'she', 'i', 'me', 'my', 'our', 'their',
    'its', 'about', 'up', 'out', 'also', 'into', 'more', 'some', 'any', 'all',
    'just', 'there', 'these', 'those', 'use', 'used', 'using', 'like', 'one',
    'two', 'three', 'get', 'got', 'give', 'take', 'make', 'made', 'new', 'both'
]);

/**
 * Deterministic string hash → integer (djb2 variant)
 * @param {string} str
 * @returns {number}
 */
function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash | 0; // force 32-bit int
    }
    return Math.abs(hash);
}

/**
 * Tokenizes and cleans text:
 *   - lowercase, strip punctuation
 *   - split into words
 *   - remove stopwords & single-char tokens
 *   - apply simple stemming (strip -ing, -tion, -ed, -er, -ly endings)
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
    if (!text || typeof text !== 'string') return [];

    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s\-_]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1 && !STOPWORDS.has(w));

    // Lightweight stemming
    return words.map(w => {
        if (w.length > 6) {
            if (w.endsWith('ing'))   return w.slice(0, -3);
            if (w.endsWith('tion'))  return w.slice(0, -4);
            if (w.endsWith('tion'))  return w.slice(0, -4);
            if (w.endsWith('tions')) return w.slice(0, -5);
            if (w.endsWith('ness'))  return w.slice(0, -4);
            if (w.endsWith('ment'))  return w.slice(0, -4);
            if (w.endsWith('able'))  return w.slice(0, -4);
            if (w.endsWith('ible'))  return w.slice(0, -4);
            if (w.endsWith('edly'))  return w.slice(0, -4);
            if (w.endsWith('ly'))    return w.slice(0, -2);
            if (w.endsWith('er'))    return w.slice(0, -2);
            if (w.endsWith('ed'))    return w.slice(0, -2);
        }
        return w;
    });
}

/**
 * Builds a TF-weighted sparse vector (512-dim) for the given text.
 * Each token is hashed to a bucket index. The value is TF-weighted
 * with a secondary sign determined by a second hash to reduce collisions.
 *
 * @param {string} text
 * @returns {number[]} 512-dimensional float vector (L2 normalized)
 */
function buildVector(text) {
    const tokens = tokenize(text);
    const vector = new Float64Array(VECTOR_DIMENSION);

    if (tokens.length === 0) {
        // Return a uniform unit vector for empty text
        const val = 1 / Math.sqrt(VECTOR_DIMENSION);
        return Array.from({ length: VECTOR_DIMENSION }, () => val);
    }

    // Count term frequencies
    const tf = {};
    for (const token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
    }

    const totalTerms = tokens.length;

    for (const [token, count] of Object.entries(tf)) {
        const h1 = hashString(token);
        const h2 = hashString(token + '__sign');
        const idx = h1 % VECTOR_DIMENSION;
        const sign = (h2 % 2 === 0) ? 1 : -1;
        const tfWeight = count / totalTerms; // term frequency (0..1)

        vector[idx] += sign * tfWeight;
    }

    // L2 normalize
    let magnitude = 0;
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
        magnitude += vector[i] * vector[i];
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude > 0) {
        for (let i = 0; i < VECTOR_DIMENSION; i++) {
            vector[i] = parseFloat((vector[i] / magnitude).toFixed(6));
        }
    }

    return Array.from(vector);
}

/**
 * Public API — mirrors the original Gemini-based interface.
 * Generates a TF-IDF embedding vector for the given text (local, no API call).
 *
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} The embedding vector (512-dimensional)
 */
async function getEmbedding(text) {
    // Async wrapper for API compatibility — computation is synchronous
    return buildVector(text || '');
}

/**
 * Computes keyword overlap score between query text and a candidate text.
 * Returns a value between 0 and 1 (fraction of query tokens present in candidate).
 *
 * @param {string} queryText
 * @param {string} candidateText
 * @returns {number} overlap score 0..1
 */
function keywordOverlap(queryText, candidateText) {
    const qTokens = new Set(tokenize(queryText));
    const cTokens = new Set(tokenize(candidateText));
    if (qTokens.size === 0) return 0;

    let matches = 0;
    for (const token of qTokens) {
        if (cTokens.has(token)) matches++;
    }
    return matches / qTokens.size;
}

module.exports = {
    getEmbedding,
    buildVector,
    keywordOverlap,
    tokenize,
    VECTOR_DIMENSION
};
