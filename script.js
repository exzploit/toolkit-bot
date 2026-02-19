const tg = window.Telegram.WebApp;
const haptic = tg.HapticFeedback;
tg.expand();

let currentLang = localStorage.getItem('toolkit_lang') || 'en';
let soundsEnabled = localStorage.getItem('toolkit_sounds') !== 'false';
let metronomeInterval = null;
let isMetronomeRunning = false;
let bpm = 120;

const i18n = {
    en: {
        tools: "Tools", network: "Network", media: "Media", settings: "Settings",
        speedtest: "Speed Test", passgen: "Password Gen", domain: "Domain Info",
        qrgen: "QR Generator", textutils: "Text Utils", ipinfo: "IP Address",
        downloads: "Downloads", audioConv: "Audio Conv", metronome: "Metronome",
        darkMode: "Dark Mode", language: "Language", closeApp: "Close App",
        systemReady: "System Ready", standby: "Standby", startTest: "Start Test",
        testAgain: "Test Again", latency: "Latency", jitter: "Jitter",
        download: "Download", upload: "Upload", testing: "Testing",
        complete: "Complete", length: "Length", uppercase: "Uppercase",
        numbers: "Numbers", symbols: "Symbols", generate: "Generate",
        selectFile: "Select Audio/Video File", convMp3: "Convert to MP3",
        converting: "Converting...", sentChat: "Sent to chat!",
        failed: "Failed", query: "Querying...", provider: "Provider",
        link: "Link", processing: "Processing...", chars: "Chars", words: "Words",
        clear: "Clear", title: "Title", upper: "Upper", lower: "Lower",
        rickroll: "Rickroll Gen", soundEffects: "Sound Effects", copy: "Copy Link"
    },
    ro: {
        tools: "Utilități", network: "Rețea", media: "Media", settings: "Setări",
        speedtest: "Test Viteză", passgen: "Gen. Parole", domain: "Info Domeniu",
        qrgen: "Generator QR", textutils: "Text Utils", ipinfo: "Adresă IP",
        downloads: "Descărcări", audioConv: "Conv. Audio", metronome: "Metronom",
        darkMode: "Mod Întunecat", language: "Limbă", closeApp: "Închide",
        systemReady: "Sistem Pregătit", standby: "Așteptare", startTest: "Începe Testul",
        testAgain: "Repetă Testul", latency: "Latență", jitter: "Jitter",
        download: "Descărcare", upload: "Încărcare", testing: "Se testează",
        complete: "Finalizat", length: "Lungime", uppercase: "Majuscule",
        numbers: "Cifre", symbols: "Simboluri", generate: "Generează",
        selectFile: "Alege Fișier Audio/Video", convMp3: "Convertește în MP3",
        converting: "Se convertește...", sentChat: "Trimis în chat!",
        failed: "Eroare", query: "Se caută...", provider: "Furnizor",
        link: "Link", processing: "Se procesează...", chars: "Caractere", words: "Cuvinte",
        clear: "Șterge", title: "Titlu", upper: "Majuscule", lower: "Minuscule",
        rickroll: "Gen. Rickroll", soundEffects: "Efecte Sonore", copy: "Copiază Link"
    }
};

const sounds = {
    click: new Audio('assets/sfx/click.wav'),
    error: new Audio('assets/sfx/error.wav'),
    loading: new Audio('assets/sfx/loading.wav')
};

// Ensure loading loops
sounds.loading.loop = true;

function playSound(type) {
    if (soundsEnabled && sounds[type]) {
        if (type === 'click' || type === 'error') {
            const s = sounds[type].cloneNode();
            s.play().catch(() => {});
        } else {
            sounds[type].currentTime = 0;
            sounds[type].play().catch(() => {});
        }
    }
}

function stopSound(type) {
    if (sounds[type]) {
        sounds[type].pause();
        sounds[type].currentTime = 0;
    }
}

function t(key) { return i18n[currentLang][key] || key; }

function initTheme() {
    if (tg.colorScheme === 'dark') document.body.classList.add('dark-mode');
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.setAttribute('data-lucide', document.body.classList.contains('dark-mode') ? 'moon' : 'sun');
        lucide.createIcons();
    }
}

function toggleTheme() {
    playSound('click');
    haptic.impactOccurred('light');
    document.body.classList.toggle('dark-mode');
    updateThemeIcon();
}

