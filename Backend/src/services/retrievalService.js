/**
 * retrievalService.js
 *
 * Section-aware RAG retrieval engine.
 *
 * Rules:
 *   - DB_SECTIONS (technical, scenario, industry):
 *       → fetch from MySQL, rank with cosine + keyword boost + metadata boosts
 *   - RESUME_SECTIONS (self_intro, projects, experience, soft_skills, closing):
 *       → skip DB entirely, return empty array (prompt will use resume keywords)
 */

const mysqlService = require('./mysqlService');
const embeddingService = require('./embeddingService');

// Sections that pull questions from MySQL DB via RAG
const DB_SECTIONS = new Set(['technical', 'scenario', 'industry']);

// Sections that rely purely on resume/JD keywords (no DB retrieval)
const RESUME_SECTIONS = new Set(['self_intro', 'projects', 'experience', 'soft_skills', 'closing', 'behavioral']);

/**
 * Returns true if this section should use the DB-RAG pipeline
 * @param {string} section
 * @returns {boolean}
 */
function isDBSection(section) {
    return DB_SECTIONS.has(section);
}

/**
 * Calculates the cosine similarity between two vectors
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} similarity score between -1 and 1
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieves relevant questions from the MySQL database for DB-backed sections.
 * Ranks using: cosine similarity (0.60) + keyword overlap (0.25) + role boost (0.10) + difficulty boost (0.05)
 *
 * For RESUME_SECTIONS, returns an empty array immediately without hitting the DB.
 *
 * @param {Object} params
 * @param {string} params.role
 * @param {string[]} params.skills
 * @param {string} params.category - Maps to the MySQL `category` column
 * @param {string} params.difficulty - "easy" | "medium" | "hard"
 * @param {string} params.queryText - Candidate's answer or current topic
 * @param {number} [params.limit=3]
 * @returns {Promise<Object[]>} Ranked question objects
 */
