const ytdl = require('ytdl-core');
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
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        
        let options = {};
        let method = 'sendVideo';
        let field = 'video';
        
        if (format === 'mp3') {
            options = { filter: 'audioonly', quality: 'highestaudio' };
            method = 'sendAudio';
            field = 'audio';
        } else {
            options = { quality: quality || 'highest' };
        }

        const stream = ytdl(url, options);
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append(field, stream, { filename: `${title}.${format === 'mp3' ? 'mp3' : 'mp4'}` });

        // Use built-in fetch (Node 18+)
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
        console.error(err);
        res.status(500).json({ error: 'Failed to process: ' + err.message });
    }
};
