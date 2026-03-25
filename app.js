const express = require('express');
const axios = require('axios'); // Gọi thư viện axios để chọc API thật
const app = express();
const port = 3000;

// Lấy tên Container từ cấu hình Docker, nếu không có thì để mặc định
const CONTAINER_NAME = process.env.CONTAINER_NAME || "Backend_Unknown";

// ==========================================
// 1. API LẤY GIÁ VÀNG THẬT (BACKEND)
// ==========================================
app.get('/api/gold', async (req, res) => {
    try {
        // Lấy giá PAXG/USDT (Bảo chứng 1:1 với vàng thật) từ Binance
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
        
        // Ép kiểu về số thực và làm tròn 2 chữ số thập phân
        const realPrice = parseFloat(response.data.price).toFixed(2);

        const goldPriceData = {
            ticker: "XAU/USD (Real-time)",
            price: realPrice,
            currency: "USD",
            server: CONTAINER_NAME,
            timestamp: new Date().toISOString()
        };
        
        console.log(`[${CONTAINER_NAME}] Cap nhat gia vang that: $${realPrice}`);
        res.json(goldPriceData);

    } catch (error) {
        console.log(`[${CONTAINER_NAME}] Lỗi gọi API Binance:`, error.message);
        res.status(500).json({ error: "Không thể lấy giá vàng lúc này" });
    }
});

// ==========================================
// 2. GIAO DIỆN SÀN GIAO DỊCH (FRONTEND)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Trading Dashboard</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background-color: #0b0f19; 
                color: white; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
            }
            .dashboard { 
                background: #1e293b; 
                padding: 40px; 
                border-radius: 20px; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.8); 
                text-align: center; 
                border: 1px solid #334155; 
                width: 450px; 
                position: relative;
            }
            .live-indicator {
                position: absolute;
                top: 20px;
                right: 20px;
                color: #ef4444;
                font-weight: bold;
                font-size: 14px;
                animation: blink 1s infinite;
            }
            @keyframes blink { 50% { opacity: 0; } }
            
            h1 { color: #facc15; margin-top: 0; font-size: 26px; letter-spacing: 1px; }
            .ticker { font-size: 18px; color: #94a3b8; margin-bottom: 20px; }
            .price-box { 
                margin: 30px 0; 
                background: #0f172a; 
                padding: 20px; 
                border-radius: 15px; 
                border: 1px solid #1e293b;
            }
            .price { font-size: 55px; font-weight: bold; transition: color 0.3s ease; }
            .up { color: #10b981; } 
            .down { color: #ef4444; } 
            .neutral { color: #e2e8f0; } 
            
            .server-info { 
                background: #0f172a; 
                padding: 15px; 
                border-radius: 10px; 
                font-size: 14px; 
                color: #94a3b8; 
                border: 1px dashed #475569;
                margin-top: 20px;
            }
            .server-info span { 
                color: #38bdf8; 
                font-weight: bold; 
                font-size: 20px; 
                display: block; 
                margin-top: 5px; 
                transition: color 0.3s;
            }
            .status-text {
                margin-top: 20px;
                font-size: 13px;
                color: #64748b;
            }
        </style>
    </head>
    <body>
        <div class="dashboard">
            <div class="live-indicator">● LIVE</div>
            <h1>📊 SÀN GIAO DỊCH UED</h1>
            <div class="ticker">Tỷ giá: <b>VÀNG THẾ GIỚI (XAU/USD)</b></div>
            
            <div class="price-box">
                <div class="price neutral" id="priceDisplay">Đang tải...</div>
            </div>

            <div class="server-info">
                Đang được xử lý cân bằng tải bởi máy chủ:<br>
                <span id="serverName">Đang kết nối...</span>
            </div>

            <div class="status-text">🔄 Hệ thống tự động cập nhật mỗi 2 giây</div>
        </div>

        <script>
            let previousPrice = null; 

            function fetchData() {
                fetch('/api/gold')
                    .then(res => res.json())
                    .then(data => {
                        if(data.error) {
                            console.error(data.error);
                            return; // Bỏ qua nếu lỗi mạng để giao diện không bị sập
                        }

                        const priceElement = document.getElementById('priceDisplay');
                        const serverElement = document.getElementById('serverName');
                        const currentPrice = parseFloat(data.price);
                        
                        // Thuật toán đổi màu: Chỉ đổi khi giá thay đổi
                        if (previousPrice !== null && currentPrice !== previousPrice) {
                            if (currentPrice > previousPrice) {
                                priceElement.className = 'price up';
                                priceElement.innerHTML = currentPrice.toFixed(2) + ' <span style="font-size:30px">▲</span>';
                            } else if (currentPrice < previousPrice) {
                                priceElement.className = 'price down';
                                priceElement.innerHTML = currentPrice.toFixed(2) + ' <span style="font-size:30px">▼</span>';
                            }
                        } else if (previousPrice === null) {
                            // Lần đầu tải trang
                            priceElement.innerHTML = currentPrice.toFixed(2);
                        }
                        
                        previousPrice = currentPrice; 
                        
                        // Hiển thị tên máy chủ đang phục vụ (Load Balancer đang chia việc)
                        serverElement.style.color = '#ffffff';
                        serverElement.innerText = "🚀 " + data.server;
                        setTimeout(() => { serverElement.style.color = '#38bdf8'; }, 300);
                    })
                    .catch(err => console.log("Lỗi:", err));
            }
            
            // Chạy ngay lần đầu
            fetchData();
            
            // Tự động gọi lại mỗi 2 giây (2000ms)
            setInterval(fetchData, 2000);
        </script>
    </body>
    </html>
    `);
});

app.listen(port, () => {
    console.log(`API dang chay tai cong ${port}`);
});