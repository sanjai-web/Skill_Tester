/**
 * aiService.js
 *
 * Core AI interview engine.
 *
 * Section routing:
 *   - technical / scenario / industry  → DB-RAG pipeline context (ragService Path A)
 *   - self_intro / projects / experience / soft_skills / closing → resume-only context (ragService Path B)
 *
 * Persona: Strict, senior human technical interviewer.
 *   - Concise acknowledgements, natural transitions
 *   - No hollow praise, no coaching, no hints
 *   - Digs deeper before advancing
 *   - STAR method enforcement for behavioral
 *   - Adaptive difficulty via candidate memory
 */

require('dotenv').config();
const ragService = require('./ragService');
const retrievalService = require('./retrievalService');
const { db } = require('../config/firebase');

async function getSkillsForInterview(interviewId) {
    if (!interviewId) return [];
    try {
        const doc = await db.collection('interviews').doc(interviewId).get();
        if (doc.exists) {
            const data = doc.data();
            const resumeText = data.resume_text || '';
            const jobDescription = data.job_description || '';
            return ragService.extractSkills(`${resumeText} ${jobDescription}`);
        }
    } catch (err) {
        console.error('getSkillsForInterview Error:', err.message);
    }
    return [];
}

const groq = require('./groqClient');
const AI_MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

// ─────────────────────────────────────────────
// INTERVIEW STRUCTURE
// ─────────────────────────────────────────────
const SECTIONS = [
    { id: 'self_intro', label: 'Self Introduction', maxQ: 1 },
    { id: 'projects', label: 'Projects', maxQ: 7 },
    { id: 'experience', label: 'Experience', maxQ: 3 },
    { id: 'technical', label: 'Technical', maxQ: 9 },
    { id: 'scenario', label: 'Scenario-Based', maxQ: 4 },
    { id: 'industry', label: 'Industry Knowledge', maxQ: 3 },
    { id: 'soft_skills', label: 'Soft Skills', maxQ: 3 },
    { id: 'closing', label: 'Closing', maxQ: 1 },
];

// ─────────────────────────────────────────────
// TECH JD DETECTION
// ─────────────────────────────────────────────
const TECH_KEYWORDS = [
    'python', 'java', 'javascript', 'typescript', 'react', 'vue', 'angular', 'node',
    'express', 'django', 'flask', 'fastapi', 'spring', 'sql', 'nosql', 'mongodb',
    'postgresql', 'mysql', 'redis', 'kafka', 'docker', 'kubernetes', 'aws', 'gcp',
    'azure', 'c++', 'c#', 'golang', 'go', 'rust', 'algorithms', 'data structures',
    'dsa', 'leetcode', 'coding', 'programming', 'backend', 'frontend', 'fullstack',
    'software engineer', 'developer', 'devops', 'machine learning', 'ml', 'ai',
    'deep learning', 'api', 'microservices', 'system design',
];

function isTechJD(jobDescription) {
    const jd = (jobDescription || '').toLowerCase();
    return TECH_KEYWORDS.some(k => jd.includes(k));
}

// ─────────────────────────────────────────────
// GROQ WRAPPER
// ─────────────────────────────────────────────
async function askGroq(prompt, maxTokens = 700) {
    const result = await groq.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: maxTokens,
    });
    return result.choices[0]?.message?.content || '';
}

