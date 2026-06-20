/**
 * ragService.js
 *
 * RAG context builder — dual-path architecture:
 *
 *  Path A (DB-backed) — technical, scenario, industry:
 *    extractSkills → retrievalService.getRelevantQuestions → buildCandidateMemory
 *    → build context block with difficulty, weak/strong topics, retrieved Qs, asked Qs
 *
 *  Path B (Resume-only) — self_intro, projects, experience, soft_skills, closing:
 *    extractResumeKeywords → build context block from resume data ONLY
 *    → No DB query at all
 */

const { db } = require('../config/firebase');
const retrievalService = require('./retrievalService');

// ─────────────────────────────────────────────
// TOPIC KEYWORDS — for memory analysis
// ─────────────────────────────────────────────
const TOPIC_KEYWORDS = [
    'react', 'hooks', 'redux', 'node', 'express', 'javascript', 'typescript', 'mongodb',
    'postgresql', 'mysql', 'sql', 'redis', 'docker', 'kubernetes', 'aws', 'gcp', 'azure',
    'system design', 'microservices', 'api', 'graphql', 'rest', 'algorithms', 'dsa',
    'git', 'cicd', 'testing', 'jest', 'security', 'oauth', 'jwt', 'python', 'django',
    'flask', 'java', 'spring', 'concurrency', 'caching', 'load balancing', 'kafka',
    'elasticsearch', 'terraform', 'ansible', 'nginx', 'linux', 'bash', 'go', 'rust',
    'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'pandas', 'numpy',
    'css', 'observability', 'cloud computing', 'architecture', 'ai/ml', 'ai', 'ml',
    'problem solving', 'performance', 'figma', 'sketch', 'adobe xd', 'wireframing',
    'prototyping', 'user research', 'usability testing', 'design systems',
    'information architecture', 'interaction design', 'visual design', 'user flows',
    'heuristic evaluation', 'accessibility', 'wcag'
];

// ─────────────────────────────────────────────
// SECTION ROUTING
// ─────────────────────────────────────────────
const DB_SECTIONS = new Set(['technical', 'scenario', 'industry']);
const RESUME_SECTIONS = new Set(['self_intro', 'projects', 'experience', 'soft_skills', 'closing']);

/**
 * Maps interview section → MySQL category column
 * @param {string} section
 * @returns {string}
 */
function mapSectionToCategory(section) {
    const sectionMap = {
        'self_intro':  'behavioral',
        'projects':    'projects',
        'experience':  'experience',
        'technical':   'technical',
        'scenario':    'scenario',
        'industry':    'industry',
        'soft_skills': 'behavioral',
        'closing':     'closing'
    };
    return sectionMap[section] || 'technical';
}

// ─────────────────────────────────────────────
// SKILL EXTRACTOR (from resume/JD text)
// ─────────────────────────────────────────────
/**
 * Extracts tech skills from text by matching against TOPIC_KEYWORDS
 * @param {string} text
 * @returns {string[]}
 */
function extractSkills(text) {
    if (!text || typeof text !== 'string') return [];
    const lowerText = text.toLowerCase();
    const matched = [];

    TOPIC_KEYWORDS.forEach(keyword => {
        const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const startBound = /^\w/.test(keyword) ? '\\b' : '';
        const endBound = /\w$/.test(keyword) ? '\\b' : '';
        const regex = new RegExp(`${startBound}${escaped}${endBound}`, 'i');
        if (regex.test(lowerText)) {
            const formatted = keyword.split(' ')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            matched.push(formatted);
        }
    });

    return [...new Set(matched)];
}

// ─────────────────────────────────────────────
// RESUME KEYWORD EXTRACTOR (for Path B)
// ─────────────────────────────────────────────
/**
 * Parses raw resume text to extract structured candidate data.
 * Used for self_intro / projects / experience / soft_skills / closing sections.
 *
 * @param {string} resumeText
 * @returns {Object} { skills, technologies, projectHints, companyHints, roleHints, yearsHint }
 */