function switchLang() {
    playSound('click');
    currentLang = currentLang === 'en' ? 'ro' : 'en';
    localStorage.setItem('toolkit_lang', currentLang);
    haptic.notificationOccurred('success');
    updateUIVocabulary();
    renderSettings();
    if (document.getElementById('view-media').style.display !== 'none') renderMediaTabs();
}

function toggleSounds() {
    soundsEnabled = !soundsEnabled;
    localStorage.setItem('toolkit_sounds', soundsEnabled);
    if (soundsEnabled) playSound('click');
    haptic.impactOccurred('light');
    renderSettings();
}

function updateUIVocabulary() {
    document.querySelector('#nav-tools span').innerText = t('tools');
    document.querySelector('#nav-network span').innerText = t('network');
    document.querySelector('#nav-media span').innerText = t('media');
    document.querySelector('#nav-settings span').innerText = t('settings');
    
    document.getElementById('header-tools').innerText = t('tools');
    document.getElementById('header-network').innerText = t('network');
    document.getElementById('header-media').innerText = t('media');
    document.getElementById('header-settings').innerText = t('settings');

    const toolsMenu = document.getElementById('menu-tools');
    if (toolsMenu) {
        toolsMenu.children[0].innerHTML = `<i data-lucide="shield-check"></i> ${t('passgen')}`;
        toolsMenu.children[1].innerHTML = `<i data-lucide="ghost"></i> ${t('rickroll')}`;
        toolsMenu.children[2].innerHTML = `<i data-lucide="qr-code"></i> ${t('qrgen')}`;
        toolsMenu.children[3].innerHTML = `<i data-lucide="file-text"></i> ${t('textutils')}`;
    }
    
    const networkMenu = document.getElementById('menu-network');
    if (networkMenu) {
        networkMenu.children[0].innerHTML = `<i data-lucide="zap"></i> ${t('speedtest')}`;
        networkMenu.children[1].innerHTML = `<i data-lucide="globe"></i> ${t('domain')}`;
        networkMenu.children[2].innerHTML = `<i data-lucide="map-pin"></i> ${t('ipinfo')}`;
    }
    
    lucide.createIcons();
}

