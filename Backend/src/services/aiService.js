const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const AI_MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

// 8-section interview structure
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

// CS/tech keywords — if JD contains any of these, coding problems are enabled
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

async function askGroq(prompt, maxTokens = 700) {
    const result = await groq.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
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

const SECTION_OPENERS = {
    projects: 'Walk me through your most technically complex project — the architecture, the key challenges, and specifically what you built.',
    experience: 'Tell me about the role where you had the deepest technical ownership and the most measurable impact.',
    technical: "Let's go technical. How would you design a highly available, scalable system for a core use case of this role?",
    scenario: "I'm going to give you a realistic scenario. Think out loud — structure matters as much as the answer.",
    industry: 'What major technical shift in this domain is most underrated right now, and why?',
    soft_skills: "Tell me about the most serious professional conflict you've experienced — not a mild disagreement, a real conflict.",
    closing: "We're near the end. What questions do you have for me about the role, the team, or the technical direction?",
};

const aiService = {
    SECTIONS,
    isTechJD,

    /**
     * Generates the opening Self-Introduction question.
     */
    async generateFirstQuestion(company, role, jobDescription, resumeText) {
        try {
            const prompt = `You are a senior interviewer at ${company || 'a top-tier tech company'} for the role: ${role}.
Resume (partial): ${(resumeText || '').substring(0, 400)}
Job Description (partial): ${(jobDescription || '').substring(0, 400)}

Write one professional Self-Introduction opening question specific to this role.
Return ONLY this JSON (no markdown): {"question": "..."}`;

            const text = await askGroq(prompt, 300);
            return extractJSON(text).question;
        } catch (error) {
            console.error('generateFirstQuestion Error:', error.message);
            return `Good to meet you. Please introduce yourself and walk me through your background as it relates to the ${role} position.`;
        }
    },

    /**
     * Evaluates a candidate's answer and decides: follow-up, coding problem, OR advance section.
     * Returns { score, feedback, nextQuestion, advanceSection, nextSection, isCodingProblem }
     */
    async evaluateAndContinue({ role, company, section, sectionQuestionCount, maxQuestionsInSection,
        currentQuestion, answer, conversationHistory, hasTechJD }) {
        const sectionIdx = SECTIONS.findIndex(s => s.id === section);
        const nextSection = SECTIONS[sectionIdx + 1] || null;
        const canFollowUp = sectionQuestionCount < maxQuestionsInSection;

        // Offer coding problems in the technical section for tech JDs
        const codingEnabled = hasTechJD && section === 'technical';
        // Only offer one coding problem (check if we haven't already in this session by question count)
        const shouldOfferCoding = codingEnabled && sectionQuestionCount >= 3 && sectionQuestionCount <= 5;

        try {
            const history = (conversationHistory || [])
                .slice(-6)
                .map(h => `${h.from === 'ai' ? 'Interviewer' : 'Candidate'}: ${h.text}`)
                .join('\n');

            const nextOpener = nextSection ? SECTION_OPENERS[nextSection.id] || 'Let\'s continue.' : '';

            const codingInstruction = shouldOfferCoding ? `
SPECIAL INSTRUCTION FOR TECHNICAL SECTION:
Since this is a tech role and the conversation has covered enough theory, you MAY now assign a HARD coding problem.
If the candidate's theoretical answers so far were decent, assign a coding problem (isCodingProblem: true).
The coding problem must be:
- Hard difficulty (similar to LeetCode Hard / CodeChef Long Division)
- Relevant to the role's tech stack
- Include: clear problem statement, input/output format, constraints, and 2 examples
- Format nextQuestion as: "Here is your coding challenge: [problem statement with examples and constraints]"
If you assign a coding problem, set isCodingProblem:true and do NOT set advanceSection:true.` : '';

            const prompt = `You are a strict senior interviewer at ${company || 'a top-tier tech company'} for the role: ${role}.

SECTION: ${section.replace(/_/g, ' ').toUpperCase()} (${SECTIONS.find(s => s.id === section)?.label})
Questions in this section: ${sectionQuestionCount} / ${maxQuestionsInSection}
Can follow up: ${canFollowUp ? 'YES' : 'NO — must advance'}
${nextSection ? `Next section: ${nextSection.label}\nOpener: "${nextOpener}"` : 'Last section.'}
${codingInstruction}

Recent conversation:
${history}

You asked: "${currentQuestion}"
Candidate replied: "${answer}"

EVALUATION RULES:
- Be strict. Demand specifics: algorithms, complexity, architecture, STAR method.
- NEVER give hollow praise.
- Keep response to 2-3 sentences max (unless assigning a coding problem).
- If answer weak/vague AND canFollowUp=YES → sharp follow-up (advanceSection: false)
- If answer sufficient OR canFollowUp=NO → transition to next section (advanceSection: true)
- Last section → close naturally

Return ONLY this JSON (no markdown):
{
  "score": 7,
  "feedback": "one-line internal note",
  "nextQuestion": "what you say next",
  "advanceSection": false,
  "nextSection": "${nextSection?.id || 'closing'}",
  "isCodingProblem": false
}`;

            const text = await askGroq(prompt, 900);
            const parsed = extractJSON(text);
            const shouldAdvance = (parsed.advanceSection || !canFollowUp) && !parsed.isCodingProblem;

            return {
                score: typeof parsed.score === 'number' ? parsed.score : 5,
                feedback: parsed.feedback || '',
                nextQuestion: parsed.nextQuestion || (shouldAdvance && nextSection
                    ? `Thank you. Let's move on. ${nextOpener}`
                    : 'Could you give a more specific example with measurable outcomes?'),
                advanceSection: shouldAdvance,
                nextSection: parsed.nextSection || nextSection?.id || 'closing',
                isCodingProblem: !!parsed.isCodingProblem,
            };

        } catch (error) {
            console.error('evaluateAndContinue Error:', error.message);
            const fallback = canFollowUp
                ? 'Could you give a more specific example with measurable outcomes?'
                : nextSection ? `Thank you. Let's move on. ${SECTION_OPENERS[nextSection.id] || ''}` : 'Do you have any questions for me?';
            return {
                score: 5, feedback: 'AI evaluation failed — fallback.',
                nextQuestion: fallback,
                advanceSection: !canFollowUp,
                nextSection: nextSection?.id || 'closing',
                isCodingProblem: false,
            };
        }
    },

    /**
     * Evaluates a coding submission — code + output.
     * Returns { score, feedback, nextQuestion, advanceSection, nextSection }
     */
    async evaluateCodingSubmission({ role, company, section, codingProblem, language, code, output, conversationHistory }) {
        const sectionIdx = SECTIONS.findIndex(s => s.id === section);
        const nextSection = SECTIONS[sectionIdx + 1] || null;

        try {
            const prompt = `You are a strict senior technical interviewer at ${company || 'a top-tier tech company'} evaluating a coding submission for the role: ${role}.

CODING PROBLEM:
${codingProblem}

CANDIDATE'S SUBMISSION (${language}):
\`\`\`
${code}
\`\`\`

ACTUAL OUTPUT WHEN RUN:
${output || '(not run)'}

EVALUATION CRITERIA (be strict and specific):
1. Correctness: Does it solve the problem for all cases (including edge cases)?
2. Time Complexity: What is the Big-O? Is it optimal?
3. Space Complexity: What is the Big-O? Is it optimal?
4. Code Quality: Is it readable, well-structured, uses good variable names?
5. Edge Cases: Are edge cases handled?
6. Output Correctness: Does the actual runtime output match expected?

Provide a 2-3 sentence evaluation mentioning: time/space complexity, correctness observation, and one specific improvement.
Then transition naturally to the next section.

Return ONLY this JSON (no markdown):
{
  "score": 7,
  "feedback": "detailed internal evaluation",
  "nextQuestion": "your spoken evaluation + transition to next section",
  "advanceSection": true,
  "nextSection": "${nextSection?.id || 'closing'}"
}`;

            const text = await askGroq(prompt, 700);
            const parsed = extractJSON(text);

            return {
                score: typeof parsed.score === 'number' ? parsed.score : 5,
                feedback: parsed.feedback || '',
                nextQuestion: parsed.nextQuestion || `Good effort. Let's move on. ${SECTION_OPENERS[nextSection?.id] || ''}`,
                advanceSection: true, // after coding, always advance
                nextSection: parsed.nextSection || nextSection?.id || 'closing',
                isCodingProblem: false,
            };
        } catch (error) {
            console.error('evaluateCodingSubmission Error:', error.message);
            return {
                score: 5, feedback: 'Code evaluation failed — fallback.',
                nextQuestion: `Thanks for the submission. Let's move on. ${SECTION_OPENERS[nextSection?.id] || ''}`,
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
