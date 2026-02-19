const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = async (req, res) => {
    // Basic implementation: Forward uploaded image to Telegram
    // This could be expanded with 'sharp' for grayscale/sepia filters
    const { chatId } = req.body; 
    const token = process.env.BOT_TOKEN;

    if (!req.body.image) return res.status(400).json({ error: 'No image data' });

    try {
        const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('photo', buffer, { filename: 'processed_image.jpg' });

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        const tgData = await tgRes.json();
        if (tgData.ok) res.status(200).json({ success: true });
        else throw new Error(tgData.description);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