function switchView(viewId) {
    playSound('click');
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
    playSound('click');
    haptic.impactOccurred('medium');
    document.getElementById('tool-container').style.display = 'block';
    const content = document.getElementById('tool-content');
    const title = document.getElementById('tool-title');

    if (toolName === 'speedtest') {
        title.innerText = t('speedtest');
        content.innerHTML = `<div class="pass-box" style="padding-top: 10px;">
            <div id="meta-info" style="font-size: 13px; color: var(--secondary-text); margin-bottom: 15px; height: 20px;">${t('systemReady')}</div>
            <div class="speed-gauge">
                <span id="speed-display" class="speed-value">0.0</span>
                <span class="speed-unit">Mbps</span>
            </div>
            <div id="test-status" style="color: var(--secondary-text); font-size: 14px; font-weight: 600; margin-bottom: 10px;">${t('standby')}</div>
            <div class="progress-container" style="margin: 10px 0 25px 0;"><div id="progress-bar" class="progress-bar" style="width:0%"></div></div>
            <div class="stats-grid">
                <div class="stat-card"><span class="stat-label">${t('latency')}</span><span id="ping-display" class="stat-value">--</span></div>
                <div class="stat-card"><span class="stat-label">${t('jitter')}</span><span id="jitter-display" class="stat-value">--</span></div>
                <div class="stat-card"><span class="stat-label">${t('download')}</span><span id="download-display" class="stat-value">--</span></div>
                <div class="stat-card"><span class="stat-label">${t('upload')}</span><span id="upload-display" class="stat-value">--</span></div>
            </div>
            <button class="tool-btn" id="start-test-btn" style="margin-top:30px; justify-content:center;" onclick="runSpeedTest()">${t('startTest')}</button>
        </div>`;
    }

    if (toolName === 'password') {
        title.innerText = t('passgen');
        content.innerHTML = `<div class="pass-box">
            <h2 id="password-display" style="color: var(--primary-color); word-break: break-all; min-height: 1.2em; font-size: 28px; margin-bottom: 25px;">-</h2>
            <div class="options-container">
                <div class="option-row"><label>${t('length')} <span id="length-val">12</span></label><input type="range" id="pass-length" min="6" max="32" value="12" oninput="document.getElementById('length-val').innerText=this.value; generateComplexPassword(true)"></div>
                <div class="option-row"><label>${t('uppercase')}</label><input type="checkbox" id="pass-upper" checked onchange="generateComplexPassword(true)"></div>
                <div class="option-row"><label>${t('numbers')}</label><input type="checkbox" id="pass-numbers" checked onchange="generateComplexPassword(true)"></div>
                <div class="option-row"><label>${t('symbols')}</label><input type="checkbox" id="pass-symbols" checked onchange="generateComplexPassword(true)"></div>
            </div>
            <button class="tool-btn" style="justify-content:center;" onclick="generateComplexPassword(true)">${t('generate')}</button>
        </div>`;
        generateComplexPassword(false);
    }

    if (toolName === 'rickroll') {
        title.innerText = t('rickroll');
        content.innerHTML = `<div class="pass-box">
            <input type="text" id="rick-alias" class="text-input" placeholder="Disguise text (e.g. Free Nitro)">
            <button class="tool-btn" style="justify-content:center" onclick="generateRickroll()">${t('generate')}</button>
            <div id="rick-result" style="display:none">
                <div class="rick-preview" id="rick-url"></div>
                <button class="tool-btn" style="justify-content:center" onclick="copyRickroll()"><i data-lucide="copy"></i> ${t('copy')}</button>
            </div>
        </div>`;
    }

    if (toolName === 'ipinfo') {
        title.innerText = t('ipinfo');
        content.innerHTML = `<div id="loading-spinner" style="padding: 20px;">${t('query')}</div>`;
        fetch('https://ipapi.co/json/').then(r => r.json()).then(data => {
            playSound('click');
            haptic.notificationOccurred('success');
            content.innerHTML = `<div class="stats-grid">
                <div class="stat-card" style="grid-column: span 2;"><span class="stat-label">IPv4 Address</span><span class="stat-value">${data.ip}</span></div>
                <div class="stat-card" style="grid-column: span 2;"><span class="stat-label">${t('provider')}</span><span class="stat-value">${data.org}</span></div>
            </div>`;
        }).catch(() => {
            playSound('error');
            haptic.notificationOccurred('error');
        });
    }
    
    if (toolName === 'domain') {
        title.innerText = t('domain');
        content.innerHTML = `<div class="pass-box"><input type="text" id="dom-url" class="text-input" placeholder="example.com"><button class="tool-btn" style="justify-content:center;" onclick="lookupDomain()">Lookup</button><div id="dom-result" style="margin-top:20px;"></div></div>`;
    }
    if (toolName === 'qrcode') {
        title.innerText = t('qrgen');
        content.innerHTML = `<div class="pass-box" style="text-align:center;"><input type="text" id="qr-input" class="text-input" placeholder="Text..." oninput="updateQR()"><div class="qr-container" id="qr-result" style="margin: 20px auto; display:block; width:fit-content;"><p style="font-size: 14px; color: var(--secondary-text); padding: 40px;">Waiting...</p></div><button id="download-qr" class="tool-btn" style="display:none; justify-content:center;" onclick="downloadQR()">Save PNG</button></div>`;
    }
    if (toolName === 'textutils') {
        title.innerText = t('textutils');
        content.innerHTML = `<div class="pass-box"><textarea id="text-input" class="text-area" placeholder="Text..." oninput="updateTextStats()" style="height:150px;"></textarea><div id="text-stats" style="font-size:12px; color:var(--secondary-text); margin-bottom:15px;"></div><div class="util-grid"><button class="small-btn" onclick="processText('upper')">${t('upper')}</button><button class="small-btn" onclick="processText('lower')">${t('lower')}</button><button class="small-btn" onclick="processText('title')">${t('title')}</button><button class="small-btn" onclick="processText('clear')" style="color:#ff3b30">${t('clear')}</button></div></div>`;
    }

    lucide.createIcons();
}

function hideTool() {
    document.getElementById('tool-container').style.display = 'none';
    stopMetronome();
    stopSound('loading');
}

