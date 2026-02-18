const ytdl = require('@ybd-project/ytdl-core');
const FormData = require('form-data');

module.exports = async (req, res) => {
    const { url, quality, format, chatId } = req.query;
    const token = process.env.BOT_TOKEN;

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    if (!chatId) {
        return res.status(400).json({ error: 'Missing Chat ID' });
    }

    try {
        // Optimized request options for the new fork
        const requestOptions = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
            }
        };

        const info = await ytdl.getInfo(url, { requestOptions });
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        
        let options = { requestOptions };
        let method = 'sendVideo';
        let field = 'video';
        
        if (format === 'mp3') {
            options = { ...options, filter: 'audioonly', quality: 'highestaudio' };
            method = 'sendAudio';
            field = 'audio';
        } else {
            options = { ...options, quality: quality || 'highest' };
        }

        const stream = ytdl(url, options);
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append(field, stream, { filename: `${title}.${format === 'mp3' ? 'mp3' : 'mp4'}` });

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        const tgData = await tgRes.json();

        if (tgData.ok) {
            res.status(200).json({ success: true });
        } else {
            res.status(500).json({ error: 'Telegram API Error: ' + tgData.description });
        }

    } catch (err) {
        console.error('YTDL Error:', err);
        res.status(500).json({ error: 'Failed to process: ' + err.message });
    }
};
