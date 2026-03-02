const https = require('https');

// Exact compiler names verified from https://wandbox.org/api/list.json
const WANDBOX_CONFIG = {
    python: { compiler: 'cpython-3.13.8' },
    java: { compiler: 'openjdk-jdk-22+36' },
    c: { compiler: 'gcc-13.2.0-c' },
    cpp: { compiler: 'gcc-13.2.0' },
};

/**
 * Makes a POST request to Wandbox and returns the result.
 */
const callWandbox = (payload) => {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const options = {
            hostname: 'wandbox.org',
            path: '/api/compile.json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'User-Agent': 'AIInterview/1.0'
            },
            timeout: 15000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Invalid JSON from Wandbox: ' + data.substring(0, 200))); }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request to execution engine timed out.')); });
        req.write(body);
        req.end();
    });
};

exports.runCode = async (req, res) => {
    const { language, code } = req.body;

    if (!language || !code) {
        return res.status(400).json({ status: 'error', message: 'language and code are required.' });
    }

    const config = WANDBOX_CONFIG[language];
    if (!config) {
        return res.status(400).json({ status: 'error', message: `Unsupported language: ${language}` });
    }

    console.log(`[Code Run] Language: ${language}, Compiler: ${config.compiler}`);

    try {
        const payload = {
            compiler: config.compiler,
            code: code,
            stdin: '',
            ...(config.options && { options: config.options })
        };

        const result = await callWandbox(payload);

        // Wandbox returns status as a string number
        const isError = result.status !== '0';

        let output = '';
        if (result.compiler_error) {
            output = `Compile Error:\n${result.compiler_error}`;
        } else if (result.program_error) {
            output = result.program_output
                ? `${result.program_output}\n\nRuntime Error:\n${result.program_error}`
                : `Runtime Error:\n${result.program_error}`;
        } else {
            output = result.program_output || '(No output)';
        }

        res.status(200).json({
            status: 'success',
            data: { output: output.trim(), isError }
        });

    } catch (err) {
        console.error('[Code Run] Wandbox Error:', err.message);
        res.status(502).json({
            status: 'error',
            message: `Execution engine error: ${err.message}`
        });
    }
};
