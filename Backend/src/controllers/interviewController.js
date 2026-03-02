const { db } = require('../config/firebase');
const aiService = require('../services/aiService');
const pdfService = require('../services/pdfService');
const admin = require('firebase-admin');

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
                data: { plan_id: 'free', interviews_remaining: 1, subscription_status: 'active' }
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
        const remaining = userData.interviews_remaining ?? 1; // default 1 for brand-new users
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
        const hasTechJD = aiService.isTechJD(description);

        // Generate the opening Self-Introduction question
        const firstQuestion = await aiService.generateFirstQuestion(company, role, description, resumeText);

        // Create Interview document in Firestore
        const interviewRef = await db.collection('interviews').add({
            user_id: req.user.id,
            company: company || '',
            role,
            job_description: description,
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

        const questionsSnap = await db.collection('interviews').doc(id)
            .collection('questions').get();

        // Score all non-closing sections
        let totalScore = 0;
        let answeredCount = 0;

        questionsSnap.docs.forEach(doc => {
            const { score, section } = doc.data();
            if (section !== 'closing' && score != null) {
                totalScore += Number(score);
                answeredCount++;
            }
        });

        // The expected total questions if the user completes all sections
        const expectedTotalQuestions = aiService.SECTIONS
            .filter(s => s.id !== 'closing' && s.id !== 'self_intro')
            .reduce((sum, s) => sum + s.maxQ, 1); // +1 for self_intro

        // Use the larger of answeredCount or expectedTotalQuestions to penalize early exits
        const denominator = Math.max(answeredCount, expectedTotalQuestions);
        const finalScore = denominator > 0 ? Math.round((totalScore / denominator) * 10) : 0;

        const interviewRef = db.collection('interviews').doc(id);
        const interviewDoc = await interviewRef.get();
        if (!interviewDoc.exists || interviewDoc.data().user_id !== req.user.id) {
            return res.status(404).json({ status: 'error', message: 'Interview not found.' });
        }

        await interviewRef.update({ status: 'completed', score: finalScore });

        res.status(200).json({ status: 'success', data: { interviewId: id, score: finalScore } });
    } catch (error) {
        console.error('finishInterview Error:', error.message);
        next(error);
    }
};
