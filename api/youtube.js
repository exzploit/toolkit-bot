const ytdl = require('@ybd-project/ytdl-core');

module.exports = async (req, res) => {
    const { url, quality, format, chatId } = req.query;
    const token = process.env.BOT_TOKEN;

    if (!token || token === 'your_bot_token_here') {
        return res.status(500).json({ error: 'BOT_TOKEN is not configured in environment variables' });
    }

    if (!url || !ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    try {
        const requestOptions = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        };

        const info = await ytdl.getInfo(url, { requestOptions });
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '') || 'video';
        
        let options = { requestOptions };
        let method = 'sendVideo';
        let field = 'video';
        let extension = 'mp4';
        
        if (format === 'mp3') {
            options = { ...options, filter: 'audioonly', quality: 'highestaudio' };
            method = 'sendAudio';
            field = 'audio';
            extension = 'mp3';
        } else {
            options = { ...options, quality: quality || 'highest' };
        }

        // Collect stream into Buffer (more reliable for serverless fetch)
        const chunks = [];
        const stream = ytdl(url, options);
        
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const fileBlob = new Blob([buffer]);

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append(field, fileBlob, `${title}.${extension}`);

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            body: formData
        });

        const tgData = await tgRes.json();

        if (tgData.ok) {
            res.status(200).json({ success: true });
        } else {
            res.status(500).json({ error: `Telegram: ${tgData.description}` });
        }

    } catch (err) {
        console.error('Download Error:', err);
        res.status(500).json({ error: err.message });
    }
};
