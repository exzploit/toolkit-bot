const ig = require('priyansh-ig-downloader');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { url, chatId } = req.query;
    const token = process.env.BOT_TOKEN;

    if (!token) return res.status(500).json({ error: 'BOT_TOKEN missing' });
    if (!url) return res.status(400).json({ error: 'URL missing' });
    if (!chatId) return res.status(400).json({ error: 'chatId missing' });

    try {
        // Correcting the function call based on typical library export
        // If it's a direct export or named export
        const downloadFn = ig.instagram || ig.default || ig;
        
        if (typeof downloadFn !== 'function') {
            throw new Error('Downloader function not found in library');
        }

        const data = await downloadFn(url);
        
        if (!data || (Array.isArray(data) && data.length === 0)) {
            return res.status(404).json({ error: 'No media found. Check if the link is correct or the account is public.' });
        }

        let mediaUrl = '';
        if (Array.isArray(data)) {
            mediaUrl = data[0].url || data[0].download_link;
        } else if (data.url) {
            mediaUrl = data.url;
        } else if (data.download_link) {
            mediaUrl = data.download_link;
        }

        if (!mediaUrl) {
            return res.status(404).json({ error: 'Could not extract a valid download link.' });
        }

        const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video');
        const method = isVideo ? 'sendVideo' : 'sendPhoto';
        const field = isVideo ? 'video' : 'photo';

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                [field]: mediaUrl,
                caption: 'Downloaded via Toolkit Bot 🛡️'
            })
        });

        const tgData = await tgRes.json();

        if (tgData.ok) {
            res.status(200).json({ success: true });
        } else {
            res.status(500).json({ error: `Telegram: ${tgData.description}` });
        }

    } catch (err) {
        console.error('IG Error Details:', err);
        res.status(500).json({ error: `IG processing failed: ${err.message}` });
    }
};
