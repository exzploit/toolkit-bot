const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { from = 'usd', to = 'eur', amount = 1 } = req.query;

    try {
        // Using fawazahmed0's open currency API
        const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from.toLowerCase()}.json`;
        const response = await fetch(url);
        const data = await response.json();

        if (data[from.toLowerCase()] && data[from.toLowerCase()][to.toLowerCase()]) {
            const rate = data[from.toLowerCase()][to.toLowerCase()];
            const converted = amount * rate;
            res.status(200).json({
                success: true,
                from,
                to,
                amount,
                rate,
                result: converted,
                date: data.date
            });
        } else {
            res.status(404).json({ error: 'Currency pair not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
};
