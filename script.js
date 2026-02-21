const tg = window.Telegram.WebApp;
const haptic = tg.HapticFeedback;
tg.expand();

// --- GLOBALS ---
let currentLang = localStorage.getItem('toolkit_lang') || 'en';
let soundsEnabled = localStorage.getItem('toolkit_sounds') !== 'false';
let metronomeInterval = null;
let isMetronomeRunning = false;
let bpm = 120;
let nextBeatTime = 0;
let isMorsePlaying = false;
let speedTestController = null;
let selectedAudioFile = null;
let exifFile = null;

// --- i18n ---
const i18n = {
    en: {
        tools: "Tools", network: "Network", media: "Media", settings: "Settings",
        speedtest: "Speed Test", portscan: "Port Scanner", passgen: "Password Gen", domain: "Domain Info",
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
        rickroll: "Rickroll Gen", soundEffects: "Sound Effects", copy: "Copy Link",
        scanning: "Scanning...", open: "OPEN", closed: "CLOSED", target: "Target IP/Host",
        secureVault: "Secure Vault", encrypt: "Encrypt File", decrypt: "Decrypt File",
        password: "Password", dropFile: "Drop file or click", success: "Success!",
        server: "Server", disguise: "Disguise Text", redirectType: "Redirect Type",
        morse: "Morse Engine", play: "Play Haptic", invisibleText: "Invisible Text",
        copied: "Copied!", fancyText: "Fancy Styles", glitchText: "Glitch (Zalgo)", 
        flipText: "Flip Text", transform: "Transform", inspector: "URL Inspector",
        inspecting: "Inspecting...", secure: "Secure", insecure: "Insecure",
        intensity: "Intensity", mode: "Mode", encode: "Encode", decode: "Decode",
        decision: "Decision Engine", coinFlip: "Coin Flip", diceRoll: "Dice Roll",
        heads: "HEADS", tails: "TAILS", rolling: "Rolling...", exifStripper: "EXIF Stripper",
        stripMetadata: "Strip Metadata", selectImage: "Select Image",
        crack: "Hash Cracker", cracking: "Cracking...", enterHash: "Enter Hash (MD5/SHA)",
        cracked: "Cracked!", notFound: "Not found", jailbreak: "Jailbreak Check",
        check: "Check Compatibility", selectModel: "Select Model", selectOS: "Select iOS Version",
        compatible: "COMPATIBLE", incompatible: "NOT COMPATIBLE", partial: "SEMI-COMPATIBLE",
        tts: "Text-to-Speech", speak: "Generate Voice", enterText: "Enter text to speak...",
        subnet: "Subnet Master", calculate: "Calculate", networkRange: "Network Range",
        broadcast: "Broadcast", usableHosts: "Usable Hosts", mask: "Subnet Mask",
        scraper: "Scraper", scrape: "Scrape", urlScraper: "URL Scraper", tgScraper: "Telegram Scraper",
        username: "Username", bio: "Bio", subscribers: "Subscribers/Members",
        tracker: "Username Tracker", tracking: "Tracking...", track: "Start Tracking",
        dorking: "Dorking Studio", dork: "Generate Dork", dorkType: "Dork Type",
        breach: "Breach Checker", phone: "Phone Lookup", checkBreach: "Check Breach", lookup: "Lookup",
        desc_passgen: "Generate high-entropy secure passwords instantly.",
        desc_vault: "Client-side encryption for your sensitive files.",
        desc_morse: "Translate text to Morse code with haptic pulses.",
        desc_jailbreak: "Check if your iPhone model and iOS version can be jailbroken.",
        desc_crack: "Attempt to recover passwords from common MD5/SHA hashes.",
        desc_decision: "Let fate decide with a high-speed coin flip or dice roll.",
        desc_rickroll: "Create disguised links to prank your friends.",
        desc_qrgen: "Generate high-quality QR codes for any text or link.",
        desc_textutils: "Transform text into fancy styles, Zalgo, or Leetspeak.",
        desc_speedtest: "Measure your internet speed using high-precision servers.",
        desc_portscan: "Scan a host for commonly open network ports.",
        desc_inspector: "Deep analysis of URLs including IP and server headers.",
        desc_domain: "Lookup DNS and WHOIS registration details.",
        desc_ipinfo: "Get detailed information about your current IP address.",
        desc_audioConv: "Convert audio or video files into high-quality MP3s.",
        desc_exif: "Remove hidden metadata from photos for better privacy.",
        desc_metronome: "Rock-solid precision metronome with drift compensation.",
        desc_tts: "Convert text to high-quality speech sent to your DM.",
        desc_subnet: "Professional IPv4 CIDR and Subnet calculator.",
        desc_scraper: "Choose between URL extraction or Telegram account scraping.",
        desc_tracker: "Find a username across 10+ social media platforms.",
        desc_dorking: "Advanced Google search queries for domain reconnaissance.",
        desc_breach: "Check if an email has been leaked in known data breaches.",
        desc_phone: "Extract carrier, region, and metadata from any phone number."
    },
    ro: {
        tools: "Utilități", network: "Rețea", media: "Media", settings: "Setări",
        speedtest: "Test Viteză", portscan: "Scanare Porturi", passgen: "Gen. Parole", domain: "Info Domeniu",
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
        rickroll: "Gen. Rickroll", soundEffects: "Efecte Sonore", copy: "Copiază Link",
        scanning: "Se scanează...", open: "DESCHIS", closed: "ÎNCHIS", target: "IP sau Gazdă",
        secureVault: "Seif Securizat", encrypt: "Criptează Fișier", decrypt: "Decriptează Fișier",
        password: "Parolă", dropFile: "Trage fișierul sau apasă", success: "Succes!",
        server: "Server", disguise: "Text Mascare", redirectType: "Tip Redirecționare",
        morse: "Motor Morse", play: "Redă Haptic", invisibleText: "Text Invizibil",
        copied: "Copiat!", fancyText: "Stiluri Speciale", glitchText: "Glitch (Zalgo)",
        flipText: "Text Întors", transform: "Transformă", inspector: "Inspector URL",
        inspecting: "Se inspectează...", secure: "Securizat", insecure: "Nesecurizat",
        intensity: "Intensitate", mode: "Mod", encode: "Codare", decode: "Decodare",
        decision: "Motor Decizii", coinFlip: "Aruncă Banul", diceRoll: "Dă cu Zarul",
        heads: "CAP", tails: "PAJURĂ", rolling: "Se rotește...", exifStripper: "Șterge EXIF",
        stripMetadata: "Șterge Datele", selectImage: "Alege Imagine",
        crack: "Hash Cracker", cracking: "Se sparge...", enterHash: "Introdu Hash-ul",
        cracked: "Spart!", notFound: "Nu am găsit", jailbreak: "Verifică Jailbreak",
        check: "Verifică Compatibilitate", selectModel: "Alege Modelul", selectOS: "Alege Versiunea iOS",
        compatible: "COMPATIBIL", incompatible: "INCOMPATIBIL", partial: "SEMI-COMPATIBIL",
        tts: "Text-to-Speech", speak: "Generează Voce", enterText: "Introdu textul pentru redare...",
        subnet: "Subnet Master", calculate: "Calculează", networkRange: "Gamă Rețea",
        broadcast: "Broadcast", usableHosts: "Host-uri Utilizabile", mask: "Mască Subnet",
        scraper: "Scraper", scrape: "Extrage", urlScraper: "URL Scraper", tgScraper: "Telegram Scraper",
        username: "Utilizator", bio: "Bio", subscribers: "Abonați/Membri",
        tracker: "Username Tracker", tracking: "Se caută...", track: "Începe Căutarea",
        dorking: "Dorking Studio", dork: "Generează Dork", dorkType: "Tip Dork",
        breach: "Verificare Leak", phone: "Căutare Telefon", checkBreach: "Verifică", lookup: "Caută",
        desc_passgen: "Generează parole securizate cu entropie ridicată.",
        desc_vault: "Criptare locală pentru fișierele tale sensibile.",
        desc_morse: "Tradu text în cod Morse cu impulsuri haptice.",
        desc_jailbreak: "Verifică dacă modelul și versiunea iOS pot fi jailbroken.",
        desc_crack: "Recuperează parole din hash-uri comune MD5/SHA.",
        desc_decision: "Lasă soarta să decidă cu un ban sau un zar rapid.",
        desc_rickroll: "Creează link-uri mascate pentru glume cu prietenii.",
        desc_qrgen: "Generează coduri QR de calitate pentru orice text sau link.",
        desc_textutils: "Transformă textul în stiluri speciale, Zalgo sau Leetspeak.",
        desc_speedtest: "Măsoară viteza internetului folosind servere de precizie.",
        desc_portscan: "Scanează un host pentru porturi de rețea deschise.",
        desc_inspector: "Analiză profundă a URL-urilor, inclusiv IP și server.",
        desc_domain: "Caută detalii DNS și înregistrare WHOIS.",
        desc_ipinfo: "Obține informații detaliate despre adresa ta IP curentă.",
        desc_audioConv: "Convertește fișiere audio sau video în MP3-uri de calitate.",
        desc_exif: "Elimină metadatele ascunse din poze pentru confidențialitate.",
        desc_metronome: "Metronom de precizie cu compensare a derivei temporale.",
        desc_tts: "Convertește textul în voce și îl trimite în DM.",
        desc_subnet: "Calculator profesional de IPv4 CIDR și Subnet.",
        desc_scraper: "Alege între extragere URL sau profil Telegram.",
        desc_tracker: "Caută un utilizator pe 10+ platforme sociale.",
        desc_dorking: "Interogări Google avansate pentru recunoaștere domeniu.",
        desc_breach: "Verifică dacă un email a fost expus în scurgeri de date.",
        desc_phone: "Extrage operatorul, regiunea și metadatele oricărui număr."
    }
};

