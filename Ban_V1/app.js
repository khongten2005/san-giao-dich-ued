const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.static(__dirname));

const CONTAINER_NAME = process.env.CONTAINER_NAME || "Backend_Unknown";

app.get('/api/history', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'PAXGUSDT';
        const interval = req.query.interval || '15m';
        const response = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`);
        const chartData = response.data.map(candle => ({
            time: candle[0] / 1000,
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4])
        }));
        res.json(chartData);
    } catch (error) {
        res.status(500).json({ error: "Loi tai lich su" });
    }
});

app.get('/api/gold', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'PAXGUSDT';
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        res.json({ ticker: symbol, price: parseFloat(response.data.price).toFixed(2), server: CONTAINER_NAME });
    } catch (error) {
        res.status(500).json({ error: "Loi tai gia" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => console.log(`API chay cong ${port}`));