function extractResumeKeywords(resumeText) {
    if (!resumeText || typeof resumeText !== 'string') {
        return { skills: [], technologies: [], projectHints: [], companyHints: [], roleHints: [], yearsHint: '' };
    }

    const text = resumeText;
    const lower = text.toLowerCase();

    // ── Technologies ──
    const ALL_TECH = [
        'react', 'node', 'nodejs', 'express', 'javascript', 'typescript', 'python', 'java',
        'c++', 'c#', 'go', 'golang', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'dart', 'flutter',
        'django', 'flask', 'fastapi', 'spring', 'laravel', 'rails', 'nextjs', 'nuxt', 'vue',
        'angular', 'svelte', 'graphql', 'rest', 'grpc', 'websocket', 'kafka', 'rabbitmq',
        'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'firebase', 'supabase', 'dynamodb',
        'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform', 'ansible', 'jenkins',
        'github actions', 'gitlab ci', 'nginx', 'apache', 'linux', 'bash', 'git', 'github',
        'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit',
        'elasticsearch', 'tailwind', 'bootstrap', 'sass', 'webpack', 'vite', 'jest', 'cypress',
        'selenium', 'playwright', 'socket.io', 'three.js', 'd3.js', 'figma', 'postman'
    ];

    const technologies = ALL_TECH.filter(tech => {
        const escaped = tech.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const startBound = /^\w/.test(tech) ? '\\b' : '';
        const endBound = /\w$/.test(tech) ? '\\b' : '';
        const regex = new RegExp(`${startBound}${escaped}${endBound}`, 'i');
        return regex.test(lower);
    });

    // ── Projects — extract capitalized noun phrases near "project", "built", "developed", "created" ──
    const projectHints = [];
    const projectPatterns = [
        /(?:built|developed|created|designed|implemented|engineered|worked on)\s+([A-Z][A-Za-z0-9\s\-]{2,40})/g,
        /Project[:\s]+([A-Z][A-Za-z0-9\s\-]{2,40})/g,
        /([A-Z][A-Za-z0-9]{2,25}(?:\s[A-Z][A-Za-z0-9]{2,15}){0,3})\s*[-–]\s*(?:a|an|the)\s+\w+/g
    ];
    for (const pattern of projectPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const hint = match[1].trim();
            if (hint.length > 3 && hint.length < 60 && !projectHints.includes(hint)) {
                projectHints.push(hint);
            }
        }
    }

    // ── Companies — words near "at", "for", "with" that are title-cased ──
    const companyHints = [];
    const companyPattern = /(?:at|for|with|joined|worked at|interned at)\s+([A-Z][A-Za-z0-9]{2,}(?:\s[A-Z][A-Za-z0-9]{2,}){0,2})/g;
    let match;
    while ((match = companyPattern.exec(text)) !== null) {
        const hint = match[1].trim();
        if (hint.length > 2 && hint.length < 50 && !companyHints.includes(hint)) {
            companyHints.push(hint);
        }
    }

    // ── Roles — common title patterns ──
    const roleKeywords = [
        'software engineer', 'developer', 'frontend', 'backend', 'fullstack', 'full stack',
        'devops', 'data scientist', 'data engineer', 'ml engineer', 'product manager',
        'tech lead', 'team lead', 'architect', 'intern', 'sde', 'software development'
    ];
    const roleHints = roleKeywords.filter(r => lower.includes(r));

    // ── Years of experience — numeric year patterns ──
    const yearsMatch = text.match(/(\d+)\s*\+?\s*years?\s+(?:of\s+)?experience/i);
    const yearsHint = yearsMatch ? `${yearsMatch[1]}+ years of experience` : '';

    // ── Skills (from TOPIC_KEYWORDS) ──
    const skills = extractSkills(resumeText);

    return {
        skills,
        technologies: [...new Set(technologies)].slice(0, 20),
        projectHints: projectHints.slice(0, 5),
        companyHints: companyHints.slice(0, 5),
        roleHints: [...new Set(roleHints)],
        yearsHint
    };
}

// ─────────────────────────────────────────────
// CANDIDATE MEMORY (Firestore Q&A history)
// ─────────────────────────────────────────────
/**
 * Dynamically builds candidate memory from past Q&A in Firestore.
 * Tracks: weak/strong topics, asked questions, current difficulty, avg score.
 *
 * @param {string} interviewId
 * @returns {Promise<Object>}
 */
