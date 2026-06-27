const { db } = require('../config/firebase');
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');
const admin = require('firebase-admin');
const groq = require('../services/groqClient');

// ─── Evaluation Report Generator ─────────────────────────────────────────────
// Computes section scores locally (deterministic), then asks Groq only for
// natural-language narrative (no number hallucination risk).
async function generateEvaluationReport({ role, company, questions, finalScore }) {

    const SECTION_LABELS = {
        self_intro: 'Self Introduction', projects: 'Projects', experience: 'Experience',
        technical: 'Technical Skills', scenario: 'Scenario-Based',
        industry: 'Industry Knowledge', soft_skills: 'Soft Skills',
    };

    // Group by section and compute averages locally
    const sectionMap = {};
    questions.forEach(q => {
        const sec = q.section;
        if (!sec || sec === 'closing') return;
        if (!sectionMap[sec]) sectionMap[sec] = { questions: [], scores: [] };
        sectionMap[sec].questions.push(q);
        if (typeof q.score === 'number') sectionMap[sec].scores.push(q.score);
    });

    const SECTION_ORDER = ['self_intro', 'projects', 'experience', 'technical', 'scenario', 'industry', 'soft_skills'];
    const sectionData = SECTION_ORDER
        .filter(sec => sectionMap[sec])
        .map(sec => {
            const d = sectionMap[sec];
            const avg = d.scores.length > 0
                ? Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 10)
                : 0;
            return { sectionKey: sec, label: SECTION_LABELS[sec] || sec, score: avg, questionCount: d.questions.length };
        });

    // Build Q&A digest — limit to 20 Qs, truncate long answers
    const answeredQs = questions
        .filter(q => q.question_text && q.user_answer && q.section !== 'closing')
        .slice(0, 20);

    const qaSummary = answeredQs.map((q, i) =>
        `Q${i + 1} [${SECTION_LABELS[q.section] || q.section}] Score:${q.score}/10\n` +
        `Q: ${q.question_text.substring(0, 160)}\n` +
        `A: ${(q.user_answer || '').substring(0, 220)}`
    ).join('\n\n');

    const sectionSummaryForPrompt = sectionData
        .map(s => `${s.label}: ${s.score}/100 (${s.questionCount} questions)`)
        .join('\n');

    const prompt =
`You are a senior technical interviewer writing a post-interview evaluation for a ${role}${company ? ` position at ${company}` : ''} candidate.

OVERALL SCORE: ${finalScore}/100

SECTION SCORES (already computed — do NOT change these numbers):
${sectionSummaryForPrompt}

Q&A TRANSCRIPT SAMPLE:
${qaSummary}

Write a professional evaluation. Return ONLY valid JSON (no markdown, no code fences):
{
  "overallSummary": "3-4 sentences assessing the candidate honestly and constructively. Reference specific content from their answers.",
  "sectionSummaries": {
    ${sectionData.map(s => `"${s.sectionKey}": "One specific sentence about their ${s.label} performance"`).join(',\n    ')}
  },
  "skillAssessment": [
    { "skill": "SkillName", "level": "Beginner|Intermediate|Advanced|Expert", "note": "Brief evidence-based note" }
  ],
  "strengths": [
    "Specific strength with evidence from their actual answers"
  ],
  "improvements": [
    "Specific, actionable improvement recommendation"
  ],
  "hiringRecommendation": "Strong Yes|Yes|Maybe|No",
  "interviewerNote": "One candid sentence a real interviewer would note"
}`;

    const result = await groq.chat.completions.create({
        model: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.35,
        max_tokens: 1500,
    });

    const text = (result.choices[0]?.message?.content || '').trim();
    let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON in report response');
    const parsed = JSON.parse(cleaned.substring(start, end + 1));

    // Merge pre-computed section scores with AI summaries
    parsed.sectionScores = sectionData.map(s => ({
        section: s.label,
        score: s.score,
        questionCount: s.questionCount,
        summary: parsed.sectionSummaries?.[s.sectionKey] || '',
    }));
    delete parsed.sectionSummaries;

    return parsed;
}

// GET /api/interviews
exports.getUserInterviews = async (req, res, next) => {
    try {
        const snapshot = await db.collection('interviews')
            .where('user_id', '==', req.user.id)
            .get();

        const interviews = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.status(200).json({ status: 'success', data: interviews });
    } catch (error) {
        console.error('getUserInterviews Error:', error.message);
        next(error);
    }
};

