const { instagramGetUrl } = require('instagram-url-direct');
const fetch = require('node-fetch');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const { PassThrough } = require('stream');
const FormData = require('form-data');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

module.exports = async (req, res) => {
    const { url, chatId, format } = req.query;
    const token = process.env.BOT_TOKEN;

    if (!token) return res.status(500).json({ error: 'BOT_TOKEN missing' });
    if (!url) return res.status(400).json({ error: 'URL missing' });
    if (!chatId) return res.status(400).json({ error: 'chatId missing' });

    try {
        const result = await instagramGetUrl(url);
        
        if (!result || !result.url_list || result.url_list.length === 0) {
            return res.status(404).json({ error: 'No media found. Account might be private.' });
        }

        const mediaUrl = result.url_list[0];
        const isVideo = mediaUrl.includes('.mp4') || (result.media_details && result.media_details[0] && result.media_details[0].type === 'video');

        if (format === 'mp3' && isVideo) {
            // Audio Extraction Mode
            const audioStream = new PassThrough();
            
            ffmpeg(mediaUrl)
                .toFormat('mp3')
                .on('error', (err) => {
                    console.error('FFmpeg Error:', err);
                })
                .pipe(audioStream);

            const form = new FormData();
            form.append('chat_id', chatId);
            form.append('audio', audioStream, { filename: 'instagram_audio.mp3', contentType: 'audio/mpeg' });

            const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendAudio`, {
                method: 'POST',
                body: form,
                headers: form.getHeaders()
            });

            const tgData = await tgRes.json();
            if (tgData.ok) return res.status(200).json({ success: true });
            else throw new Error(tgData.description);

        } else {
            // Regular Video/Photo Mode
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
            if (tgData.ok) return res.status(200).json({ success: true });
            else throw new Error(tgData.description);
        }

    } catch (err) {
        console.error('IG Error:', err);
        res.status(500).json({ error: `IG Error: ${err.message}` });
    }
};
