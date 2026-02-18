const { instagram } = require('priyansh-ig-downloader');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { url, chatId } = req.query;
    const token = process.env.BOT_TOKEN;

    if (!token) return res.status(500).json({ error: 'BOT_TOKEN missing' });
    if (!url) return res.status(400).json({ error: 'URL missing' });
    if (!chatId) return res.status(400).json({ error: 'chatId missing' });

    try {
        const data = await instagram(url);
        
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'No media found. Is the profile private?' });
        }

        // Send the first media found
        const mediaUrl = data[0].url;
        const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video');
        
        const method = isVideo ? 'sendVideo' : 'sendPhoto';
        const field = isVideo ? 'video' : 'photo';

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                [field]: mediaUrl,
                caption: 'Downloaded from Instagram via Toolkit Bot 🛡️'
            })
        });

        const tgData = await tgRes.json();

        if (tgData.ok) {
            res.status(200).json({ success: true });
        } else {
            res.status(500).json({ error: `Telegram: ${tgData.description}` });
        }

    } catch (err) {
        console.error('IG Error:', err);
        res.status(500).json({ error: 'Failed to process Instagram link' });
    }
};
