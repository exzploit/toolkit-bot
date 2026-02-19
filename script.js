const tg = window.Telegram.WebApp;
const haptic = tg.HapticFeedback;
tg.expand();

// Theme Management
function initTheme() {
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeIcon();
}

function toggleTheme() {
    haptic.impactOccurred('light');
    document.body.classList.toggle('dark-mode');
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerText = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

initTheme();

function showTool(toolName) {
    haptic.impactOccurred('medium');
    document.getElementById('menu').style.display = 'none';
    document.getElementById('tool-container').style.display = 'block';
    const content = document.getElementById('tool-content');
    const title = document.getElementById('tool-title');

    if (toolName === 'speedtest') {
        title.innerText = "Speed Test";
        content.innerHTML = `
            <div id="speedtest-ui">
                <div id="meta-info" style="font-size: 12px; color: var(--secondary-text); margin-bottom: 10px;">Initializing...</div>
                <div class="speed-gauge">
                    <span id="speed-display" class="speed-value">0.0</span>
                    <span class="speed-unit">Mbps</span>
                </div>
                <div id="test-status" style="margin-top: -10px; color: var(--secondary-text); font-size: 14px; font-weight: 500;">Ready</div>
                <div class="progress-container">
                    <div id="progress-bar" class="progress-bar"></div>
                </div>
                <div class="stats-grid">
                    <div class="stat-card"><span class="stat-label">Latency</span><span id="ping-display" class="stat-value">--</span></div>
                    <div class="stat-card"><span class="stat-label">Jitter</span><span id="jitter-display" class="stat-value">--</span></div>
                    <div class="stat-card"><span class="stat-label">Download</span><span id="download-display" class="stat-value">--</span></div>
                    <div class="stat-card"><span class="stat-label">Upload</span><span id="upload-display" class="stat-value">--</span></div>
                </div>
                <button id="restart-test" class="tool-btn" style="display:none; margin-top: 25px;" onclick="runSpeedTest()">🚀 Run Again</button>
            </div>
        `;
        runSpeedTest();
    } 
    
    if (toolName === 'password') {
        title.innerText = "Password Generator";
        content.innerHTML = `
            <div class="pass-box">
                <h2 id="password-display" style="color: var(--primary-color); word-break: break-all; min-height: 1.2em; font-size: 28px; margin-bottom: 20px;">-</h2>
                <div class="options-container">
                    <div style="margin-bottom: 20px; padding: 0 5px;">
                        <label style="display:flex; justify-content:space-between; font-weight:700;">Length <span id="length-val" class="length-display">12</span></label>
                        <input type="range" id="pass-length" min="6" max="32" value="12" oninput="document.getElementById('length-val').innerText = this.value; generateComplexPassword(true);">
                    </div>
                    <div class="option-row"><label>Uppercase (A-Z)</label><input type="checkbox" id="pass-upper" checked onchange="generateComplexPassword(true)"></div>
                    <div class="option-row"><label>Numbers (0-9)</label><input type="checkbox" id="pass-numbers" checked onchange="generateComplexPassword(true)"></div>
                    <div class="option-row"><label>Symbols (!@#$)</label><input type="checkbox" id="pass-symbols" checked onchange="generateComplexPassword(true)"></div>
                </div>
                <button class="tool-btn" onclick="generateComplexPassword(true)">🔄 Generate New</button>
            </div>`;
        generateComplexPassword(false);
    }

    if (toolName === 'downloaders') {
        title.innerText = "Downloaders";
        content.innerHTML = `
            <div class="tab-container">
                <button id="tab-yt" class="tab-btn active" onclick="showDownloader('yt')">YouTube</button>
                <button id="tab-ig" class="tab-btn" onclick="showDownloader('ig')">Instagram</button>
                <button id="tab-tt" class="tab-btn" onclick="showDownloader('tt')">TikTok</button>
            </div>
            <div id="downloader-content"></div>
        `;
        showDownloader('yt');
    }

    if (toolName === 'currency') {
        title.innerText = "Currency Converter";
        content.innerHTML = `
            <div class="pass-box">
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <input type="number" id="cur-amount" class="text-input" value="1" style="flex:1; margin:0;">
                    <select id="cur-from" class="select-input" style="width: 110px; margin:0;">
                        <option value="usd">USD</option><option value="eur">EUR</option><option value="gbp">GBP</option>
                        <option value="mdl">MDL</option><option value="ron">RON</option><option value="uah">UAH</option>
                        <option value="rub">RUB</option><option value="btc">BTC</option><option value="ton">TON</option>
                    </select>
                </div>
                <div style="margin-bottom:15px; font-size: 24px; opacity: 0.5;">⬇</div>
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <div id="cur-result-val" class="text-input" style="flex:1; margin:0; background: var(--stat-card-bg); line-height: 24px; font-weight:800;">---</div>
                    <select id="cur-to" class="select-input" style="width: 110px; margin:0;">
                        <option value="eur">EUR</option><option value="usd">USD</option><option value="ron">RON</option>
                        <option value="mdl">MDL</option><option value="uah">UAH</option><option value="ton">TON</option>
                    </select>
                </div>
                <button class="tool-btn" onclick="convertCurrency()">💹 Convert Now</button>
                <div id="cur-status" style="margin-top: 15px; font-size: 12px; color: var(--secondary-text);"></div>
            </div>`;
    }

    if (toolName === 'domain') {
        title.innerText = "Domain Info";
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="dom-url" class="text-input" placeholder="example.com">
                <button class="tool-btn" onclick="lookupDomain()">🔍 Lookup Domain</button>
                <div id="dom-result" style="margin-top: 20px;"></div>
            </div>`;
    }

    if (toolName === 'qrcode') {
        title.innerText = "QR Generator";
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="qr-input" class="text-input" placeholder="Type link or text here..." oninput="updateQR()">
                <div class="qr-container" id="qr-result">
                    <p style="color: #888; margin: 40px 0;">QR will appear here</p>
                </div>
                <button id="download-qr" class="tool-btn" style="display:none; margin-top: 15px;" onclick="downloadQR()">📥 Download PNG</button>
            </div>`;
    }

    if (toolName === 'textutils') {
        title.innerText = "Text Utilities";
        content.innerHTML = `
            <div class="pass-box">
                <span id="text-stats" class="stats-info">Chars: 0 | Words: 0</span>
                <textarea id="text-input" class="text-area" placeholder="Enter text here..." oninput="updateTextStats()"></textarea>
                <div class="util-grid">
                    <button class="small-btn" onclick="processText('upper')">UPPERCASE</button>
                    <button class="small-btn" onclick="processText('lower')">lowercase</button>
                    <button class="small-btn" onclick="processText('title')">Title Case</button>
                    <button class="small-btn" onclick="processText('clear')">Clear</button>
                </div>
            </div>`;
    }

    if (toolName === 'ipinfo') {
        title.innerText = "IP Information";
        content.innerHTML = `<div id="loading-spinner" style="padding: 20px;">🔍 Fetching IP Info...</div>`;
        fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
                haptic.notificationOccurred('success');
                content.innerHTML = `
                    <div style="text-align: left; line-height: 1.8;">
                        <div class="stat-card" style="margin-bottom:10px;"><span class="stat-label">IP Address</span><span class="stat-value">${data.ip}</span></div>
                        <div class="stat-card" style="margin-bottom:10px;"><span class="stat-label">Location</span><span class="stat-value">${data.city}, ${data.country_name}</span></div>
                        <div class="stat-card"><span class="stat-label">Provider</span><span class="stat-value">${data.org}</span></div>
                    </div>`;
            })
            .catch(() => {
                haptic.notificationOccurred('error');
                content.innerHTML = `<p style="color: red;">Failed to fetch IP info.</p>`;
            });
    }
}