// GET /api/interviews/subscription
exports.getUserSubscription = async (req, res, next) => {
    try {
        const doc = await db.collection('users').doc(req.user.id).get();
        if (!doc.exists) {
            return res.status(200).json({
                status: 'success',
                data: { plan_id: 'free', interviews_remaining: 4, subscription_status: 'active' }
            });
        }
        const { plan_id, interviews_remaining, subscription_status } = doc.data();
        res.status(200).json({ status: 'success', data: { plan_id, interviews_remaining, subscription_status } });
    } catch (error) {
        console.error('getUserSubscription Error:', error.message);
        next(error);
    }
};

// GET /api/interviews/:id
exports.getInterviewById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('interviews').doc(id).get();

        if (!doc.exists || doc.data().user_id !== req.user.id) {
            return res.status(404).json({ status: 'error', message: 'Interview not found.' });
        }

        const questionsSnap = await db.collection('interviews').doc(id).collection('questions').get();
        const questions = questionsSnap.docs.map(q => ({ id: q.id, ...q.data() }));
        res.status(200).json({ status: 'success', data: { id: doc.id, ...doc.data(), questions } });
    } catch (error) {
        console.error('getInterviewById Error:', error.message);
        next(error);
    }
};

// POST /api/interviews/init
exports.initializeInterview = async (req, res, next) => {
    try {
        const { company, role, description, resumeText: clientResumeText } = req.body;

        if (!role || !description) {
            return res.status(400).json({ status: 'error', message: 'Role and job description are required.' });
        }

        // Check remaining interview quota BEFORE doing anything else
        const userDoc = await db.collection('users').doc(req.user.id).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const remaining = userData.interviews_remaining ?? 4; // default 4 for brand-new users
        if (remaining <= 0) {
            return res.status(403).json({
                status: 'error',
                code: 'QUOTA_EXCEEDED',
                message: 'You have used all your interview credits. Please upgrade your plan to continue.',
            });
        }

        let resumeText = '';
        if (clientResumeText && clientResumeText.trim().length > 0) {
            resumeText = clientResumeText.trim();
        } else if (req.file) {
            try {
                resumeText = await pdfService.extractTextFromPdf(req.file.buffer);
            } catch (pdfError) {
                return res.status(400).json({ status: 'error', message: 'Could not read the uploaded PDF.' });
            }
        }

        // Detect tech JD for coding problem feature
        const hasTechJD = aiService.isTechJD(description) && aiService.isCodingRole(role);

        // Generate the opening Self-Introduction question
        const firstQuestion = await aiService.generateFirstQuestion(company, role, description, resumeText);

        // Create Interview document in Firestore
        const interviewRef = await db.collection('interviews').add({
            user_id: req.user.id,
            company: company || '',
            role,
            job_description: description,
            resume_text: resumeText || '', // Saved for RAG retrieval
            status: 'in_progress',
            score: null,
            has_tech_jd: hasTechJD,
            current_section: 'self_intro',
            created_at: new Date().toISOString(),
        });

        // Decrement interviews_remaining immediately when interview starts
        db.collection('users').doc(req.user.id).update({
            interviews_remaining: admin.firestore.FieldValue.increment(-1)
        }).catch(e => console.error('Decrement error:', e.message));

        res.status(200).json({
            status: 'success',
            data: {
                interviewId: interviewRef.id,
                firstQuestion,
                sections: aiService.SECTIONS,
                hasTechJD,
                role,
                company: company || '',
            }
        });
    } catch (error) {
        console.error('initializeInterview Error:', error.message);
        next(error);
    }
};

// POST /api/interviews/next
exports.evaluateAnswer = async (req, res, next) => {
    try {
        const {
            interviewId, currentQuestion, answer, role, company,
            section, sectionQuestionCount, conversationHistory, hasTechJD
        } = req.body;

        if (!interviewId || !currentQuestion || !answer) {
            return res.status(400).json({ status: 'error', message: 'interviewId, currentQuestion, and answer are required.' });
        }

        const sectionId = section || 'self_intro';
        const sectionDef = aiService.SECTIONS.find(s => s.id === sectionId);
        const maxQ = sectionDef?.maxQ || 3;
        const qCount = sectionQuestionCount || 1;

        // Evaluate via AI — decide follow-up or advance section
        const evaluation = await aiService.evaluateAndContinue({
            interviewId,
            role: role || 'Software Engineer',
            company: company || '',
            section: sectionId,
            sectionQuestionCount: qCount,
            maxQuestionsInSection: maxQ,
            currentQuestion,
            answer,
            conversationHistory: conversationHistory || [],
            hasTechJD: !!hasTechJD,
        });

        // Save Q&A to Firestore sub-collection (non-blocking)
        db.collection('interviews').doc(interviewId)
            .collection('questions').add({
                question_text: currentQuestion,
                user_answer: answer,
                ai_feedback: evaluation.feedback,
                score: evaluation.score,
                section: sectionId,
                created_at: new Date().toISOString(),
            }).catch(e => console.error('Q save error:', e.message));

        // Update current section in interview doc if advancing
        if (evaluation.advanceSection && evaluation.nextSection) {
            db.collection('interviews').doc(interviewId)
                .update({ current_section: evaluation.nextSection })
                .catch(e => console.error('Section update error:', e.message));
        }

        res.status(200).json({
            status: 'success',
            data: {
                nextQuestion: evaluation.nextQuestion,
                advanceSection: evaluation.advanceSection,
                nextSection: evaluation.nextSection,
                isCodingProblem: evaluation.isCodingProblem,
                score: evaluation.score,
                feedback: evaluation.feedback,
                isAnswerRelevant: evaluation.isAnswerRelevant,
            }
        });
    } catch (error) {
        console.error('evaluateAnswer Error:', error.message);
        next(error);
    }
};