async function runSpeedTest() {
    const btn = document.getElementById('start-test-btn');
    if (btn) btn.disabled = true;
    
    playSound('loading');
    const speedDisplay = document.getElementById('speed-display');
    const pingDisplay = document.getElementById('ping-display');
    const jitterDisplay = document.getElementById('jitter-display');
    const downloadDisplay = document.getElementById('download-display');
    const uploadDisplay = document.getElementById('upload-display');
    const progressBar = document.getElementById('progress-bar');
    const statusText = document.getElementById('test-status');
    
    if (!speedDisplay) return;
    
    progressBar.style.width = '0%';
    statusText.innerText = t('testing') + "...";
    
    try {
        const TEST_DURATION = 8000;
        const metaRes = await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' });
        const colo = metaRes.headers.get('cf-meta-colo') || 'UKN';
        document.getElementById('meta-info').innerText = `Server: ${colo}`;
        
        let pings = [];
        for (let i = 0; i < 15; i++) {
            const start = performance.now();
            await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' });
            pings.push(performance.now() - start);
            progressBar.style.width = (i * 1) + '%';
        }
        const minPing = Math.min(...pings);
        const maxPing = Math.max(...pings);
        pingDisplay.innerText = minPing.toFixed(0) + ' ms';
        jitterDisplay.innerText = (maxPing - minPing).toFixed(0) + ' ms';

        let dlReceived = 0;
        const dlStart = performance.now();
        const dlResponse = await fetch(`https://speed.cloudflare.com/__down?bytes=10000000`, { cache: 'no-store' });
        const reader = dlResponse.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            dlReceived += value.length;
            const elapsed = (performance.now() - dlStart) / 1000;
            const speed = (dlReceived * 8) / (elapsed * 1024 * 1024);
            speedDisplay.innerText = speed.toFixed(1);
            progressBar.style.width = (15 + (dlReceived / 10000000) * 40) + '%';
        }
        downloadDisplay.innerText = speedDisplay.innerText + ' Mbps';

        const ulData = new Uint8Array(5000000);
        const ulStart = performance.now();
        await fetch('https://speed.cloudflare.com/__up', { method: 'POST', body: ulData, cache: 'no-store' });
        const ulElapsed = (performance.now() - ulStart) / 1000;
        const ulSpeed = (5 * 8) / ulElapsed;
        uploadDisplay.innerText = ulSpeed.toFixed(1) + ' Mbps';
        speedDisplay.innerText = ulSpeed.toFixed(1);
        progressBar.style.width = '100%';
        
        statusText.innerText = t('complete');
        stopSound('loading');
        playSound('click'); // Using click as success for now
        haptic.notificationOccurred('success');
    } catch (e) { 
        statusText.innerText = t('failed'); 
        stopSound('loading');
        playSound('error'); 
        haptic.notificationOccurred('error'); 
    }
    if (btn) {
        btn.disabled = false;
        btn.innerText = t('testAgain');
    }
}

function generateRickroll() {
    const alias = document.getElementById('rick-alias').value.trim() || 'Click Me';
    const finalUrl = `https://www.google.com/url?q=https://www.youtube.com/watch?v=dQw4w9WgXcQ&source=gmail&ust=1700000000000&usg=AOvVaw0&disguise=${encodeURIComponent(alias)}`;
    document.getElementById('rick-url').innerText = finalUrl;
    document.getElementById('rick-result').style.display = 'block';
    playSound('click');
    haptic.notificationOccurred('success');
}

function copyRickroll() {
    const text = document.getElementById('rick-url').innerText;
    navigator.clipboard.writeText(text);
    playSound('click');
    haptic.impactOccurred('medium');
}

function renderMediaTabs() {
    const container = document.getElementById('media-tabs-container');
    container.innerHTML = `
        <div class="tab-container">
            <button id="mtab-downs" class="tab-btn active" onclick="setMediaTab('downs')">${t('downloads')}</button>
            <button id="mtab-conv" class="tab-btn" onclick="setMediaTab('conv')">${t('audioConv')}</button>
            <button id="mtab-metro" class="tab-btn" onclick="setMediaTab('metro')">${t('metronome')}</button>
        </div>
        <div id="media-tab-content"></div>
    `;
    setMediaTab('downs');
}

