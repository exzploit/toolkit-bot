const { TikTok } = require('@tobyg74/tiktok-api-dl');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { url, chatId, format } = req.query;
    const token = process.env.BOT_TOKEN;

    if (!token) return res.status(500).json({ error: 'BOT_TOKEN missing' });
    if (!url) return res.status(400).json({ error: 'URL missing' });
    if (!chatId) return res.status(400).json({ error: 'chatId missing' });

    try {
        const result = await TikTok(url);
        
        if (result.status !== 'success') {
            throw new Error(result.message || 'TikTok extraction failed');
        }

        const data = result.result;
        let mediaUrl = format === 'mp3' ? data.music : data.video[0];
        
        if (!mediaUrl) {
            throw new Error('Requested format not available');
        }

        const method = format === 'mp3' ? 'sendAudio' : 'sendVideo';
        const field = format === 'mp3' ? 'audio' : 'video';

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                [field]: mediaUrl,
                caption: format === 'mp3' ? '' : (data.description || 'TikTok Video')
            })
        });

        const tgData = await tgRes.json();

        if (tgData.ok) {
            res.status(200).json({ success: true });
        } else {
            res.status(500).json({ error: `Telegram: ${tgData.description}` });
        }

    } catch (err) {
        console.error('TikTok Error:', err);
        res.status(500).json({ error: err.message });
    }
};