async function getRelevantQuestions({ role, skills = [], category, difficulty, queryText, limit = 3 }) {
    try {
        // --- Gate: resume-only sections skip DB entirely ---
        if (RESUME_SECTIONS.has(category)) {
            console.log(`📄 [RESUME-ONLY] Skipping DB retrieval for section: ${category}`);
            return [];
        }

        console.log(`🗄️  [DB-RAG] Fetching from MySQL for section: ${category}`);

        // 1. Build query embedding from the candidate's answer / topic
        const queryEmbedding = await embeddingService.getEmbedding(queryText || role || category || '');

        // 2. Fetch relevant questions — pre-filter at SQL level to avoid full-table scan
        let sql, params;
        if (skills && skills.length > 0) {
            // Build a case-insensitive skill OR role pre-filter.
            // MySQL uses ? placeholder.
            const skillPatterns = skills.map(() => `LOWER(skill) LIKE ?`);
            const skillParams = skills.map(s => `%${s.toLowerCase()}%`);
            sql = `
                SELECT id, role, skill, category, difficulty, question, follow_up_tags, expected_topics, embedding_vector
                FROM interview_questions
                WHERE category = ?
                  AND (
                    ${skillPatterns.join(' OR ')}
                    OR LOWER(role) LIKE ?
                    OR skill IS NULL
                  )
                LIMIT 200
            `;
            params = [category, ...skillParams, `%${(role || '').toLowerCase()}%`];
        } else {
            // No skill hints: fall back to category-only fetch
            sql = `
                SELECT id, role, skill, category, difficulty, question, follow_up_tags, expected_topics, embedding_vector
                FROM interview_questions
                WHERE category = ?
                LIMIT 200
            `;
            params = [category];
        }
        const candidates = await mysqlService.query(sql, params);

        if (!candidates || candidates.length === 0) {
            console.log(`ℹ️  No questions in MySQL for category: ${category}`);
            return [];
        }

        // JS-level skill filter still runs to refine further (substring-check)
        // but now on a much smaller pre-filtered result set
        let filteredCandidates = candidates;
        if (skills && skills.length > 0) {
            const lowerSkills = skills.map(s => s.toLowerCase());
            const matched = candidates.filter(q => {
                if (!q.skill) return true; // Keep if no skill is tagged
                const qSkillLower = q.skill.toLowerCase();
                return lowerSkills.some(s => s.includes(qSkillLower) || qSkillLower.includes(s));
            });
            if (matched.length > 0) {
                console.log(`🎯 [DB-RAG] Filtered ${candidates.length} SQL rows down to ${matched.length} matching skills: [${skills.join(', ')}]`);
                filteredCandidates = matched;
            } else {
                console.log(`⚠️ [DB-RAG] No questions matching skills [${skills.join(', ')}]. Using all ${candidates.length} category rows.`);
            }
        }

        // 3. Score each candidate question
        const scoredQuestions = filteredCandidates.map(q => {
            // Parse embedding vector from database
            let parsedVector = null;
            try {
                if (q.embedding_vector) {
                    parsedVector = typeof q.embedding_vector === 'string'
                        ? JSON.parse(q.embedding_vector)
                        : q.embedding_vector;
                }
            } catch (err) {
                console.error(`Error parsing embedding vector for question ID ${q.id}:`, err.message);
            }

            // Calculate similarity using the JS cosineSimilarity function
            const similarity = cosineSimilarity(queryEmbedding, parsedVector);

            // --- Keyword overlap boost — weight: 25% ---
            const questionText = [
                q.question || '',
                ...(typeof q.expected_topics === 'string' ? JSON.parse(q.expected_topics) : (q.expected_topics || []))
            ].join(' ');
            const kwOverlap = embeddingService.keywordOverlap(queryText || '', questionText);

            // --- Role match boost — weight: 10% ---
            let roleBoost = 0;
            if (q.role && role) {
                const qRoleLower = q.role.toLowerCase();
                const targetRoleLower = role.toLowerCase();
                if (qRoleLower === targetRoleLower) {
                    roleBoost = 1.0; // exact match
                } else if (targetRoleLower.includes(qRoleLower) || qRoleLower.includes(targetRoleLower)) {
                    roleBoost = 0.5; // partial match
                }
            }

            // --- Difficulty alignment boost — weight: 5% ---
            let difficultyBoost = 0;
            if (q.difficulty && difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase()) {
                difficultyBoost = 1.0;
            }

            // --- Skill match bonus (additive) ---
            let skillBoost = 0;
            if (q.skill && skills.length > 0) {
                const qSkillLower = q.skill.toLowerCase();
                if (skills.some(s => s.toLowerCase() === qSkillLower)) {
                    skillBoost = 0.1; // additive bonus
                }
            }

            // Weighted total score
            const totalScore =
                (similarity  * 0.60) +
                (kwOverlap   * 0.25) +
                (roleBoost   * 0.10) +
                (difficultyBoost * 0.05) +
                skillBoost;

            return {
                id: q.id,
                question: q.question,
                role: q.role,
                skill: q.skill,
                category: q.category,
                difficulty: q.difficulty,
                follow_up_tags: typeof q.follow_up_tags === 'string'
                    ? JSON.parse(q.follow_up_tags)
                    : (q.follow_up_tags || []),
                expected_topics: typeof q.expected_topics === 'string'
                    ? JSON.parse(q.expected_topics)
                    : (q.expected_topics || []),
                score: parseFloat(totalScore.toFixed(4)),
                similarity: parseFloat(similarity.toFixed(4)),
                kwOverlap: parseFloat(kwOverlap.toFixed(4)),
            };
        });

        // 4. Sort descending by score, return top N
        scoredQuestions.sort((a, b) => b.score - a.score);
        const top = scoredQuestions.slice(0, limit);

        console.log(`✅ [DB-RAG] Ranked ${filteredCandidates.length} questions → top ${top.length} returned (best score: ${top[0]?.score ?? 0})`);
        return top;

    } catch (error) {
        console.error('❌ Error in getRelevantQuestions:', error.message);
        return [];
    }
}

module.exports = {
    getRelevantQuestions,
    cosineSimilarity,
    isDBSection,
    DB_SECTIONS,
    RESUME_SECTIONS
};
