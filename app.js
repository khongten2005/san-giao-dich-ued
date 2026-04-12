const express = require('express');
const path = require('path');
const axios = require('axios');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); // Dùng bcryptjs cho nhẹ và ổn định trên Docker
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

app.use(express.static(__dirname));
app.use(express.json());

const CONTAINER_NAME = process.env.CONTAINER_NAME || "Backend_Unknown";
const SECRET_KEY = "Sieu_Mat_Khau_Cua_Khoa_UED";

// ================= CẤU HÌNH DATABASE MYSQL =================
const dbConfig = {
    host: 'db',
    user: 'ued_user',
    password: 'ued_password',
    database: 'ued_trading',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

// ================= KẾT NỐI DB (CHIÊU RETRY THẦN THÁNH) =================
async function initDB() {
    while (true) {
        try {
            pool = mysql.createPool(dbConfig);
            // Kiểm tra kết nối thực tế
            await pool.query("SELECT 1");
            console.log(`[${CONTAINER_NAME}] ✅ Kết nối MySQL thành công!`);
            break; // Thoát vòng lặp khi kết nối OK
        } catch (err) {
            console.log(`[${CONTAINER_NAME}] ⏳ MySQL chưa tỉnh, 2 giây nữa Khoa thử lại...`);
            await new Promise(res => setTimeout(res, 2000));
        }
    }

    try {
        const createTradeTable = `
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
        await pool.query(createTradeTable);

        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                balance DECIMAL(15, 2) DEFAULT 10000.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await pool.query(createUsersTable);
        console.log(`[${CONTAINER_NAME}] ✅ Đã kiểm tra và tạo xong các bảng.`);
    } catch (dbErr) {
        console.error("❌ Lỗi tạo bảng:", dbErr);
    }
}

// ================= API XÁC THỰC =================
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Nhập đủ thông tin!" });

        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password, balance) VALUES (?, ?, ?)', [username, hashedPassword, 10000]);

        res.json({ success: true, message: "Đăng ký thành công!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi máy chủ!" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (rows.length === 0) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu!" });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu!" });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ success: true, token, username: user.username, balance: parseFloat(user.balance) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi máy chủ!" });
    }
});

// ================= API DỮ LIỆU TỪ BINANCE =================
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
        res.status(500).json({ error: "Lỗi tải lịch sử" });
    }
});

app.get('/api/gold', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'PAXGUSDT';
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        res.json({
            ticker: symbol,
            price: parseFloat(response.data.price).toFixed(2),
            server: CONTAINER_NAME
        });
    } catch (error) {
        res.status(500).json({ error: "Lỗi tải giá" });
    }
});

// ================= LƯU LỆNH GIAO DỊCH =================
app.post('/api/save-trade', async (req, res) => {
    try {
        const { username, asset, type, margin, leverage, entryPrice, closePrice, pnl } = req.body;
        const query = `
            INSERT INTO trade_history 
            (username, asset, trade_type, margin, leverage, entry_price, close_price, pnl) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await pool.query(query, [username, asset, type, margin, leverage, entryPrice, closePrice, pnl]);
        await pool.query(`UPDATE users SET balance = balance + ? WHERE username = ?`, [pnl, username]);

        res.json({ success: true, server: CONTAINER_NAME });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi lưu Database" });
    }
});

app.get('/api/my-history', async (req, res) => {
    try {
        const username = req.query.username;
        if (!username) return res.status(400).json({ error: "Thiếu username" });
        const [rows] = await pool.query("SELECT * FROM trade_history WHERE username = ? ORDER BY closed_at DESC", [username]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Lỗi server" });
    }
});
app.get('/api/admin/data', async (req, res) => {
    try {
        if (!pool) return res.status(500).json({ error: "DB chưa sẵn sàng" });
        const [rows] = await pool.query('SELECT * FROM trade_history ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi truy vấn Database" });
    }
});
// ================= ĐIỀU HƯỚNG GIAO DIỆN =================
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/ls', (req, res) => res.sendFile(path.join(__dirname, 'ls.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ================= KHỞI ĐỘNG =================
async function startServer() {
    await initDB();
    app.listen(port, () => console.log(`🚀 Sàn UED của đại ca Khoa đang chạy tại cổng ${port}`));
}

startServer();