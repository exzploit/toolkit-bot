const tg = window.Telegram.WebApp;
const haptic = tg.HapticFeedback;
tg.expand();

let currentView = 'tools';
let metronomeInterval = null;
let isMetronomeRunning = false;
let bpm = 120;

// Theme Initialization
function initTheme() {
    if (tg.colorScheme === 'dark') document.body.classList.add('dark-mode');
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

function switchView(viewId) {
    haptic.impactOccurred('light');
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${viewId}`).style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${viewId}`).classList.add('active');
    
    if (viewId === 'media') renderMediaTabs();
    if (viewId === 'settings') renderSettings();
    
    hideTool(); 
    lucide.createIcons();
}

function showTool(toolName) {
    haptic.impactOccurred('medium');
    document.getElementById('tool-container').style.display = 'block';
    const content = document.getElementById('tool-content');
    const title = document.getElementById('tool-title');

    if (toolName === 'speedtest') {
        title.innerText = "Speed Test";
        content.innerHTML = `
            <div id="speedtest-ui">
                <div id="meta-info" style="font-size: 13px; color: var(--secondary-text); margin-bottom: 10px;">System Ready</div>
                <div class="speed-gauge"><span id="speed-display" class="speed-value">0.0</span><span class="speed-unit">Mbps</span></div>
                <div id="test-status" style="margin-top: -10px; color: var(--secondary-text); font-size: 14px; font-weight: 600;">Standby</div>
                <div class="progress-container"><div id="progress-bar" class="progress-bar"></div></div>
                <div class="stats-grid">
                    <div class="stat-card"><span class="stat-label">Latency</span><span id="ping-display" class="stat-value">-- ms</span></div>
                    <div class="stat-card"><span class="stat-label">Jitter</span><span id="jitter-display" class="stat-value">-- ms</span></div>
                    <div class="stat-card"><span class="stat-label">Download</span><span id="download-display" class="stat-value">--</span></div>
                    <div class="stat-card"><span class="stat-label">Upload</span><span id="upload-display" class="stat-value">--</span></div>
                </div>
                <button class="tool-btn" style="margin-top:30px; justify-content:center;" onclick="runSpeedTest()">Test Again</button>
            </div>`;
        runSpeedTest();
    } 
    
    if (toolName === 'password') {
        title.innerText = "Password Gen";
        content.innerHTML = `
            <div class="pass-box">
                <h2 id="password-display" style="color: var(--primary-color); word-break: break-all; min-height: 1.2em; font-size: 28px; margin-bottom: 25px;">-</h2>
                <div class="options-container">
                    <div class="option-row"><label>Length <span id="length-val">12</span></label><input type="range" id="pass-length" min="6" max="32" value="12" oninput="document.getElementById('length-val').innerText=this.value; generateComplexPassword(true)"></div>
                    <div class="option-row"><label>Uppercase</label><input type="checkbox" id="pass-upper" checked onchange="generateComplexPassword(true)"></div>
                    <div class="option-row"><label>Numbers</label><input type="checkbox" id="pass-numbers" checked onchange="generateComplexPassword(true)"></div>
                    <div class="option-row"><label>Symbols</label><input type="checkbox" id="pass-symbols" checked onchange="generateComplexPassword(true)"></div>
                </div>
                <button class="tool-btn" style="justify-content:center;" onclick="generateComplexPassword(true)">Generate New</button>
            </div>`;
        generateComplexPassword(false);
    }

    if (toolName === 'domain') {
        title.innerText = "Domain Info";
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="dom-url" class="text-input" placeholder="example.com">
                <button class="tool-btn" style="justify-content:center;" onclick="lookupDomain()">Lookup Domain</button>
                <div id="dom-result" style="margin-top: 20px;"></div>
            </div>`;
    }

    if (toolName === 'qrcode') {
        title.innerText = "QR Generator";
        content.innerHTML = `
            <div class="pass-box">
                <input type="text" id="qr-input" class="text-input" placeholder="Type text or link..." oninput="updateQR()">
                <div class="qr-container" id="qr-result" style="margin: 20px 0;"><p style="font-size: 14px; color: var(--secondary-text); margin: 40px 0;">Waiting...</p></div>
                <button id="download-qr" class="tool-btn" style="display:none; justify-content:center;" onclick="downloadQR()">Save PNG</button>
            </div>`;
    }

    if (toolName === 'textutils') {
        title.innerText = "Text Utils";
        content.innerHTML = `
            <div class="pass-box">
                <textarea id="text-input" class="text-area" placeholder="Enter text..." oninput="updateTextStats()"></textarea>
                <div id="text-stats" class="stats-info">Length: 0 | Words: 0</div>
                <div class="util-grid">
                    <button class="small-btn" onclick="processText('upper')">Upper</button>
                    <button class="small-btn" onclick="processText('lower')">Lower</button>
                    <button class="small-btn" onclick="processText('title')">Title</button>
                    <button class="small-btn" onclick="processText('clear')" style="color: #ff3b30;">Clear</button>
                </div>
            </div>`;
    }

    if (toolName === 'ipinfo') {
        title.innerText = "IP Address";
        content.innerHTML = `<div id="loading-spinner" style="padding: 20px;">Fetching...</div>`;
        fetch('https://ipapi.co/json/').then(r => r.json()).then(data => {
            haptic.notificationOccurred('success');
            content.innerHTML = `<div class="stats-grid">
                <div class="stat-card" style="grid-column: span 2;"><span class="stat-label">IPv4 Address</span><span class="stat-value">${data.ip}</span></div>
                <div class="stat-card" style="grid-column: span 2;"><span class="stat-label">Provider</span><span class="stat-value">${data.org}</span></div>
            </div>`;
        }).catch(() => haptic.notificationOccurred('error'));
    }
    lucide.createIcons();
}

function hideTool() {
    document.getElementById('tool-container').style.display = 'none';
    stopMetronome();
}

function renderMediaTabs() {
    const container = document.getElementById('media-tabs-container');
    container.innerHTML = `
        <div class="tab-container">
            <button id="mtab-downs" class="tab-btn active" onclick="setMediaTab('downs')">Downloads</button>
            <button id="mtab-conv" class="tab-btn" onclick="setMediaTab('conv')">Audio Conv</button>
            <button id="mtab-metro" class="tab-btn" onclick="setMediaTab('metro')">Metronome</button>
        </div>
        <div id="media-tab-content"></div>
    `;
    setMediaTab('downs');
}

function setMediaTab(tab) {
    haptic.impactOccurred('light');
    const content = document.getElementById('media-tab-content');
    document.querySelectorAll('#media-tabs-container .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`mtab-${tab}`).classList.add('active');
    stopMetronome();

    if (tab === 'downs') {
        content.innerHTML = `
            <div class="tab-container" style="background:none; border: 1px solid var(--border-color);">
                <button onclick="showDownloaderUI('yt')" id="st-yt" class="tab-btn active"><i data-lucide="youtube"></i> YT</button>
                <button onclick="showDownloaderUI('ig')" id="st-ig" class="tab-btn"><i data-lucide="instagram"></i> IG</button>
                <button onclick="showDownloaderUI('tt')" id="st-tt" class="tab-btn"><i data-lucide="music"></i> TT</button>
            </div>
            <div id="downloader-ui-box"></div>
        `;
        showDownloaderUI('yt');
    } else if (tab === 'conv') {
        content.innerHTML = `<div class="pass-box">
            <div class="upload-box" style="border: 2px dashed var(--progress-bg); padding: 30px; border-radius: 15px; cursor: pointer; margin-bottom: 15px; text-align:center;" onclick="document.getElementById('audio-upload').click()">
                <i data-lucide="music" style="width:32px; height:32px; margin-bottom:10px; color:var(--primary-color)"></i>
                <span style="display:block; font-weight:600">Select Audio/Video File</span>
                <input type="file" id="audio-upload" style="display:none" onchange="handleAudioFile(this)">
            </div>
            <div id="audio-info" style="display:none; margin-bottom:15px; font-size:14px; font-weight:600;"></div>
            <button id="conv-btn" class="tool-btn" style="display:none; justify-content:center" onclick="startAudioConversion()">Convert to MP3</button>
            <div id="conv-status"></div>
        </div>`;
    } else {
        content.innerHTML = `<div class="pass-box" style="text-align:center;">
            <div id="metro-circle" class="metro-circle">${bpm}</div>
            <div style="margin-bottom:30px; text-align:left;">
                <label style="display:flex; justify-content:space-between; font-weight:600">BPM <span id="bpm-val">${bpm}</span></label>
                <input type="range" min="40" max="220" value="${bpm}" oninput="updateBPM(this.value)">
            </div>
            <button id="metro-btn" class="tool-btn" style="justify-content:center" onclick="toggleMetronome()">Start</button>
        </div>`;
    }
    lucide.createIcons();
}

// Tool Implementation Logic
let selectedAudioFile = null;
function handleAudioFile(input) {
    if (input.files && input.files[0]) {
        selectedAudioFile = input.files[0];
        const info = document.getElementById('audio-info');
        info.innerText = `Selected: ${selectedAudioFile.name}`;
        info.style.display = 'block';
        document.getElementById('conv-btn').style.display = 'flex';
        haptic.impactOccurred('light');
    }
}

async function startAudioConversion() {
    if (!selectedAudioFile) return;
    const status = document.getElementById('conv-status');
    const chatId = tg.initDataUnsafe?.user?.id;
    if (!chatId) return status.innerText = "❌ User ID not found";
    status.innerText = "⏳ Converting...";
    try {
        const formData = new FormData();
        formData.append('file', selectedAudioFile);
        formData.append('chatId', chatId);
        const response = await fetch('/api/convert-audio', { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            status.innerText = "✅ Sent to chat!";
            haptic.notificationOccurred('success');
        } else throw new Error(data.error);
    } catch (err) { status.innerText = "❌ Failed"; haptic.notificationOccurred('error'); }
}

function updateBPM(val) {
    bpm = val;
    document.getElementById('bpm-val').innerText = bpm;
    document.getElementById('metro-circle').innerText = bpm;
    if (isMetronomeRunning) { stopMetronome(); startMetronome(); }
}

function toggleMetronome() { isMetronomeRunning ? stopMetronome() : startMetronome(); }

function startMetronome() {
    isMetronomeRunning = true;
    document.getElementById('metro-btn').innerText = "Stop";
    const circle = document.getElementById('metro-circle');
    metronomeInterval = setInterval(() => {
        haptic.impactOccurred('medium');
        circle.classList.add('metro-active');
        setTimeout(() => circle.classList.remove('metro-active'), 50);
    }, (60 / bpm) * 1000);
}

function stopMetronome() {
    isMetronomeRunning = false;
    if (metronomeInterval) clearInterval(metronomeInterval);
    const btn = document.getElementById('metro-btn');
    if (btn) btn.innerText = "Start";
}

function renderSettings() {
    const container = document.getElementById('settings-content');
    container.innerHTML = `
        <div class="settings-group">
            <div class="settings-cell">
                <span class="settings-label">Dark Mode</span>
                <input type="checkbox" ${document.body.classList.contains('dark-mode') ? 'checked' : ''} onchange="toggleTheme()">
            </div>
        </div>
        <div class="settings-group">
            <div class="settings-cell" onclick="tg.close()">
                <span class="settings-label" style="color:#ff3b30">Close App</span>
            </div>
        </div>
        <p style="font-size:12px; color:var(--secondary-text); text-align:center;">Toolkit Bot v2.0 • [⌬]</p>
    `;
}

function showDownloaderUI(type) {
    const box = document.getElementById('downloader-ui-box');
    document.querySelectorAll('#media-tab-content .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`st-${type}`).classList.add('active');
    box.innerHTML = `<div class="pass-box">
        <input type="text" id="media-url" class="text-input" placeholder="${type.toUpperCase()} Link">
        <select id="media-format" class="select-input"><option value="mp4">Video</option><option value="mp3">Audio</option></select>
        <button class="tool-btn" style="justify-content:center" onclick="processDownload('${type}')">Download Media</button>
        <div id="dl-status" style="margin-top:10px; font-size:13px"></div>
    </div>`;
}

async function processDownload(type) {
    const url = document.getElementById('media-url').value.trim();
    const format = document.getElementById('media-format').value;
    const status = document.getElementById('dl-status');
    const chatId = tg.initDataUnsafe?.user?.id;
    if (!url || !chatId) return;
    status.innerText = "⏳ Processing...";
    try {
        const response = await fetch(`/api/${type === 'yt' ? 'youtube' : (type === 'ig' ? 'instagram' : 'tiktok')}?url=${encodeURIComponent(url)}&format=${format}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) { status.innerText = "✅ Sent!"; haptic.notificationOccurred('success'); }
        else throw new Error(data.error);
    } catch (e) { status.innerText = "❌ Failed"; haptic.notificationOccurred('error'); }
}