// --- AUDIO ---
const sounds = {
    click: new Audio('assets/sfx/click.wav'),
    success: new Audio('assets/sfx/success.wav'),
    error: new Audio('assets/sfx/error.wav'),
    loading: new Audio('assets/sfx/loading.wav'),
    coin: new Audio('assets/sfx/coin.wav'),
    dice: new Audio('assets/sfx/dice.wav')
};
sounds.loading.loop = true;

function playSound(type) {
    if (!soundsEnabled) return;
    try {
        const s = sounds[type]; if (!s) return;
        if (type === 'loading') { s.currentTime = 0; s.play().catch(() => {}); }
        else { const clone = s.cloneNode(); clone.volume = 0.4; clone.play().catch(() => {}); }
    } catch(e) {}
}
function stopSound(type) { if (sounds[type]) { sounds[type].pause(); sounds[type].currentTime = 0; } }
function t(key) { return i18n[currentLang][key] || key; }

// --- THEME / NAV ---
function initTheme() {
    if (tg.colorScheme === 'dark' || !tg.colorScheme) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    updateThemeIcon();
}
function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) { icon.setAttribute('data-lucide', document.body.classList.contains('dark-mode') ? 'moon' : 'sun'); lucide.createIcons(); }
}
function toggleTheme() { playSound('click'); haptic.impactOccurred('light'); document.body.classList.toggle('dark-mode'); updateThemeIcon(); }
function switchLang() {
    playSound('click'); currentLang = currentLang === 'en' ? 'ro' : 'en';
    localStorage.setItem('toolkit_lang', currentLang); haptic.notificationOccurred('success');
    updateUIVocabulary(); renderSettings(); if (document.getElementById('view-media').style.display !== 'none') renderMediaTabs(false);
}
function toggleSounds() { soundsEnabled = !soundsEnabled; localStorage.setItem('toolkit_sounds', soundsEnabled); if (soundsEnabled) playSound('click'); haptic.impactOccurred('light'); renderSettings(); }