function extractJSON(text) {
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
    return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────
// SECTION OPENERS — human, natural
// ─────────────────────────────────────────────
const SECTION_OPENERS = {
    projects: "Right, let's talk about your work. Walk me through the most technically interesting project you've built — the problem, the architecture, and what you specifically owned.",
    experience: "Tell me about a role where you had real technical ownership and your work had a measurable impact on the product or team.",
    technical: "Alright, let's get into the technical side. I want to see how you think, not just what you've memorized.",
    scenario: "I'm going to give you a realistic situation. Think out loud — structure and reasoning matter as much as the answer itself.",
    industry: "Let's step back from the code for a moment. What's a major technical shift in this space that most people are still underestimating, and why?",
    soft_skills: "Tell me about the most difficult professional situation you've had to navigate — not a minor disagreement, a real one. How did you handle it?",
    closing: "We're coming to the end. What questions do you have for me — about the role, the team, or the technical direction?",
};

// ─────────────────────────────────────────────
// CONVERSATIONAL HELPERS
// ─────────────────────────────────────────────
const TRANSITIONS = [
    "Right, let's move on.",
    "Got it, let's shift gears.",
    "Understood. Moving forward.",
    "Fair enough, let's continue.",
];

const ELABORATION_PROMPTS = [
    ans => `I hear you, but I need more specifics — particularly around "${ans.substring(0, 60)}". Can you walk me through that in more detail?`,
    ans => `That's a start. What were the actual trade-offs you made with "${ans.substring(0, 60)}"? Go deeper.`,
    ans => `I want to dig into "${ans.substring(0, 60)}" — what was the core technical challenge there and how exactly did you resolve it?`,
    ans => `Can you be more concrete? Give me the specifics behind "${ans.substring(0, 60)}" — what did you actually implement?`,
];

// Section-aware elaboration prompts for non-technical sections
const SELF_INTRO_ELABORATION_PROMPTS = [
    () => `That's quite brief — I'd love to hear more. Walk me through your background: where you've worked or studied, what you've built, and what drew you to this role.`,
    () => `Give me a fuller picture of yourself — your journey so far, the kind of work you've done, and what you're looking to do next.`,
    () => `Tell me more about yourself — your experience, the projects you've been involved in, and what specifically attracted you to this position.`,
    () => `I'd like to understand your background better. Tell me about your experience, the technologies you work with, and what motivated you to apply here.`,
];

const SOFT_SKILLS_ELABORATION_PROMPTS = [
    ans => `That's too brief — give me the full story. What was the situation, what exactly did you do, and what was the outcome?`,
    ans => `I need more depth than that. Walk me through what actually happened, step by step — what was your role and what specifically did you decide or act on?`,
    ans => `Can you be more specific? What was the context, what challenges came up, and how did you navigate them?`,
];

function getElaborationPrompt(section, answer) {
    if (section === 'self_intro') {
        return getRandom(SELF_INTRO_ELABORATION_PROMPTS)();
    }
    if (section === 'soft_skills' || section === 'experience') {
        return getRandom(SOFT_SKILLS_ELABORATION_PROMPTS)(answer);
    }
    const fn = getRandom(ELABORATION_PROMPTS);
    return fn(answer);
}

const ACK_PROMPTS = [
    "Sure, go ahead — I'm listening.",
    "Please, go on.",
    "Of course, take your time.",
    "Absolutely, let's hear it.",
];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────
// INTENT DETECTORS
// ─────────────────────────────────────────────
function isCodingRole(role) {
    if (!role) return false;
    const r = role.toLowerCase();
    const nonCodingKeywords = [
        'designer', 'design', 'ux', 'ui', 'product manager', 'project manager',
        'pm', 'analyst', 'writer', 'marketer', 'sales', 'content', 'scrum', 'agile'
    ];
    return !nonCodingKeywords.some(k => r.includes(k));
}

function isRepeatIntent(answer) {
    if (!answer) return false;
    const cleaned = answer.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
    const EXACT_REPEAT = ['what', 'huh', 'pardon', 'sorry', 'come again', 'say again', 'once more', 'once again', 'excuse me'];
    const PHRASE_REPEAT = [
        'repeat', 'say that again', 'did not hear', 'didnt hear', 'didnt catch', 'did not catch',
        'what was the question', 'repeat the question', 'can you repeat', 'could you repeat'
    ];
    const words = cleaned.split(/\s+/).filter(Boolean);
    const isExact = EXACT_REPEAT.includes(cleaned) || (words.length === 1 && EXACT_REPEAT.includes(words[0]));
    const isPhrase = PHRASE_REPEAT.some(p => cleaned.includes(p));
    return isExact || isPhrase;
}

function isClarifyIntent(answer) {
    if (!answer) return false;
    const cleaned = answer.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
    const CLARIFY_PHRASES = [
        'dont understand', 'do not understand', 'what do you mean', 'can you clarify', 'could you clarify',
        'please clarify', 'not clear', 'its not clear', 'explain what you mean', 'what does that mean',
        'dont follow', 'do not follow', 'confused'
    ];
    return CLARIFY_PHRASES.some(p => cleaned.includes(p));
}

function getSimplerRephrasing(question) {
    if (!question) return "Could you tell me more about your approach or thoughts on this topic?";

    const q = question.toLowerCase();

    // UI/UX
    if (q.includes('figma files') || q.includes('design tokens')) {
        return "How do you organize your files, components, and variables in Figma for a big design project?";
    }
    if (q.includes('wcag contrast') || q.includes('accessible to users')) {
        return "How do you make sure your designs are easy to read and accessible for people with disabilities?";
    }
    if (q.includes('atomic design') || q.includes('scalable design system')) {
        return "What is atomic design, and how do you use it to build a consistent design system?";
    }
    if (q.includes('usability testing') || q.includes('qualitative feedback')) {
        return "How do you test your designs with real users, and how do you decide what changes to make based on their feedback?";
    }
    if (q.includes('jakob') || q.includes('fitts')) {
        return "How do you design mobile screens so they feel familiar and the buttons are easy to tap?";
    }
    if (q.includes('drop-off rate') || q.includes('checkout form')) {
        return "If many users leave a checkout form without buying, how would you find the problems and make the checkout easier?";
    }
    if (q.includes('complex features') || q.includes('clutter the design')) {
        return "How do you explain to a client or manager that adding too many features will ruin the user experience?";
    }
    if (q.includes('developer handoff') || q.includes('design intent')) {
        return "How do you share your designs with developers to make sure they build it exactly as you designed it?";
    }
    if (q.includes('generative ai') || q.includes('figma ai')) {
        return "How do you think AI tools like Figma AI will change how design work is done in the future?";
    }

    // Developer / React
    if (q.includes('useeffect') && q.includes('control when it runs')) {
        return "What is the useEffect hook used for in React, and how do you decide when it runs?";
    }
    if (q.includes('useeffect and uselayouteffect')) {
        return "What is the main difference between useEffect and useLayoutEffect in React?";
    }
    if (q.includes('reconciliation') && q.includes('keys play')) {
        return "How does React update the UI, and why are unique keys important when rendering lists?";
    }
    if (q.includes('react fiber')) {
        return "What is React Fiber, and how does it help React handle rendering updates smoothly?";
    }
    if (q.includes('event loop') && q.includes('microtasks')) {
        return "How does JavaScript manage asynchronous tasks, and what is the difference between microtasks and macrotasks?";
    }
    if (q.includes('closures') && q.includes('real bug')) {
        return "What are JavaScript closures, and can you describe a common issue they cause?";
    }
    if (q.includes('css specificity')) {
        return "How does CSS decide which style to apply when there are conflicting rules?";
    }
    if (q.includes('memory leak') && q.includes('node.js')) {
        return "How do you find and fix memory leaks in a Node.js application?";
    }
    if (q.includes('middleware') && q.includes('express')) {
        return "What is middleware in Express, and how do you handle errors with it?";
    }
    if (q.includes('database indexes') || q.includes('b-tree')) {
        return "What are database indexes, and how do they speed up database searches?";
    }
    if (q.includes('acid properties')) {
        return "What do the ACID properties mean in database transactions?";
    }
    if (q.includes('mongodb over postgresql')) {
        return "When would you choose a NoSQL database like MongoDB instead of a SQL database like PostgreSQL?";
    }
    if (q.includes('rate limiter')) {
        return "How would you build a rate limiter that limits requests across multiple servers?";
    }
    if (q.includes('docker image') || q.includes('multi-stage')) {
        return "What is the difference between a Docker image and a container, and how do you make images smaller?";
    }
    if (q.includes('kubernetes') && q.includes('statefulset')) {
        return "What is the difference between a Kubernetes Deployment and a StatefulSet?";
    }
    if (q.includes('jwt authentication')) {
        return "How does JWT auth work, and is it safer to store tokens in cookies or localStorage?";
    }
    if (q.includes('sql injection')) {
        return "What is SQL injection, and how do parameterized queries prevent it?";
    }

    // Default fallback templates
    if (q.includes('describe') || q.includes('walk me') || q.includes('tell me') || q.includes('explain')) {
        return "In simple terms, could you explain your main approach or thinking on this topic?";
    }

    return "Could you share your general thoughts or experience regarding this area?";
}

async function getNextQuestionOrAdvance({
    interviewId, role, section, currentQuestion, canFollowUp, nextSection, nextOpener
}) {
    let nextQ = '';
    let doAdvance = !canFollowUp || section === 'self_intro';

    if (section === 'self_intro') {
        nextQ = "No problem — we can move past the intro. Let's talk about your projects instead. Tell me about something you've built recently.";
        doAdvance = true;
    } else if (!doAdvance) {
        try {
            const mem = await ragService.buildCandidateMemory(interviewId);
            const category = ragService.mapSectionToCategory(section);
            const skills = await getSkillsForInterview(interviewId);
            const dbQs = await retrievalService.getRelevantQuestions({
                role, skills, category,
                difficulty: mem.currentDifficulty || 'medium',
                queryText: currentQuestion || '',
                limit: 5
            });
            const available = dbQs.filter(q => {
                const qClean = q.question.toLowerCase().trim();
                const curClean = (currentQuestion || '').toLowerCase().trim();
                if (curClean.includes(qClean) || qClean.includes(curClean)) {
                    return false;
                }
                return !mem.askedQuestions.some(a => {
                    const aClean = a.toLowerCase().trim();
                    return aClean.includes(qClean) || qClean.includes(aClean);
                });
            });
            if (available.length > 0) {
                nextQ = `${getRandom(TRANSITIONS)} ${available[0].question}`;
            } else {
                doAdvance = true;
            }
        } catch {
            doAdvance = true;
        }
    }

    if (doAdvance && !nextQ) {
        nextQ = nextSection
            ? `${getRandom(TRANSITIONS)} ${nextOpener}`
            : "Thank you — that wraps up our interview today.";
    }

    return { nextQuestion: nextQ, advanceSection: doAdvance };
}

function isGreeting(answer) {
    if (!answer) return false;
    const cleaned = answer.toLowerCase().trim().replace(/[^a-z\s]/g, '');
    return ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
        'greetings', 'namaste', 'hi there', 'hello there'].includes(cleaned);
}