function showDownloader(type) {
    haptic.impactOccurred('light');
    const content = document.getElementById('downloader-content');
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    
    if (type === 'yt') {
        document.getElementById('tab-yt').classList.add('active');
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="yt-url" class="text-input" placeholder="Paste YouTube link here...">
                <div class="options-container">
                    <div class="option-row"><label>Format</label><select id="yt-format" class="select-input" style="width: 120px; margin:0;" onchange="toggleYTQuality()"><option value="mp4">Video (MP4)</option><option value="mp3">Audio (MP3)</option></select></div>
                    <div class="option-row" id="yt-quality-row"><label>Quality</label><select id="yt-quality" class="select-input" style="width: 120px; margin:0;"><option value="highest">Highest</option><option value="720p">720p</option><option value="360p">360p</option><option value="lowest">Lowest</option></select></div>
                </div>
                <button class="tool-btn" onclick="downloadYouTube()">🚀 Download & Send</button>
                <div id="yt-status" style="margin-top: 15px; font-size: 14px;"></div>
            </div>`;
    } else if (type === 'ig') {
        document.getElementById('tab-ig').classList.add('active');
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="ig-url" class="text-input" placeholder="Paste Instagram link...">
                <div class="option-row" style="margin-bottom:20px;"><label>Format</label><select id="ig-format" class="select-input" style="width: 120px; margin:0;"><option value="mp4">Video</option><option value="mp3">Sound Only</option></select></div>
                <button class="tool-btn" onclick="downloadInstagram()">📸 Download & Send</button>
                <div id="ig-status" style="margin-top: 15px; font-size: 14px;"></div>
            </div>`;
    } else {
        document.getElementById('tab-tt').classList.add('active');
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="tt-url" class="text-input" placeholder="Paste TikTok link...">
                <div class="option-row" style="margin-bottom:20px;"><label>Format</label><select id="tt-format" class="select-input" style="width: 120px; margin:0;"><option value="mp4">Video (No WM)</option><option value="mp3">Sound Only</option></select></div>
                <button class="tool-btn" onclick="downloadTikTok()">🎵 Download & Send</button>
                <div id="tt-status" style="margin-top: 15px; font-size: 14px;"></div>
            </div>`;
    }
}

async function convertCurrency() {
    haptic.impactOccurred('light');
    const amount = document.getElementById('cur-amount').value;
    const from = document.getElementById('cur-from').value;
    const to = document.getElementById('cur-to').value;
    const resultVal = document.getElementById('cur-result-val');
    const status = document.getElementById('cur-status');
    status.innerText = "⏳ Updating rates...";
    try {
        const response = await fetch(`/api/currency?from=${from}&to=${to}&amount=${amount}`);
        const data = await response.json();
        if (data.success) {
            resultVal.innerText = data.result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            status.innerText = `Updated: ${data.date}`;
            haptic.impactOccurred('medium');
        } else throw new Error(data.error);
    } catch (err) { status.innerText = "❌ Error fetching rates"; haptic.notificationOccurred('error'); }
}

async function lookupDomain() {
    haptic.impactOccurred('light');
    const domain = document.getElementById('dom-url').value.trim();
    const resultDiv = document.getElementById('dom-result');
    if (!domain) return;
    resultDiv.innerHTML = "⏳ Looking up...";
    try {
        const response = await fetch(`/api/domain?domain=${encodeURIComponent(domain)}`);
        const data = await response.json();
        let html = `<div style="display:grid; gap:10px; text-align:left;">`;
        html += `<div class="stat-card"><span class="stat-label">A Records</span><span class="stat-value">${data.dns.a.join(', ') || 'None'}</span></div>`;
        html += `<div class="stat-card"><span class="stat-label">MX Records</span><span class="stat-value">${data.dns.mx.map(m => m.exchange).join(', ') || 'None'}</span></div>`;
        if (data.whois) {
            html += `<div class="stat-card"><span class="stat-label">Registrar</span><span class="stat-value">${data.whois.registrar}</span></div>`;
            html += `<div class="stat-card"><span class="stat-label">Created</span><span class="stat-value">${new Date(data.whois.created).toLocaleDateString()}</span></div>`;
        }
        html += `</div>`;
        resultDiv.innerHTML = html;
        haptic.notificationOccurred('success');
    } catch (err) { resultDiv.innerHTML = "❌ Lookup failed"; haptic.notificationOccurred('error'); }
}

// Global Helpers
function goBack() { haptic.impactOccurred('light'); document.getElementById('menu').style.display = 'grid'; document.getElementById('tool-container').style.display = 'none'; }
function updateTextStats() { const text = document.getElementById('text-input').value; const stats = document.getElementById('text-stats'); stats.innerText = `Chars: ${text.length} | Words: ${text.trim() ? text.trim().split(/\s+/).length : 0}`; }
function processText(mode) { 
    haptic.impactOccurred('light'); const input = document.getElementById('text-input'); let text = input.value;
    if (mode === 'upper') text = text.toUpperCase(); else if (mode === 'lower') text = text.toLowerCase(); else if (mode === 'title') text = text.replace(/\b\w/g, l => l.toUpperCase()); else if (mode === 'clear') text = "";
    input.value = text; updateTextStats();
}
function generateComplexPassword(isUserAction) {
    if (isUserAction) haptic.impactOccurred('light');
    const length = document.getElementById('pass-length').value;
    const hasUpper = document.getElementById('pass-upper').checked, hasNumbers = document.getElementById('pass-numbers').checked, hasSymbols = document.getElementById('pass-symbols').checked;
    const lower = "abcdefghijklmnopqrstuvwxyz", upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", numbers = "0123456789", symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let charset = lower; if (hasUpper) charset += upper; if (hasNumbers) charset += numbers; if (hasSymbols) charset += symbols;
    let password = ""; for (let i = 0; i < length; i++) password += charset[Math.floor(Math.random() * charset.length)];
    document.getElementById('password-display').innerText = password;
}
function toggleYTQuality() { const format = document.getElementById('yt-format').value; const qualityRow = document.getElementById('yt-quality-row'); if (qualityRow) qualityRow.style.display = (format === 'mp3') ? 'none' : 'flex'; }
async function downloadYouTube() {
    haptic.impactOccurred('light'); const urlInput = document.getElementById('yt-url').value.trim(); const format = document.getElementById('yt-format').value; const quality = document.getElementById('yt-quality')?.value || 'highest'; const status = document.getElementById('yt-status'); const chatId = tg.initDataUnsafe?.user?.id;
    if (!urlInput || !chatId) return; status.innerText = "⏳ Processing YouTube..."; status.style.color = "var(--primary-color)";
    try {
        const response = await fetch(`/api/youtube?url=${encodeURIComponent(urlInput)}&format=${format}&quality=${quality}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) { status.innerText = "✅ Sent!"; status.style.color = "#4caf50"; haptic.notificationOccurred('success'); } else throw new Error(data.error);
    } catch (err) { status.innerText = "❌ " + err.message; status.style.color = "#f44336"; haptic.notificationOccurred('error'); }
}
async function downloadInstagram() {
    haptic.impactOccurred('light'); const urlInput = document.getElementById('ig-url').value.trim(); const format = document.getElementById('ig-format').value; const status = document.getElementById('ig-status'); const chatId = tg.initDataUnsafe?.user?.id;
    if (!urlInput || !chatId) return; status.innerText = "⏳ Processing Instagram..."; status.style.color = "var(--primary-color)";
    try {
        const response = await fetch(`/api/instagram?url=${encodeURIComponent(urlInput)}&format=${format}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) { status.innerText = "✅ Sent!"; status.style.color = "#4caf50"; haptic.notificationOccurred('success'); } else throw new Error(data.error);
    } catch (err) { status.innerText = "❌ " + err.message; status.style.color = "#f44336"; haptic.notificationOccurred('error'); }
}
async function downloadTikTok() {
    haptic.impactOccurred('light'); const urlInput = document.getElementById('tt-url').value.trim(); const format = document.getElementById('tt-format').value; const status = document.getElementById('tt-status'); const chatId = tg.initDataUnsafe?.user?.id;
    if (!urlInput || !chatId) return; status.innerText = "⏳ Processing TikTok..."; status.style.color = "var(--primary-color)";
    try {
        const response = await fetch(`/api/tiktok?url=${encodeURIComponent(urlInput)}&format=${format}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) { status.innerText = "✅ Sent!"; status.style.color = "#4caf50"; haptic.notificationOccurred('success'); } else throw new Error(data.error);
    } catch (err) { status.innerText = "❌ " + err.message; status.style.color = "#f44336"; haptic.notificationOccurred('error'); }
}
function updateQR() {
    const input = document.getElementById('qr-input').value; const result = document.getElementById('qr-result'); const dlBtn = document.getElementById('download-qr');
    if (!input.trim()) { result.innerHTML = '<p style="color: #888; margin: 40px 0;">QR will appear here</p>'; dlBtn.style.display = 'none'; return; }
    result.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(input)}" alt="QR Code">`; dlBtn.style.display = 'block';
}
function downloadQR() { haptic.impactOccurred('light'); const img = document.querySelector('#qr-result img'); if (img) window.open(img.src, '_blank'); }
