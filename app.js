const express = require('express');
const axios = require('axios'); 
const app = express();
const port = 3000;

// Lấy tên Container từ cấu hình Docker, nếu không có thì để mặc định
const CONTAINER_NAME = process.env.CONTAINER_NAME || "Backend_Unknown";

// ==========================================
// 1. API LẤY DỮ LIỆU LỊCH SỬ (VẼ BIỂU ĐỒ NẾN TOÀN CẢNH)
// ==========================================
app.get('/api/history', async (req, res) => {
    try {
        // Lấy 200 cây nến gần nhất (mỗi nến 15 phút)
        const response = await axios.get('https://api.binance.com/api/v3/klines?symbol=PAXGUSDT&interval=15m&limit=200');
        
        const chartData = response.data.map(candle => {
            return {
                time: candle[0] / 1000,   // Đổi timestamp ra giây cho Lightweight Charts
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4])
            };
        });
        
        console.log(`[${CONTAINER_NAME}] Da gui du lieu lich su (200 nen)`);
        res.json(chartData);
    } catch (error) {
        console.log(`[${CONTAINER_NAME}] Lỗi gọi API History:`, error.message);
        res.status(500).json({ error: "Không thể lấy dữ liệu lịch sử" });
    }
});

// ==========================================
// 2. API LẤY GIÁ VÀNG THẬT (REAL-TIME GIẬT TỪNG GIÂY)
// ==========================================
app.get('/api/gold', async (req, res) => {
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
        const realPrice = parseFloat(response.data.price).toFixed(2);

        const goldPriceData = {
            ticker: "XAU/USD (Real-time)",
            price: realPrice,
            currency: "USD",
            server: CONTAINER_NAME,
            timestamp: new Date().toISOString()
        };
        
        res.json(goldPriceData);
    } catch (error) {
        console.log(`[${CONTAINER_NAME}] Lỗi gọi API Realtime:`, error.message);
        res.status(500).json({ error: "Không thể lấy giá vàng lúc này" });
    }
});