function isSkipIntent(answer) {
    if (!answer) return false;
    const cleaned = answer.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');
    const words = cleaned.split(/\s+/).filter(Boolean);

    const EXACT_SKIP = ['no', 'nope', 'skip', 'pass', 'idk', 'sorry', 'nothing', 'none',
        'nil', 'na', 'n/a', 'no projects', 'no experience', 'nothing to share', 'i have nothing'];

    const PHRASE_SKIP = [
        'i dont know', "i don't know", 'no idea', 'next question', 'move on', 'can we move',
        'can you move', 'dont know', 'go to next', 'bypass', 'dont know the answer',
        'do not know', 'have no idea', 'skip this', 'i have no projects', 'dont have any projects',
        'i have no experience', 'dont have experience', 'i have no project',
        'not sure about this', 'cant answer', "can't answer", 'not confident',
    ];

    const isExact = EXACT_SKIP.some(w => cleaned === w || (words.length <= 2 && words.includes(w)));
    const isPhrase = PHRASE_SKIP.some(p => cleaned.includes(p));
    return isExact || isPhrase;
}

function isVeryShortAnswer(answer) {
    const cleaned = answer.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    const words = cleaned.split(/\s+/).filter(Boolean);
    return words.length > 0 && words.length < 6;
}

function isAcknowledgement(answer) {
    if (!answer) return false;
    const cleaned = answer.toLowerCase().trim().replace(/[^a-z]/g, '');
    const ACK = ['ok', 'okay', 'yeah', 'sure', 'alright', 'yes', 'yup'];
    return ACK.includes(cleaned);
}


