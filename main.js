// Các biến hệ thống
let currentSymbol = 'PAXGUSDT';
let currentInterval = '15m';
let currentAssetName = 'VÀNG (PAXG/USDT)';

let previousPrice = null; 
let globalCurrentPrice = 0; 
let lastCandle = null; 
let fetchIntervalId = null; 

// HỆ THỐNG TÀI KHOẢN DEMO
let balance = 10000; 
let positions = [];
let posIdCounter = 0;

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

    fetch(`/api/history?symbol=${currentSymbol}&interval=${currentInterval}`)
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
    fetch(`/api/gold?symbol=${currentSymbol}`)
        .then(res => res.json())
        .then(data => {
            if(data.error) return;

            const priceElement = document.getElementById('priceDisplay');
            globalCurrentPrice = parseFloat(data.price); 
            
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

            renderPositions();
        });
}

function executeTrade(type) {
    if(globalCurrentPrice === 0) return alert("Hệ thống chưa tải xong giá, vui lòng đợi!");
    
    let margin = parseFloat(document.getElementById('tradeMargin').value);
    let leverage = parseInt(document.getElementById('tradeLeverage').value);

    if(isNaN(margin) || margin < 10) return alert("Tiền cọc tối thiểu là $10!");
    if(margin > balance) return alert("Số dư không đủ! Nạp thêm VIP đi đại ca!");

    balance -= margin; 
    updateBalanceUI();

    positions.unshift({
        id: ++posIdCounter,
        type: type, 
        asset: currentAssetName.split(' ')[0], 
        entryPrice: globalCurrentPrice,
        margin: margin,
        leverage: leverage
    });
    renderPositions();
}

function closePosition(id) {
    let idx = positions.findIndex(p => p.id === id);
    if(idx === -1) return;
    
    let p = positions[idx];
    let pnl = calculatePnL(p);
    
    balance += (p.margin + pnl); 
    positions.splice(idx, 1); 
    
    updateBalanceUI();
    renderPositions();
    
    let pnlString = pnl >= 0 ? '+' + pnl.toFixed(2) : pnl.toFixed(2);
    alert(`[UED BOT] Đóng lệnh ${p.type} ${p.asset} thành công. Lợi nhuận: $${pnlString}`);
}

function calculatePnL(p) {
    let priceRatio = (globalCurrentPrice - p.entryPrice) / p.entryPrice;
    let pnl = (p.type === 'LONG' ? priceRatio : -priceRatio) * p.margin * p.leverage;
    return pnl;
}

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

        list.innerHTML += `
            <div class="pos-item ${p.type === 'LONG' ? 'pos-long' : 'pos-short'}">
                <button class="pos-close" onclick="closePosition(${p.id})">Chốt</button>
                <b class="${p.type === 'LONG' ? 'up' : 'down'}">${p.type === 'LONG' ? 'MUA LÊN' : 'BÁN XUỐNG'} ${p.leverage}X</b> | ${p.asset}<br>
                Vào: $${p.entryPrice.toFixed(2)} | Cọc: $${p.margin.toFixed(2)}<br>
                <div style="margin-top: 5px; font-size: 14px;">
                    Lãi/Lỗ: <b class="${pnlClass}">${pnlSign}$${pnl.toFixed(2)}</b>
                </div>
            </div>
        `;
    });
}

// Khởi động
updateBalanceUI();
reloadAllData();

window.addEventListener('resize', () => {
    chart.applyOptions({ width: document.getElementById('chart-container').clientWidth });
});