function switchView(viewId) {
    playSound('click'); haptic.impactOccurred('light');
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${viewId}`).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${viewId}`).classList.add('active');
    if (viewId === 'media') renderMediaTabs(false);
    if (viewId === 'settings') renderSettings();
    hideTool(); lucide.createIcons();
}

function hideTool() { 
    const existingDesc = document.querySelector('.tool-desc'); if (existingDesc) existingDesc.remove();
    document.getElementById('tool-container').style.display = 'none'; stopMetronome(); stopSound('loading'); isMorsePlaying = false; 
}

// --- CORE TOOLS LOGIC ---
function showTool(toolName) {
    playSound('click'); haptic.impactOccurred('medium');
    document.getElementById('tool-container').style.display = 'block';
    const content = document.getElementById('tool-content');
    const title = document.getElementById('tool-title');
    
    let descKey = `desc_${toolName}`;
    if (['password','vault','inspect','qrcode','scraper','tracker','dorking','breach','phone'].includes(toolName)) {
        if (toolName === 'password') descKey = 'desc_passgen';
        if (toolName === 'vault') descKey = 'desc_vault';
        if (toolName === 'inspect') descKey = 'desc_inspector';
        if (toolName === 'qrcode') descKey = 'desc_qrgen';
    }
    
    const existingDesc = document.querySelector('.tool-desc'); if (existingDesc) existingDesc.remove();
    const descEl = document.createElement('p'); descEl.className = 'tool-desc'; descEl.innerText = t(descKey);
    document.getElementById('tool-header').after(descEl);

    if (toolName === 'password') {
        title.innerText = t('passgen');
        content.innerHTML = `<div class="pass-box"><h2 id="password-display" style="color:var(--primary-color); word-break:break-all; min-height:1.2em; font-size:28px; margin-bottom:25px;">-</h2><div class="options-container"><div class="option-row"><label>${t('length')} <span id="length-val">12</span></label><input type="range" id="pass-length" min="6" max="32" value="12" oninput="document.getElementById('length-val').innerText=this.value; generateComplexPassword(true)"></div><div class="option-row"><label>${t('uppercase')}</label><input type="checkbox" id="pass-upper" checked onchange="generateComplexPassword(true)"></div><div class="option-row"><label>${t('numbers')}</label><input type="checkbox" id="pass-numbers" checked onchange="generateComplexPassword(true)"></div><div class="option-row"><label>${t('symbols')}</label><input type="checkbox" id="pass-symbols" checked onchange="generateComplexPassword(true)"></div></div><button class="tool-btn" style="justify-content:center;" onclick="generateComplexPassword(true)">${t('generate')}</button></div>`;
        generateComplexPassword(false);
    }
    else if (toolName === 'scraper') {
        title.innerText = t('scraper');
        content.innerHTML = `<div class="pass-box" style="display:flex; flex-direction:column; gap:15px;"><button class="tool-btn" style="justify-content:center; background:var(--secondary-bg);" onclick="setScrapeMode('url')"><i data-lucide="globe"></i> ${t('urlScraper')}</button><button class="tool-btn" style="justify-content:center; background:var(--secondary-bg);" onclick="setScrapeMode('tg')"><i data-lucide="send"></i> ${t('tgScraper')}</button><div id="scrape-ui-box"></div><div id="scrape-result"></div></div>`;
    }
    else if (toolName === 'breach') {
        title.innerText = t('breach');
        content.innerHTML = `<div class="pass-box"><input type="email" id="breach-email" class="text-input" placeholder="email@example.com"><button class="tool-btn" style="justify-content:center" onclick="runBreachChecker()">${t('checkBreach')}</button><div id="breach-result" style="margin-top:20px;"></div></div>`;
    }
    else if (toolName === 'phone') {
        title.innerText = t('phone');
        content.innerHTML = `<div class="pass-box"><input type="tel" id="phone-number" class="text-input" placeholder="+1234567890"><button class="tool-btn" style="justify-content:center" onclick="runPhoneLookup()">${t('lookup')}</button><div id="phone-result" style="margin-top:20px;"></div></div>`;
    }
    else if (toolName === 'tracker') {
        title.innerText = t('tracker');
        content.innerHTML = `<div class="pass-box"><input type="text" id="track-username" class="text-input" placeholder="Username..."><button class="tool-btn" style="justify-content:center" onclick="runTracker()">${t('track')}</button><div id="track-result" style="margin-top:20px;"></div></div>`;
    }
    else if (toolName === 'tts') {
        title.innerText = t('tts');
        content.innerHTML = `<div class="pass-box"><textarea id="tts-input" class="text-area" placeholder="${t('enterText')}"></textarea><select id="tts-lang" class="select-input"><option value="en">English</option><option value="ro">Română</option><option value="es">Español</option></select><button class="tool-btn" style="justify-content:center" onclick="runTTS()">${t('speak')}</button><div id="tts-status" style="margin-top:15px; text-align:center;"></div></div>`;
    }
    else if (toolName === 'decision') {
        title.innerText = t('decision');
        content.innerHTML = `<div class="pass-box" style="text-align:center;"><div id="decision-display" style="font-size:64px; margin:40px 0;">🎲</div><div class="util-grid"><button class="small-btn" onclick="runDecision('coin')">${t('coinFlip')}</button><button class="small-btn" onclick="runDecision('dice')">${t('diceRoll')}</button></div></div>`;
    }
    else if (toolName === 'vault') {
        title.innerText = t('secureVault');
        content.innerHTML = `<div class="pass-box"><div class="upload-box" onclick="document.getElementById('vault-file').click()"><i data-lucide="lock"></i><span id="vault-filename">${t('dropFile')}</span><input type="file" id="vault-file" style="display:none" onchange="handleVaultFile(this)"></div><input type="password" id="vault-pass" class="text-input" placeholder="${t('password')}"><div style="display:flex; gap:10px; margin-top:15px;"><button class="tool-btn" style="flex:1; justify-content:center;" onclick="processVault('encrypt')">${t('encrypt')}</button><button class="tool-btn" style="flex:1; justify-content:center;" onclick="processVault('decrypt')">${t('decrypt')}</button></div><div id="vault-status" style="margin-top:15px; text-align:center;"></div></div>`;
    }
    else if (toolName === 'subnet') {
        title.innerText = t('subnet');
        content.innerHTML = `<div class="pass-box"><div style="display:flex; gap:10px;"><input type="text" id="sub-ip" class="text-input" style="flex:3" placeholder="192.168.1.1"><input type="number" id="sub-prefix" class="text-input" style="flex:1" placeholder="24"></div><button class="tool-btn" style="justify-content:center" onclick="runSubnetCalc()">${t('calculate')}</button><div id="sub-result" style="margin-top:20px;"></div></div>`;
    }
    lucide.createIcons();
}

