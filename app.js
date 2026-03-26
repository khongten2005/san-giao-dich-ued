const express = require('express');
const axios = require('axios'); 
const app = express();
const port = 3000;

const CONTAINER_NAME = process.env.CONTAINER_NAME || "Backend_Unknown";

// ==========================================
// 1. API LẤY LỊCH SỬ (ĐÃ NÂNG CẤP ĐA NĂNG)
// Nhận thêm tham số symbol (Mã coin) và interval (Khung giờ)
// ==========================================
app.get('/api/history', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'PAXGUSDT'; // Mặc định là Vàng
        const interval = req.query.interval || '15m';  // Mặc định 15 phút
        
        const response = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`);
        
        const chartData = response.data.map(candle => ({
            time: candle[0] / 1000,
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4])
        }));
        
        console.log(`[${CONTAINER_NAME}] Da gui lich su ${symbol} (Khung ${interval})`);
        res.json(chartData);
    } catch (error) {
        console.log(`[${CONTAINER_NAME}] Lỗi History:`, error.message);
        res.status(500).json({ error: "Lỗi tải lịch sử" });
    }
});

// ==========================================
// 2. API LẤY GIÁ REALTIME (ĐÃ NÂNG CẤP ĐA NĂNG)
// ==========================================
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
        console.log(`[${CONTAINER_NAME}] Lỗi Realtime:`, error.message);
        res.status(500).json({ error: "Lỗi tải giá" });
    }
});

// ==========================================
// 3. FRONTEND - GIAO DIỆN SIÊU CẤP VIP PRO
// ==========================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Siêu Sàn Giao Dịch UED</title>
        <script src="https://cdn.jsdelivr.net/npm/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js"></script>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: white; margin: 0; padding: 20px; display: flex; justify-content: center; }
            .dashboard { background: #1e293b; padding: 30px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); width: 100%; max-width: 1000px; position: relative; }
            .live-indicator { position: absolute; top: 20px; right: 20px; color: #ef4444; font-weight: bold; animation: blink 1s infinite; }
            @keyframes blink { 50% { opacity: 0; } }
            
            h1 { color: #facc15; text-align: center; margin-top: 0; font-size: 24px; }
            #title-display { text-align: center; font-size: 18px; color: #94a3b8; margin-bottom: 20px; }
            
            /* Khu vực nút bấm điều khiển */
            .control-panel { display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;}
            .btn-group { display: flex; gap: 10px; }
            button { background: #334155; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; }
            button:hover { background: #475569; }
            button.active { background: #38bdf8; color: #0f172a; }

            .price-box { background: #0f172a; padding: 20px; border-radius: 15px; text-align: center; border: 1px solid #334155;}
            .price { font-size: 50px; font-weight: bold; transition: 0.3s; }
            .up { color: #10b981; } .down { color: #ef4444; } .neutral { color: #e2e8f0; } 
            
            #chart-container { width: 100%; height: 400px; margin-top: 20px; border-radius: 10px; overflow: hidden; border: 1px solid #334155; }
            
            /* Khu vực mua bán */
            .action-panel { display: flex; gap: 15px; margin-top: 20px; }
            .btn-buy { flex: 1; background: #10b981; font-size: 18px; padding: 15px; }
            .btn-buy:hover { background: #059669; }
            .btn-sell { flex: 1; background: #ef4444; font-size: 18px; padding: 15px; }
            .btn-sell:hover { background: #dc2626; }

            .server-info { margin-top: 20px; text-align: center; font-size: 13px; color: #64748b; }
            #serverName { color: #38bdf8; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="dashboard">
            <div class="live-indicator">● LIVE</div>
            <h1>📊 SIÊU SÀN GIAO DỊCH UED</h1>
            <div id="title-display">Đang giao dịch: <b id="asset-name" style="color:white;">VÀNG (PAXG/USDT)</b></div>
            
            <div class="control-panel">
                <div class="btn-group" id="symbol-btns">
                    <button class="active" onclick="changeSymbol('PAXGUSDT', 'VÀNG (PAXG/USDT)')">VÀNG</button>
                    <button onclick="changeSymbol('BTCUSDT', 'BITCOIN (BTC/USDT)')">BITCOIN</button>
                    <button onclick="changeSymbol('ETHUSDT', 'ETHEREUM (ETH/USDT)')">ETHEREUM</button>
                </div>
                <div class="btn-group" id="interval-btns">
                    <button class="active" onclick="changeInterval('15m')">15 Phút</button>
                    <button onclick="changeInterval('1h')">1 Giờ</button>
                    <button onclick="changeInterval('1d')">1 Ngày</button>
                </div>
            </div>

            <div class="price-box">
                <div class="price neutral" id="priceDisplay">Đang tải...</div>
            </div>

            <div id="chart-container"></div>

            <div class="action-panel">
                <button class="btn-buy" onclick="trade('MUA')">🛒 MUA VÀO</button>
                <button class="btn-sell" onclick="trade('BÁN')">📉 BÁN RA</button>
            </div>

            <div class="server-info">
                Hệ thống cân bằng tải: <span id="serverName">Đang kết nối...</span> | Cập nhật 2s/lần
            </div>
        </div>

        <script>
            // Các biến hệ thống
            let currentSymbol = 'PAXGUSDT';
            let currentInterval = '15m';
            let currentAssetName = 'VÀNG (PAXG/USDT)';
            let previousPrice = null; 
            let lastCandle = null; 
            let fetchIntervalId = null; // Quản lý vòng lặp giật giá

            // Khởi tạo biểu đồ
            const chartContainer = document.getElementById('chart-container');
            const chart = LightweightCharts.createChart(chartContainer, {
                layout: { textColor: '#d1d5db', background: { type: 'solid', color: '#0f172a' } },
                grid: { vertLines: { color: '#334155' }, horzLines: { color: '#334155' } },
                crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            });
            const candleSeries = chart.addCandlestickSeries({
                upColor: '#10b981', downColor: '#ef4444', 
                borderDownColor: '#ef4444', borderUpColor: '#10b981'
            });

            // Hàm chuyển đổi Sản Phẩm (Vàng / BTC / ETH)
            function changeSymbol(symbol, name) {
                currentSymbol = symbol;
                currentAssetName = name;
                document.getElementById('asset-name').innerText = name;
                previousPrice = null; // Reset bộ đếm giá
                updateActiveButton('symbol-btns', event.target);
                reloadAllData();
            }

            // Hàm chuyển đổi Khung giờ
            function changeInterval(interval) {
                currentInterval = interval;
                updateActiveButton('interval-btns', event.target);
                reloadAllData();
            }

            // Đổi màu nút khi bấm
            function updateActiveButton(groupId, clickedBtn) {
                const btns = document.getElementById(groupId).getElementsByTagName('button');
                for(let btn of btns) btn.classList.remove('active');
                clickedBtn.classList.add('active');
            }

            // Hàm Mua Bán biểu diễn
            function trade(action) {
                const price = document.getElementById('priceDisplay').innerText.split(' ')[0];
                if(price === "Đang" || price === "") return alert("Chưa tải được giá, vui lòng đợi!");
                alert(\`[HỆ THỐNG UED] Khớp lệnh \${action} \${currentAssetName} thành công tại giá \${price}$!\`);
            }

            // Tải lại toàn bộ dữ liệu khi chuyển tab
            function reloadAllData() {
                document.getElementById('priceDisplay').innerHTML = "Đang tải...";
                document.getElementById('priceDisplay').className = "price neutral";
                candleSeries.setData([]); // Xóa trắng biểu đồ cũ
                
                // Dừng vòng lặp cũ
                if(fetchIntervalId) clearInterval(fetchIntervalId);

                // Tải lịch sử mới
                fetch(\`/api/history?symbol=\${currentSymbol}&interval=\${currentInterval}\`)
                    .then(res => res.json())
                    .then(data => {
                        if(data.error) return;
                        candleSeries.setData(data);
                        lastCandle = data[data.length - 1]; 
                    });

                // Tải Realtime và thiết lập vòng lặp mới
                setTimeout(() => {
                    fetchRealtimeData();
                    fetchIntervalId = setInterval(fetchRealtimeData, 2000);
                }, 1000);
            }

            // Kéo giá Realtime
            function fetchRealtimeData() {
                fetch(\`/api/gold?symbol=\${currentSymbol}\`)
                    .then(res => res.json())
                    .then(data => {
                        if(data.error) return;

                        const priceElement = document.getElementById('priceDisplay');
                        const currentPrice = parseFloat(data.price);
                        
                        if (previousPrice !== null && currentPrice !== previousPrice) {
                            if (currentPrice > previousPrice) {
                                priceElement.className = 'price up';
                                priceElement.innerHTML = currentPrice.toFixed(2) + ' ▲';
                            } else {
                                priceElement.className = 'price down';
                                priceElement.innerHTML = currentPrice.toFixed(2) + ' ▼';
                            }
                        } else if (previousPrice === null) {
                            priceElement.innerHTML = currentPrice.toFixed(2);
                        }
                        previousPrice = currentPrice; 
                        
                        document.getElementById('serverName').innerText = data.server;

                        if (lastCandle) {
                            lastCandle.close = currentPrice;
                            if (currentPrice > lastCandle.high) lastCandle.high = currentPrice;
                            if (currentPrice < lastCandle.low) lastCandle.low = currentPrice;
                            candleSeries.update(lastCandle);
                        }
                    });
            }
            
            // Khởi động lần đầu
            reloadAllData();

            window.addEventListener('resize', () => {
                chart.applyOptions({ width: chartContainer.clientWidth });
            });
        </script>
    </body>
    </html> 
    `);
});

app.listen(port, () => console.log(`API chay cong ${port}`));