function setMediaTab(tab) {
    playSound('click');
    haptic.impactOccurred('light');
    const content = document.getElementById('media-tab-content');
    document.querySelectorAll('#media-tabs-container .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`mtab-${tab}`).classList.add('active');
    stopMetronome();
    stopSound('loading');

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
            <div class="upload-box" style="border: 2px dashed var(--progress-bg); padding: 30px; border-radius: 15px; cursor: pointer; text-align:center;" onclick="document.getElementById('audio-upload').click()">
                <i data-lucide="music" style="width:32px; height:32px; margin-bottom:10px; color:var(--primary-color)"></i>
                <span style="display:block; font-weight:600">${t('selectFile')}</span>
                <input type="file" id="audio-upload" style="display:none" onchange="handleAudioFile(this)">
            </div>
            <div id="audio-info" style="display:none; margin:15px 0; font-size:14px; font-weight:600;"></div>
            <button id="conv-btn" class="tool-btn" style="display:none; justify-content:center" onclick="startAudioConversion()">${t('convMp3')}</button>
            <div id="conv-status"></div>
        </div>`;
    } else {
        content.innerHTML = `<div class="pass-box" style="text-align:center;">
            <div id="metro-circle" class="metro-circle" style="margin: 20px auto;">${bpm}</div>
            <div style="margin-bottom:30px; text-align:left;">
                <label style="display:flex; justify-content:space-between; font-weight:600">BPM <span id="bpm-val">${bpm}</span></label>
                <input type="range" min="40" max="220" value="${bpm}" oninput="updateBPM(this.value)">
            </div>
            <button id="metro-btn" class="tool-btn" style="justify-content:center" onclick="toggleMetronome()">Start</button>
        </div>`;
    }
    lucide.createIcons();
}

function generateComplexPassword(isUserAction) {
    if (isUserAction) { playSound('click'); haptic.impactOccurred('light'); }
    const lengthEl = document.getElementById('pass-length');
    if (!lengthEl) return;
    const length = parseInt(lengthEl.value);
    const hasUpper = document.getElementById('pass-upper').checked, hasNumbers = document.getElementById('pass-numbers').checked, hasSymbols = document.getElementById('pass-symbols').checked;
    const lower = "abcdefghijklmnopqrstuvwxyz", upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", numbers = "0123456789", symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
    let charset = lower; if (hasUpper) charset += upper; if (hasNumbers) charset += numbers; if (hasSymbols) charset += symbols;
    let password = ""; for (let i = 0; i < length; i++) password += charset[Math.floor(Math.random() * charset.length)];
    const display = document.getElementById('password-display');
    if (display) display.innerText = password;
}

function renderSettings() {
    const container = document.getElementById('settings-content');
    container.innerHTML = `
        <div class="settings-group">
            <div class="settings-cell">
                <span class="settings-label">${t('darkMode')}</span>
                <input type="checkbox" ${document.body.classList.contains('dark-mode') ? 'checked' : ''} onchange="toggleTheme()">
            </div>
            <div class="settings-cell">
                <span class="settings-label">${t('soundEffects')}</span>
                <input type="checkbox" ${soundsEnabled ? 'checked' : ''} onchange="toggleSounds()">
            </div>
            <div class="settings-cell" onclick="switchLang()">
                <span class="settings-label">${t('language')}</span>
                <span style="color:var(--primary-color); font-weight:600;">${currentLang === 'en' ? 'English' : 'Română'}</span>
            </div>
        </div>
        <div class="settings-group">
            <div class="settings-cell" onclick="tg.close()">
                <span class="settings-label" style="color:#ff3b30">${t('closeApp')}</span>
            </div>
        </div>
        <p style="font-size:12px; color:var(--secondary-text); text-align:center;">Toolkit Bot v2.4 • [⌬]</p>
    `;
}

function startMetronome() {
    isMetronomeRunning = true;
    document.getElementById('metro-btn').innerText = "Stop";
    const circle = document.getElementById('metro-circle');
    metronomeInterval = setInterval(() => {
        playSound('click'); // Using click for metronome too
        haptic.impactOccurred('medium');
        circle.classList.add('metro-active');
        setTimeout(() => circle.classList.remove('metro-active'), 50);
    }, (60 / bpm) * 1000);
}

// Helpers
let selectedAudioFile = null;
function handleAudioFile(input) { if (input.files && input.files[0]) { selectedAudioFile = input.files[0]; const info = document.getElementById('audio-info'); info.innerText = `Selected: ${selectedAudioFile.name}`; info.style.display = 'block'; document.getElementById('conv-btn').style.display = 'flex'; playSound('click'); haptic.impactOccurred('light'); } }
async function startAudioConversion() { if (!selectedAudioFile) return; const status = document.getElementById('conv-status'); const chatId = tg.initDataUnsafe?.user?.id; if (!chatId) return; status.innerText = "⏳ " + t('converting'); playSound('loading'); try { const formData = new FormData(); formData.append('file', selectedAudioFile); formData.append('chatId', chatId); const response = await fetch('/api/convert-audio', { method: 'POST', body: formData }); const data = await response.json(); stopSound('loading'); if (data.success) { status.innerText = "✅ " + t('sentChat'); playSound('click'); haptic.notificationOccurred('success'); } else throw new Error(); } catch (e) { stopSound('loading'); status.innerText = "❌ " + t('failed'); playSound('error'); haptic.notificationOccurred('error'); } }
function updateBPM(val) { bpm = val; document.getElementById('bpm-val').innerText = bpm; document.getElementById('metro-circle').innerText = bpm; if (isMetronomeRunning) { stopMetronome(); startMetronome(); } }
function stopMetronome() { isMetronomeRunning = false; if (metronomeInterval) clearInterval(metronomeInterval); const btn = document.getElementById('metro-btn'); if (btn) btn.innerText = "Start"; }
function showDownloaderUI(type) { playSound('click'); const box = document.getElementById('downloader-ui-box'); document.querySelectorAll('#media-tab-content .tab-btn').forEach(b => b.classList.remove('active')); document.getElementById(`st-${type}`).classList.add('active'); box.innerHTML = `<div class="pass-box"><input type="text" id="media-url" class="text-input" placeholder="${type.toUpperCase()} Link"><select id="media-format" class="select-input"><option value="mp4">Video</option><option value="mp3">Audio</option></select><button class="tool-btn" style="justify-content:center" onclick="processDownload('${type}')">Download</button><div id="dl-status" style="margin-top:10px; font-size:13px"></div></div>`; }
async function processDownload(type) { const url = document.getElementById('media-url').value.trim(); const format = document.getElementById('media-format').value; const status = document.getElementById('dl-status'); const chatId = tg.initDataUnsafe?.user?.id; if (!url || !chatId) return; status.innerText = t('processing') + "..."; playSound('loading'); try { const response = await fetch(`/api/${type === 'yt' ? 'youtube' : (type === 'ig' ? 'instagram' : 'tiktok')}?url=${encodeURIComponent(url)}&format=${format}&chatId=${chatId}`); const data = await response.json(); stopSound('loading'); if (data.success) { status.innerText = "✅ " + t('sentChat'); playSound('click'); haptic.notificationOccurred('success'); } else throw new Error(); } catch (e) { stopSound('loading'); status.innerText = "❌ " + t('failed'); playSound('error'); haptic.notificationOccurred('error'); } }
async function lookupDomain() { const domain = document.getElementById('dom-url').value.trim(); const resultDiv = document.getElementById('dom-result'); if (!domain) return; resultDiv.innerHTML = "Querying..."; playSound('click'); try { const response = await fetch(`/api/domain?domain=${encodeURIComponent(domain)}`); const data = await response.json(); let html = `<div class="stats-grid"><div class="stat-card" style="grid-column: span 2;"><span class="stat-label">Primary IP</span><span class="stat-value">${data.dns.a[0] || 'None'}</span></div>`; if (data.whois) html += `<div class="stat-card" style="grid-column: span 2;"><span class="stat-label">Registrar</span><span class="stat-value">${data.whois.registrar}</span></div>`; html += `</div>`; resultDiv.innerHTML = html; playSound('click'); haptic.notificationOccurred('success'); } catch (e) { resultDiv.innerHTML = "Lookup failed"; playSound('error'); haptic.notificationOccurred('error'); } }
function updateQR() { const input = document.getElementById('qr-input').value; const result = document.getElementById('qr-result'); const dlBtn = document.getElementById('download-qr'); if (!input.trim()) { result.innerHTML = '<p style="padding:40px;">Waiting...</p>'; dlBtn.style.display = 'none'; return; } result.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(input)}" style="width:200px; height:200px;">`; dlBtn.style.display = 'flex'; }
function downloadQR() { const img = document.querySelector('#qr-result img'); if (img) window.open(img.src, '_blank'); }
function updateTextStats() { const text = document.getElementById('text-input').value; document.getElementById('text-stats').innerText = `${t('chars')}: ${text.length} | ${t('words')}: ${text.trim() ? text.trim().split(/\s+/).length : 0}`; }
function processText(mode) { const input = document.getElementById('text-input'); if (mode === 'upper') input.value = input.value.toUpperCase(); else if (mode === 'lower') input.value = input.value.toLowerCase(); else if (mode === 'title') input.value = input.value.replace(/\b\w/g, l => l.toUpperCase()); else if (mode === 'clear') input.value = ""; updateTextStats(); playSound('click'); }

initTheme();
switchView('tools');
updateUIVocabulary();
