const express = require('express');
const path = require('path'); 
const axios = require('axios'); 
const mysql = require('mysql2/promise'); // Thêm bộ não MySQL
const app = express();
const port = 3000;

app.use(express.static(__dirname));
app.use(express.json()); // Dòng này cực kỳ quan trọng để đọc dữ liệu từ web gửi về

const CONTAINER_NAME = process.env.CONTAINER_NAME || "Backend_Unknown";

// ================= CẤU HÌNH DATABASE MYSQL =================
const dbConfig = {
    host: 'db', // Trỏ thẳng vào cái thùng MySQL trong docker-compose
    user: 'ued_user',
    password: 'ued_password',
    database: 'ued_trading',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

// Hàm tự động khởi tạo và tạo bảng nếu chưa có
async function initDB() {
    try {
        pool = mysql.createPool(dbConfig);
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS trade_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                asset VARCHAR(50) NOT NULL,
                trade_type VARCHAR(10) NOT NULL,
                margin DECIMAL(10,2) NOT NULL,
                leverage INT NOT NULL,
                entry_price DECIMAL(15,2) NOT NULL,
                close_price DECIMAL(15,2) NOT NULL,
                pnl DECIMAL(15,2) NOT NULL,
                closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await pool.query(createTableQuery);
        console.log(`[${CONTAINER_NAME}] Kết nối MySQL thành công! Đã sẵn sàng lưu dữ liệu.`);
    } catch (error) {
        console.error(`[${CONTAINER_NAME}] Đang chờ MySQL khởi động...`);
    }
}
initDB();
// ==========================================================

// 1. API LẤY LỊCH SỬ KLINE
app.get('/api/history', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'PAXGUSDT'; 
        const interval = req.query.interval || '15m';  
        const response = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`);
        const chartData = response.data.map(candle => ({
            time: candle[0] / 1000, open: parseFloat(candle[1]), high: parseFloat(candle[2]), low: parseFloat(candle[3]), close: parseFloat(candle[4])
        }));
        res.json(chartData);
    } catch (error) { res.status(500).json({ error: "Lỗi tải lịch sử" }); }
});

// 2. API LẤY GIÁ REALTIME
app.get('/api/gold', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'PAXGUSDT';
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        res.json({ ticker: symbol, price: parseFloat(response.data.price).toFixed(2), server: CONTAINER_NAME });
    } catch (error) { res.status(500).json({ error: "Lỗi tải giá" }); }
});

// 3. [NEW API] LƯU LỊCH SỬ VÀO DATABASE
app.post('/api/save-trade', async (req, res) => {
    try {
        const { username, asset, type, margin, leverage, entryPrice, closePrice, pnl } = req.body;
        if (!pool) return res.status(500).json({ error: "Database chưa khởi động xong!" });

        const query = `INSERT INTO trade_history (username, asset, trade_type, margin, leverage, entry_price, close_price, pnl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(query, [username, asset, type, margin, leverage, entryPrice, closePrice, pnl]);

        res.json({ success: true, server: CONTAINER_NAME });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi lưu Database" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => console.log(`API chay cong ${port}`));