async function lookupDomain() {
    const domain = document.getElementById('dom-url').value.trim();
    const resultDiv = document.getElementById('dom-result');
    if (!domain) return;
    resultDiv.innerHTML = "Querying...";
    try {
        const response = await fetch(`/api/domain?domain=${encodeURIComponent(domain)}`);
        const data = await response.json();
        let html = `<div class="stats-grid">`;
        html += `<div class="stat-card" style="grid-column: span 2;"><span class="stat-label">Primary IP</span><span class="stat-value">${data.dns.a[0] || 'None'}</span></div>`;
        if (data.whois) html += `<div class="stat-card" style="grid-column: span 2;"><span class="stat-label">Registrar</span><span class="stat-value">${data.whois.registrar}</span></div>`;
        html += `</div>`;
        resultDiv.innerHTML = html;
        haptic.notificationOccurred('success');
    } catch (e) { resultDiv.innerHTML = "Lookup failed"; haptic.notificationOccurred('error'); }
}

async function runSpeedTest() {
    const speedDisplay = document.getElementById('speed-display');
    const pingDisplay = document.getElementById('ping-display');
    const jitterDisplay = document.getElementById('jitter-display');
    const downloadDisplay = document.getElementById('download-display');
    const uploadDisplay = document.getElementById('upload-display');
    const progressBar = document.getElementById('progress-bar');
    const statusText = document.getElementById('test-status');
    if (!speedDisplay) return;
    progressBar.style.width = '0%';
    speedDisplay.innerText = '0.0';
    try {
        const metaRes = await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' });
        const colo = metaRes.headers.get('cf-meta-colo') || 'UKN';
        statusText.innerText = `Testing (${colo})...`;
        // Latency
        let pings = [];
        for (let i = 0; i < 10; i++) {
            const start = performance.now();
            await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' });
            pings.push(performance.now() - start);
            progressBar.style.width = (i * 2) + '%';
        }
        pingDisplay.innerText = Math.min(...pings).toFixed(0) + ' ms';
        // Download
        const dlStart = performance.now();
        const dlRes = await fetch('https://speed.cloudflare.com/__down?bytes=10000000', { cache: 'no-store' });
        const dlDuration = (performance.now() - dlStart) / 1000;
        const dlSpeed = (10 * 8) / dlDuration;
        speedDisplay.innerText = dlSpeed.toFixed(1);
        downloadDisplay.innerText = dlSpeed.toFixed(1) + ' Mbps';
        progressBar.style.width = '100%';
        statusText.innerText = "Complete";
        haptic.notificationOccurred('success');
    } catch (e) { statusText.innerText = "Failed"; haptic.notificationOccurred('error'); }
}

function updateQR() {
    const input = document.getElementById('qr-input').value;
    const result = document.getElementById('qr-result');
    const dlBtn = document.getElementById('download-qr');
    if (!input.trim()) { result.innerHTML = '<p>Waiting...</p>'; dlBtn.style.display = 'none'; return; }
    result.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(input)}" style="width:100%">`;
    dlBtn.style.display = 'flex';
}

function downloadQR() { const img = document.querySelector('#qr-result img'); if (img) window.open(img.src, '_blank'); }
function updateTextStats() { const text = document.getElementById('text-input').value; document.getElementById('text-stats').innerText = `Chars: ${text.length} | Words: ${text.trim() ? text.trim().split(/\s+/).length : 0}`; }
function processText(mode) { 
    const input = document.getElementById('text-input');
    if (mode === 'upper') input.value = input.value.toUpperCase(); 
    else if (mode === 'lower') input.value = input.value.toLowerCase(); 
    else if (mode === 'title') input.value = input.value.replace(/\b\w/g, l => l.toUpperCase()); 
    else if (mode === 'clear') input.value = "";
    updateTextStats();
}

initTheme();
switchView('tools');