async function buildCandidateMemory(interviewId) {
    const defaultState = {
        weakTopics: [],
        strongTopics: [],
        askedQuestions: [],
        currentDifficulty: 'medium',
        communicationLevel: 7,
        scores: []
    };

    if (!interviewId) return defaultState;

    try {
        const questionsSnap = await db.collection('interviews')
            .doc(interviewId)
            .collection('questions')
            .get();

        if (questionsSnap.empty) return defaultState;

        const questions = questionsSnap.docs
            .map(doc => doc.data())
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        const state = { ...defaultState };
        const topicScores = {};

        questions.forEach(q => {
            const score = typeof q.score === 'number' ? q.score : 5;
            state.scores.push(score);

            if (q.question_text) state.askedQuestions.push(q.question_text);

            const content = `${q.question_text || ''} ${q.user_answer || ''}`.toLowerCase();
            TOPIC_KEYWORDS.forEach(keyword => {
                if (content.includes(keyword)) {
                    topicScores[keyword] = topicScores[keyword] || [];
                    topicScores[keyword].push(score);
                }
            });
        });

        // Compute weak/strong topics
        Object.entries(topicScores).forEach(([topic, scores]) => {
            const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
            const fmt = topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            if (avg < 6)       state.weakTopics.push(fmt);
            else if (avg >= 8) state.strongTopics.push(fmt);
        });

        // Dynamic difficulty: based on last 2 scores
        const recent = state.scores.slice(-2);
        if (recent.length === 2) {
            if (recent.every(s => s >= 8))    state.currentDifficulty = 'hard';
            else if (recent.some(s => s < 5)) state.currentDifficulty = 'easy';
            else                               state.currentDifficulty = 'medium';
        } else if (recent.length === 1) {
            if (recent[0] >= 8)    state.currentDifficulty = 'medium';
            else if (recent[0] < 5) state.currentDifficulty = 'easy';
        }

        // Average communication level
        if (state.scores.length > 0) {
            const sum = state.scores.reduce((t, s) => t + s, 0);
            state.communicationLevel = parseFloat((sum / state.scores.length).toFixed(1));
        }

        return state;
    } catch (error) {
        console.error('Error building candidate memory:', error.message);
        return defaultState;
    }
}

// ─────────────────────────────────────────────
// CONTEXT BUILDER — dual-path
// ─────────────────────────────────────────────
/**
 * Builds the RAG context string injected into the Groq prompt.
 *
 * Path A (DB-backed) — for: technical, scenario, industry
 *   → Fetches relevant DB questions + candidate memory
 *
 * Path B (Resume-only) — for: self_intro, projects, experience, soft_skills, closing
 *   → Parses resume text ONLY, no DB query
 *
 * @param {Object} params
 * @returns {Promise<string>} context block for LLM injection
 */
