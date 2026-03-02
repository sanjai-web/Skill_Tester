const pdfParse = require('pdf-parse');

const pdfService = {
    async extractTextFromPdf(buffer) {
        try {
            const data = await pdfParse(buffer);
            // Basic cleanup (remove extra spaces, weird chars, keep max length)
            let text = data.text.replace(/\s+/g, ' ').trim();

            // Limit to ~3000 words to save tokens, should be enough for any standard resume
            if (text.length > 20000) {
                text = text.slice(0, 20000);
            }
            return text;
        } catch (error) {
            throw new Error('Failed to parse PDF resume: ' + error.message);
        }
    }
};

module.exports = pdfService;