/**
 * Extracts candidate's first name from resume text.
 *
 * Handles:
 *  - "Sanjai Kumar" (Title Case)
 *  - "SANJAI KUMAR" (ALL CAPS)
 *  - "SELVA.A" (dot-initial format common in South Indian resumes)
 *  - Flat single-line text from PDF.js (all on one line with contact info after)
 *  - Newline-separated text from server-side pdf-parse
 */
function extractCandidateName(resumeText) {
    if (!resumeText || typeof resumeText !== 'string') return null;

    const SKIP_KEYWORDS = [
        'resume', 'curriculum', 'vitae', 'cv', 'profile', 'summary', 'objective',
        'contact', 'email', 'phone', 'address', 'linkedin', 'github', 'portfolio',
        'education', 'experience', 'skills', 'projects', 'certifications', 'references'
    ];

    // These words appear right after a name in resumes and signal the name has ended
    const NAME_STOP_PATTERN = /\b(fresher|student|engineer|developer|designer|analyst|manager|intern|trainee|consultant|b\.?e\.?|b\.?tech|m\.?tech|mba|bsc|msc|bca|mca|street|nagar|road|colony|district|village|city|state|near|pincode|mobile|phone|tel|email|linkedin|github|portfolio|objective|summary|d\.o\.b|dob|date|nationality|gender|languages?)\b/i;

    // ── Strategy 1: Flat single-line text (PDF.js client-side extraction) ─────
    const first300 = resumeText.slice(0, 300).replace(/\s+/g, ' ').trim();

    // Find earliest stop: email/phone/URL OR non-name resume words
    const contactIdx = first300.search(/[@+]|\d{5,}|http|www\.|linkedin|github/i);
    const keywordIdx = first300.search(NAME_STOP_PATTERN);

    let stopAt = -1;
    if (contactIdx > 0 && keywordIdx > 0) stopAt = Math.min(contactIdx, keywordIdx);
    else if (contactIdx > 0) stopAt = contactIdx;
    else if (keywordIdx > 0) stopAt = keywordIdx;

    const rawSegment = (stopAt > 0 ? first300.slice(0, stopAt) : first300).trim();

    if (rawSegment && rawSegment.length >= 2) {
        // Normalize dot-initial format: "SELVA.A" → "SELVA A", "A.P.J" → "A P J"
        const normalized = rawSegment
            .replace(/([A-Za-z])\.([A-Za-z])/g, '$1 $2')  // "SELVA.A" → "SELVA A"
            .replace(/\s+/g, ' ')
            .trim();

        // Title-case match: "Sanjai Kumar"
        const titleMatch = normalized.match(/^([A-Z][a-z'-]+(?: [A-Z][a-z'-]*\.?){0,3})/);
        if (titleMatch) {
            const name = titleMatch[1].trim();
            if (!SKIP_KEYWORDS.some(k => name.toLowerCase().includes(k)) && name.length >= 3) {
                return name;
            }
        }

        // ALL-CAPS match: "SELVA A" (was "SELVA.A"), "SANJAI KUMAR"
        const capsMatch = normalized.match(/^([A-Z]{2,})((?:\s[A-Z]{1,}){0,3})/);
        if (capsMatch) {
            const firstName = capsMatch[1].trim();
            const rest = capsMatch[2].trim();
            if (!SKIP_KEYWORDS.some(k => firstName.toLowerCase().includes(k)) && firstName.length >= 3) {
                // If the remaining parts are all single-letter initials, drop them — return only first name
                const parts = rest ? rest.split(/\s+/).filter(Boolean) : [];
                const allInitials = parts.every(p => p.length === 1);
                const fullName = (allInitials || parts.length === 0)
                    ? firstName
                    : `${firstName} ${parts.join(' ')}`;
                // Convert to Title Case: "SANJAI KUMAR" → "Sanjai Kumar", "SELVA" → "Selva"
                return fullName.replace(/\b([A-Z]+)\b/g, w => w[0] + w.slice(1).toLowerCase());
            }
        }
    }

    // ── Strategy 2: Newline-split (server-side pdf-parse / well-formatted PDFs) ──
    const lines = resumeText
        .split(/[\r\n]+/)
        .map(l => l.trim())
        .filter(Boolean)
        .slice(0, 12);

    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        if (SKIP_KEYWORDS.some(k => lowerLine.includes(k))) continue;
        if (/[@•–|]/.test(line)) continue;
        if (/\d{4,}/.test(line)) continue; // skip lines with long numbers (phone, pincode)
        if (line.length > 60) continue;

        // Normalize dot-initials on this line too
        const normalized = line.replace(/([A-Za-z])\.([A-Za-z])/g, '$1 $2').replace(/\s+/g, ' ').trim();

        const nameMatch = normalized.match(/^([A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]{0,}\.?){0,3})$/);
        if (nameMatch) return normalized.trim();

        const capsMatch = normalized.match(/^([A-Z]{1,}(?: [A-Z]{1,}){0,3})$/);
        if (capsMatch) {
            return capsMatch[1].replace(/\b([A-Z]+)\b/g, w => w[0] + w.slice(1).toLowerCase());
        }
    }

    return null;
}


