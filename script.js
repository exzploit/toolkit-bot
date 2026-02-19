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
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    const isDark = document.body.classList.contains('dark-mode');
    icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    lucide.createIcons();
}

initTheme();
lucide.createIcons();

function showTool(toolName) {
    haptic.impactOccurred('medium');
    document.getElementById('menu').style.display = 'none';
    document.getElementById('tool-container').style.display = 'block';
    const content = document.getElementById('tool-content');
    const title = document.getElementById('tool-title');

    if (toolName === 'speedtest') {
        title.innerText = "NWK.SPEED";
        content.innerHTML = `
            <div id="speedtest-ui">
                <div id="meta-info" style="font-size: 10px; color: var(--secondary-text); margin-bottom: 10px;">SYSTEM READY</div>
                <div class="speed-gauge">
                    <span id="speed-display" class="speed-value">0.0</span>
                    <span class="speed-unit">Mb/s</span>
                </div>
                <div id="test-status" style="margin-top: -10px; color: var(--secondary-text); font-size: 12px; font-weight: 700;">STANDBY</div>
                <div class="progress-container">
                    <div id="progress-bar" class="progress-bar"></div>
                </div>
                <div class="stats-grid">
                    <div class="stat-card"><span class="stat-label">Lat.</span><span id="ping-display" class="stat-value">--</span></div>
                    <div class="stat-card"><span class="stat-label">Jit.</span><span id="jitter-display" class="stat-value">--</span></div>
                    <div class="stat-card"><span class="stat-label">Down</span><span id="download-display" class="stat-value">--</span></div>
                    <div class="stat-card"><span class="stat-label">Up</span><span id="upload-display" class="stat-value">--</span></div>
                </div>
                <button id="restart-test" class="tool-btn" style="display:none; margin-top: 25px;" onclick="runSpeedTest()">↻ RESTART_TEST</button>
            </div>
        `;
        runSpeedTest();
    } 
    
    if (toolName === 'password') {
        title.innerText = "SEC.PASS";
        content.innerHTML = `
            <div class="pass-box">
                <h2 id="password-display" style="color: var(--accent-color); word-break: break-all; min-height: 1.2em; font-size: 24px; margin-bottom: 20px;">-</h2>
                <div class="options-container">
                    <div style="margin-bottom: 20px; text-align:left;">
                        <label style="display:flex; justify-content:space-between; font-size:10px; font-weight:700;">LEN <span id="length-val" class="length-display">12</span></label>
                        <input type="range" id="pass-length" min="6" max="32" value="12" oninput="document.getElementById('length-val').innerText = this.value; generateComplexPassword(true);">
                    </div>
                    <div class="option-row"><label>A-Z</label><input type="checkbox" id="pass-upper" checked onchange="generateComplexPassword(true)"></div>
                    <div class="option-row"><label>0-9</label><input type="checkbox" id="pass-numbers" checked onchange="generateComplexPassword(true)"></div>
                    <div class="option-row"><label>!@#$</label><input type="checkbox" id="pass-symbols" checked onchange="generateComplexPassword(true)"></div>
                </div>
                <button class="tool-btn" onclick="generateComplexPassword(true)" style="margin-top:20px;">↻ GENERATE_NEW</button>
            </div>`;
        generateComplexPassword(false);
    }

    if (toolName === 'downloaders') {
        title.innerText = "MEDIA.DOWN";
        content.innerHTML = `
            <div class="tab-container">
                <button id="tab-yt" class="tab-btn active" onclick="showDownloader('yt')">YT</button>
                <button id="tab-ig" class="tab-btn" onclick="showDownloader('ig')">IG</button>
                <button id="tab-tt" class="tab-btn" onclick="showDownloader('tt')">TT</button>
            </div>
            <div id="downloader-content"></div>
        `;
        showDownloader('yt');
    }

    if (toolName === 'currency') {
        title.innerText = "VAL.CONV";
        content.innerHTML = `
            <div class="pass-box">
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px;">
                    <div style="display:flex; border: 1px solid var(--border-color);">
                        <input type="number" id="cur-amount" class="text-input" value="1" style="flex:1; margin:0; border:none;">
                        <select id="cur-from" class="select-input" style="width: 100px; margin:0; border:none; border-left: 1px solid var(--border-color);">
                            <option value="usd">USD</option><option value="eur">EUR</option><option value="gbp">GBP</option>
                            <option value="mdl">MDL</option><option value="ron">RON</option><option value="uah">UAH</option>
                            <option value="btc">BTC</option><option value="ton">TON</option>
                        </select>
                    </div>
                    <div style="text-align:center; font-size: 14px; opacity: 0.5;">▼</div>
                    <div style="display:flex; border: 1px solid var(--border-color);">
                        <div id="cur-result-val" class="text-input" style="flex:1; margin:0; background: var(--bg-color); line-height: 24px; border:none;">---</div>
                        <select id="cur-to" class="select-input" style="width: 100px; margin:0; border:none; border-left: 1px solid var(--border-color);">
                            <option value="eur">EUR</option><option value="usd">USD</option><option value="ron">RON</option>
                            <option value="mdl">MDL</option><option value="uah">UAH</option><option value="ton">TON</option>
                        </select>
                    </div>
                </div>
                <button class="tool-btn" onclick="convertCurrency()">[ PROCESS_CONVERSION ]</button>
                <div id="cur-status" style="margin-top: 15px; font-size: 10px; color: var(--secondary-text); text-transform: uppercase;"></div>
            </div>`;
    }

    if (toolName === 'domain') {
        title.innerText = "DOMAIN.QRY";
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="dom-url" class="text-input" placeholder="HOST.NAME">
                <button class="tool-btn" onclick="lookupDomain()">[ EXECUTE_QUERY ]</button>
                <div id="dom-result" style="margin-top: 20px;"></div>
            </div>`;
    }

    if (toolName === 'qrcode') {
        title.innerText = "QR.GEN";
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="qr-input" class="text-input" placeholder="DATA_SOURCE" oninput="updateQR()">
                <div class="qr-container" id="qr-result" style="margin: 20px 0;">
                    <p style="font-size: 10px; color: var(--secondary-text); margin: 40px 0;">AWAITING_INPUT</p>
                </div>
                <button id="download-qr" class="tool-btn" style="display:none; margin-top: 15px;" onclick="downloadQR()">[ EXPORT_PNG ]</button>
            </div>`;
    }

    if (toolName === 'textutils') {
        title.innerText = "TEXT.PRC";
        content.innerHTML = `
            <div class="pass-box">
                <span id="text-stats" class="stats-info" style="font-size:10px;">LEN: 0 | WRD: 0</span>
                <textarea id="text-input" class="text-area" placeholder="RAW_TEXT" oninput="updateTextStats()"></textarea>
                <div class="util-grid">
                    <button class="small-btn" onclick="processText('upper')">Upper</button>
                    <button class="small-btn" onclick="processText('lower')">Lower</button>
                    <button class="small-btn" onclick="processText('title')">Title</button>
                    <button class="small-btn" onclick="processText('clear')">Wipe</button>
                </div>
            </div>`;
    }

    if (toolName === 'ipinfo') {
        title.innerText = "SYS.ADDR";
        content.innerHTML = `<div id="loading-spinner" style="padding: 20px; font-size:10px;">QUERYING...</div>`;
        fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
                haptic.notificationOccurred('success');
                content.innerHTML = `
                    <div class="stats-grid">
                        <div class="stat-card" style="grid-column: span 2;"><span class="stat-label">IPv4</span><span class="stat-value">${data.ip}</span></div>
                        <div class="stat-card"><span class="stat-label">Loc.</span><span class="stat-value">${data.city}</span></div>
                        <div class="stat-card"><span class="stat-label">Cty.</span><span class="stat-value">${data.country_code}</span></div>
                        <div class="stat-card" style="grid-column: span 2;"><span class="stat-label">Org.</span><span class="stat-value">${data.org}</span></div>
                    </div>`;
            })
            .catch(() => {
                haptic.notificationOccurred('error');
                content.innerHTML = `<p style="color: red; font-size:10px;">FAILURE_DETECTION</p>`;
            });
    }
    lucide.createIcons();
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
                <input type="text" id="yt-url" class="text-input" placeholder="YOUTUBE_URL">
                <div class="options-container">
                    <div class="option-row"><label>MODE</label><select id="yt-format" class="select-input" style="width: 100px; margin:0;" onchange="toggleYTQuality()"><option value="mp4">MP4</option><option value="mp3">MP3</option></select></div>
                    <div class="option-row" id="yt-quality-row"><label>QLTY</label><select id="yt-quality" class="select-input" style="width: 100px; margin:0;"><option value="highest">MAX</option><option value="720p">720P</option><option value="360p">360P</option></select></div>
                </div>
                <button class="tool-btn" onclick="downloadYouTube()">↓ FETCH_DATA</button>
                <div id="yt-status" style="margin-top: 15px; font-size: 11px; text-transform: uppercase;"></div>
            </div>`;
    } else if (type === 'ig') {
        document.getElementById('tab-ig').classList.add('active');
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="ig-url" class="text-input" placeholder="INSTAGRAM_URL">
                <div class="option-row" style="margin-bottom:20px;"><label>MODE</label><select id="ig-format" class="select-input" style="width: 100px; margin:0;"><option value="mp4">MP4</option><option value="mp3">MP3</option></select></div>
                <button class="tool-btn" onclick="downloadInstagram()">↓ FETCH_DATA</button>
                <div id="ig-status" style="margin-top: 15px; font-size: 11px; text-transform: uppercase;"></div>
            </div>`;
    } else {
        document.getElementById('tab-tt').classList.add('active');
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="tt-url" class="text-input" placeholder="TIKTOK_URL">
                <div class="option-row" style="margin-bottom:20px;"><label>MODE</label><select id="tt-format" class="select-input" style="width: 100px; margin:0;"><option value="mp4">MP4</option><option value="mp3">MP3</option></select></div>
                <button class="tool-btn" onclick="downloadTikTok()">↓ FETCH_DATA</button>
                <div id="tt-status" style="margin-top: 15px; font-size: 11px; text-transform: uppercase;"></div>
            </div>`;
    }
}

// Logic Functions
async function convertCurrency() {
    haptic.impactOccurred('light');
    const amount = document.getElementById('cur-amount').value;
    const from = document.getElementById('cur-from').value;
    const to = document.getElementById('cur-to').value;
    const resultVal = document.getElementById('cur-result-val');
    const status = document.getElementById('cur-status');
    status.innerText = "UPDATING_RATES...";
    try {
        const response = await fetch(`/api/currency?from=${from}&to=${to}&amount=${amount}`);
        const data = await response.json();
        if (data.success) {
            resultVal.innerText = data.result.toLocaleString(undefined, { minimumFractionDigits: 2 });
            status.innerText = `SYNC_DATE: ${data.date}`;
            haptic.impactOccurred('medium');
        } else throw new Error();
    } catch (err) { status.innerText = "SYNC_ERROR"; haptic.notificationOccurred('error'); }
}

async function lookupDomain() {
    haptic.impactOccurred('light');
    const domain = document.getElementById('dom-url').value.trim();
    const resultDiv = document.getElementById('dom-result');
    if (!domain) return;
    resultDiv.innerHTML = "EXEC_QUERY...";
    try {
        const response = await fetch(`/api/domain?domain=${encodeURIComponent(domain)}`);
        const data = await response.json();
        let html = `<div class="stats-grid">`;
        html += `<div class="stat-card" style="grid-column: span 2;"><span class="stat-label">A_REC</span><span class="stat-value">${data.dns.a[0] || 'NONE'}</span></div>`;
        html += `<div class="stat-card" style="grid-column: span 2;"><span class="stat-label">MX_REC</span><span class="stat-value">${data.dns.mx[0]?.exchange || 'NONE'}</span></div>`;
        if (data.whois) {
            html += `<div class="stat-card"><span class="stat-label">REGISTRAR</span><span class="stat-value">${data.whois.registrar.split(' ')[0]}</span></div>`;
            html += `<div class="stat-card"><span class="stat-label">CREATED</span><span class="stat-value">${new Date(data.whois.created).getFullYear()}</span></div>`;
        }
        html += `</div>`;
        resultDiv.innerHTML = html;
        haptic.notificationOccurred('success');
    } catch (err) { resultDiv.innerHTML = "QUERY_FAILURE"; haptic.notificationOccurred('error'); }
}

function goBack() { haptic.impactOccurred('light'); document.getElementById('menu').style.display = 'grid'; document.getElementById('tool-container').style.display = 'none'; }
function updateTextStats() { const text = document.getElementById('text-input').value; document.getElementById('text-stats').innerText = `LEN: ${text.length} | WRD: ${text.trim() ? text.trim().split(/\s+/).length : 0}`; }
function processText(mode) { 
    haptic.impactOccurred('light'); const input = document.getElementById('text-input');
    if (mode === 'upper') input.value = input.value.toUpperCase(); 
    else if (mode === 'lower') input.value = input.value.toLowerCase(); 
    else if (mode === 'title') input.value = input.value.replace(/\b\w/g, l => l.toUpperCase()); 
    else if (mode === 'clear') input.value = "";
    updateTextStats();
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
    if (!urlInput || !chatId) return; status.innerText = "PROC_REQUEST...";
    try {
        const response = await fetch(`/api/youtube?url=${encodeURIComponent(urlInput)}&format=${format}&quality=${quality}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) { status.innerText = "SUCCESS"; haptic.notificationOccurred('success'); } else throw new Error();
    } catch (err) { status.innerText = "FAIL"; haptic.notificationOccurred('error'); }
}
async function downloadInstagram() {
    haptic.impactOccurred('light'); const urlInput = document.getElementById('ig-url').value.trim(); const format = document.getElementById('ig-format').value; const status = document.getElementById('ig-status'); const chatId = tg.initDataUnsafe?.user?.id;
    if (!urlInput || !chatId) return; status.innerText = "PROC_REQUEST...";
    try {
        const response = await fetch(`/api/instagram?url=${encodeURIComponent(urlInput)}&format=${format}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) { status.innerText = "SUCCESS"; haptic.notificationOccurred('success'); } else throw new Error();
    } catch (err) { status.innerText = "FAIL"; haptic.notificationOccurred('error'); }
}
async function downloadTikTok() {
    haptic.impactOccurred('light'); const urlInput = document.getElementById('tt-url').value.trim(); const format = document.getElementById('tt-format').value; const status = document.getElementById('tt-status'); const chatId = tg.initDataUnsafe?.user?.id;
    if (!urlInput || !chatId) return; status.innerText = "PROC_REQUEST...";
    try {
        const response = await fetch(`/api/tiktok?url=${encodeURIComponent(urlInput)}&format=${format}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) { status.innerText = "SUCCESS"; haptic.notificationOccurred('success'); } else throw new Error();
    } catch (err) { status.innerText = "FAIL"; haptic.notificationOccurred('error'); }
}
function updateQR() {
    const input = document.getElementById('qr-input').value; const result = document.getElementById('qr-result'); const dlBtn = document.getElementById('download-qr');
    if (!input.trim()) { result.innerHTML = '<p style="font-size: 10px; color: var(--secondary-text); margin: 40px 0;">AWAITING_INPUT</p>'; dlBtn.style.display = 'none'; return; }
    result.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(input)}" alt="QR Code">`; dlBtn.style.display = 'block';
}
function downloadQR() { haptic.impactOccurred('light'); const img = document.querySelector('#qr-result img'); if (img) window.open(img.src, '_blank'); }