// ==========================================
// 3. GIAO DIỆN SÀN GIAO DỊCH VIP (FRONTEND)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Trading Dashboard VIP</title>
        
        <script src="https://cdn.jsdelivr.net/npm/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js"></script>
        
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background-color: #0b0f19; 
                color: white; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                margin: 0; 
                padding: 20px;
                box-sizing: border-box;
            }
            .dashboard { 
                background: #1e293b; 
                padding: 40px; 
                border-radius: 20px; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.8); 
                text-align: center; 
                border: 1px solid #334155; 
                width: 100%; 
                max-width: 900px;
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
            
            .flex-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .price-box { 
                background: #0f172a; 
                padding: 20px; 
                border-radius: 15px; 
                border: 1px solid #1e293b;
            }
            .price { font-size: 55px; font-weight: bold; transition: color 0.3s ease; }
            .up { color: #10b981; } 
            .down { color: #ef4444; } 
            .neutral { color: #e2e8f0; } 
            
            #chart-container {
                width: 100%;
                height: 400px;
                border-radius: 10px;
                overflow: hidden;
                border: 1px solid #334155;
            }

            .server-info { 
                background: #0f172a; 
                padding: 15px; 
                border-radius: 10px; 
                font-size: 14px; 
                color: #94a3b8; 
                border: 1px dashed #475569;
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
            <h1>📊 SÀN GIAO DỊCH UED (PRO VERSION)</h1>
            <div class="ticker">Tỷ giá: <b>VÀNG THẾ GIỚI (XAU/USD)</b></div>
            
            <div class="flex-container">
                <div class="price-box">
                    <div class="price neutral" id="priceDisplay">Đang tải...</div>
                </div>

                <div id="chart-container"></div>

                <div class="server-info">
                    Đang được xử lý cân bằng tải bởi máy chủ:<br>
                    <span id="serverName">Đang kết nối...</span>
                </div>
            </div>

            <div class="status-text">🔄 Hệ thống tự động cập nhật mỗi 2 giây</div>
        </div>

        <script>
            // Cấu hình giao diện biểu đồ
            const chartProperties = {
                layout: { textColor: '#d1d5db', background: { type: 'solid', color: '#0f172a' } },
                grid: { vertLines: { color: '#334155' }, horzLines: { color: '#334155' } },
                crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
                timeScale: { timeVisible: true, secondsVisible: false },
            };
            
            const chartContainer = document.getElementById('chart-container');
            const chart = LightweightCharts.createChart(chartContainer, chartProperties);
            const candleSeries = chart.addCandlestickSeries({
                upColor: '#10b981', downColor: '#ef4444', 
                borderDownColor: '#ef4444', borderUpColor: '#10b981', 
                wickDownColor: '#ef4444', wickUpColor: '#10b981'
            });

            let previousPrice = null; 
            let lastCandle = null; 

            // Hàm 1: Gọi API lịch sử để vẽ 200 cây nến ban đầu
            function loadHistory() {
                fetch('/api/history')
                    .then(res => res.json())
                    .then(data => {
                        if(data.error) {
                            console.error("Lỗi data lịch sử:", data.error);
                            return;
                        }
                        candleSeries.setData(data);
                        lastCandle = data[data.length - 1]; // Nhớ cây nến cuối cùng
                    })
                    .catch(err => console.error("Lỗi mạng khi tải lịch sử:", err));
            }

            // Hàm 2: Gọi API giá hiện tại để giật biểu đồ realtime
            function fetchRealtimeData() {
                fetch('/api/gold')
                    .then(res => res.json())
                    .then(data => {
                        if(data.error) return;

                        const priceElement = document.getElementById('priceDisplay');
                        const serverElement = document.getElementById('serverName');
                        const currentPrice = parseFloat(data.price);
                        
                        // Xử lý đổi màu giá lớn
                        if (previousPrice !== null && currentPrice !== previousPrice) {
                            if (currentPrice > previousPrice) {
                                priceElement.className = 'price up';
                                priceElement.innerHTML = currentPrice.toFixed(2) + ' <span style="font-size:30px">▲</span>';
                            } else if (currentPrice < previousPrice) {
                                priceElement.className = 'price down';
                                priceElement.innerHTML = currentPrice.toFixed(2) + ' <span style="font-size:30px">▼</span>';
                            }
                        } else if (previousPrice === null) {
                            priceElement.innerHTML = currentPrice.toFixed(2);
                        }
                        previousPrice = currentPrice; 
                        
                        // Hiển thị tên Load Balancer
                        serverElement.style.color = '#ffffff';
                        serverElement.innerText = "🚀 " + data.server;
                        setTimeout(() => { serverElement.style.color = '#38bdf8'; }, 300);

                        // Giật râu nến realtime
                        if (lastCandle) {
                            lastCandle.close = currentPrice;
                            if (currentPrice > lastCandle.high) lastCandle.high = currentPrice;
                            if (currentPrice < lastCandle.low) lastCandle.low = currentPrice;
                            candleSeries.update(lastCandle);
                        }
                    })
                    .catch(err => console.error("Lỗi mạng tải realtime:", err));
            }
            
            // KỊCH BẢN CHẠY:
            loadHistory(); // 1. Tải nguyên mảng đồi núi trước
            
            setTimeout(() => {
                fetchRealtimeData(); // 2. Mồi phát đầu tiên cho giá to
                setInterval(fetchRealtimeData, 2000); // 3. Lặp lại giật nhấp nháy mỗi 2s
            }, 1000); 

            // Cân chỉnh lại kích thước biểu đồ khi thu phóng web
            window.addEventListener('resize', () => {
                chart.applyOptions({ width: chartContainer.clientWidth });
            });
        </script>
    </body>
    </html> 
    `);
});

// Khởi động Server
app.listen(port, () => {
    console.log(`API dang chay tai cong ${port}`);
});