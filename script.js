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
    
    hideTool(); // Close any open tool when switching primary tabs
    lucide.createIcons();
}

function showTool(toolName) {
    haptic.impactOccurred('medium');
    document.getElementById('tool-container').style.display = 'block';
    const content = document.getElementById('tool-content');
    const title = document.getElementById('tool-title');

    // Generic tool rendering logic
    if (toolName === 'speedtest') {
        title.innerText = "Speed Test";
        content.innerHTML = `<div id="speedtest-ui">
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
            <button class="tool-btn" style="margin-top:30px; justify-content:center;" onclick="runSpeedTest()">Start Test</button>
        </div>`;
    }

    if (toolName === 'password') {
        title.innerText = "Password Gen";
        content.innerHTML = `<div class="pass-box">
            <h2 id="password-display" style="color: var(--primary-color); word-break: break-all; min-height: 1.2em; font-size: 28px; margin-bottom: 25px;">-</h2>
            <div class="options-container">
                <div class="option-row"><label>Length <span id="length-val">12</span></label><input type="range" id="pass-length" min="6" max="32" value="12" oninput="document.getElementById('length-val').innerText=this.value; generateComplexPassword(true)"></div>
                <div class="option-row"><label>Uppercase</label><input type="checkbox" id="pass-upper" checked onchange="generateComplexPassword(true)"></div>
                <div class="option-row"><label>Numbers</label><input type="checkbox" id="pass-numbers" checked onchange="generateComplexPassword(true)"></div>
                <div class="option-row"><label>Symbols</label><input type="checkbox" id="pass-symbols" checked onchange="generateComplexPassword(true)"></div>
            </div>
            <button class="tool-btn" style="justify-content:center;" onclick="generateComplexPassword(true)">Generate</button>
        </div>`;
        generateComplexPassword(false);
    }

    // ... rest of tools (domain, qrcode, textutils, ipinfo) ...
    // Note: domain, qrcode, textutils, ipinfo logic remains same, just adapt labels
    if (toolName === 'ipinfo') {
        title.innerText = "IP Address";
        fetch('https://ipapi.co/json/').then(r => r.json()).then(data => {
            content.innerHTML = `<div class="stats-grid">
                <div class="stat-card" style="grid-column: span 2;"><span class="stat-label">IPv4 Address</span><span class="stat-value">${data.ip}</span></div>
                <div class="stat-card" style="grid-column: span 2;"><span class="stat-label">Provider</span><span class="stat-value">${data.org}</span></div>
            </div>`;
        });
    }
}

function hideTool() {
    document.getElementById('tool-container').style.display = 'none';
    stopMetronome();
}

// Media Tab Management
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
            <div class="upload-box" onclick="document.getElementById('audio-upload').click()">
                <i data-lucide="music" style="width:32px; height:32px; margin-bottom:10px; color:var(--primary-color)"></i>
                <span style="display:block; font-weight:600">Select File</span>
                <input type="file" id="audio-upload" style="display:none" onchange="handleAudioFile(this)">
            </div>
            <div id="audio-info" style="display:none; margin-bottom:15px; font-size:14px"></div>
            <button id="conv-btn" class="tool-btn" style="display:none; justify-content:center" onclick="startAudioConversion()">Convert to MP3</button>
            <div id="conv-status"></div>
        </div>`;
    } else {
        content.innerHTML = `<div class="pass-box">
            <div id="metro-circle" class="metro-circle">${bpm}</div>
            <div style="margin-bottom:30px">
                <label style="display:flex; justify-content:space-between; font-weight:600">BPM <span id="bpm-val">${bpm}</span></label>
                <input type="range" min="40" max="220" value="${bpm}" oninput="updateBPM(this.value)">
            </div>
            <button id="metro-btn" class="tool-btn" style="justify-content:center" onclick="toggleMetronome()">Start</button>
        </div>`;
    }
    lucide.createIcons();
}

// Metronome Logic
function updateBPM(val) {
    bpm = val;
    document.getElementById('bpm-val').innerText = bpm;
    document.getElementById('metro-circle').innerText = bpm;
    if (isMetronomeRunning) {
        stopMetronome();
        startMetronome();
    }
}

function toggleMetronome() {
    isMetronomeRunning ? stopMetronome() : startMetronome();
}

function startMetronome() {
    isMetronomeRunning = true;
    document.getElementById('metro-btn').innerText = "Stop";
    const circle = document.getElementById('metro-circle');
    const interval = (60 / bpm) * 1000;
    
    metronomeInterval = setInterval(() => {
        haptic.impactOccurred('medium');
        circle.classList.add('metro-active');
        setTimeout(() => circle.classList.remove('metro-active'), 50);
    }, interval);
}

function stopMetronome() {
    isMetronomeRunning = false;
    if (metronomeInterval) clearInterval(metronomeInterval);
    const btn = document.getElementById('metro-btn');
    if (btn) btn.innerText = "Start";
}

// Settings Page
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
        <p style="font-size:12px; color:var(--secondary-text)">Toolkit v2.0 • Pro Edition</p>
    `;
}

// ... Downloader & Helper functions adapted from previous version ...
function showDownloaderUI(type) {
    const box = document.getElementById('downloader-ui-box');
    document.querySelectorAll('#media-tab-content .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`st-${type}`).classList.add('active');
    
    box.innerHTML = `<div class="pass-box">
        <input type="text" id="media-url" class="text-input" placeholder="${type.toUpperCase()} Link">
        <button class="tool-btn" style="justify-content:center" onclick="processDownload('${type}')">Download Media</button>
        <div id="dl-status" style="margin-top:10px; font-size:13px"></div>
    </div>`;
}

async function processDownload(type) {
    const url = document.getElementById('media-url').value.trim();
    const status = document.getElementById('dl-status');
    const chatId = tg.initDataUnsafe?.user?.id;
    if (!url || !chatId) return;
    
    status.innerText = "Processing...";
    try {
        const response = await fetch(`/api/${type === 'yt' ? 'youtube' : (type === 'ig' ? 'instagram' : 'tiktok')}?url=${encodeURIComponent(url)}&chatId=${chatId}`);
        const data = await response.json();
        if (data.success) { status.innerText = "✅ Sent!"; haptic.notificationOccurred('success'); }
        else throw new Error(data.error);
    } catch (e) { status.innerText = "❌ Failed"; haptic.notificationOccurred('error'); }
}

function generateComplexPassword(isUserAction) {
    if (isUserAction) haptic.impactOccurred('light');
    const length = document.getElementById('pass-length').value;
    const hasUpper = document.getElementById('pass-upper').checked, hasNumbers = document.getElementById('pass-numbers').checked, hasSymbols = document.getElementById('pass-symbols').checked;
    const lower = "abcdefghijklmnopqrstuvwxyz", upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", numbers = "0123456789", symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let charset = lower; if (hasUpper) charset += upper; if (hasNumbers) charset += numbers; if (hasSymbols) charset += symbols;
    let password = ""; for (let i = 0; i < length; i++) password += charset[Math.floor(Math.random() * charset.length)];
    const display = document.getElementById('password-display');
    if (display) display.innerText = password;
}

initTheme();
switchView('tools');