// ─────────────────────────────────────────────
// SECTION-AWARE PROMPT BUILDER
// ─────────────────────────────────────────────
/**
 * Builds the base interviewer persona prompt.
 * Adjusts tone & instruction based on whether the section is DB-backed or resume-based.
 */
function buildInterviewerPersonaPrompt({ role, company, section, ragContext }) {
    const isDBSection = ['technical', 'scenario', 'industry'].includes(section);

    const personaBlock = `You are a senior interviewer at ${company || 'a top-tier tech company'} conducting a real technical interview for the role: ${role}.

CORE PERSONA — Non-negotiable rules:
1. You sound like a real human interviewer — not a chatbot. Your language is natural, direct, and professional.
2. Keep ALL responses to 2-3 sentences maximum, unless assigning a coding problem.
3. Never give hints, solutions, or coaching. Never praise answers with hollow positivity ("Great answer!", "Excellent!").
4. Brief, natural acknowledgements only: "Got it.", "Makes sense.", "Right.", "I see." — then move straight to your next question.
5. If the answer is vague or thin, probe specifically into it before advancing.
6. For behavioral questions, enforce the STAR method implicitly: push for Situation, Task, Action, Result if missing.
7. Never repeat a question that has already been asked.
8. Adjust your question difficulty based on the candidate's performance (see candidate memory in context).
9. If the candidate indicates they don't know, have no experience, or want to skip, accept it gracefully and move to the next topic/question — do not push or ask them to elaborate on a lack of knowledge.`;

    const sectionInstruction = isDBSection
        ? `\nSECTION INSTRUCTION (${section.toUpperCase()} — DB-RAG Mode):
- For new questions, you MUST strictly use the [TARGET DATABASE QUESTION] provided in the context as your source.
- Rephrase it naturally so it flows within the conversation, but preserve the core concept and technical testing objectives. Do NOT ask about a different topic.
- If the candidate's last response was incomplete, vague, or weak, stay on the previous topic or probe deeper before asking a new question.
- Focus on: specifics, trade-offs, complexity, and decision rationale.`
        : `\nSECTION INSTRUCTION (${section.toUpperCase()} — Resume-Based Mode):
- Ask questions ONLY based on the candidate's resume data provided in the context.
- Reference their specific projects, technologies, companies, and roles.
- If they mentioned ${section === 'projects' ? 'a project' : 'a role'} — dig into it specifically: architecture, decisions, challenges, outcomes.
- Do NOT generate generic questions. Ground every question in their actual background.`;

    return `${personaBlock}

${ragContext ? `--- CONTEXT ---\n${ragContext}\n---\n` : ''}${sectionInstruction}`;
}

