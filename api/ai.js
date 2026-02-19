const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) return res.status(500).json({ error: 'AI API Key missing' });
    if (!prompt) return res.status(400).json({ error: 'Prompt missing' });

    try {
        // Direct REST call to Gemini API using node-fetch
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            res.status(200).json({ text: data.candidates[0].content.parts[0].text });
        } else {
            throw new Error('Unexpected API response structure');
        }

    } catch (err) {
        console.error('AI Error:', err);
        res.status(500).json({ error: 'AI failed to respond: ' + err.message });
    }
};