async function runSpeedTest() {
    const speedDisplay = document.getElementById('speed-display');
    const pingDisplay = document.getElementById('ping-display');
    const jitterDisplay = document.getElementById('jitter-display');
    const downloadDisplay = document.getElementById('download-display');
    const uploadDisplay = document.getElementById('upload-display');
    const progressBar = document.getElementById('progress-bar');
    const statusText = document.getElementById('test-status');
    const metaInfo = document.getElementById('meta-info');
    const restartBtn = document.getElementById('restart-test');
    if (!speedDisplay) return;
    restartBtn.style.display = 'none';
    progressBar.style.width = '0%';
    speedDisplay.innerText = '0.0';
    pingDisplay.innerText = '--';
    jitterDisplay.innerText = '--';
    downloadDisplay.innerText = '--';
    uploadDisplay.innerText = '--';
    try {
        const TEST_DURATION = 10000;
        const metaRes = await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' });
        const colo = metaRes.headers.get('cf-meta-colo') || 'UKN';
        const country = metaRes.headers.get('cf-meta-country') || 'SYS';
        metaInfo.innerText = `SRV: ${colo} (${country}) • STABLE`;
        statusText.innerText = 'LATENCY_CHECK...';
        let pings = [];
        for (let i = 0; i < 20; i++) {
            const start = performance.now();
            await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' });
            pings.push(performance.now() - start);
            progressBar.style.width = (i * 0.5) + '%';
        }
        const avgPing = pings.reduce((a,b) => a+b) / pings.length;
        const jitter = Math.max(...pings) - Math.min(...pings);
        pingDisplay.innerText = avgPing.toFixed(0) + ' ms';
        jitterDisplay.innerText = jitter.toFixed(0) + ' ms';
        haptic.impactOccurred('soft');
        statusText.innerText = 'DL_TEST...';
        let dlReceived = 0;
        const startDlTime = performance.now();
        while (performance.now() - startDlTime < TEST_DURATION) {
            const response = await fetch(`https://speed.cloudflare.com/__down?bytes=25000000`, { cache: 'no-store' });
            const reader = response.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                const elapsed = performance.now() - startDlTime;
                if (done || elapsed >= TEST_DURATION) break;
                dlReceived += value.length;
                const speedMbps = (dlReceived * 8) / (elapsed / 1000 * 1024 * 1024);
                speedDisplay.innerText = speedMbps.toFixed(1);
                progressBar.style.width = (10 + (elapsed / TEST_DURATION) * 40) + '%';
            }
            if (performance.now() - startDlTime >= TEST_DURATION) break;
        }
        downloadDisplay.innerText = speedDisplay.innerText + ' Mbps';
        haptic.impactOccurred('soft');
        statusText.innerText = 'UL_TEST...';
        let ulSent = 0;
        const startUlTime = performance.now();
        const ulChunkSize = 5 * 1024 * 1024;
        const ulData = new Uint8Array(ulChunkSize);
        while (performance.now() - startUlTime < TEST_DURATION) {
            await fetch('https://speed.cloudflare.com/__up', { method: 'POST', body: ulData, cache: 'no-store' });
            ulSent += ulChunkSize;
            const elapsed = performance.now() - startUlTime;
            const speedMbps = (ulSent * 8) / (elapsed / 1000 * 1024 * 1024);
            speedDisplay.innerText = speedMbps.toFixed(1);
            progressBar.style.width = (50 + (elapsed / TEST_DURATION) * 50) + '%';
            if (elapsed >= TEST_DURATION) break;
        }
        uploadDisplay.innerText = speedDisplay.innerText + ' Mbps';
        progressBar.style.width = '100%';
        statusText.innerText = 'COMPLETE';
        restartBtn.style.display = 'block';
        haptic.notificationOccurred('success');
    } catch (error) {
        statusText.innerText = 'FAIL';
        haptic.notificationOccurred('error');
        if (restartBtn) restartBtn.style.display = 'block';
    }
}
