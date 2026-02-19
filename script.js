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
                    <div class="stat-card">
                        <span class="stat-label">Latency</span>
                        <span id="ping-display" class="stat-value">--</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Jitter</span>
                        <span id="jitter-display" class="stat-value">--</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Download</span>
                        <span id="download-display" class="stat-value">--</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Upload</span>
                        <span id="upload-display" class="stat-value">--</span>
                    </div>
                </div>
                <button id="restart-test" class="tool-btn" style="display:none; margin-top: 20px;" onclick="runSpeedTest()">Run Again</button>
            </div>
        `;
        runSpeedTest();
    } 
    
    if (toolName === 'password') {
        title.innerText = "Password Generator";
        content.innerHTML = `
            <div class="pass-box">
                <h2 id="password-display" style="color: var(--primary-color); word-break: break-all; min-height: 1.2em;">-</h2>
                <div class="options-container">
                    <div style="margin-bottom: 15px;">
                        <label>Length: <span id="length-val" class="length-display">12</span></label>
                        <input type="range" id="pass-length" min="6" max="32" value="12" oninput="document.getElementById('length-val').innerText = this.value; generateComplexPassword(true);">
                    </div>
                    <div class="option-row">
                        <label for="pass-upper">Uppercase (A-Z)</label>
                        <input type="checkbox" id="pass-upper" checked onchange="generateComplexPassword(true)">
                    </div>
                    <div class="option-row">
                        <label for="pass-numbers">Numbers (0-9)</label>
                        <input type="checkbox" id="pass-numbers" checked onchange="generateComplexPassword(true)">
                    </div>
                    <div class="option-row">
                        <label for="pass-symbols">Symbols (!@#$%^&*)</label>
                        <input type="checkbox" id="pass-symbols" checked onchange="generateComplexPassword(true)">
                    </div>
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

    if (toolName === 'qrcode') {
        title.innerText = "QR Generator";
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="qr-input" class="text-input" placeholder="Type link or text here..." oninput="updateQR()">
                <div class="qr-container" id="qr-result">
                    <p style="color: #888; margin: 40px 0;">QR will appear here</p>
                </div>
                <button id="download-qr" class="tool-btn" style="display:none;" onclick="downloadQR()">📥 Download PNG</button>
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
                    <button class="small-btn" onclick="processText('b64e')">Base64 Enc</button>
                    <button class="small-btn" onclick="processText('b64d')">Base64 Dec</button>
                    <button class="small-btn" onclick="processText('clear')">Clear</button>
                </div>
            </div>`;
    }

    if (toolName === 'currency') {
        title.innerText = "Currency Converter";
        content.innerHTML = `
            <div class="pass-box">
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <input type="number" id="cur-amount" class="text-input" value="1" style="flex:1; margin:0;">
                    <select id="cur-from" class="select-input" style="width: 100px; margin:0;">
                        <option value="usd">USD</option>
                        <option value="eur">EUR</option>
                        <option value="gbp">GBP</option>
                        <option value="btc">BTC</option>
                        <option value="ton">TON</option>
                        <option value="eth">ETH</option>
                        <option value="rub">RUB</option>
                        <option value="uah">UAH</option>
                    </select>
                </div>
                <div style="margin-bottom:15px; font-size: 24px;">⬇</div>
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <div id="cur-result-val" class="text-input" style="flex:1; margin:0; background: var(--stat-card-bg); line-height: 24px;">---</div>
                    <select id="cur-to" class="select-input" style="width: 100px; margin:0;">
                        <option value="eur">EUR</option>
                        <option value="usd">USD</option>
                        <option value="gbp">GBP</option>
                        <option value="rub">RUB</option>
                        <option value="uah">UAH</option>
                        <option value="ton">TON</option>
                    </select>
                </div>
                <button class="tool-btn" onclick="convertCurrency()">💹 Convert</button>
                <div id="cur-status" style="margin-top: 10px; font-size: 12px; color: var(--secondary-text);"></div>
            </div>`;
    }

    if (toolName === 'domain') {
        title.innerText = "Domain Info";
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="dom-url" class="text-input" placeholder="example.com">
                <button class="tool-btn" onclick="lookupDomain()">🔍 Lookup DNS/Whois</button>
                <div id="dom-result" style="margin-top: 20px; text-align: left; font-size: 14px;"></div>
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
                    <div style="text-align: left; padding: 10px; line-height: 1.6;">
                        <h3 style="margin-top:0;">Your Connection Info</h3>
                        <p><strong>IP:</strong> ${data.ip}</p>
                        <p><strong>City:</strong> ${data.city}</p>
                        <p><strong>Region:</strong> ${data.region}</p>
                        <p><strong>Country:</strong> ${data.country_name}</p>
                        <p><strong>ISP:</strong> ${data.org}</p>
                    </div>`;
            })
            .catch(() => {
                haptic.notificationOccurred('error');
                content.innerHTML = `<p style="color: red;">Failed to fetch IP info. Please try again.</p>`;
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
                    <div class="option-row">
                        <label>Format</label>
                        <select id="yt-format" class="select-input" style="width: 120px; margin:0;" onchange="toggleYTQuality()">
                            <option value="mp4">Video (MP4)</option>
                            <option value="mp3">Audio (MP3)</option>
                        </select>
                    </div>
                    <div class="option-row" id="yt-quality-row">
                        <label>Quality</label>
                        <select id="yt-quality" class="select-input" style="width: 120px; margin:0;">
                            <option value="highest">Highest</option>
                            <option value="720p">720p</option>
                            <option value="360p">360p</option>
                            <option value="lowest">Lowest</option>
                        </select>
                    </div>
                </div>
                <button class="tool-btn" onclick="downloadYouTube()">🚀 Download & Send</button>
                <div id="yt-status" style="margin-top: 10px; font-size: 14px; color: var(--secondary-text);"></div>
            </div>`;
    } else if (type === 'ig') {
        document.getElementById('tab-ig').classList.add('active');
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="ig-url" class="text-input" placeholder="Paste Instagram link...">
                <div class="options-container">
                    <div class="option-row">
                        <label>Format</label>
                        <select id="ig-format" class="select-input" style="width: 120px; margin:0;">
                            <option value="mp4">Video (MP4)</option>
                            <option value="mp3">Audio (MP3)</option>
                        </select>
                    </div>
                </div>
                <button class="tool-btn" onclick="downloadInstagram()">📸 Download & Send</button>
                <div id="ig-status" style="margin-top: 10px; font-size: 14px; color: var(--secondary-text);"></div>
            </div>`;
    } else {
        document.getElementById('tab-tt').classList.add('active');
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="tt-url" class="text-input" placeholder="Paste TikTok link...">
                <div class="options-container">
                    <div class="option-row">
                        <label>Format</label>
                        <select id="tt-format" class="select-input" style="width: 120px; margin:0;">
                            <option value="mp4">Video (No WM)</option>
                            <option value="mp3">Audio (MP3)</option>
                        </select>
                    </div>
                </div>
                <button class="tool-btn" onclick="downloadTikTok()">🎵 Download & Send</button>
                <div id="tt-status" style="margin-top: 10px; font-size: 14px; color: var(--secondary-text);"></div>
            </div>`;
    }
}

async function downloadTikTok() {
    haptic.impactOccurred('light');
    const urlInput = document.getElementById('tt-url').value.trim();
    const format = document.getElementById('tt-format').value;
    const status = document.getElementById('tt-status');
    const chatId = tg.initDataUnsafe?.user?.id;

    if (!urlInput) return status.innerText = "❌ URL needed";
    if (!chatId) return status.innerText = "❌ Open in Telegram";

    status.innerText = "⏳ Fetching TikTok...";
    try {
        const response = await fetch(`/api/tiktok?url=${encodeURIComponent(urlInput)}&format=${format}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) {
            status.innerText = "✅ Sent!";
            haptic.notificationOccurred('success');
        } else throw new Error(data.error);
    } catch (err) {
        status.innerText = "❌ " + err.message;
        haptic.notificationOccurred('error');
    }
}

