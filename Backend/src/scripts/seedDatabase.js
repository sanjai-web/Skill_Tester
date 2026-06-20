/**
 * seedDatabase.js
 *
 * Seeds the local MySQL database with interview questions.
 * Uses local TF-IDF embedding (embeddingService) — NO external API calls required.
 *
 * Run: npm run seed
 *
 * Covers DB-backed sections only (technical, scenario, industry).
 * Projects/experience/self_intro questions are generated dynamically from resume keywords.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');
const embeddingService = require('../services/embeddingService');

const SEED_QUESTIONS = [

    // ═══════════════════════════════════════════════════
    // TECHNICAL — React / Frontend
    // ═══════════════════════════════════════════════════
    {
        role: 'Software Engineer',
        skill: 'React',
        category: 'technical',
        difficulty: 'easy',
        question: 'What is the purpose of the useEffect hook in React, and how do you control when it runs?',
        expected_topics: ['useEffect', 'dependency array', 'lifecycle', 'componentDidMount'],
        follow_up_tags: ['cleanup function', 'infinite loops', 'dependencies']
    },
    {
        role: 'Software Engineer',
        skill: 'React',
        category: 'technical',
        difficulty: 'medium',
        question: 'Explain the difference between useEffect and useLayoutEffect. When would you prefer useLayoutEffect over useEffect?',
        expected_topics: ['useEffect', 'useLayoutEffect', 'browser paint', 'DOM mutations', 'synchronous execution'],
        follow_up_tags: ['performance', 'visual flickering', 'paint cycle']
    },
    {
        role: 'Software Engineer',
        skill: 'React',
        category: 'technical',
        difficulty: 'medium',
        question: 'How does React reconciliation work, and what role do keys play when rendering lists?',
        expected_topics: ['reconciliation', 'virtual DOM', 'diffing algorithm', 'keys', 're-render'],
        follow_up_tags: ['key uniqueness', 'index as key pitfall', 'fiber']
    },
    {
        role: 'Software Engineer',
        skill: 'React',
        category: 'technical',
        difficulty: 'hard',
        question: 'How does React Fiber work under the hood? Explain how it enables concurrent rendering and time slicing.',
        expected_topics: ['React Fiber', 'reconciliation', 'concurrent mode', 'priority queues', 'work loop'],
        follow_up_tags: ['scheduling', 'suspense', 'rendering phases']
    },
    {
        role: 'Frontend Engineer',
        skill: 'JavaScript',
        category: 'technical',
        difficulty: 'medium',
        question: 'Explain the JavaScript event loop. How do microtasks (Promises) differ from macrotasks (setTimeout) in execution order?',
        expected_topics: ['event loop', 'call stack', 'microtasks', 'macrotasks', 'Promise', 'setTimeout'],
        follow_up_tags: ['queueMicrotask', 'async/await order', 'execution context']
    },
    {
        role: 'Frontend Engineer',
        skill: 'JavaScript',
        category: 'technical',
        difficulty: 'hard',
        question: 'What are JavaScript closures? Describe a real bug that closures can cause inside loops and how to fix it.',
        expected_topics: ['closures', 'lexical scope', 'IIFE', 'let vs var in loops', 'function factory'],
        follow_up_tags: ['memory leak via closure', 'module pattern', 'stale closures in React']
    },
    {
        role: 'Frontend Engineer',
        skill: 'CSS',
        category: 'technical',
        difficulty: 'medium',
        question: 'Explain how CSS specificity is calculated. What is the stacking order for: inline styles, IDs, classes, and elements?',
        expected_topics: ['specificity', 'cascade', 'inline styles', 'ID selectors', 'class selectors', '!important'],
        follow_up_tags: ['BEM methodology', 'CSS variables', 'specificity wars']
    },

    // ═══════════════════════════════════════════════════
    // TECHNICAL — Node.js / Backend
    // ═══════════════════════════════════════════════════
    {
        role: 'Backend Engineer',
        skill: 'Node.js',
        category: 'technical',
        difficulty: 'medium',
        question: 'Explain the Node.js Event Loop. How are microtasks (process.nextTick, Promises) and macrotasks (setTimeout, setImmediate) prioritized?',
        expected_topics: ['Event Loop', 'timers phase', 'poll phase', 'process.nextTick', 'microtasks', 'macrotasks'],
        follow_up_tags: ['thread pool', 'libuv', 'blocking I/O']
    },
    {
        role: 'Backend Engineer',
        skill: 'Node.js',
        category: 'technical',
        difficulty: 'hard',
        question: 'How do you diagnose and fix a memory leak in a production Node.js application? What tools and techniques would you use?',
        expected_topics: ['memory leak', 'heap snapshot', 'chrome devtools', 'v8 engine', 'garbage collection'],
        follow_up_tags: ['v8-profiler', 'heapdump', 'closure memory leaks']
    },
    {
        role: 'Backend Engineer',
        skill: 'Node.js',
        category: 'technical',
        difficulty: 'easy',
        question: 'What is middleware in Express.js? How does the middleware chain work, and how do you handle errors in it?',
        expected_topics: ['middleware', 'Express pipeline', 'next()', 'error middleware', 'order of execution'],
        follow_up_tags: ['error handler signature', 'async middleware', 'third-party middleware']
    },

    // ═══════════════════════════════════════════════════
    // TECHNICAL — Databases
    // ═══════════════════════════════════════════════════
    {
        role: 'Backend Engineer',
        skill: 'PostgreSQL',
        category: 'technical',
        difficulty: 'medium',
        question: 'What are database indexes and how do B-Tree and Hash indexes differ? How do indexes affect write performance?',
        expected_topics: ['B-Tree index', 'hash index', 'search time complexity', 'write overhead', 'read optimization'],
        follow_up_tags: ['composite index', 'EXPLAIN ANALYZE', 'index scan vs seq scan']
    },
    {
        role: 'Backend Engineer',
        skill: 'SQL',
        category: 'technical',
        difficulty: 'medium',
        question: 'Explain the four ACID properties of database transactions with a concrete example for each.',
        expected_topics: ['Atomicity', 'Consistency', 'Isolation', 'Durability', 'transactions', 'rollback'],
        follow_up_tags: ['isolation levels', 'dirty reads', 'phantom reads', 'deadlocks']
    },
    {
        role: 'Backend Engineer',
        skill: 'MongoDB',
        category: 'technical',
        difficulty: 'medium',
        question: 'When would you choose MongoDB over PostgreSQL? What are the trade-offs in terms of schema design, querying, and consistency?',
        expected_topics: ['document store', 'schema-less', 'relational vs non-relational', 'CAP theorem', 'joins vs embedding'],
        follow_up_tags: ['aggregation pipeline', 'eventual consistency', 'sharding']
    },

    // ═══════════════════════════════════════════════════
    // TECHNICAL — System Design / Architecture
    // ═══════════════════════════════════════════════════
    {
        role: 'Software Engineer',
        skill: 'System Design',
        category: 'technical',
        difficulty: 'hard',
        question: 'How would you design a scalable REST API for a high-traffic e-commerce product catalog? Walk me through caching, DB design, and rate limiting.',
        expected_topics: ['REST API', 'caching', 'Redis', 'rate limiting', 'pagination', 'CDN', 'horizontal scaling'],
        follow_up_tags: ['cache invalidation', 'read replicas', 'API versioning']
    },
    {
        role: 'Backend Engineer',
        skill: 'System Design',
        category: 'technical',
        difficulty: 'hard',
        question: 'Explain how you would implement a distributed rate limiter that works across multiple server instances.',
        expected_topics: ['rate limiting', 'Redis', 'sliding window', 'token bucket', 'distributed systems', 'atomic operations'],
        follow_up_tags: ['lua scripts', 'Redis INCR', 'leaky bucket algorithm']
    },
    {
        role: 'DevOps Engineer',
        skill: 'Docker',
        category: 'technical',
        difficulty: 'easy',
        question: 'What is the difference between a Docker image and a Docker container? How do multi-stage Dockerfiles reduce image size?',
        expected_topics: ['Docker image', 'Docker container', 'multi-stage builds', 'layer caching', 'distroless images'],
        follow_up_tags: ['build cache', 'alpine base', 'security scanning']
    },
    {
        role: 'DevOps Engineer',
        skill: 'Kubernetes',
        category: 'technical',
        difficulty: 'medium',
        question: 'Explain the difference between a Kubernetes Deployment and a StatefulSet. When would you choose one over the other?',
        expected_topics: ['Deployment', 'StatefulSet', 'pod identity', 'persistent storage', 'rolling updates'],
        follow_up_tags: ['PersistentVolumeClaim', 'headless service', 'DaemonSet']
    },

    // ═══════════════════════════════════════════════════
    // TECHNICAL — Security / Auth
    // ═══════════════════════════════════════════════════
    {
        role: 'Backend Engineer',
        skill: 'Security',
        category: 'technical',
        difficulty: 'medium',
        question: 'How does JWT authentication work? What are the security risks of storing JWTs in localStorage vs httpOnly cookies?',
        expected_topics: ['JWT structure', 'signing', 'localStorage XSS', 'httpOnly cookies', 'CSRF', 'token expiry'],
        follow_up_tags: ['refresh tokens', 'token rotation', 'blacklisting JWTs']
    },
    {
        role: 'Backend Engineer',
        skill: 'Security',
        category: 'technical',
        difficulty: 'hard',
        question: 'What is SQL injection and how do you prevent it? Walk me through how parameterized queries work at the driver level.',
        expected_topics: ['SQL injection', 'parameterized queries', 'prepared statements', 'ORM protection', 'input validation'],
        follow_up_tags: ['blind SQL injection', 'NoSQL injection', 'WAF']
    },

    // ═══════════════════════════════════════════════════
    // SCENARIO-BASED
    // ═══════════════════════════════════════════════════
    {
        role: 'System Architect',
        skill: 'System Design',
        category: 'scenario',
        difficulty: 'hard',
        question: 'Your backend database is at 100% CPU and API requests are timing out. Walk me through your triage process step-by-step.',
        expected_topics: ['database CPU spike', 'slow query logs', 'read replicas', 'caching', 'rate limiting', 'connection pooling'],
        follow_up_tags: ['horizontal scaling', 'circuit breakers', 'query optimization']
    },
    {
        role: 'Backend Engineer',
        skill: 'System Design',
        category: 'scenario',
        difficulty: 'medium',
        question: 'Design a URL shortener that handles 10,000 requests per second. What hashing, caching, and database strategies would you use?',
        expected_topics: ['URL shortener', 'Base62 encoding', 'Redis caching', 'hash collision', 'relational vs NoSQL'],
        follow_up_tags: ['distributed locking', 'unique ID generation', 'scaling writes']
    },
    {
        role: 'Software Engineer',
        skill: 'Problem Solving',
        category: 'scenario',
        difficulty: 'medium',
        question: 'A feature you deployed last night is now causing a 3% error rate spike in production. You have no monitoring alerts set up. How do you identify and fix the issue?',
        expected_topics: ['production incident', 'log analysis', 'rollback strategy', 'hotfix', 'post-mortem'],
        follow_up_tags: ['feature flags', 'canary release', 'on-call process']
    },
    {
        role: 'Backend Engineer',
        skill: 'Performance',
        category: 'scenario',
        difficulty: 'hard',
        question: 'Your API response times have degraded from 50ms to 2 seconds after a data volume increase. Walk me through how you would profile and fix this.',
        expected_topics: ['profiling', 'slow queries', 'N+1 problem', 'indexing', 'query optimization', 'caching strategy'],
        follow_up_tags: ['APM tools', 'query plans', 'database connection pooling']
    },

    // ═══════════════════════════════════════════════════
    // INDUSTRY KNOWLEDGE
    // ═══════════════════════════════════════════════════
    {
        role: 'Software Engineer',
        skill: 'Cloud Computing',
        category: 'industry',
        difficulty: 'medium',
        question: 'What are the trade-offs between serverless (e.g. AWS Lambda) and containerized microservices (Kubernetes)? When does serverless become a liability?',
        expected_topics: ['Serverless', 'cold starts', 'vendor lock-in', 'microservices', 'K8s', 'cost patterns'],
        follow_up_tags: ['state management', 'API gateway timeouts', 'debugging serverless']
    },
    {
        role: 'Software Engineer',
        skill: 'Architecture',
        category: 'industry',
        difficulty: 'medium',
        question: 'What is your take on microservices vs monolith? At what scale does a monolith become the wrong choice, and what signals do you look for?',
        expected_topics: ['microservices', 'monolith', 'service boundaries', 'Conway\'s Law', 'distributed tracing', 'team scaling'],
        follow_up_tags: ['strangler fig pattern', 'API gateway', 'service mesh']
    },
    {
        role: 'Backend Engineer',
        skill: 'Observability',
        category: 'industry',
        difficulty: 'medium',
        question: 'What are the three pillars of observability? How would you implement proper observability for a distributed microservices system?',
        expected_topics: ['logs', 'metrics', 'traces', 'distributed tracing', 'OpenTelemetry', 'alerting'],
        follow_up_tags: ['correlation IDs', 'SLO vs SLA', 'cardinality in metrics']
    },
    {
        role: 'Software Engineer',
        skill: 'AI/ML',
        category: 'industry',
        difficulty: 'easy',
        question: 'How would you responsibly integrate an LLM (like GPT or Llama) into a production application? What are the key risks and mitigations?',
        expected_topics: ['LLM integration', 'prompt injection', 'hallucination', 'RAG', 'rate limiting', 'cost management'],
        follow_up_tags: ['evaluation frameworks', 'output validation', 'model versioning']
    },

    // ═══════════════════════════════════════════════════
    // TECHNICAL — UI/UX Design
    // ═══════════════════════════════════════════════════
    {
        role: 'UI/UX Designer',
        skill: 'Figma',
        category: 'technical',
        difficulty: 'easy',
        question: 'How do you structure your Figma files for a large project, and what is your approach to organizing components and design tokens?',
        expected_topics: ['Figma', 'design tokens', 'component library', 'auto-layout', 'file organization'],
        follow_up_tags: ['naming conventions', 'variants', 'styles vs variables']
    },
    {
        role: 'UI/UX Designer',
        skill: 'Accessibility',
        category: 'technical',
        difficulty: 'medium',
        question: 'Explain the WCAG contrast requirements. How do you design interfaces that are accessible to users with visual or motor impairments?',
        expected_topics: ['WCAG', 'contrast ratio', 'accessibility', 'screen readers', 'keyboard navigation'],
        follow_up_tags: ['color blindness', 'aria labels', 'inclusive design']
    },
    {
        role: 'UI/UX Designer',
        skill: 'Design Systems',
        category: 'technical',
        difficulty: 'medium',
        question: 'What are the core principles of atomic design? How do you apply them when building a scalable design system?',
        expected_topics: ['atomic design', 'atoms molecules organisms', 'design systems', 'consistency', 'scaling components'],
        follow_up_tags: ['documentation', 'developer handoff', 'component state']
    },
    {
        role: 'UI/UX Designer',
        skill: 'User Research',
        category: 'technical',
        difficulty: 'hard',
        question: 'Walk me through your methodology for conducting usability testing on a high-fidelity prototype. How do you synthesize qualitative feedback into actionable design decisions?',
        expected_topics: ['usability testing', 'qualitative research', 'prototyping', 'feedback synthesis', 'user behavior'],
        follow_up_tags: ['moderated vs unmoderated', 'user personas', 'metrics like SUS']
    },
    {
        role: 'UI/UX Designer',
        skill: 'Interaction Design',
        category: 'technical',
        difficulty: 'medium',
        question: 'How do you apply Jakob\'s Law and Fitts\'s Law to improve user flows in a mobile application?',
        expected_topics: ['Jakobs Law', 'Fittss Law', 'UX laws', 'mobile layout', 'user flows'],
        follow_up_tags: ['cognitive load', 'thumb zone', 'touch target size']
    },

    // ═══════════════════════════════════════════════════
    // SCENARIO-BASED — UI/UX Design
    // ═══════════════════════════════════════════════════
    {
        role: 'UI/UX Designer',
        skill: 'User Research',
        category: 'scenario',
        difficulty: 'medium',
        question: 'Analytics show a 40% drop-off rate on a new multi-step checkout form. Walk me through how you would investigate and redesign this flow.',
        expected_topics: ['checkout drop-off', 'user analytics', 'form design', 'usability issues', 'checkout flow'],
        follow_up_tags: ['heuristics', 'friction points', 'checkout optimization']
    },
    {
        role: 'UI/UX Designer',
        skill: 'Problem Solving',
        category: 'scenario',
        difficulty: 'hard',
        question: 'A client or product manager insists on adding several complex features to the homepage, which will clutter the design. How do you handle this pushback using design rationale?',
        expected_topics: ['client pushback', 'design rationale', 'user focus', 'clutter reduction', 'negotiation'],
        follow_up_tags: ['data-backed design', 'A/B testing', 'compromise mockups']
    },

    // ═══════════════════════════════════════════════════
    // INDUSTRY KNOWLEDGE — UI/UX Design
    // ═══════════════════════════════════════════════════
    {
        role: 'UI/UX Designer',
        skill: 'Architecture',
        category: 'industry',
        difficulty: 'medium',
        question: 'What is your approach to developer handoff? How do you ensure that design intent is accurately translated into the final production code?',
        expected_topics: ['developer handoff', 'design intent', 'Figma handoff', 'documentation', 'collaboration'],
        follow_up_tags: ['redlining', 'design QA', 'bridging the gap']
    },
    {
        role: 'UI/UX Designer',
        skill: 'AI/ML',
        category: 'industry',
        difficulty: 'medium',
        question: 'How do you see Generative AI tools (like Figma AI or Midjourney) impacting the product design lifecycle and the role of the designer?',
        expected_topics: ['Generative AI', 'Figma AI', 'design lifecycle', 'automation', 'creative role'],
        follow_up_tags: ['ethics in design', 'prototyping speed', 'curation vs creation']
    }
];

async function seed() {
    console.log('\n🏁 Starting Database Seed — using local TF-IDF embeddings (no external API)...\n');
    let mysqlService;

    try {
        if (!process.env.DATABASE_URL) {
            // 1. Create DB if not exists
            console.log('📌 Creating database if not exists...');
            const tempConn = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                port: parseInt(process.env.DB_PORT || '3306', 10)
            });
            await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_DATABASE || 'interview_prep'}\``);
            await tempConn.end();
            console.log(`✅ Database \`${process.env.DB_DATABASE || 'interview_prep'}\` ready.\n`);
        } else {
            console.log('📌 Using DATABASE_URL. Skipping database creation step...\n');
        }

        mysqlService = require('../services/mysqlService');

        // 2. Create / recreate table
        console.log('📌 Recreating interview_questions table...');
        await mysqlService.query('DROP TABLE IF EXISTS interview_questions');
        await mysqlService.query(`
            CREATE TABLE interview_questions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                role VARCHAR(100),
                skill VARCHAR(100),
                category VARCHAR(100),
                difficulty ENUM('easy', 'medium', 'hard'),
                question TEXT,
                follow_up_tags JSON,
                expected_topics JSON,
                embedding_vector LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table ready.\n');

        // 3. Insert questions with local TF-IDF embeddings
        for (let i = 0; i < SEED_QUESTIONS.length; i++) {
            const q = SEED_QUESTIONS[i];
            const short = q.question.substring(0, 60);
            process.stdout.write(`⏳ [${i + 1}/${SEED_QUESTIONS.length}] "${short}..."  `);

            // Build rich text for embedding: question + expected topics + skill
            const textToEmbed = [
                `Role: ${q.role}`,
                `Skill: ${q.skill}`,
                `Category: ${q.category}`,
                `Difficulty: ${q.difficulty}`,
                `Question: ${q.question}`,
                `Topics: ${q.expected_topics.join(', ')}`
            ].join('. ');

            const vector = await embeddingService.getEmbedding(textToEmbed);

            await mysqlService.query(
                `INSERT INTO interview_questions
                (role, skill, category, difficulty, question, follow_up_tags, expected_topics, embedding_vector)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    q.role, q.skill, q.category, q.difficulty, q.question,
                    JSON.stringify(q.follow_up_tags),
                    JSON.stringify(q.expected_topics),
                    JSON.stringify(vector)
                ]
            );

            console.log(`✅`);
        }

        console.log(`\n🎉 Seeding complete! ${SEED_QUESTIONS.length} questions inserted.`);
        console.log(`📊 Breakdown:`);
        const categories = {};
        SEED_QUESTIONS.forEach(q => { categories[q.category] = (categories[q.category] || 0) + 1; });
        Object.entries(categories).forEach(([cat, count]) => console.log(`   ${cat}: ${count} questions`));

    } catch (err) {
        console.error('\n❌ Seeding failed:', err.message);
        console.error(err.stack);
    } finally {
        if (mysqlService?.pool) {
            await mysqlService.pool.end();
        }
        console.log('\n🔌 Connection closed.');
    }
}

seed();
