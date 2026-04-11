const chartContainer = document.getElementById('chart-container');
const chart = LightweightCharts.createChart(chartContainer, {
    layout: { textColor: '#d1d5db', background: { type: 'solid', color: '#1e1e1e' } },
    grid: { vertLines: { color: '#333' }, horzLines: { color: '#333' } },
});
const candleSeries = chart.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444', borderDownColor: '#ef4444', borderUpColor: '#10b981' });

let currentPrice = 0;
let lastCandle = null;
let balance = 10000;
let positions = [];
let posId = 0;

fetch('/api/history?symbol=PAXGUSDT&interval=15m')
    .then(res => res.json())
    .then(data => {
        candleSeries.setData(data);
        lastCandle = data[data.length - 1];
    });

setInterval(() => {
    fetch('/api/gold?symbol=PAXGUSDT')
        .then(res => res.json())
        .then(data => {
            currentPrice = parseFloat(data.price);
            document.getElementById('priceDisplay').innerText = data.price + " USD";
            document.getElementById('serverName').innerText = data.server;

            if (lastCandle) {
                lastCandle.close = currentPrice;
                if (currentPrice > lastCandle.high) lastCandle.high = currentPrice;
                if (currentPrice < lastCandle.low) lastCandle.low = currentPrice;
                candleSeries.update(lastCandle);
            }
            renderPositions();
        });
}, 2000);

function executeTrade(type) {
    if(currentPrice === 0) return alert("Đang tải giá, vui lòng chờ!");
    let margin = parseFloat(document.getElementById('tradeMargin').value);
    let leverage = parseInt(document.getElementById('tradeLeverage').value);
    
    if(margin > balance) return alert("Số dư không đủ!");
    balance -= margin;
    document.getElementById('balanceDisplay').innerText = "$" + balance.toFixed(2);

    positions.push({ id: ++posId, type: type, entryPrice: currentPrice, margin: margin, leverage: leverage });
    renderPositions();
    alert(`Đã mở lệnh ${type}`);
}

function closePosition(id) {
    let idx = positions.findIndex(p => p.id === id);
    if(idx === -1) return;
    let p = positions[idx];
    
    let priceRatio = (currentPrice - p.entryPrice) / p.entryPrice;
    let pnl = (p.type === 'LONG' ? priceRatio : -priceRatio) * p.margin * p.leverage;
    
    balance += (p.margin + pnl);
    document.getElementById('balanceDisplay').innerText = "$" + balance.toFixed(2);
    positions.splice(idx, 1);
    renderPositions();
    alert(`Đã đóng lệnh. Lợi nhuận: $${pnl.toFixed(2)}`);
}

function renderPositions() {
    const list = document.getElementById('positionsList');
    if(positions.length === 0) return list.innerHTML = '<span style="color:#888;">Chưa có lệnh nào</span>';
    
    list.innerHTML = '';
    positions.forEach(p => {
        let priceRatio = (currentPrice - p.entryPrice) / p.entryPrice;
        let pnl = (p.type === 'LONG' ? priceRatio : -priceRatio) * p.margin * p.leverage;
        let pnlClass = pnl >= 0 ? 'up' : 'down';
        let typeClass = p.type === 'LONG' ? 'long' : 'short';
        
        list.innerHTML += `
            <div class="pos-item ${typeClass}">
                <button onclick="closePosition(${p.id})" style="float: right; cursor:pointer; background: #555; color: white; border: none; padding: 5px; border-radius: 3px;">Đóng</button>
                <b>${p.type} ${p.leverage}x</b> | Vào: $${p.entryPrice} <br>
                Cọc: $${p.margin} | Lãi/Lỗ: <b class="${pnlClass}">$${pnl.toFixed(2)}</b>
            </div>
        `;
    });
}