// Standard Back/Theme
function goBack() {
    haptic.impactOccurred('light');
    document.getElementById('menu').style.display = 'block';
    document.getElementById('tool-container').style.display = 'none';
    document.getElementById('tool-content').innerHTML = "";
}

function updateQR() {
    const input = document.getElementById('qr-input').value;
    const result = document.getElementById('qr-result');
    const dlBtn = document.getElementById('download-qr');
    if (!input.trim()) { result.innerHTML = '<p style="color: #888; margin: 40px 0;">QR will appear here</p>'; dlBtn.style.display = 'none'; return; }
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(input)}`;
    result.innerHTML = `<img src="${url}" alt="QR Code">`;
    dlBtn.style.display = 'block';
}

function downloadQR() {
    haptic.impactOccurred('light');
    const img = document.querySelector('#qr-result img');
    if (img) window.open(img.src, '_blank');
}

function updateTextStats() {
    const text = document.getElementById('text-input').value;
    const stats = document.getElementById('text-stats');
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    stats.innerText = `Chars: ${chars} | Words: ${words}`;
}

function processText(mode) {
    haptic.impactOccurred('light');
    const input = document.getElementById('text-input');
    let text = input.value;
    if (mode === 'upper') text = text.toUpperCase();
    if (mode === 'lower') text = text.toLowerCase();
    if (mode === 'title') text = text.replace(/\b\w/g, l => l.toUpperCase());
    if (mode === 'clear') text = "";
    if (mode === 'b64e') { try { text = btoa(text); } catch(e) { haptic.notificationOccurred('error'); return; } }
    if (mode === 'b64d') { try { text = atob(text); } catch(e) { haptic.notificationOccurred('error'); return; } }
    input.value = text;
    updateTextStats();
}

function generateComplexPassword(isUserAction) {
    if (isUserAction) haptic.impactOccurred('light');
    const length = document.getElementById('pass-length').value;
    const hasUpper = document.getElementById('pass-upper').checked;
    const hasNumbers = document.getElementById('pass-numbers').checked;
    const hasSymbols = document.getElementById('pass-symbols').checked;
    const lower = "abcdefghijklmnopqrstuvwxyz", upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", numbers = "0123456789", symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let charset = lower;
    if (hasUpper) charset += upper;
    if (hasNumbers) charset += numbers;
    if (hasSymbols) charset += symbols;
    let password = "";
    for (let i = 0; i < length; i++) password += charset[Math.floor(Math.random() * charset.length)];
    document.getElementById('password-display').innerText = password;
}

function toggleYTQuality() {
    const format = document.getElementById('yt-format').value;
    const qualityRow = document.getElementById('yt-quality-row');
    if (qualityRow) qualityRow.style.display = (format === 'mp3') ? 'none' : 'flex';
}

async function downloadYouTube() {
    haptic.impactOccurred('light');
    const urlInput = document.getElementById('yt-url').value.trim();
    const format = document.getElementById('yt-format').value;
    const quality = document.getElementById('yt-quality')?.value || 'highest';
    const status = document.getElementById('yt-status');
    const chatId = tg.initDataUnsafe?.user?.id;
    if (!urlInput || !chatId) return;
    status.innerText = "⏳ Processing YouTube...";
    try {
        const baseUrl = window.location.origin && window.location.origin !== 'null' ? window.location.origin : '';
        const apiUrl = `${baseUrl}/api/youtube?url=${encodeURIComponent(urlInput)}&format=${format}&quality=${quality}&chatId=${chatId}`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) { status.innerText = "✅ Sent!"; haptic.notificationOccurred('success'); }
        else throw new Error(data.error);
    } catch (err) { status.innerText = "❌ " + err.message; haptic.notificationOccurred('error'); }
}

async function downloadInstagram() {
    haptic.impactOccurred('light');
    const status = document.getElementById('ig-status');
    const urlInput = document.getElementById('ig-url').value.trim();
    const format = document.getElementById('ig-format').value;
    const chatId = tg.initDataUnsafe?.user?.id;
    if (!urlInput || !chatId) return;
    status.innerText = "⏳ Processing IG...";
    try {
        const baseUrl = window.location.origin && window.location.origin !== 'null' ? window.location.origin : '';
        const response = await fetch(`${baseUrl}/api/instagram?url=${encodeURIComponent(urlInput)}&format=${format}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) { status.innerText = "✅ Sent!"; haptic.notificationOccurred('success'); }
        else throw new Error(data.error);
    } catch (err) { status.innerText = "❌ " + err.message; haptic.notificationOccurred('error'); }
}

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
        const colo = metaRes.headers.get('cf-meta-colo') || 'Unknown';
        const country = metaRes.headers.get('cf-meta-country') || '';
        metaInfo.innerText = `Server: ${colo} (${country}) • Provider: ${metaRes.headers.get('server') || 'Cloudflare'}`;
        statusText.innerText = 'Measuring Latency...';
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
        statusText.innerText = 'Testing Download Speed...';
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
        statusText.innerText = 'Testing Upload Speed...';
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
        statusText.innerText = 'Test Complete';
        restartBtn.style.display = 'block';
        haptic.notificationOccurred('success');
    } catch (error) {
        console.error(error);
        haptic.notificationOccurred('error');
        if (statusText) statusText.innerText = 'Test Failed. Check connection.';
        if (restartBtn) restartBtn.style.display = 'block';
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
            resultVal.innerText = data.result.toFixed(2);
            status.innerText = `Last updated: ${data.date}`;
            haptic.impactOccurred('medium');
        } else throw new Error(data.error);
    } catch (err) {
        status.innerText = "❌ Error fetching rates";
        haptic.notificationOccurred('error');
    }
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
        
        let html = `
            <div style="background: var(--stat-card-bg); padding: 15px; border-radius: 10px;">
                <p><strong>A Records:</strong><br>${data.dns.a.join(', ') || 'None'}</p>
                <p><strong>MX Records:</strong><br>${data.dns.mx.map(m => m.exchange).join(', ') || 'None'}</p>
        `;

        if (data.whois) {
            html += `
                <hr style="border: 0; border-top: 1px solid var(--progress-bg); margin: 10px 0;">
                <p><strong>Registrar:</strong> ${data.whois.registrar}</p>
                <p><strong>Created:</strong> ${new Date(data.whois.created).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${data.whois.status}</p>
            `;
        }

        html += `</div>`;
        resultDiv.innerHTML = html;
        haptic.notificationOccurred('success');
    } catch (err) {
        resultDiv.innerHTML = "❌ Lookup failed: " + err.message;
        haptic.notificationOccurred('error');
    }
}
