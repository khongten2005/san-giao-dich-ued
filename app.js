const express = require('express');
const axios = require('axios'); 
const app = express();
const port = 3000;
app.use(express.static('.'));

const CONTAINER_NAME = process.env.CONTAINER_NAME || "Backend_Unknown";

// 1. API LẤY LỊCH SỬ
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

// 2. API LẤY GIÁ REALTIME
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

// 3. FRONTEND - GIAO DIỆN CÓ BẢNG TRADE DEMO
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
            .dashboard { background: #1e293b; padding: 25px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); width: 100%; max-width: 1200px; position: relative; }
            .live-indicator { position: absolute; top: 20px; right: 20px; color: #ef4444; font-weight: bold; animation: blink 1s infinite; }
            @keyframes blink { 50% { opacity: 0; } }
            
            h1 { color: #facc15; text-align: center; margin-top: 0; font-size: 26px; }
            #title-display { text-align: center; font-size: 16px; color: #94a3b8; margin-bottom: 20px; }
            
            .control-panel { display: flex; justify-content: center; margin-bottom: 20px; flex-wrap: wrap; gap: 20px;}
            .btn-group { display: flex; gap: 10px; }
            button { background: #334155; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; }
            button:hover { background: #475569; }
            button.active { background: #38bdf8; color: #0f172a; }

            /* BỐ CỤC 2 CỘT MỚI */
            .main-layout { display: flex; gap: 20px; align-items: stretch; flex-wrap: wrap; }
            .left-col { flex: 2; display: flex; flex-direction: column; min-width: 600px;}
            .right-col { flex: 1; background: #0f172a; padding: 20px; border-radius: 15px; border: 1px solid #334155; display: flex; flex-direction: column; min-width: 300px;}

            .price-box { background: #0f172a; padding: 15px; border-radius: 15px; text-align: center; border: 1px solid #334155;}
            .price { font-size: 45px; font-weight: bold; transition: 0.3s; }
            .up { color: #10b981; } .down { color: #ef4444; } .neutral { color: #e2e8f0; } 
            
            #chart-container { width: 100%; height: 450px; margin-top: 15px; border-radius: 10px; overflow: hidden; border: 1px solid #334155; }
            
            /* TRADING PANEL CSS */
            .balance-title { color: #94a3b8; font-size: 14px; text-align: center; }
            .balance-amount { font-size: 30px; color: #facc15; text-align: center; font-weight: bold; margin-bottom: 20px; }
            
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; color: #cbd5e1; font-size: 13px; margin-bottom: 5px; }
            .form-group input, .form-group select { width: 100%; padding: 10px; background: #1e293b; color: white; border: 1px solid #475569; border-radius: 5px; box-sizing: border-box; font-size: 16px; outline: none; }
            
            .action-panel { display: flex; gap: 10px; margin-top: 10px; }
            .btn-buy { flex: 1; background: #10b981; font-size: 16px; padding: 12px; }
            .btn-buy:hover { background: #059669; }
            .btn-sell { flex: 1; background: #ef4444; font-size: 16px; padding: 12px; }
            .btn-sell:hover { background: #dc2626; }

            .positions-title { margin-top: 25px; border-bottom: 1px solid #334155; padding-bottom: 10px; font-weight: bold; color: #cbd5e1; }
            .positions-list { flex: 1; overflow-y: auto; margin-top: 10px; max-height: 200px; }
            .pos-item { background: #1e293b; padding: 12px; border-radius: 8px; margin-bottom: 10px; font-size: 13px; position: relative; border-left: 4px solid gray; }
            .pos-item.pos-long { border-left-color: #10b981; }
            .pos-item.pos-short { border-left-color: #ef4444; }
            .pos-close { position: absolute; top: 10px; right: 10px; background: transparent; border: 1px solid #64748b; padding: 3px 8px; font-size: 11px; cursor: pointer; color: white; border-radius: 4px; }
            .pos-close:hover { background: #475569; }

            .server-info { margin-top: 20px; text-align: center; font-size: 12px; color: #64748b; width: 100%; }
        </style>
    </head>
    <body>
        <div class="dashboard">
            <div class="live-indicator">● LIVE</div>
            <h1>📊 SIÊU SÀN GIAO DỊCH UED</h1>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="/1.png" alt="Phong cảnh UED" style="max-height: 150px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            </div>

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

            <div class="main-layout">
                <div class="left-col">
                    <div class="price-box">
                        <div class="price neutral" id="priceDisplay">Đang tải...</div>
                    </div>
                    <div id="chart-container"></div>
                </div>

                <div class="right-col">
                    <div class="balance-title">Tài khoản Demo (USD)</div>
                    <div class="balance-amount" id="balanceDisplay">$10,000.00</div>

                    <div class="form-group">
                        <label>Số tiền cọc (Margin - $):</label>
                        <input type="number" id="tradeMargin" value="100" min="10" step="10">
                    </div>
                    
                    <div class="form-group">
                        <label>Đòn bẩy (Leverage):</label>
                        <select id="tradeLeverage">
                            <option value="1">1x (Không đòn bẩy)</option>
                            <option value="10">10x</option>
                            <option value="50" selected>50x</option>
                            <option value="100">100x</option>
                        </select>
                    </div>

                    <div class="action-panel">
                        <button class="btn-buy" onclick="executeTrade('LONG')">▲ MUA (Lên)</button>
                        <button class="btn-sell" onclick="executeTrade('SHORT')">▼ BÁN (Xuống)</button>
                    </div>

                    <div class="positions-title">Lệnh đang chạy</div>
                    <div class="positions-list" id="positionsList">
                        <div style="text-align:center; color:#64748b; margin-top:20px;">Chưa có lệnh nào</div>
                    </div>
                </div>
            </div>

            <div class="server-info">
                Hệ thống cân bằng tải: <span id="serverName" style="color: #38bdf8;">Đang kết nối...</span> | Cập nhật 2s/lần
            </div>
        </div>

        <script>
            // Các biến hệ thống
            let currentSymbol = 'PAXGUSDT';
            let currentInterval = '15m';
            let currentAssetName = 'VÀNG (PAXG/USDT)';
            
            let previousPrice = null; 
            let globalCurrentPrice = 0; // Lưu giá realtime toàn cục để tính lãi lỗ
            let lastCandle = null; 
            let fetchIntervalId = null; 

            // HỆ THỐNG TÀI KHOẢN DEMO
            let balance = 10000; // Tiền ảo 10k biden
            let positions = [];
            let posIdCounter = 0;

            // Cập nhật UI Số dư
            function updateBalanceUI() {
                document.getElementById('balanceDisplay').innerText = "$" + balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }

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

            function changeSymbol(symbol, name) {
                currentSymbol = symbol;
                currentAssetName = name;
                document.getElementById('asset-name').innerText = name;
                previousPrice = null; globalCurrentPrice = 0;
                updateActiveButton('symbol-btns', event.target);
                reloadAllData();
            }

            function changeInterval(interval) {
                currentInterval = interval;
                updateActiveButton('interval-btns', event.target);
                reloadAllData();
            }

            function updateActiveButton(groupId, clickedBtn) {
                const btns = document.getElementById(groupId).getElementsByTagName('button');
                for(let btn of btns) btn.classList.remove('active');
                clickedBtn.classList.add('active');
            }

            function reloadAllData() {
                document.getElementById('priceDisplay').innerHTML = "Đang tải...";
                document.getElementById('priceDisplay').className = "price neutral";
                candleSeries.setData([]); 
                if(fetchIntervalId) clearInterval(fetchIntervalId);

                fetch(\`/api/history?symbol=\${currentSymbol}&interval=\${currentInterval}\`)
                    .then(res => res.json())
                    .then(data => {
                        if(data.error) return;
                        candleSeries.setData(data);
                        lastCandle = data[data.length - 1]; 
                    });

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
                        globalCurrentPrice = parseFloat(data.price); // Cập nhật biến toàn cục
                        
                        if (previousPrice !== null && globalCurrentPrice !== previousPrice) {
                            if (globalCurrentPrice > previousPrice) {
                                priceElement.className = 'price up';
                                priceElement.innerHTML = globalCurrentPrice.toFixed(2) + ' ▲';
                            } else {
                                priceElement.className = 'price down';
                                priceElement.innerHTML = globalCurrentPrice.toFixed(2) + ' ▼';
                            }
                        } else if (previousPrice === null) {
                            priceElement.innerHTML = globalCurrentPrice.toFixed(2);
                        }
                        previousPrice = globalCurrentPrice; 
                        
                        document.getElementById('serverName').innerText = data.server;

                        if (lastCandle) {
                            lastCandle.close = globalCurrentPrice;
                            if (globalCurrentPrice > lastCandle.high) lastCandle.high = globalCurrentPrice;
                            if (globalCurrentPrice < lastCandle.low) lastCandle.low = globalCurrentPrice;
                            candleSeries.update(lastCandle);
                        }

                        // CẬP NHẬT LÃI LỖ MỖI 2 GIÂY KHI GIÁ NHẢY
                        renderPositions();
                    });
            }

            // HÀM: MỞ LỆNH GIAO DỊCH
            function executeTrade(type) {
                if(globalCurrentPrice === 0) return alert("Hệ thống chưa tải xong giá, vui lòng đợi!");
                
                let margin = parseFloat(document.getElementById('tradeMargin').value);
                let leverage = parseInt(document.getElementById('tradeLeverage').value);

                if(isNaN(margin) || margin < 10) return alert("Tiền cọc tối thiểu là $10!");
                if(margin > balance) return alert("Số dư không đủ! Nạp thêm VIP đi đại ca!");

                balance -= margin; // Trừ tiền cọc
                updateBalanceUI();

                positions.unshift({ // Thêm lệnh lên đầu mảng
                    id: ++posIdCounter,
                    type: type, // 'LONG' hoặc 'SHORT'
                    asset: currentAssetName.split(' ')[0], // Lấy chữ VÀNG/BITCOIN
                    entryPrice: globalCurrentPrice,
                    margin: margin,
                    leverage: leverage
                });
                renderPositions();
            }

            // HÀM: ĐÓNG LỆNH GIAO DỊCH
            function closePosition(id) {
                let idx = positions.findIndex(p => p.id === id);
                if(idx === -1) return;
                
                let p = positions[idx];
                let pnl = calculatePnL(p);
                
                balance += (p.margin + pnl); // Trả lại cọc + Lãi/Lỗ
                positions.splice(idx, 1); // Xóa khỏi danh sách
                
                updateBalanceUI();
                renderPositions();
                
                let pnlString = pnl >= 0 ? '+' + pnl.toFixed(2) : pnl.toFixed(2);
                alert(\`[UED BOT] Đóng lệnh \${p.type} \${p.asset} thành công. Lợi nhuận: $\${pnlString}\`);
            }

            // HÀM TÍNH LÃI/LỖ BÍ TRUYỀN
            function calculatePnL(p) {
                // Công thức: (Giá chênh lệch / Giá vào) * Cọc * Đòn bẩy
                let priceRatio = (globalCurrentPrice - p.entryPrice) / p.entryPrice;
                let pnl = (p.type === 'LONG' ? priceRatio : -priceRatio) * p.margin * p.leverage;
                return pnl;
            }

            // HÀM VẼ DANH SÁCH LỆNH LÊN MÀN HÌNH
            function renderPositions() {
                const list = document.getElementById('positionsList');
                if(positions.length === 0) {
                    list.innerHTML = '<div style="text-align:center; color:#64748b; margin-top:20px;">Chưa có lệnh nào</div>';
                    return;
                }

                list.innerHTML = '';
                positions.forEach(p => {
                    let pnl = calculatePnL(p);
                    let pnlClass = pnl >= 0 ? 'up' : 'down';
                    let pnlSign = pnl >= 0 ? '+' : '';

                    list.innerHTML += \`
                        <div class="pos-item \${p.type === 'LONG' ? 'pos-long' : 'pos-short'}">
                            <button class="pos-close" onclick="closePosition(\${p.id})">Chốt</button>
                            <b class="\${p.type === 'LONG' ? 'up' : 'down'}">\${p.type === 'LONG' ? 'MUA LÊN' : 'BÁN XUỐNG'} \${p.leverage}X</b> | \${p.asset}<br>
                            Vào: $\${p.entryPrice.toFixed(2)} | Cọc: $\${p.margin.toFixed(2)}<br>
                            <div style="margin-top: 5px; font-size: 14px;">
                                Lãi/Lỗ: <b class="\${pnlClass}">\${pnlSign}$\${pnl.toFixed(2)}</b>
                            </div>
                        </div>
                    \`;
                });
            }
            
            // Khởi động
            updateBalanceUI();
            reloadAllData();

            window.addEventListener('resize', () => {
                chart.applyOptions({ width: document.getElementById('chart-container').clientWidth });
            });
        </script>
    </body>
    </html> 
    `);
});

app.listen(port, () => console.log(`API chay cong ${port}`));