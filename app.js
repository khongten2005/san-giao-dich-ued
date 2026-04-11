const express = require('express');
const path = require('path'); 
const axios = require('axios'); 
const mysql = require('mysql2/promise'); 
const bcrypt = require('bcrypt'); 
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

async function initDB() {
    try {
        pool = mysql.createPool(dbConfig);
        
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

        console.log(`[${CONTAINER_NAME}] Kết nối MySQL thành công! Đã tạo xong bảng Users và Trade History.`);
    } catch (error) {
        console.error(`[${CONTAINER_NAME}] Đang chờ MySQL khởi động...`);
    }
}
initDB();

// ================= CÁC API XÁC THỰC (ĐĂNG KÝ / ĐĂNG NHẬP) =================

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Nhập đủ thông tin!" });
        if (!pool) return res.status(500).json({ error: "DB chưa sẵn sàng!" });

        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại!" });

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password, balance) VALUES (?, ?, ?)', [username, hashedPassword, 10000]);

        res.json({ success: true, message: "Đăng ký thành công! Hãy đăng nhập." });
    } catch (error) {
        console.error(error); res.status(500).json({ error: "Lỗi máy chủ!" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!pool) return res.status(500).json({ error: "DB chưa sẵn sàng!" });

        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu!" });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu!" });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '12h' });
        res.json({ success: true, token, username: user.username, balance: parseFloat(user.balance) });
    } catch (error) {
        console.error(error); res.status(500).json({ error: "Lỗi máy chủ!" });
    }
});

// ================= CÁC API NGHIỆP VỤ (CŨ) =================

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

app.get('/api/gold', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'PAXGUSDT';
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        res.json({ ticker: symbol, price: parseFloat(response.data.price).toFixed(2), server: CONTAINER_NAME });
    } catch (error) { res.status(500).json({ error: "Lỗi tải giá" }); }
});

app.post('/api/save-trade', async (req, res) => {
    try {
        const { username, asset, type, margin, leverage, entryPrice, closePrice, pnl } = req.body;
        if (!pool) return res.status(500).json({ error: "Database chưa khởi động xong!" });

        const query = `INSERT INTO trade_history (username, asset, trade_type, margin, leverage, entry_price, close_price, pnl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(query, [username, asset, type, margin, leverage, entryPrice, closePrice, pnl]);

        // Cập nhật lại số dư trong bảng Users
        await pool.query(`UPDATE users SET balance = balance + ? WHERE username = ?`, [pnl, username]);

        res.json({ success: true, server: CONTAINER_NAME });
    } catch (error) {
        console.error(error); res.status(500).json({ error: "Lỗi lưu Database" });
    }
});

app.get('/api/admin/data', async (req, res) => {
    try {
        if (!pool) return res.status(500).json({ error: "Database chưa sẵn sàng" });
        const [rows] = await pool.query('SELECT * FROM trade_history ORDER BY id DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: "Lỗi truy vấn Database" }); }
});

app.get('/api/my-history', (req, res) => {
    const username = req.query.username; // Lấy tên người dùng từ trình duyệt gửi lên
    
    if (!username) {
        return res.status(400).json({ error: "Thiếu tên đăng nhập" });
    }

    const sql = "SELECT * FROM trades WHERE username = ? ORDER BY closed_at DESC";
    
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error("Lỗi MySQL: ", err);
            return res.status(500).json({ error: "Lỗi kết nối Database" });
        }
        res.json(results); // Chỉ trả về đúng dữ liệu của thằng này thôi
    });
});
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(port, () => console.log(`API chay cong ${port}`));