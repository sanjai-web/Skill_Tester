const mysqlService = require('../services/mysqlService');
const embeddingService = require('../services/embeddingService');
const retrievalService = require('../services/retrievalService');
const ragService = require('../services/ragService');

async function runTests() {
    console.log('🧪 Starting RAG Layer Verification Tests...\n');
    let dbConnected = false;

    // 1. Test Database Connectivity
    try {
        console.log('1. Checking MySQL Database Connection...');
        const result = await mysqlService.query('SELECT 1 + 1 AS solution');
        if (result && result[0] && result[0].solution === 2) {
            console.log('   ✅ MySQL connected successfully!');
            dbConnected = true;
        } else {
            console.log('   ❌ MySQL check failed (unexpected result).');
        }
    } catch (err) {
        console.log(`   ❌ Database connection failed: ${err.message}`);
        console.log('   ⚠️ Please check if your MySQL server is running and credentials are set in .env.');
    }

    // 2. Test Embedding Generation
    console.log('\n2. Testing Embedding Service...');
    try {
        const testText = 'React hooks useEffect and useLayoutEffect comparison';
        console.log(`   Sending request for text: "${testText}"`);
        const vector = await embeddingService.getEmbedding(testText);
        if (Array.isArray(vector) && vector.length === embeddingService.VECTOR_DIMENSION) {
            console.log(`   ✅ Embedding generated successfully! (Dimension size: ${vector.length})`);
            console.log(`   First 5 values: ${JSON.stringify(vector.slice(0, 5))}...`);
        } else {
            console.log(`   ❌ Embedding check failed (Returned size: ${vector ? vector.length : 'null'}, expected ${embeddingService.VECTOR_DIMENSION})`);
        }
    } catch (err) {
        console.log(`   ❌ Embedding Service failed: ${err.message}`);
    }

    // 3. Test Retrieval Service (if database is connected and populated)
    if (dbConnected) {
        console.log('\n3. Testing Retrieval & Semantic Search...');
        try {
            // Check if questions are seeded
            const countRes = await mysqlService.query('SELECT COUNT(*) AS total FROM interview_questions');
            const total = countRes[0]?.total || 0;
            console.log(`   Total questions in database: ${total}`);

            if (total === 0) {
                console.log('   ⚠️ Warning: No questions found in MySQL database. Please run npm run seed first.');
            } else {
                console.log('   Performing semantic search query: "Explain cleanup function in React"');
                const results = await retrievalService.getRelevantQuestions({
                    role: 'Software Engineer',
                    skills: ['React', 'JavaScript'],
                    category: 'technical',
                    difficulty: 'medium',
                    queryText: 'Explain cleanup function in React',
                    limit: 2
                });

                console.log('   ✅ Retrieval query success! Results:');
                results.forEach((r, idx) => {
                    console.log(`      [${idx + 1}] Score: ${r.score} | Similarity: ${r.similarity}`);
                    console.log(`          Question: "${r.question}"`);
                    console.log(`          Metadata: Category=${r.category}, Skill=${r.skill}, Role=${r.role}, Difficulty=${r.difficulty}`);
                });
            }
        } catch (err) {
            console.log(`   ❌ Retrieval Service failed: ${err.message}`);
        }

        // 4. Test RAG Service context generation
        console.log('\n4. Testing RAG Service prompt context building...');
        try {
            const context = await ragService.getContextForPrompt({
                interviewId: null, // Test stateless context without Firestore doc
                role: 'Software Engineer',
                company: 'Google',
                section: 'technical',
                sectionQuestionCount: 2,
                currentQuestion: 'Explain useEffect Hook',
                answer: 'It is a hook that handles side effects. It takes a callback.',
                conversationHistory: [],
                hasTechJD: true,
                resumeText: 'I have experience in React Hooks, Node.js, Express, and MySQL.',
                jobDescription: 'Looking for a Frontend React Engineer.'
            });

            console.log('   ✅ RAG context built successfully!');
            console.log('--- Context Output Preview ---');
            console.log(context.substring(0, 700) + '\n... [truncated]');
            console.log('------------------------------');
        } catch (err) {
            console.log(`   ❌ RAG Service prompt context failed: ${err.message}`);
        }
    } else {
        console.log('\n⚠️ Skipping database retrieval and RAG context validation as database connection failed.');
    }

    console.log('\n🔌 Closing database connection pool...');
    await mysqlService.pool.end();
    console.log('🏁 Verification Tests Complete!');
}

runTests();
