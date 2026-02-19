const dns = require('dns').promises;
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { domain } = req.query;

    if (!domain) return res.status(400).json({ error: 'Domain missing' });

    const results = {
        domain,
        dns: {},
        whois: null
    };

    try {
        // DNS Lookups
        const [a, mx, txt] = await Promise.allSettled([
            dns.resolve(domain, 'A'),
            dns.resolve(domain, 'MX'),
            dns.resolve(domain, 'TXT')
        ]);

        results.dns.a = a.status === 'fulfilled' ? a.value : [];
        results.dns.mx = mx.status === 'fulfilled' ? mx.value : [];
        results.dns.txt = txt.status === 'fulfilled' ? txt.value : [];

        // WHOIS via RDAP (Restful WHOIS replacement)
        try {
            const rdapRes = await fetch(`https://rdap.org/domain/${domain}`);
            if (rdapRes.ok) {
                const rdapData = await rdapRes.json();
                results.whois = {
                    registrar: rdapData.entities?.[0]?.vcardArray?.[1]?.find(x => x[0] === 'fn')?.[3] || 'Unknown',
                    status: rdapData.status?.[0] || 'Unknown',
                    created: rdapData.events?.find(e => e.eventAction === 'registration')?.eventDate || 'Unknown'
                };
            }
        } catch (e) {
            console.error('RDAP error:', e);
        }

        res.status(200).json(results);

    } catch (err) {
        res.status(500).json({ error: 'Failed to lookup domain info: ' + err.message });
    }
};
