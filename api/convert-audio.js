const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fetch = require('node-fetch');
const FormData = require('form-data');
const multiparty = require('multiparty');
const fs = require('fs');
const { PassThrough } = require('stream');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const form = new multiparty.Form();
    const token = process.env.BOT_TOKEN;

    form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ error: err.message });

        const chatId = fields.chatId?.[0];
        const file = files.file?.[0];

        if (!chatId || !file) return res.status(400).json({ error: 'Missing data' });

        try {
            const outStream = new PassThrough();
            
            // Start conversion
            ffmpeg(file.path)
                .toFormat('mp3')
                .on('error', (e) => console.error('FFmpeg Error:', e))
                .pipe(outStream);

            const tgForm = new FormData();
            tgForm.append('chat_id', chatId);
            tgForm.append('audio', outStream, { filename: 'converted.mp3', contentType: 'audio/mpeg' });

            const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendAudio`, {
                method: 'POST',
                body: tgForm,
                headers: tgForm.getHeaders()
            });

            const tgData = await tgRes.json();
            
            // Cleanup temp file
            fs.unlinkSync(file.path);

            if (tgData.ok) {
                res.status(200).json({ success: true });
            } else {
                throw new Error(tgData.description);
            }

        } catch (err) {
            console.error('Conv Error:', err);
            res.status(500).json({ error: err.message });
        }
    });
};