// POST /api/interviews/code-eval
exports.evaluateCodingSubmission = async (req, res, next) => {
    try {
        const { interviewId, codingProblem, language, code, output, role, company, section, conversationHistory } = req.body;
        if (!interviewId || !code) return res.status(400).json({ status: 'error', message: 'interviewId and code are required.' });

        const evaluation = await aiService.evaluateCodingSubmission({
            role: role || 'Software Engineer',
            company: company || '',
            section: section || 'technical',
            codingProblem: codingProblem || '',
            language: language || 'Unknown',
            code,
            output: output || '',
            conversationHistory: conversationHistory || [],
        });

        db.collection('interviews').doc(interviewId)
            .collection('questions').add({
                question_text: `[CODING] ${(codingProblem || '').substring(0, 200)}`,
                user_answer: `[${language}] ${code.substring(0, 500)}`,
                ai_feedback: evaluation.feedback,
                score: evaluation.score,
                section: section || 'technical',
                is_coding: true,
                created_at: new Date().toISOString(),
            }).catch(e => console.error('Code Q save error:', e.message));

        if (evaluation.nextSection) {
            db.collection('interviews').doc(interviewId)
                .update({ current_section: evaluation.nextSection })
                .catch(e => console.error('Section update error:', e.message));
        }

        res.status(200).json({
            status: 'success',
            data: {
                nextQuestion: evaluation.nextQuestion,
                advanceSection: true,
                nextSection: evaluation.nextSection,
                isCodingProblem: false,
                score: evaluation.score,
            }
        });
    } catch (error) {
        console.error('evaluateCodingSubmission Error:', error.message);
        next(error);
    }
};

// POST /api/interviews/:id/finish
exports.finishInterview = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Auth check first
        const interviewRef = db.collection('interviews').doc(id);
        const interviewDoc = await interviewRef.get();
        if (!interviewDoc.exists || interviewDoc.data().user_id !== req.user.id) {
            return res.status(404).json({ status: 'error', message: 'Interview not found.' });
        }
        const interviewData = interviewDoc.data();

        // Fetch all Q&A
        const questionsSnap = await db.collection('interviews').doc(id)
            .collection('questions').get();

        let totalScore = 0;
        let answeredCount = 0;
        const questions = [];

        questionsSnap.docs.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            questions.push(data);
            const { score, section } = data;
            if (section !== 'closing' && score != null) {
                totalScore += Number(score);
                answeredCount++;
            }
        });

        questions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // The expected total questions if the user completes all sections
        const expectedTotalQuestions = aiService.SECTIONS
            .filter(s => s.id !== 'closing' && s.id !== 'self_intro')
            .reduce((sum, s) => sum + s.maxQ, 1); // +1 for self_intro

        const denominator = Math.max(answeredCount, expectedTotalQuestions);
        const finalScore = denominator > 0 ? Math.round((totalScore / denominator) * 10) : 0;

        // ── Generate AI evaluation report ──────────────────────────────────────
        // Non-fatal: if Groq fails, interview still closes with just the numeric score.
        let evaluationReport = null;
        try {
            evaluationReport = await generateEvaluationReport({
                role: interviewData.role || 'Software Engineer',
                company: interviewData.company || '',
                questions,
                finalScore,
            });
            console.log(`[finishInterview] ✅ Evaluation report generated for interview ${id}`);
        } catch (reportErr) {
            console.error('[finishInterview] Report generation failed (non-fatal):', reportErr.message);
        }

        // Save to Firestore
        await interviewRef.update({
            status: 'completed',
            score: finalScore,
            ...(evaluationReport && { evaluation_report: evaluationReport }),
        });

        res.status(200).json({
            status: 'success',
            data: { interviewId: id, score: finalScore, report: evaluationReport },
        });
    } catch (error) {
        console.error('finishInterview Error:', error.message);
        next(error);
    }
};