async function getContextForPrompt({
    interviewId, role, company, section, sectionQuestionCount,
    currentQuestion, answer, conversationHistory, hasTechJD,
    resumeText, jobDescription
}) {
    try {
        // Fetch interview metadata from Firestore if not passed
        let resumeToUse = resumeText || '';
        let jdToUse = jobDescription || '';

        if (interviewId) {
            const snap = await db.collection('interviews').doc(interviewId).get();
            if (snap.exists) {
                const data = snap.data();
                if (!resumeToUse) resumeToUse = data.resume_text || '';
                if (!jdToUse)     jdToUse = data.job_description || '';
                if (!role)        role = data.role || '';
            }
        }

        const category = mapSectionToCategory(section);

        // ─── PATH B: Resume-only sections ───────────────────────────────────
        if (RESUME_SECTIONS.has(section)) {
            console.log(`📄 [RESUME-ONLY] Building context for section: ${section}`);

            const kw = extractResumeKeywords(resumeToUse);

            let ctx = `[CANDIDATE PROFILE — Resume-Based Context]\n`;
            ctx += `Target Role: ${role || 'Not specified'}\n`;
            if (company) ctx += `Company: ${company}\n`;
            if (kw.yearsHint) ctx += `Experience: ${kw.yearsHint}\n`;

            if (kw.technologies.length > 0) {
                ctx += `Technologies on Resume: ${kw.technologies.join(', ')}\n`;
            }
            if (kw.skills.length > 0) {
                ctx += `Key Skills: ${kw.skills.join(', ')}\n`;
            }
            if (kw.roleHints.length > 0) {
                ctx += `Role History Hints: ${kw.roleHints.join(', ')}\n`;
            }
            if (kw.companyHints.length > 0) {
                ctx += `Companies Mentioned: ${kw.companyHints.join(', ')}\n`;
            }
            if (kw.projectHints.length > 0) {
                ctx += `\nProjects Detected on Resume:\n`;
                kw.projectHints.forEach((p, i) => { ctx += `  ${i + 1}. ${p}\n`; });
            }

            ctx += `\n[INSTRUCTION] Ask questions ONLY based on the candidate's resume and experience above.\n`;
            ctx += `Do NOT invent or assume projects or companies not listed.\n`;
            ctx += `Reference specific technologies/projects from their resume when asking follow-ups.\n`;

            return ctx;
        }

        // ─── PATH A: DB-backed sections ─────────────────────────────────────
        console.log(`🗄️  [DB-RAG] Building context for section: ${section}`);

        const skills = extractSkills(`${resumeToUse} ${jdToUse}`);
        const candidateState = await buildCandidateMemory(interviewId);

        const queryText = answer || currentQuestion || role || '';
        const rawQuestions = await retrievalService.getRelevantQuestions({
            role,
            skills,
            category,
            difficulty: candidateState.currentDifficulty,
            queryText,
            limit: 6
        });

        const retrievedQuestions = rawQuestions.filter(q => {
            const qClean = q.question.toLowerCase().trim();
            const curClean = (currentQuestion || '').toLowerCase().trim();
            if (curClean.includes(qClean) || qClean.includes(curClean)) {
                return false;
            }
            return !candidateState.askedQuestions.some(a => {
                const aClean = a.toLowerCase().trim();
                return aClean.includes(qClean) || qClean.includes(aClean);
            });
        }).slice(0, 3);

        // Build context block
        let ctx = `[DB-RAG CONTEXT]\n`;
        ctx += `Target Role: ${role || 'Software Engineer'}\n`;
        if (company) ctx += `Company: ${company}\n`;
        ctx += `Skills on Resume/JD: ${skills.length > 0 ? skills.join(', ') : 'None identified'}\n`;

        ctx += `\n[CANDIDATE MEMORY]\n`;
        ctx += `- Adaptive Difficulty: ${candidateState.currentDifficulty.toUpperCase()}\n`;
        ctx += `- Avg Score So Far: ${candidateState.communicationLevel}/10\n`;
        ctx += `- Weak Topics: ${candidateState.weakTopics.length > 0 ? candidateState.weakTopics.join(', ') : 'None yet'}\n`;
        ctx += `- Strong Topics: ${candidateState.strongTopics.length > 0 ? candidateState.strongTopics.join(', ') : 'None yet'}\n`;

        if (candidateState.askedQuestions.length > 0) {
            ctx += `- Already Asked (DO NOT repeat):\n`;
            candidateState.askedQuestions.forEach((q, i) => {
                ctx += `  ${i + 1}. "${q}"\n`;
            });
        }

        if (retrievedQuestions.length > 0) {
            const target = retrievedQuestions[0];
            ctx += `\n[TARGET DATABASE QUESTION — MANDATORY SOURCE FOR NEW QUESTION]\n`;
            ctx += `- Question: "${target.question}"\n`;
            ctx += `- Skill: "${target.skill}"\n`;
            ctx += `- Difficulty: "${target.difficulty}"\n`;
            if (target.expected_topics?.length > 0) {
                ctx += `- Expected Topics: "${target.expected_topics.join(', ')}"\n`;
            }
            if (target.follow_up_tags?.length > 0) {
                ctx += `- Follow-up Angles: "${target.follow_up_tags.join(', ')}"\n`;
            }
            ctx += `\n[INSTRUCTION] If you are asking a new question (rather than probing the candidate's previous response), you MUST ground it directly on this target database question. Rephrase it naturally to fit the conversation, but preserve the core concept and technical testing objectives. Do NOT deviate from this skill or topic.\n`;
        } else {
            ctx += `\n[NOTE] No matching questions found in knowledge base. Use your expertise for the next question.\n`;
        }

        return ctx;

    } catch (error) {
        console.error('Error generating RAG context:', error.message);
        return '';
    }
}

module.exports = {
    extractSkills,
    extractResumeKeywords,
    buildCandidateMemory,
    getContextForPrompt,
    mapSectionToCategory
};
