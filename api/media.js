const ytdl = require('@ybd-project/ytdl-core');
const instagramGetUrl = require('instagram-url-direct');
const { tiktokdl } = require('@tobyg74/tiktok-api-dl');

module.exports = async (req, res) => {
    const { type, url } = req.query;

    if (!url) return res.status(400).json({ error: 'URL required' });

    try {
        if (type === 'yt') {
            const info = await ytdl.getInfo(url);
            const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
            return res.status(200).json({ success: true, url: format.url, title: info.videoDetails.title });
        } 
        
        if (type === 'ig') {
            const data = await instagramGetUrl(url);
            return res.status(200).json({ success: true, url: data.url_list[0] });
        }

        if (type === 'tt') {
            const data = await tiktokdl(url);
            return res.status(200).json({ success: true, url: data.video.no_watermark });
        }

        res.status(400).json({ error: 'Invalid type' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
