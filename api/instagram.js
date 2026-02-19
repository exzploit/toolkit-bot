const { instagramGetUrl } = require('instagram-url-direct');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { url, chatId } = req.query;
    const token = process.env.BOT_TOKEN;

    if (!token) return res.status(500).json({ error: 'BOT_TOKEN missing' });
    if (!url) return res.status(400).json({ error: 'URL missing' });
    if (!chatId) return res.status(400).json({ error: 'chatId missing' });

    try {
        console.log('Fetching IG URL with instagram-url-direct (named export):', url);
        
        // Named export is 'instagramGetUrl'
        const result = await instagramGetUrl(url);
        
        console.log('IG Result:', JSON.stringify(result));

        if (!result || !result.url_list || result.url_list.length === 0) {
            return res.status(404).json({ error: 'No media found. Account might be private or link is invalid.' });
        }

        const mediaUrl = result.url_list[0];
        const isVideo = mediaUrl.includes('.mp4') || (result.media_details && result.media_details[0] && result.media_details[0].type === 'video');
        
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
            console.error('Telegram Error:', tgData);
            res.status(500).json({ error: `Telegram: ${tgData.description}` });
        }

    } catch (err) {
        console.error('IG Error Details:', err);
        res.status(500).json({ error: `IG processing failed: ${err.message}` });
    }
};
