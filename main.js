let currentSymbol = 'PAXGUSDT';
let currentInterval = '15m';
let currentAssetName = 'VÀNG (PAXG/USDT)';

let previousPrice = null; 
let globalCurrentPrice = 0; 
let lastCandle = null; 
let fetchIntervalId = null; 

let balance = 0; 
let positions = [];
let tradeHistory = []; 
let posIdCounter = 0;

// ================= HỆ THỐNG ĐĂNG NHẬP & DROPDOWN MENU =================
function toggleDropdown(e) {
    document.getElementById('userDropdown').classList.toggle('show');
}
// Click ra ngoài thì đóng Menu
window.onclick = function(event) {
    if (!event.target.closest('.user-profile')) {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown && dropdown.classList.contains('show')) dropdown.classList.remove('show');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? `✅ ${message}` : `⚠️ ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function checkAuth() {
    let savedName = localStorage.getItem('ued_username');
    let savedBalance = localStorage.getItem('ued_balance');
    let savedTime = localStorage.getItem('ued_login_time');
    
    if (savedName) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('userProfile').style.display = 'flex';
        document.getElementById('displayUsername').innerText = savedName;
        
        // Hiện thời gian đăng nhập
        let timeDisplay = document.getElementById('loginTimeDisplay');
        if(timeDisplay) timeDisplay.innerText = savedTime || new Date().toLocaleString('vi-VN');

        balance = savedBalance ? parseFloat(savedBalance) : 10000;
        updateBalanceUI();
        showToast(`Chào mừng ${savedName} quay trở lại!`, 'success');
        reloadAllData(); 
    }
}

function handleLogin() {
    let name = document.getElementById('usernameInput').value.trim();
    if(name === '') return alert('Vui lòng nhập tên!');
    localStorage.setItem('ued_username', name);
    localStorage.setItem('ued_balance', 10000); 
    // LƯU THỜI GIAN ĐĂNG NHẬP LÚC BẤM VÀO SÀN
    localStorage.setItem('ued_login_time', new Date().toLocaleString('vi-VN'));
    checkAuth();
}

function handleLogout() {
    localStorage.removeItem('ued_username');
    localStorage.removeItem('ued_balance');
    localStorage.removeItem('ued_login_time');
    location.reload(); 
}

function updateBalanceUI() {
    document.getElementById('balanceDisplay').innerText = "$" + balance.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    localStorage.setItem('ued_balance', balance); 
    
    if(balance < 500 && positions.length > 0) {
        document.getElementById('balanceDisplay').style.color = '#ef4444';
        document.getElementById('balanceDisplay').style.animation = 'blink 1s infinite';
    } else {
        document.getElementById('balanceDisplay').style.color = '#facc15';
        document.getElementById('balanceDisplay').style.animation = 'none';
    }
}

function resetAccount() {
    if(confirm("Xác nhận xóa trắng lịch sử và bơm lại 10.000$?")) {
        balance = 10000;
        positions = [];
        tradeHistory = [];
        updateBalanceUI();
        renderPositions();
        showToast("Tài khoản đã được reset về $10,000", 'success');
    }
}
// =================================================================

// KHỞI TẠO BIỂU ĐỒ
const chartContainer = document.getElementById('chart-container');
const chart = LightweightCharts.createChart(chartContainer, {
    layout: { textColor: '#d1d5db', background: { type: 'solid', color: '#0f172a' } },
    grid: { vertLines: { color: '#334155' }, horzLines: { color: '#334155' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
});

const candleSeries = chart.addCandlestickSeries({ upColor: '#10b981', downColor: '#ef4444', borderDownColor: '#ef4444', borderUpColor: '#10b981' });
const volumeSeries = chart.addHistogramSeries({ color: '#26a69a', priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.8, bottom: 0 }, });
const maSeries = chart.addLineSeries({ color: '#facc15', lineWidth: 2, title: 'MA 20', crosshairMarkerVisible: false });

function changeSymbol(symbol, name) {
    currentSymbol = symbol; currentAssetName = name;
    document.getElementById('asset-name').innerText = name;
    previousPrice = null; globalCurrentPrice = 0;
    const btns = document.getElementById('symbol-btns').getElementsByTagName('button');
    for(let btn of btns) btn.classList.remove('active');
    event.target.classList.add('active');
    reloadAllData();
}

function changeInterval(interval) {
    currentInterval = interval;
    const btns = document.getElementById('interval-btns').getElementsByTagName('button');
    for(let btn of btns) btn.classList.remove('active');
    event.target.classList.add('active');
    reloadAllData();
}

function reloadAllData() {
    document.getElementById('priceDisplay').innerHTML = "Đang tải...";
    candleSeries.setData([]); volumeSeries.setData([]); maSeries.setData([]);
    if(fetchIntervalId) clearInterval(fetchIntervalId);

    fetch(`/api/history?symbol=${currentSymbol}&interval=${currentInterval}`)
        .then(res => res.json())
        .then(data => {
            if(data.error) return;
            candleSeries.setData(data);
            
            const volumeData = data.map(candle => ({ time: candle.time, value: Math.random() * 100 + 10, color: candle.close >= candle.open ? '#10b98188' : '#ef444488' }));
            volumeSeries.setData(volumeData);
            
            let maData = [];
            for (let i = 19; i < data.length; i++) {
                let sum = 0;
                for (let j = 0; j < 20; j++) sum += data[i - j].close;
                maData.push({ time: data[i].time, value: sum / 20 });
            }
            maSeries.setData(maData);

            lastCandle = data[data.length - 1]; 
        });

    setTimeout(() => {
        fetchRealtimeData();
        fetchIntervalId = setInterval(fetchRealtimeData, 2000);
    }, 1000);
}

function fetchRealtimeData() {
    fetch(`/api/gold?symbol=${currentSymbol}`)
        .then(res => res.json())
        .then(data => {
            if(data.error) return;
            const priceElement = document.getElementById('priceDisplay');
            globalCurrentPrice = parseFloat(data.price); 
            
            if (previousPrice !== null && globalCurrentPrice !== previousPrice) {
                priceElement.className = globalCurrentPrice > previousPrice ? 'price up' : 'price down';
                priceElement.innerHTML = globalCurrentPrice.toFixed(2) + (globalCurrentPrice > previousPrice ? ' ▲' : ' ▼');
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

            autoCheckSLTP();
            renderPositions();
        });
}

function autoCheckSLTP() {
    positions.forEach(p => {
        if(p.tp > 0) {
            if(p.type === 'LONG' && globalCurrentPrice >= p.tp) closePosition(p.id, "Chốt lời (TP)");
            if(p.type === 'SHORT' && globalCurrentPrice <= p.tp) closePosition(p.id, "Chốt lời (TP)");
        }
        if(p.sl > 0) {
            if(p.type === 'LONG' && globalCurrentPrice <= p.sl) closePosition(p.id, "Cắt lỗ (SL)");
            if(p.type === 'SHORT' && globalCurrentPrice >= p.sl) closePosition(p.id, "Cắt lỗ (SL)");
        }
    });
}

function executeTrade(type) {
    if(globalCurrentPrice === 0) return showToast("Hệ thống chưa tải xong giá!", 'error');
    
    let margin = parseFloat(document.getElementById('tradeMargin').value);
    let leverage = parseInt(document.getElementById('tradeLeverage').value);
    let sl = parseFloat(document.getElementById('tradeSL').value) || 0;
    let tp = parseFloat(document.getElementById('tradeTP').value) || 0;

    if(isNaN(margin) || margin < 10) return showToast("Tiền cọc tối thiểu là $10!", 'error');
    if(margin > balance) return showToast("Số dư không đủ! Bấm nút Bơm lại 10k nhé.", 'error');

    balance -= margin; updateBalanceUI();

    positions.unshift({
        id: ++posIdCounter, type: type, asset: currentAssetName.split(' ')[0], 
        entryPrice: globalCurrentPrice, margin: margin, leverage: leverage, sl: sl, tp: tp,
        time: new Date().toLocaleTimeString()
    });
    
    showToast(`Đã MỞ lệnh ${type} ${margin}$ đòn bẩy ${leverage}x`, 'success');
    renderPositions();
}

function closePosition(id, reason = "Chủ động") {
    let idx = positions.findIndex(p => p.id === id);
    if(idx === -1) return;
    
    let p = positions[idx];
    let pnl = calculatePnL(p);
    
    balance += (p.margin + pnl); 
    positions.splice(idx, 1); 
    
    tradeHistory.push({ ...p, closePrice: globalCurrentPrice, pnl: pnl, closeTime: new Date().toLocaleTimeString(), reason: reason });
    
    let savedName = localStorage.getItem('ued_username') || "Ẩn danh";
    fetch('/api/save-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: savedName, 
            asset: p.asset, type: p.type, 
            margin: p.margin, leverage: p.leverage, 
            entryPrice: p.entryPrice, closePrice: globalCurrentPrice, pnl: pnl
        })
    }).then(res => res.json()).then(data => {
        if(data.success) console.log(`Đã lưu lệnh vào Database qua máy chủ: ${data.server}`);
    }).catch(err => console.error("Lỗi khi lưu DB:", err));

    updateBalanceUI(); renderPositions();
    
    let pnlString = pnl >= 0 ? '+' + pnl.toFixed(2) : pnl.toFixed(2);
    showToast(`Đóng lệnh (${reason}): Lợi nhuận $${pnlString}`, pnl >= 0 ? 'success' : 'error');
}

function calculatePnL(p) {
    let priceRatio = (globalCurrentPrice - p.entryPrice) / p.entryPrice;
    return (p.type === 'LONG' ? priceRatio : -priceRatio) * p.margin * p.leverage;
}

function renderPositions() {
    const list = document.getElementById('positionsList');
    if(positions.length === 0) return list.innerHTML = '<div style="text-align:center; color:#64748b; margin-top:20px;">Chưa có lệnh nào</div>';

    list.innerHTML = '';
    positions.forEach(p => {
        let pnl = calculatePnL(p);
        let pnlClass = pnl >= 0 ? 'up' : 'down';
        let sltpText = (p.sl > 0 || p.tp > 0) ? `<br><span style="color:#94a3b8; font-size:11px;">SL: ${p.sl||'Không'} | TP: ${p.tp||'Không'}</span>` : '';

        list.innerHTML += `
            <div class="pos-item ${p.type === 'LONG' ? 'pos-long' : 'pos-short'}">
                <button class="pos-close" onclick="closePosition(${p.id})">Đóng</button>
                <b class="${p.type === 'LONG' ? 'up' : 'down'}">${p.type === 'LONG' ? 'MUA LÊN' : 'BÁN XUỐNG'} ${p.leverage}X</b> | ${p.asset}<br>
                Vào: $${p.entryPrice.toFixed(2)} | Cọc: $${p.margin.toFixed(2)} ${sltpText}<br>
                <div style="margin-top: 5px; font-size: 14px;">
                    Lãi/Lỗ: <b class="${pnlClass}">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}</b>
                </div>
            </div>
        `;
    });
}

function exportToCSV() {
    if(tradeHistory.length === 0) return showToast("Chưa có lịch sử giao dịch để xuất!", 'error');
    let csvContent = "\uFEFFID,Thoi Gian Mo,Tai San,Loai Lenh,Tien Coc ($),Don Bay,Gia Vao,Gia Dong,Thoi Gian Dong,Ly do,Lai/Lo ($)\n";
    tradeHistory.forEach(h => {
        let pnlString = h.pnl >= 0 ? `+${h.pnl.toFixed(2)}` : h.pnl.toFixed(2);
        csvContent += `${h.id},${h.time},${h.asset},${h.type},${h.margin},${h.leverage}x,${h.entryPrice},${h.closePrice},${h.closeTime},${h.reason},${pnlString}\n`;
    });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Bao_Cao_UED_${new Date().getTime()}.csv`;
    link.click();
}

window.addEventListener('resize', () => chart.applyOptions({ width: document.getElementById('chart-container').clientWidth }));
checkAuth();