// ─────────────────────────────────────────────
// AI SERVICE
// ─────────────────────────────────────────────
const aiService = {
    SECTIONS,
    isTechJD,
    isCodingRole,

    /**
     * Generates the opening Self-Introduction question.
     * Extracts candidate name from resume to personalize the greeting.
     */
    async generateFirstQuestion(company, role, jobDescription, resumeText) {
        // Try to extract the candidate's name from the resume upfront
        const candidateName = extractCandidateName(resumeText);
        console.log('[generateFirstQuestion] Extracted name:', candidateName, '| Resume start:', (resumeText || '').slice(0, 80));
        const nameGreeting = candidateName ? `Good to have you here, ${candidateName.split(' ')[0]}.` : `Good to have you here.`;

        try {
            const ragContext = await ragService.getContextForPrompt({
                role,
                company,
                section: 'self_intro',
                sectionQuestionCount: 0,
                resumeText,
                jobDescription
            });

            const prompt = `${buildInterviewerPersonaPrompt({ role, company, section: 'self_intro', ragContext })}

Your task: Write ONE natural, personalized self-introduction opening question.
- Start the greeting with exactly: "${nameGreeting}"
- After the greeting, briefly acknowledge ONE specific technology, project, or experience you can see from their resume in the context (if available).
- Then ask them to walk through their background and what brought them to apply for this role.
- Keep it warm but professional — this is the opening of a real interview.
- Example tone: "${nameGreeting} I noticed you've been working with [X] — that's relevant here. Let's start with a quick introduction: walk me through your journey and what brought you to apply for the ${role} role."

Return ONLY this JSON (no markdown): {"question": "..."}`;

            const text = await askGroq(prompt, 300);
            return extractJSON(text).question;
        } catch (error) {
            console.error('generateFirstQuestion Error:', error.message);
            return `${nameGreeting} Let's start with a quick introduction — walk me through your background and what brought you to apply for the ${role} role.`;
        }
    },

    /**
     * Core evaluation loop:
     * Evaluates candidate's answer → decides follow-up, advance, or coding problem.
     * Returns: { score, feedback, nextQuestion, advanceSection, nextSection, isCodingProblem }
     */
    async evaluateAndContinue({
        interviewId, role, company, section, sectionQuestionCount, maxQuestionsInSection,
        currentQuestion, answer, conversationHistory, hasTechJD
    }) {
        const sectionIdx = SECTIONS.findIndex(s => s.id === section);
        const nextSection = SECTIONS[sectionIdx + 1] || null;
        const canFollowUp = sectionQuestionCount < maxQuestionsInSection;

        // ── 1. Greeting detection ──────────────────────────────────────────
        if (isGreeting(answer)) {
            const reply = section === 'self_intro'
                ? `Good to meet you! Please go ahead and introduce yourself — walk me through your background.`
                : `Hey! Let's get back to it. ${currentQuestion}`;
            return { score: 5, feedback: 'Candidate greeted.', nextQuestion: reply, advanceSection: false, nextSection: nextSection?.id || 'closing', isCodingProblem: false };
        }

        // ── Repeat / Clarification intent detection ───────────────────────
        if (isRepeatIntent(answer)) {
            let cleanQuestion = currentQuestion || '';
            cleanQuestion = cleanQuestion.replace(/^(Sure, let me repeat that:\s*|Let me repeat that:\s*|Sure, let me repeat:\s*)/i, '');
            return {
                score: 5,
                feedback: 'Candidate asked to repeat the question.',
                nextQuestion: cleanQuestion,
                advanceSection: false,
                nextSection: nextSection?.id || 'closing',
                isCodingProblem: false
            };
        }

        // ── Clarification intent detection ───────────────────────────────
        if (isClarifyIntent(answer)) {
            // Check if we can rephrase locally first
            const localRephrased = getSimplerRephrasing(currentQuestion);
            if (localRephrased && localRephrased !== currentQuestion && !localRephrased.startsWith("Could you share") && !localRephrased.startsWith("Could you tell")) {
                return {
                    score: 5,
                    feedback: 'Candidate requested clarification. Question rephrased locally.',
                    nextQuestion: localRephrased,
                    advanceSection: false,
                    nextSection: nextSection?.id || 'closing',
                    isCodingProblem: false
                };
            }

            // Fallback to LLM if it's a dynamic resume/project question
            const rephrasePrompt = `You are a professional technical interviewer conducting a job interview.
The candidate did not understand the following question: "${currentQuestion}"

Your task: Rephrase this question in simpler terms so it is easier to understand.
Guidelines:
1. Keep the question short (1-2 sentences maximum).
2. Do not change the core topic, skill, or meaning of the question.
3. Do not give any hints, solutions, or coaching. Do not probe for specifics.
4. Speak directly to the candidate in a natural, conversational tone.

Return ONLY the rephrased question text (no JSON, no intro/outro).`;

            try {
                const rephrased = await askGroq(rephrasePrompt, 200);
                return {
                    score: 5,
                    feedback: 'Candidate requested clarification. Question rephrased via LLM.',
                    nextQuestion: rephrased.trim(),
                    advanceSection: false,
                    nextSection: nextSection?.id || 'closing',
                    isCodingProblem: false
                };
            } catch (err) {
                console.error('Rephrase error:', err.message);
                // Use fallback template rephraser
                return {
                    score: 5,
                    feedback: 'Candidate requested clarification. Fallback template used.',
                    nextQuestion: localRephrased,
                    advanceSection: false,
                    nextSection: nextSection?.id || 'closing',
                    isCodingProblem: false
                };
            }
        }

        // ── 2. Force-advance: no projects / no experience ──────────────────
        let forceAdvance = false;
        let skipReason = '';

        if (section === 'projects') {
            if (/no project|never built|don'?t have.*project|no portfolio|havent built|i have no project/i.test(answer)) {
                forceAdvance = true;
                skipReason = 'Candidate has no projects.';
            }
        } else if (section === 'experience') {
            if (/no experience|never worked|don'?t have.*experience|fresh graduate|no professional|just graduated|fresher/i.test(answer)) {
                forceAdvance = true;
                skipReason = 'Candidate has no professional experience.';
            }
        }

        if (forceAdvance) {
            const opener = nextSection ? SECTION_OPENERS[nextSection.id] || "Let's continue." : '';
            const transition = getRandom(TRANSITIONS);
            return {
                score: 2,
                feedback: skipReason,
                nextQuestion: nextSection
                    ? `${transition} ${opener}`
                    : "Thank you — that concludes our interview today.",
                advanceSection: true,
                nextSection: nextSection?.id || 'closing',
                isCodingProblem: false
            };
        }

        // ── 3. Skip / don't-know intent ───────────────────────────────────
        if (isSkipIntent(answer)) {
            const nextOpener = nextSection ? SECTION_OPENERS[nextSection.id] || "Let's continue." : '';
            const outcome = await getNextQuestionOrAdvance({
                interviewId, role, section, currentQuestion, canFollowUp, nextSection, nextOpener
            });

            return {
                score: 2,
                feedback: 'Candidate skipped / indicated lack of knowledge.',
                nextQuestion: outcome.nextQuestion,
                advanceSection: outcome.advanceSection,
                nextSection: nextSection?.id || 'closing',
                isCodingProblem: false
            };
        }

        // ── 4. Very short answer → prompt to elaborate ────────────────────
        if (isVeryShortAnswer(answer)) {
            if (isAcknowledgement(answer)) {
                const userMessages = (conversationHistory || []).filter(h => h.from !== 'ai');
                const prevCandidateMsg = userMessages[userMessages.length - 2];
                const repeatedAck = prevCandidateMsg && isAcknowledgement(prevCandidateMsg.text);

                if (repeatedAck) {
                    const nextOpener = nextSection ? SECTION_OPENERS[nextSection.id] || "Let's continue." : '';
                    const outcome = await getNextQuestionOrAdvance({
                        interviewId, role, section, currentQuestion, canFollowUp, nextSection, nextOpener
                    });
                    return {
                        score: 2,
                        feedback: 'Candidate repeated short acknowledgement. Moving to next question/section.',
                        nextQuestion: outcome.nextQuestion,
                        advanceSection: outcome.advanceSection,
                        nextSection: nextSection?.id || 'closing',
                        isCodingProblem: false
                    };
                } else {
                    return {
                        score: 5,
                        feedback: 'Short acknowledgement — prompted to continue.',
                        nextQuestion: "Go ahead, I'm listening.",
                        advanceSection: false,
                        nextSection: nextSection?.id || 'closing',
                        isCodingProblem: false
                    };
                }
            }
            // Use section-aware elaboration prompts
            const elaborationPrompt = getElaborationPrompt(section, answer);
            return {
                score: 3,
                feedback: 'Answer too short — asked for elaboration.',
                nextQuestion: elaborationPrompt,
                advanceSection: false,
                nextSection: nextSection?.id || 'closing',
                isCodingProblem: false
            };
        }

        // ── 5. Coding problem opportunity ─────────────────────────────────
        const codingEnabled = hasTechJD && section === 'technical';
        const shouldOfferCoding = codingEnabled && sectionQuestionCount >= 3 && sectionQuestionCount <= 5;

        // ── 6. Build RAG context ───────────────────────────────────────────
        let ragContext = '';
        try {
            ragContext = await ragService.getContextForPrompt({
                interviewId, role, company, section,
                sectionQuestionCount, currentQuestion, answer,
                conversationHistory, hasTechJD
            });
        } catch (ragErr) {
            console.error('RAG context error:', ragErr.message);
        }

        // ── 7. Build the conversation history snippet ──────────────────────
        const history = (conversationHistory || [])
            .slice(-6)
            .map(h => `${h.from === 'ai' ? 'Interviewer' : 'Candidate'}: ${h.text}`)
            .join('\n');

        const nextOpener = nextSection ? SECTION_OPENERS[nextSection.id] || "Let's continue." : '';

        const codingInstruction = shouldOfferCoding ? `
SPECIAL — CODING CHALLENGE:
The candidate has answered enough theory. If their theoretical performance is decent (score ≥ 6), assign a HARD coding problem.
Requirements:
- Hard difficulty (LeetCode Hard equivalent)
- Directly relevant to the role's tech stack
- Include: clear problem statement, input/output format, constraints, 2 examples
- Format: "Here is your coding challenge: [problem]"
- If you assign a coding problem: set isCodingProblem: true, advanceSection: false
` : '';

        // ── 8. Main evaluation prompt ──────────────────────────────────────
        const prompt = `${buildInterviewerPersonaPrompt({ role, company, section, ragContext })}

CURRENT STATE:
- Section: ${section.replace(/_/g, ' ').toUpperCase()} (${SECTIONS.find(s => s.id === section)?.label})
- Questions asked in this section: ${sectionQuestionCount} / ${maxQuestionsInSection}
- Can follow up: ${canFollowUp ? 'YES' : 'NO — you MUST transition to the next section'}
${nextSection ? `- Next section: ${nextSection.label} — Opener: "${nextOpener}"` : '- This is the last section.'}
${codingInstruction}

Recent Conversation:
${history || '(Start of interview)'}

Interviewer asked: "${currentQuestion}"
Candidate replied: "${answer}"

TASK:
1. Evaluate the candidate's answer internally (score 1-10).
2. Assess whether the candidate's answer is relevant to the question asked. If the candidate answers with something completely unrelated, off-topic, or avoids answering the question without stating that they don't know, set "isAnswerRelevant" to false. In this case, "nextQuestion" must politely state that the answer was not relevant to the question and then ask/rephrase the question again, and "advanceSection" must be false.
3. If the answer is relevant, set "isAnswerRelevant" to true.
4. If the answer is relevant but incomplete, vague, or skips key details → ask ONE targeted follow-up that probes the specific weak point.
5. If the answer is relevant and strong and ${canFollowUp ? 'you want to advance' : 'section is exhausted'} → transition naturally to the next section.
6. Your spoken response must start with a brief natural acknowledgement (1 sentence max) then the next question.
7. Never end with a compliment. Never say "Great answer" or "Excellent."

Return ONLY this JSON (no markdown):
{
  "score": 7,
  "feedback": "internal evaluation of the response",
  "isAnswerRelevant": true,
  "nextQuestion": "your natural acknowledgement + follow-up or transition",
  "advanceSection": false,
  "nextSection": "${nextSection?.id || 'closing'}",
  "isCodingProblem": false
}`;

        try {
            const text = await askGroq(prompt, 900);
            const parsed = extractJSON(text);
            const isRelevant = parsed.isAnswerRelevant !== false;
            const shouldAdvance = isRelevant && (parsed.advanceSection || !canFollowUp) && !parsed.isCodingProblem;

            return {
                score: typeof parsed.score === 'number' ? parsed.score : 5,
                feedback: parsed.feedback || '',
                isAnswerRelevant: isRelevant,
                nextQuestion: parsed.nextQuestion ||
                    (shouldAdvance && nextSection
                        ? `${getRandom(TRANSITIONS)} ${nextOpener}`
                        : "Thank you — that concludes our interview today."),
                advanceSection: shouldAdvance,
                nextSection: parsed.nextSection || nextSection?.id || 'closing',
                isCodingProblem: !!parsed.isCodingProblem,
            };

        } catch (error) {
            console.error('evaluateAndContinue Error:', error.message);

            // Fallback: try DB for a replacement question
            let fallback = '';
            let fallbackAdvance = !canFollowUp;
            try {
                const mem = await ragService.buildCandidateMemory(interviewId);
                const category = ragService.mapSectionToCategory(section);
                const skills = await getSkillsForInterview(interviewId);
                const dbQs = await retrievalService.getRelevantQuestions({
                    role, skills, category,
                    difficulty: mem.currentDifficulty || 'medium',
                    queryText: currentQuestion || '',
                    limit: 5
                });
                const available = dbQs.filter(q => {
                    const qClean = q.question.toLowerCase().trim();
                    const curClean = (currentQuestion || '').toLowerCase().trim();
                    if (curClean.includes(qClean) || qClean.includes(curClean)) {
                        return false;
                    }
                    return !mem.askedQuestions.some(a => {
                        const aClean = a.toLowerCase().trim();
                        return aClean.includes(qClean) || qClean.includes(aClean);
                    });
                });
                if (available.length > 0) {
                    fallback = `${getRandom(TRANSITIONS)} ${available[0].question}`;
                } else {
                    fallbackAdvance = true;
                }
            } catch {
                fallbackAdvance = true;
            }

            if (fallbackAdvance || !fallback) {
                fallback = nextSection
                    ? `${getRandom(TRANSITIONS)} ${nextOpener}`
                    : "Thank you for your time. That wraps up our interview today.";
            }

            return {
                score: 5,
                feedback: 'AI evaluation failed — fallback used.',
                isAnswerRelevant: true,
                nextQuestion: fallback,
                advanceSection: fallbackAdvance,
                nextSection: nextSection?.id || 'closing',
                isCodingProblem: false,
            };
        }
    },

    /**
     * Evaluates a coding submission (code + output).
     * Always advances to the next section after coding.
     */
    async evaluateCodingSubmission({ role, company, section, codingProblem, language, code, output, conversationHistory }) {
        const sectionIdx = SECTIONS.findIndex(s => s.id === section);
        const nextSection = SECTIONS[sectionIdx + 1] || null;

        try {
            const prompt = `You are a strict senior technical interviewer at ${company || 'a top-tier tech company'} evaluating a coding submission for: ${role}.

CODING PROBLEM:
${codingProblem}

CANDIDATE'S SOLUTION (${language}):
\`\`\`
${code}
\`\`\`

ACTUAL OUTPUT WHEN RUN:
${output || '(not executed)'}

EVALUATION (be strict and specific — 2-3 sentences):
1. Correctness — does it handle all cases including edge cases?
2. Time/Space Complexity — what is the Big-O? Is it optimal?
3. Code Quality — readable, well-structured, good variable names?
4. One specific improvement they should make.

After your evaluation, transition naturally to the next section.

Return ONLY this JSON (no markdown):
{
  "score": 7,
  "feedback": "detailed internal evaluation",
  "nextQuestion": "your spoken 2-3 sentence evaluation + transition to next section",
  "advanceSection": true,
  "nextSection": "${nextSection?.id || 'closing'}"
}`;

            const text = await askGroq(prompt, 700);
            const parsed = extractJSON(text);

            return {
                score: typeof parsed.score === 'number' ? parsed.score : 5,
                feedback: parsed.feedback || '',
                nextQuestion: parsed.nextQuestion || `Good effort on the code. Let's move forward. ${SECTION_OPENERS[nextSection?.id] || ''}`,
                advanceSection: true,
                nextSection: parsed.nextSection || nextSection?.id || 'closing',
                isCodingProblem: false,
            };
        } catch (error) {
            console.error('evaluateCodingSubmission Error:', error.message);
            return {
                score: 5,
                feedback: 'Code evaluation failed — fallback.',
                nextQuestion: `Thanks for the submission. Let's continue. ${SECTION_OPENERS[nextSection?.id] || ''}`,
                advanceSection: true,
                nextSection: nextSection?.id || 'closing',
                isCodingProblem: false,
            };
        }
    },

    // Legacy alias
    async generateInitialQuestions(company, role, jobDescription, resumeText) {
        const q = await this.generateFirstQuestion(company, role, jobDescription, resumeText);
        return [q];
    },
};

module.exports = aiService;