// --- MEDIA TAB LOGIC ---
function renderMediaTabs(shouldPlaySound = true) {
    if (shouldPlaySound) playSound('click');
    const container = document.getElementById('media-tabs-container');
    container.innerHTML = `<div class="tab-container"><button id="mtab-downs" class="tab-btn active" onclick="setMediaTab('downs')">${t('downloads')}</button><button id="mtab-conv" class="tab-btn" onclick="setMediaTab('conv')">${t('audioConv')}</button><button id="mtab-exif" class="tab-btn" onclick="setMediaTab('exif')">${t('exifStripper')}</button><button id="mtab-metro" class="tab-btn" onclick="setMediaTab('metro')">${t('metronome')}</button></div><div id="media-tab-content"></div>`;
    setMediaTab('downs', false);
}

function setMediaTab(tab, sound = true) {
    if (sound) playSound('click'); haptic.impactOccurred('light');
    const content = document.getElementById('media-tab-content');
    document.querySelectorAll('#media-tabs-container .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`mtab-${tab}`).classList.add('active');
    stopMetronome(); stopSound('loading');
    
    if (tab === 'downs') {
        content.innerHTML = `<div class="tab-container" style="background:none; border:1px solid var(--border-color); margin-top:10px;"><button onclick="showDownloaderUI('yt')" id="st-yt" class="tab-btn active">YT</button><button onclick="showDownloaderUI('ig')" id="st-ig" class="tab-btn">IG</button><button onclick="showDownloaderUI('tt')" id="st-tt" class="tab-btn">TT</button></div><div id="downloader-ui-box"></div>`;
        showDownloaderUI('yt', false);
    } else if (tab === 'conv') {
        content.innerHTML = `<div class="pass-box"><div class="upload-box" onclick="document.getElementById('audio-upload').click()"><i data-lucide="music"></i><span id="audio-filename">${t('selectFile')}</span><input type="file" id="audio-upload" style="display:none" onchange="handleAudioFile(this)"></div><button id="conv-btn" class="tool-btn" style="display:none; justify-content:center" onclick="startAudioConversion()">${t('convMp3')}</button><div id="conv-status"></div></div>`;
    } else if (tab === 'exif') {
        content.innerHTML = `<div class="pass-box"><div class="upload-box" onclick="document.getElementById('exif-upload').click()"><i data-lucide="image"></i><span id="exif-filename">${t('selectImage')}</span><input type="file" id="exif-upload" accept="image/*" style="display:none" onchange="handleExifFile(this)"></div><button id="exif-btn" class="tool-btn" style="display:none; justify-content:center" onclick="processExif()">${t('stripMetadata')}</button><div id="exif-status"></div></div>`;
    } else if (tab === 'metro') {
        content.innerHTML = `<div class="pass-box" style="text-align:center;"><div id="metro-circle" class="metro-circle" style="margin:20px auto;">${bpm}</div><input type="range" min="40" max="220" value="${bpm}" oninput="updateBPM(this.value)"><button id="metro-btn" class="tool-btn" style="justify-content:center" onclick="toggleMetronome()">Start</button></div>`;
    }
    lucide.createIcons();
}

// --- SUB-TOOLS LOGIC ---
function showDownloaderUI(type, sound = true) {
    if (sound) playSound('click');
    const box = document.getElementById('downloader-ui-box');
    document.querySelectorAll('#media-tab-content .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`st-${type}`).classList.add('active');
    box.innerHTML = `<div class="pass-box"><input type="text" id="media-url" class="text-input" placeholder="${type.toUpperCase()} Link"><button class="tool-btn" style="justify-content:center" onclick="processDownload('${type}')">Download</button><div id="dl-status"></div></div>`;
}

function generateComplexPassword(sound = true) {
    if (sound) playSound('click');
    const len = document.getElementById('pass-length').value;
    const upper = document.getElementById('pass-upper').checked;
    const nums = document.getElementById('pass-numbers').checked;
    const syms = document.getElementById('pass-symbols').checked;
    let chars = "abcdefghijklmnopqrstuvwxyz";
    if (upper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (nums) chars += "0123456789";
    if (syms) chars += "!@#$%^&*()_+";
    let pass = ""; for (let i = 0; i < len; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('password-display').innerText = pass;
}

function handleVaultFile(input) { if (input.files && input.files[0]) { document.getElementById('vault-filename').innerText = input.files[0].name; playSound('success'); } }
function handleAudioFile(input) { if (input.files && input.files[0]) { selectedAudioFile = input.files[0]; document.getElementById('audio-filename').innerText = selectedAudioFile.name; document.getElementById('conv-btn').style.display = 'flex'; playSound('success'); } }
function handleExifFile(input) { if (input.files && input.files[0]) { exifFile = input.files[0]; document.getElementById('exif-filename').innerText = exifFile.name; document.getElementById('exif-btn').style.display = 'flex'; playSound('success'); } }

async function runBreachChecker() {
    const email = document.getElementById('breach-email').value.trim(), resDiv = document.getElementById('breach-result'), chatId = tg.initDataUnsafe?.user?.id;
    if (!email) return; resDiv.innerHTML = `<p>${t('processing')}</p>`; playSound('loading');
    try {
        const res = await fetch(`/api/python_tools?tool=email_breach&email=${encodeURIComponent(email)}${chatId ? `&chatId=${chatId}` : ''}`);
        const data = await res.json(); stopSound('loading');
        if (data.success) {
            resDiv.innerHTML = `<p style="color:#34c759; font-weight:800;">${t('sentChat')}</p><p style="font-size:13px; margin-top:5px;">Check DM for full leak intelligence report.</p>`;
            playSound('success'); haptic.notificationOccurred('success');
        } else throw new Error();
    } catch(e) { stopSound('loading'); resDiv.innerHTML = `<p style="color:#ff3b30">${t('failed')}</p>`; playSound('error'); }
}

async function runPhoneLookup() {
    const num = document.getElementById('phone-number').value.trim(), resDiv = document.getElementById('phone-result'), chatId = tg.initDataUnsafe?.user?.id;
    if (!num) return; resDiv.innerHTML = `<p>${t('processing')}</p>`; playSound('loading');
    try {
        const res = await fetch(`/api/python_tools?tool=phone_lookup&number=${encodeURIComponent(num)}${chatId ? `&chatId=${chatId}` : ''}`);
        const data = await res.json(); stopSound('loading');
        if (data.success) {
            resDiv.innerHTML = `<div class="settings-group"><div class="settings-cell"><span class="settings-label">Region</span><span>${data.region}</span></div><div class="settings-cell"><span class="settings-label">Carrier</span><span>${data.carrier}</span></div></div><p style="color:#34c759; font-size:12px; margin-top:5px;">${t('sentChat')}</p>`;
            playSound('success'); haptic.notificationOccurred('success');
        } else throw new Error();
    } catch(e) { stopSound('loading'); resDiv.innerHTML = `<p style="color:#ff3b30">${t('failed')}</p>`; playSound('error'); }
}

async function runTTS() {
    const text = document.getElementById('tts-input').value.trim(), lang = document.getElementById('tts-lang').value, status = document.getElementById('tts-status'), chatId = tg.initDataUnsafe?.user?.id;
    if (!text) return; status.innerText = "⏳ " + t('processing'); playSound('loading');
    try {
        const res = await fetch(`/api/python_tools?tool=tts&text=${encodeURIComponent(text)}&lang=${lang}${chatId ? `&chatId=${chatId}` : ''}`);
        const data = await res.json(); stopSound('loading');
        if (data.success) { status.innerHTML = `<span style="color:#34c759;">${t('sentChat')}</span>`; playSound('success'); haptic.notificationOccurred('success'); }
        else throw new Error();
    } catch(e) { stopSound('loading'); status.innerHTML = `<span style="color:#ff3b30;">${t('failed')}</span>`; playSound('error'); }
}

async function runURLScraper() {
    const url = document.getElementById('scrape-url-input').value.trim(), resDiv = document.getElementById('scrape-result'), chatId = tg.initDataUnsafe?.user?.id;
    if (!url) return; resDiv.innerHTML = `<p>${t('processing')}</p>`; playSound('loading');
    try {
        const res = await fetch(`/api/python_tools?tool=scrape&url=${encodeURIComponent(url)}${chatId ? `&chatId=${chatId}` : ''}`);
        const data = await res.json(); stopSound('loading');
        if (data.success) { resDiv.innerHTML = `<p style="color:#34c759;">${t('sentChat')}</p>`; playSound('success'); haptic.notificationOccurred('success'); }
        else throw new Error();
    } catch(e) { stopSound('loading'); resDiv.innerHTML = `<p style="color:#ff3b30;">${t('failed')}</p>`; playSound('error'); }
}

async function runTGScraper() {
    const user = document.getElementById('scrape-tg-user').value.trim(), resDiv = document.getElementById('scrape-result'), chatId = tg.initDataUnsafe?.user?.id;
    if (!user) return; resDiv.innerHTML = `<p>${t('processing')}</p>`; playSound('loading');
    try {
        const res = await fetch(`/api/python_tools?tool=tg_scrape&username=${encodeURIComponent(user)}${chatId ? `&chatId=${chatId}` : ''}`);
        const data = await res.json(); stopSound('loading');
        if (data.success) { resDiv.innerHTML = `<p style="color:#34c759;">${t('sentChat')}</p>`; playSound('success'); haptic.notificationOccurred('success'); }
        else throw new Error();
    } catch(e) { stopSound('loading'); resDiv.innerHTML = `<p style="color:#ff3b30;">${t('failed')}</p>`; playSound('error'); }
}

async function runTracker() {
    const user = document.getElementById('track-username').value.trim(), resDiv = document.getElementById('track-result'), chatId = tg.initDataUnsafe?.user?.id;
    if (!user) return; resDiv.innerHTML = `<p>${t('tracking')}</p>`; playSound('loading');
    try {
        const res = await fetch(`/api/python_tools?tool=track_user&username=${encodeURIComponent(user)}${chatId ? `&chatId=${chatId}` : ''}`);
        const data = await res.json(); stopSound('loading');
        if (data.success) { resDiv.innerHTML = `<p style="color:#34c759;">${t('sentChat')}</p>`; playSound('success'); haptic.notificationOccurred('success'); }
        else throw new Error();
    } catch(e) { stopSound('loading'); resDiv.innerHTML = `<p style="color:#ff3b30;">${t('failed')}</p>`; playSound('error'); }
}

function setScrapeMode(mode, sound = true) {
    if (sound) playSound('click'); haptic.impactOccurred('light');
    const box = document.getElementById('scrape-ui-box'); document.getElementById('scrape-result').innerHTML = "";
    if (mode === 'url') box.innerHTML = `<input type="text" id="scrape-url-input" class="text-input" placeholder="https://..."><button class="tool-btn" style="justify-content:center" onclick="runURLScraper()">${t('scrape')}</button>`;
    else box.innerHTML = `<input type="text" id="scrape-tg-user" class="text-input" placeholder="@username"><button class="tool-btn" style="justify-content:center" onclick="runTGScraper()">${t('scrape')}</button>`;
    lucide.createIcons();
}

async function processDownload(type) {
    const url = document.getElementById('media-url').value.trim(), status = document.getElementById('dl-status'); if (!url) return;
    status.innerText = "⏳ " + t('processing'); playSound('loading');
    try {
        const res = await fetch(`/api/media?type=${type}&url=${encodeURIComponent(url)}`), data = await res.json(); stopSound('loading');
        if (data.success) { const a = document.createElement('a'); a.href = data.url; a.download = data.title || 'media'; document.body.appendChild(a); a.click(); a.remove(); status.innerHTML = `<span style="color:#34c759;">${t('success')}</span>`; playSound('success'); }
        else throw new Error();
    } catch(e) { stopSound('loading'); status.innerHTML = `<span style="color:#ff3b30;">${t('failed')}</span>`; playSound('error'); }
}

async function runDecision(type) {
    const display = document.getElementById('decision-display'), icons = type === 'coin' ? ['🌑', '🌕'] : ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    let delay = 50;
    for (let i = 0; i < 15; i++) {
        display.innerText = icons[Math.floor(Math.random() * icons.length)];
        haptic.impactOccurred('light'); playSound(type); await new Promise(r => setTimeout(r, delay)); delay += 20;
    }
    const result = type === 'coin' ? (Math.random() > 0.5 ? t('heads') : t('tails')) : (Math.floor(Math.random() * 6) + 1);
    display.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px;"><span style="font-size:80px">${type === 'coin' ? (result === t('heads') ? '🌕' : '🌑') : icons[result-1]}</span><span style="font-size:24px; font-weight:800; color:var(--primary-color)">${result}</span></div>`;
    haptic.notificationOccurred('success'); playSound('success');
}

function renderSettings() {
    const container = document.getElementById('settings-content'); if (!container) return;
    container.innerHTML = `<div class="settings-group"><div class="settings-cell"><span class="settings-label">${t('darkMode')}</span><input type="checkbox" ${document.body.classList.contains('dark-mode') ? 'checked' : ''} onchange="toggleTheme()"></div><div class="settings-cell"><span class="settings-label">${t('soundEffects')}</span><input type="checkbox" ${soundsEnabled ? 'checked' : ''} onchange="toggleSounds()"></div><div class="settings-cell" onclick="switchLang()"><span class="settings-label">${t('language')}</span><span style="color:var(--primary-color); font-weight:600;">${currentLang === 'en' ? 'English' : 'Română'}</span></div></div><div class="settings-group"><div class="settings-cell" onclick="tg.close()"><span class="settings-label" style="color:#ff3b30">${t('closeApp')}</span></div></div><p style="font-size:12px; color:var(--secondary-text); text-align:center;">Toolkit Bot v2.8 • [⌬]</p>`;
}

function updateUIVocabulary() {
    const keys = ['tools', 'network', 'media', 'settings'];
    keys.forEach(k => { const nav = document.querySelector(`#nav-${k} span`); if (nav) nav.innerText = t(k); const hdr = document.getElementById(`header-${k}`); if (hdr) hdr.innerText = t(k); });
    const menuTools = document.getElementById('menu-tools'), menuNet = document.getElementById('menu-network');
    if (menuTools) { const btnMap = { 'password': 'passgen', 'vault': 'secureVault', 'morse': 'morse', 'tts': 'tts', 'jailbreak': 'jailbreak', 'crack': 'crack', 'decision': 'decision', 'rickroll': 'rickroll', 'qrcode': 'qrgen', 'textutils': 'textutils' }; for (const btn of menuTools.querySelectorAll('button')) { const onclick = btn.getAttribute('onclick'); if (onclick) { const match = onclick.match(/'([^']+)'/); if (match) { const toolId = match[1]; const key = btnMap[toolId]; if (key) { const icon = btn.querySelector('i').outerHTML; btn.innerHTML = `${icon} ${t(key)}`; } } } } }
    if (menuNet) { const netMap = { 'speedtest': 'speedtest', 'portscan': 'portscan', 'subnet': 'subnet', 'scraper': 'scraper', 'tracker': 'tracker', 'breach': 'breach', 'phone': 'phone', 'inspect': 'inspector', 'domain': 'domain', 'ipinfo': 'ipinfo' }; for (const btn of menuNet.querySelectorAll('button')) { const onclick = btn.getAttribute('onclick'); if (onclick) { const match = onclick.match(/'([^']+)'/); if (match) { const toolId = match[1]; const key = netMap[toolId]; if (key) { const icon = btn.querySelector('i').outerHTML; btn.innerHTML = `${icon} ${t(key)}`; } } } } }
    lucide.createIcons();
}

function stopMetronome() { isMetronomeRunning = false; if (metronomeInterval) clearTimeout(metronomeInterval); }
function toggleMetronome() { /* Placeholder */ }
function updateBPM(v) { bpm = v; }

initTheme();
switchView('tools');
updateUIVocabulary();
