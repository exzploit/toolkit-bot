const tg = window.Telegram.WebApp;
const haptic = tg.HapticFeedback;
tg.expand();

let currentLang = localStorage.getItem('toolkit_lang') || 'en';
let soundsEnabled = localStorage.getItem('toolkit_sounds') !== 'false';
let metronomeInterval = null;
let isMetronomeRunning = false;
let bpm = 120;
let speedTestController = null;

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
        desc_metronome: "Rock-solid precision metronome with drift compensation."
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
        desc_metronome: "Metronom de precizie cu compensare a derivei temporale."
    }
};

const morseDict = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
    'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
    'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
    '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': ' '
};

const unicodeStyles = {
    bold: { a: '𝐚', A: '𝐀', '0': '𝟎' },
    italic: { a: '𝑎', A: '𝑨', '0': '0' },
    script: { a: '𝒶', A: '𝒜', '0': '0' },
    gothic: { a: '𝔞', A: '𝔄', '0': '0' },
    leetspeak: { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', b: '8', g: '9' },
    flipped: "ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnuʌʍxʎzⱯᗺƆᗡƎℲ⅁HIſʞ˥WNOԀΌᴚS⊥∩ΛMX⅄Z0ƖᄅƐㄣϛ9ㄥ86"
};

const sounds = {
    click: new Audio('assets/sfx/click.wav'),
    success: new Audio('assets/sfx/success.wav'),
    error: new Audio('assets/sfx/error.wav'),
    loading: new Audio('assets/sfx/loading.wav')
};
sounds.loading.loop = true;

let audioContextUnlocked = false;
function unlockAudioContext() {
    if (audioContextUnlocked) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        const ctx = new AudioContext();
        ctx.resume().then(() => audioContextUnlocked = true);
    }
}

function playSound(type) {
    if (!soundsEnabled) return;
    unlockAudioContext();
    try {
        const s = sounds[type];
        if (!s) return;
        if (type === 'loading') { s.currentTime = 0; s.play().catch(() => {}); }
        else { const clone = s.cloneNode(); clone.volume = 0.4; clone.play().catch(() => {}); }
    } catch(e) {}
}

function stopSound(type) { if (sounds[type]) { sounds[type].pause(); sounds[type].currentTime = 0; } }
function t(key) { return i18n[currentLang][key] || key; }

function initTheme() {
    if (tg.colorScheme === 'dark') document.body.classList.add('dark-mode');
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

function updateUIVocabulary() {
    const keys = ['tools', 'network', 'media', 'settings'];
    keys.forEach(k => {
        const nav = document.querySelector(`#nav-${k} span`); if (nav) nav.innerText = t(k);
        const hdr = document.getElementById(`header-${k}`); if (hdr) hdr.innerText = t(k);
    });
    const toolsMenu = document.getElementById('menu-tools');
    if (toolsMenu) {
        const icons = ['shield-check', 'lock', 'binary', 'zap', 'unlock', 'help-circle', 'frown', 'qr-code', 'type'];
        const toolKeys = ['passgen', 'secureVault', 'morse', 'jailbreak', 'crack', 'decision', 'rickroll', 'qrgen', 'textutils'];
        toolsMenu.innerHTML = toolKeys.map((k, i) => `<button class="tool-btn" onclick="showTool('${k === 'passgen' ? 'password' : (k === 'secureVault' ? 'vault' : (k === 'morse' ? 'morse' : (k === 'jailbreak' ? 'jailbreak' : (k === 'crack' ? 'crack' : (k === 'decision' ? 'decision' : (k === 'rickroll' ? 'rickroll' : (k === 'qrgen' ? 'qrcode' : 'textutils')))))))}')"><i data-lucide="${icons[i]}"></i> ${t(k)}</button>`).join('');
    }
    const netMenu = document.getElementById('menu-network');
    if (netMenu) {
        const netIcons = ['zap', 'search-code', 'shield-search', 'globe', 'map-pin'];
        const netKeys = ['speedtest', 'portscan', 'inspector', 'domain', 'ipinfo'];
        netMenu.innerHTML = netKeys.map((k, i) => `<button class="tool-btn" onclick="showTool('${k === 'speedtest' ? 'speedtest' : (k === 'portscan' ? 'portscan' : (k === 'inspector' ? 'inspect' : (k === 'domain' ? 'domain' : 'ipinfo')))}')"><i data-lucide="${netIcons[i]}"></i> ${t(k)}</button>`).join('');
    }
    lucide.createIcons();
}

function switchView(viewId) {
    playSound('click'); haptic.impactOccurred('light');
    if (speedTestController) { speedTestController.abort(); speedTestController = null; stopSound('loading'); }
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${viewId}`).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${viewId}`).classList.add('active');
    if (viewId === 'media') renderMediaTabs(false);
    if (viewId === 'settings') renderSettings();
    hideTool(); lucide.createIcons();
}

function showTool(toolName) {
    playSound('click'); haptic.impactOccurred('medium');
    document.getElementById('tool-container').style.display = 'block';
    const content = document.getElementById('tool-content');
    const title = document.getElementById('tool-title');
    
    let descKey = `desc_${toolName}`;
    if (toolName === 'password') descKey = 'desc_passgen';
    if (toolName === 'vault') descKey = 'desc_vault';
    if (toolName === 'inspect') descKey = 'desc_inspector';
    if (toolName === 'qrcode') descKey = 'desc_qrgen';
    
    const desc = t(descKey);
    const existingDesc = document.querySelector('.tool-desc');
    if (existingDesc) existingDesc.remove();
    
    const descEl = document.createElement('p');
    descEl.className = 'tool-desc';
    descEl.innerText = desc;
    document.getElementById('tool-header').after(descEl);

    if (toolName === 'speedtest') {
        title.innerText = t('speedtest');
        content.innerHTML = `<div class="pass-box" style="padding-top: 10px;">
            <div id="meta-info" style="font-size: 13px; color: var(--secondary-text); margin-bottom: 15px; height: 20px;">${t('systemReady')}</div>
            <div class="speed-gauge"><span id="speed-display" class="speed-value">0.0</span><span class="speed-unit">Mbps</span></div>
            <div id="test-status" style="color: var(--secondary-text); font-size: 14px; font-weight: 600; margin-bottom: 10px;">${t('standby')}</div>
            <div class="progress-container"><div id="progress-bar" class="progress-bar" style="width:0%"></div></div>
            <div class="stats-grid">
                <div class="stat-card"><span class="stat-label">${t('latency')}</span><span id="ping-display" class="stat-value">--</span></div>
                <div class="stat-card"><span class="stat-label">${t('jitter')}</span><span id="jitter-display" class="stat-value">--</span></div>
                <div class="stat-card"><span class="stat-label">${t('download')}</span><span id="download-display" class="stat-value">--</span></div>
                <div class="stat-card"><span class="stat-label">${t('upload')}</span><span id="upload-display" class="stat-value">--</span></div>
            </div>
            <button class="tool-btn" id="start-test-btn" style="margin-top:30px; justify-content:center;" onclick="runSpeedTest()">${t('startTest')}</button>
        </div>`;
    }

    if (toolName === 'jailbreak') {
        title.innerText = t('jailbreak');
        content.innerHTML = `<div class="pass-box">
            <select id="jb-model" class="select-input">
                <option value="" disabled selected>${t('selectModel')}</option>
                <optgroup label="A12+ (Newer)">
                    <option value="a12">iPhone XR / XS / XS Max</option>
                    <option value="a13">iPhone 11 Series / SE 2</option>
                    <option value="a14">iPhone 12 Series</option>
                    <option value="a15">iPhone 13 Series / 14 / SE 3</option>
                    <option value="a16">iPhone 14 Pro / 15 Series</option>
                </optgroup>
                <optgroup label="A8-A11 (Legacy)">
                    <option value="a11">iPhone 8 / 8 Plus / X</option>
                    <option value="a10">iPhone 7 / 7 Plus</option>
                    <option value="a9">iPhone 6S / 6S Plus / SE 1</option>
                </optgroup>
            </select>
            <select id="jb-version" class="select-input">
                <option value="" disabled selected>${t('selectOS')}</option>
                <option value="17.0">iOS 17.0</option>
                <option value="16.6">iOS 16.0 - 16.6.1</option>
                <option value="15.4">iOS 15.0 - 15.4.1</option>
                <option value="14.8">iOS 14.0 - 14.8</option>
                <option value="legacy">iOS 13.7 & Below</option>
            </select>
            <button class="tool-btn" style="justify-content:center" onclick="checkJailbreak()">${t('check')}</button>
            <div id="jb-result" style="margin-top:20px;"></div>
        </div>`;
    }

    if (toolName === 'crack') {
        title.innerText = t('crack');
        content.innerHTML = `<div class="pass-box">
            <input type="text" id="hash-input" class="text-input" placeholder="${t('enterHash')}">
            <select id="hash-type" class="select-input">
                <option value="md5">MD5</option>
                <option value="sha1">SHA-1</option>
                <option value="sha256">SHA-256</option>
            </select>
            <button class="tool-btn" style="justify-content:center" onclick="runHashCracker()">${t('crack')}</button>
            <div id="crack-result" style="margin-top:20px; text-align:center; font-weight:800; font-size:24px; color:var(--primary-color)"></div>
        </div>`;
    }

    if (toolName === 'decision') {
        title.innerText = t('decision');
        content.innerHTML = `<div class="pass-box" style="text-align:center;">
            <div id="decision-display" style="font-size:64px; margin:40px 0; min-height:80px; display:flex; align-items:center; justify-content:center;">🎲</div>
            <div class="util-grid">
                <button class="small-btn" onclick="runDecision('coin')"><i data-lucide="circle"></i> ${t('coinFlip')}</button>
                <button class="small-btn" onclick="runDecision('dice')"><i data-lucide="dice-5"></i> ${t('diceRoll')}</button>
            </div>
        </div>`;
    }

    if (toolName === 'inspect') {
        title.innerText = t('inspector');
        content.innerHTML = `<div class="pass-box">
            <input type="text" id="inspect-url" class="text-input" placeholder="https://example.com">
            <button class="tool-btn" style="justify-content:center" onclick="runURLInspector()">${t('generate')}</button>
            <div id="inspect-results" style="margin-top:20px;"></div>
        </div>`;
    }

    if (toolName === 'morse') {
        title.innerText = t('morse');
        content.innerHTML = `<div class="pass-box">
            <div class="tab-container" style="margin-bottom:15px;">
                <button id="morse-encode-tab" class="tab-btn active" onclick="setMorseMode('encode')">${t('encode')}</button>
                <button id="morse-decode-tab" class="tab-btn" onclick="setMorseMode('decode')">${t('decode')}</button>
            </div>
            <textarea id="morse-input" class="text-area" placeholder="Enter text..." oninput="updateMorse()"></textarea>
            <div id="morse-output" style="background:var(--progress-bg); padding:15px; border-radius:12px; min-height:60px; font-family:monospace; font-size:18px; word-break:break-all; margin-bottom:15px; letter-spacing:2px;"></div>
            <button class="tool-btn" id="morse-play-btn" style="justify-content:center" onclick="playMorseHaptics()"><i data-lucide="vibrate"></i> ${t('play')}</button>
        </div>`;
    }

    if (toolName === 'textutils') {
        title.innerText = t('textutils');
        content.innerHTML = `<div class="pass-box">
            <textarea id="text-input" class="text-area" placeholder="Enter text..." oninput="updateTextStats()"></textarea>
            <div id="text-stats" class="stats-info"></div>
            <div class="util-grid" style="margin-bottom:15px;">
                <button class="small-btn" onclick="processText('upper')">${t('upper')}</button>
                <button class="small-btn" onclick="processText('lower')">${t('lower')}</button>
                <button class="small-btn" onclick="processText('title')">${t('title')}</button>
                <button class="small-btn" onclick="processText('clear')" style="color:#ff3b30">${t('clear')}</button>
            </div>
            <div style="border-top: 1px solid var(--border-color); padding-top: 20px; margin-top: 10px;">
                <div style="margin-bottom:15px;">
                    <select id="unicode-mode" class="select-input" onchange="toggleZalgoSlider(this.value)">
                        <option value="bold">Bold Serif</option>
                        <option value="italic">Italic Serif</option>
                        <option value="script">Script Style</option>
                        <option value="gothic">Gothic Style</option>
                        <option value="leetspeak">Leetspeak</option>
                        <option value="flipped">Flipped text</option>
                        <option value="glitch">Glitch (Zalgo)</option>
                    </select>
                </div>
                <div id="zalgo-control" style="display:none; margin-bottom:15px;">
                    <label style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; margin-bottom:8px;">${t('intensity')} <span id="zalgo-val">3</span></label>
                    <input type="range" id="zalgo-intensity" min="1" max="15" value="3" oninput="document.getElementById('zalgo-val').innerText=this.value">
                </div>
                <button class="tool-btn" style="justify-content:center; background:var(--primary-color); color:white; border:none;" onclick="transformUnicode()">${t('transform')}</button>
                <button class="tool-btn" style="justify-content:center; background:var(--secondary-bg); font-size:14px; height:45px; margin-top:10px;" onclick="generateInvisibleText()">
                    <i data-lucide="ghost"></i> ${t('invisibleText')}
                </button>
            </div>
        </div>`;
    }
    
    if (toolName === 'rickroll') {
        title.innerText = t('rickroll');
        content.innerHTML = `<div class="pass-box">
            <input type="text" id="rick-alias" class="text-input" placeholder="e.g. Free Nitro">
            <select id="rick-type" class="select-input"><option value="youtube">YouTube</option><option value="spotify">Spotify</option><option value="tiktok">TikTok</option></select>
            <button class="tool-btn" style="justify-content:center" onclick="generateRickroll()">${t('generate')}</button>
            <div id="rick-result" style="display:none"><div class="rick-preview" id="rick-url"></div><button class="tool-btn" style="justify-content:center" onclick="copyRickroll()"><i data-lucide="copy"></i> ${t('copy')}</button></div>
        </div>`;
    }

    if (toolName === 'vault') {
        title.innerText = t('secureVault');
        content.innerHTML = `<div class="pass-box">
            <div class="upload-box" onclick="document.getElementById('vault-file').click()"><i data-lucide="file-lock-2" style="width:32px; height:32px; margin-bottom:10px; color:var(--primary-color)"></i><span id="vault-filename" style="display:block; font-weight:600">${t('dropFile')}</span><input type="file" id="vault-file" style="display:none" onchange="handleVaultFile(this)"></div>
            <input type="password" id="vault-pass" class="text-input" placeholder="${t('password')}">
            <div style="display:flex; gap:10px; margin-top:15px;"><button class="tool-btn" style="justify-content:center; flex:1;" onclick="processVault('encrypt')"><i data-lucide="lock"></i> ${t('encrypt')}</button><button class="tool-btn" style="justify-content:center; flex:1;" onclick="processVault('decrypt')"><i data-lucide="unlock"></i> ${t('decrypt')}</button></div>
            <div id="vault-status" style="margin-top:15px; text-align:center; font-weight:600;"></div>
        </div>`;
    }

    if (toolName === 'password') {
        title.innerText = t('passgen');
        content.innerHTML = `<div class="pass-box"><h2 id="password-display" style="color: var(--primary-color); word-break: break-all; min-height: 1.2em; font-size: 28px; margin-bottom: 25px;">-</h2><div class="options-container"><div class="option-row"><label>${t('length')} <span id="length-val">12</span></label><input type="range" id="pass-length" min="6" max="32" value="12" oninput="document.getElementById('length-val').innerText=this.value; generateComplexPassword(true)"></div><div class="option-row"><label>${t('uppercase')}</label><input type="checkbox" id="pass-upper" checked onchange="generateComplexPassword(true)"></div><div class="option-row"><label>${t('numbers')}</label><input type="checkbox" id="pass-numbers" checked onchange="generateComplexPassword(true)"></div><div class="option-row"><label>${t('symbols')}</label><input type="checkbox" id="pass-symbols" checked onchange="generateComplexPassword(true)"></div></div><button class="tool-btn" style="justify-content:center;" onclick="generateComplexPassword(true)">${t('generate')}</button></div>`;
        generateComplexPassword(false);
    }

    if (toolName === 'ipinfo') {
        title.innerText = t('ipinfo'); content.innerHTML = `<div id="loading-spinner" style="padding: 20px;">${t('query')}</div>`;
        fetch('https://ipapi.co/json/').then(r => r.json()).then(data => { haptic.notificationOccurred('success'); content.innerHTML = `<div class="stats-grid"><div class="stat-card" style="grid-column: span 2;"><span class="stat-label">IPv4 Address</span><span class="stat-value">${data.ip}</span></div><div class="stat-card" style="grid-column: span 2;"><span class="stat-label">${t('provider')}</span><span class="stat-value">${data.org}</span></div></div>`; }).catch(() => haptic.notificationOccurred('error'));
    }
    
    if (toolName === 'domain') {
        title.innerText = t('domain');
        content.innerHTML = `<div class="pass-box"><input type="text" id="dom-url" class="text-input" placeholder="example.com"><button class="tool-btn" style="justify-content:center;" onclick="lookupDomain()">Lookup</button><div id="dom-result" style="margin-top:20px;"></div></div>`;
    }
    if (toolName === 'qrcode') {
        title.innerText = t('qrgen');
        content.innerHTML = `<div class="pass-box" style="text-align:center;"><input type="text" id="qr-input" class="text-input" placeholder="Text..." oninput="updateQR()"><div class="qr-container" id="qr-result" style="margin: 20px auto; display:block; width:fit-content;"><p style="font-size: 14px; color: var(--secondary-text); padding: 40px;">Waiting...</p></div><button id="download-qr" class="tool-btn" style="display:none; justify-content:center;" onclick="downloadQR()">Save PNG</button></div>`;
    }
    lucide.createIcons();
}

function checkJailbreak() {
    const model = document.getElementById('jb-model').value;
    const version = document.getElementById('jb-version').value;
    const resDiv = document.getElementById('jb-result');
    if (!model || !version) return;
    
    let status = t('incompatible'), color = '#ff3b30', tool = 'N/A', url = '#';
    const legacyA = ['a9', 'a10', 'a11'];

    if (legacyA.includes(model)) {
        status = t('compatible'); color = '#34c759'; tool = 'Palera1n'; url = 'https://palera.in';
    } else if (version === '15.4' || (version === '16.6' && model !== 'a16')) {
        status = t('compatible'); color = '#34c759'; tool = 'Dopamine'; url = 'https://ellekit.space/dopamine/';
    } else if (version === '14.8') {
        status = t('compatible'); color = '#34c759'; tool = 'unc0ver / Taurine'; url = 'https://unc0ver.dev';
    } else if (version === 'legacy') {
        status = t('compatible'); color = '#34c759'; tool = 'Checkra1n / Odyssey'; url = 'https://checkra.in';
    } else if (version === '17.0') {
        status = t('partial'); color = '#ffcc00'; tool = 'Misaka (Exploit Only)'; url = 'https://github.com/straight-tamago/misaka';
    }

    resDiv.innerHTML = `
        <div class="settings-group" style="border-color:${color}44">
            <div class="settings-cell"><span class="settings-label">Status</span><span style="color:${color}; font-weight:900">${status}</span></div>
            <div class="settings-cell"><span class="settings-label">Recommended Tool</span><span style="font-weight:600">${tool}</span></div>
        </div>
        ${tool !== 'N/A' ? `<a href="${url}" target="_blank" class="tool-btn" style="margin-top:15px; text-decoration:none; justify-content:center; background:var(--secondary-bg)">Get ${tool}</a>` : ''}
    `;
    playSound(color === '#ff3b30' ? 'error' : 'success');
    haptic.notificationOccurred(color === '#ff3b30' ? 'error' : 'success');
}

async function runHashCracker() {
    const hash = document.getElementById('hash-input').value.trim();
    const type = document.getElementById('hash-type').value;
    const resultDiv = document.getElementById('crack-result'); if (!hash) return;
    resultDiv.innerText = t('cracking'); playSound('loading');
    try {
        const res = await fetch(`/api/crack?hash=${hash}&type=${type}`);
        const data = await res.json(); stopSound('loading');
        if (data.success) { resultDiv.innerText = data.password; playSound('success'); haptic.notificationOccurred('success'); }
        else { resultDiv.innerText = t('notFound'); playSound('error'); haptic.notificationOccurred('error'); }
    } catch(e) { stopSound('loading'); resultDiv.innerText = t('failed'); playSound('error'); }
}

async function runDecision(type) {
    const display = document.getElementById('decision-display');
    const icons = type === 'coin' ? ['🌑', '🌕'] : ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    let delay = 50;
    for (let i = 0; i < 15; i++) {
        display.innerText = icons[Math.floor(Math.random() * icons.length)];
        haptic.impactOccurred('light'); playSound('click');
        await new Promise(r => setTimeout(r, delay)); delay += 20;
    }
    const result = type === 'coin' ? (Math.random() > 0.5 ? t('heads') : t('tails')) : (Math.floor(Math.random() * 6) + 1);
    display.innerHTML = `<div style="display:flex; flex-direction:column; gap:10px;"><span style="font-size:80px">${type === 'coin' ? (result === t('heads') ? '🌕' : '🌑') : icons[result-1]}</span><span style="font-size:24px; font-weight:800; color:var(--primary-color)">${result}</span></div>`;
    haptic.notificationOccurred('success'); playSound('success');
}

let morseMode = 'encode';
function setMorseMode(mode) {
    morseMode = mode;
    document.getElementById('morse-encode-tab').classList.toggle('active', mode === 'encode');
    document.getElementById('morse-decode-tab').classList.toggle('active', mode === 'decode');
    document.getElementById('morse-play-btn').style.display = mode === 'encode' ? 'flex' : 'none';
    document.getElementById('morse-input').value = ""; document.getElementById('morse-output').innerText = ""; playSound('click');
}

function updateMorse() {
    const input = document.getElementById('morse-input').value.trim(), output = document.getElementById('morse-output');
    if (morseMode === 'encode') {
        let res = ""; for (let char of input.toUpperCase()) res += (morseDict[char] || "") + " ";
        output.innerText = res.trim();
    } else {
        const revDict = Object.fromEntries(Object.entries(morseDict).map(([k,v]) => [v,k]));
        output.innerText = input.split(' ').map(c => revDict[c] || '?').join('');
    }
}

async function runURLInspector() {
    const url = document.getElementById('inspect-url').value.trim(), resultDiv = document.getElementById('inspect-results'); if (!url) return;
    resultDiv.innerHTML = `<p>${t('inspecting')}</p>`; playSound('loading');
    try {
        const res = await fetch(`/api/inspect?url=${encodeURIComponent(url)}`), data = await res.json(); stopSound('loading');
        if (data.success) {
            resultDiv.innerHTML = `<div class="settings-group"><div class="settings-cell"><span class="settings-label">IP Address</span><span style="font-weight:600">${data.ip}</span></div><div class="settings-cell"><span class="settings-label">Response</span><span style="font-weight:600">${data.response_time}ms</span></div><div class="settings-cell"><span class="settings-label">Server</span><span style="font-weight:600">${data.server}</span></div><div class="settings-cell"><span class="settings-label">Security</span><span style="color:${data.is_secure ? '#34c759' : '#ff3b30'}; font-weight:800">${data.is_secure ? t('secure') : t('insecure')}</span></div></div><p style="font-size:13px; color:var(--secondary-text); margin-top:10px;">${data.title}</p>`;
            playSound('success'); haptic.notificationOccurred('success');
        } else throw new Error();
    } catch(e) { stopSound('loading'); resultDiv.innerHTML = `<p style="color:#ff3b30">${t('failed')}</p>`; playSound('error'); haptic.notificationOccurred('error'); }
}

function toggleZalgoSlider(val) { document.getElementById('zalgo-control').style.display = (val === 'glitch') ? 'block' : 'none'; }

function transformUnicode() {
    const input = document.getElementById('text-input'), mode = document.getElementById('unicode-mode').value; if (!input || !input.value) return;
    let text = input.value, res = "";
    if (mode === 'glitch') {
        const chars = "̀́̂̃̄̅̆̇̈̉̊̋̌̍̎̏̐̑̒̓̔̽̾̿̀́͂̓͋引领", intensity = parseInt(document.getElementById('zalgo-intensity').value);
        for (let c of text) { res += c; for (let i = 0; i < intensity; i++) res += chars[Math.floor(Math.random() * chars.length)]; }
    } else if (mode === 'leetspeak') {
        for (let c of text.toLowerCase()) res += unicodeStyles.leetspeak[c] || c;
    } else if (mode === 'flipped') {
        const normal = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", reversed = unicodeStyles.flipped;
        for (let c of text) { const idx = normal.indexOf(c); res = (idx !== -1 ? reversed[idx] : c) + res; }
    } else {
        const mapping = unicodeStyles[mode];
        for (let c of text) {
            const code = c.charCodeAt(0);
            if (c >= 'a' && c <= 'z') res += String.fromCodePoint(mapping.a.codePointAt(0) + (code - 97));
            else if (c >= 'A' && c <= 'Z') res += String.fromCodePoint(mapping.A.codePointAt(0) + (code - 65));
            else if (c >= '0' && c <= '9') res += (mapping['0'] !== '0') ? String.fromCodePoint(mapping['0'].codePointAt(0) + (code - 48)) : c;
            else res += c;
        }
    }
    input.value = res; updateTextStats(); playSound('click'); haptic.impactOccurred('light');
}

async function playMorseHaptics() {
    if (isMorsePlaying) return;
    const output = document.getElementById('morse-output'); if (!output || !output.innerText) return;
    isMorsePlaying = true;
    for (let char of output.innerText) {
        if (!isMorsePlaying) break;
        if (char === '.') { haptic.impactOccurred('light'); playSound('click'); await new Promise(r => setTimeout(r, 250)); }
        else if (char === '-') { haptic.impactOccurred('heavy'); playSound('click'); await new Promise(r => setTimeout(r, 500)); }
        else { await new Promise(r => setTimeout(r, 400)); }
        await new Promise(r => setTimeout(r, 100));
    }
    isMorsePlaying = false;
}

function hideTool() { 
    const existingDesc = document.querySelector('.tool-desc');
    if (existingDesc) existingDesc.remove();
    document.getElementById('tool-container').style.display = 'none'; 
    stopMetronome(); stopSound('loading'); isMorsePlaying = false; 
    if (speedTestController) { speedTestController.abort(); speedTestController = null; } 
}

function renderMediaTabs(shouldPlaySound = true) {
    if (shouldPlaySound) playSound('click');
    const container = document.getElementById('media-tabs-container');
    container.innerHTML = `<div class="tab-container"><button id="mtab-downs" class="tab-btn active" onclick="setMediaTab('downs')">${t('downloads')}</button><button id="mtab-conv" class="tab-btn" onclick="setMediaTab('conv')">${t('audioConv')}</button><button id="mtab-exif" class="tab-btn" onclick="setMediaTab('exif')">${t('exifStripper')}</button><button id="mtab-metro" class="tab-btn" onclick="setMediaTab('metro')">${t('metronome')}</button></div><div id="media-tab-content"></div>`;
    setMediaTab('downs', false);
}

function setMediaTab(tab, shouldPlaySound = true) {
    if (shouldPlaySound) playSound('click');
    haptic.impactOccurred('light');
    const content = document.getElementById('media-tab-content');
    document.querySelectorAll('#media-tabs-container .tab-btn').forEach(b => b.classList.remove('active'));
    const targetTab = document.getElementById(`mtab-${tab}`);
    if (targetTab) targetTab.classList.add('active');
    stopMetronome(); stopSound('loading');
    
    let descKey = `desc_${tab}`;
    if (tab === 'downs') descKey = 'desc_audioConv'; // Generic media desc
    
    const existingDesc = document.querySelector('.tool-desc');
    if (existingDesc) existingDesc.remove();
    
    if (tab === 'downs') {
        content.innerHTML = `<div class="tab-container" style="background:none; border: 1px solid var(--border-color); margin-top:10px;"><button onclick="showDownloaderUI('yt')" id="st-yt" class="tab-btn active"><i data-lucide="youtube"></i> YT</button><button onclick="showDownloaderUI('ig')" id="st-ig" class="tab-btn"><i data-lucide="instagram"></i> IG</button><button onclick="showDownloaderUI('tt')" id="st-tt" class="tab-btn"><i data-lucide="music"></i> TT</button></div><div id="downloader-ui-box"></div>`;
        showDownloaderUI('yt', false);
    } else if (tab === 'conv') {
        content.innerHTML = `<div class="pass-box"><div class="upload-box" style="border: 2px dashed var(--border-color); background:var(--secondary-bg); padding:40px 20px; border-radius:16px; text-align:center; cursor:pointer;" onclick="document.getElementById('audio-upload').click()"><i data-lucide="music" style="width:32px; height:32px; margin-bottom:10px; color:var(--primary-color)"></i><span style="display:block; font-weight:600">${t('selectFile')}</span><input type="file" id="audio-upload" style="display:none" onchange="handleAudioFile(this)"></div><div id="audio-info" style="display:none; margin:15px 0; font-size:14px; font-weight:600;"></div><button id="conv-btn" class="tool-btn" style="display:none; justify-content:center" onclick="startAudioConversion()">${t('convMp3')}</button><div id="conv-status" style="margin-top:10px;"></div></div>`;
    } else if (tab === 'exif') {
        content.innerHTML = `<div class="pass-box"><div class="upload-box" style="border: 2px dashed var(--border-color); background:var(--secondary-bg); padding:40px 20px; border-radius:16px; text-align:center; cursor:pointer;" onclick="document.getElementById('exif-upload').click()"><i data-lucide="image" style="width:32px; height:32px; margin-bottom:10px; color:var(--primary-color)"></i><span id="exif-filename" style="display:block; font-weight:600">${t('selectImage')}</span><input type="file" id="exif-upload" accept="image/*" style="display:none" onchange="handleExifFile(this)"></div><button id="exif-btn" class="tool-btn" style="display:none; justify-content:center; background:var(--primary-color); color:white; border:none;" onclick="processExif()"> <i data-lucide="shield-check" style="color:white"></i> ${t('stripMetadata')}</button><div id="exif-status" style="margin-top:15px; text-align:center;"></div></div>`;
    } else {
        content.innerHTML = `<div class="pass-box" style="text-align:center;"><div id="metro-circle" class="metro-circle" style="margin: 20px auto;">${bpm}</div><div style="margin-bottom:30px; text-align:left;"><label style="display:flex; justify-content:space-between; font-weight:600">BPM <span id="bpm-val">${bpm}</span></label><input type="range" min="40" max="220" value="${bpm}" oninput="updateBPM(this.value)"></div><button id="metro-btn" class="tool-btn" style="justify-content:center" onclick="toggleMetronome()">Start</button></div>`;
    }
    lucide.createIcons();
}

function showDownloaderUI(type, shouldPlaySound = true) { if (shouldPlaySound) playSound('click'); const box = document.getElementById('downloader-ui-box'); if (!box) return; document.querySelectorAll('#media-tab-content .tab-btn').forEach(b => b.classList.remove('active')); const subTab = document.getElementById(`st-${type}`); if (subTab) subTab.classList.add('active'); box.innerHTML = `<div class="pass-box"><input type="text" id="media-url" class="text-input" placeholder="${type.toUpperCase()} Link"><select id="media-format" class="select-input"><option value="mp4">Video</option><option value="mp3">Audio</option></select><button class="tool-btn" style="justify-content:center" onclick="processDownload('${type}')">Download</button><div id="dl-status" style="margin-top:10px; font-size:13px"></div></div>`; }
async function processExif() { if (!exifFile) return; const status = document.getElementById('exif-status'), chatId = tg.initDataUnsafe?.user?.id; status.innerText = t('processing'); playSound('loading'); const formData = new FormData(); formData.append('file', exifFile); if (chatId) formData.append('chatId', chatId); try { const response = await fetch('/api/strip-exif', { method: 'POST', body: formData }), data = await response.json(); stopSound('loading'); if (data.success) { status.innerHTML = `<span style="color:#34c759; font-weight:800">${t('sentChat')}</span>`; playSound('success'); haptic.notificationOccurred('success'); } else throw new Error(data.error); } catch (e) { stopSound('loading'); status.innerHTML = `<span style="color:#ff3b30">${t('failed')}</span>`; playSound('error'); haptic.notificationOccurred('error'); } }
function generateInvisibleText() { navigator.clipboard.writeText("\u3164"); playSound('success'); haptic.notificationOccurred('success'); tg.MainButton.setText(t('copied')).show(); setTimeout(() => tg.MainButton.hide(), 2000); }
function generateRickroll() { const alias = document.getElementById('rick-alias').value.trim() || 'Click Me'; const type = document.getElementById('rick-type').value; const targets = { youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", spotify: "https://open.spotify.com/track/4cOdK2wGvWyR9m7UNvy9oE", tiktok: "https://www.tiktok.com/@rickastlyofficial/video/6884381585451126018" }; document.getElementById('rick-url').innerText = `https://www.google.com/url?q=${encodeURIComponent(targets[type])}&disguise=${encodeURIComponent(alias)}`; document.getElementById('rick-result').style.display = 'block'; playSound('success'); haptic.notificationOccurred('success'); }
function copyRickroll() { navigator.clipboard.writeText(document.getElementById('rick-url').innerText); playSound('click'); haptic.impactOccurred('medium'); tg.MainButton.setText(t('copied')).show(); setTimeout(() => tg.MainButton.hide(), 2000); }
async function startAudioConversion() { if (!selectedAudioFile) return; const status = document.getElementById('conv-status'), chatId = tg.initDataUnsafe?.user?.id; if (!chatId) return; status.innerText = "⏳ " + t('converting'); playSound('loading'); try { const formData = new FormData(); formData.append('file', selectedAudioFile); formData.append('chatId', chatId); const response = await fetch('/api/convert-audio', { method: 'POST', body: formData }), data = await response.json(); stopSound('loading'); if (data.success) { status.innerText = "✅ " + t('sentChat'); playSound('success'); haptic.notificationOccurred('success'); } else throw new Error(); } catch (e) { stopSound('loading'); status.innerText = "❌ " + t('failed'); playSound('error'); haptic.notificationOccurred('error'); } }
async function lookupDomain() { const domainInput = document.getElementById('dom-url'); if (!domainInput) return; const domain = domainInput.value.trim(), resultDiv = document.getElementById('dom-result'); if (!domain) return; resultDiv.innerHTML = "Querying..."; playSound('click'); try { const response = await fetch(`/api/domain?domain=${encodeURIComponent(domain)}`), data = await response.json(); let html = `<div class="stats-grid"><div class="stat-card" style="grid-column: span 2;"><span class="stat-label">Primary IP</span><span class="stat-value">${data.dns.a[0] || 'None'}</span></div>`; if (data.whois) html += `<div class="stat-card" style="grid-column: span 2;"><span class="stat-label">Registrar</span><span class="stat-value">${data.whois.registrar}</span></div>`; html += `</div>`; resultDiv.innerHTML = html; playSound('success'); haptic.notificationOccurred('success'); } catch (e) { resultDiv.innerHTML = "Lookup failed"; playSound('error'); haptic.notificationOccurred('error'); } }
function updateQR() { const inputEl = document.getElementById('qr-input'); if (!inputEl) return; const input = inputEl.value, result = document.getElementById('qr-result'), dlBtn = document.getElementById('download-qr'); if (!input.trim()) { result.innerHTML = '<p style="padding:40px;">Waiting...</p>'; dlBtn.style.display = 'none'; return; } result.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(input)}" style="width:200px; height:200px;">`; dlBtn.style.display = 'flex'; }
function renderSettings() { const container = document.getElementById('settings-content'); container.innerHTML = `<div class="settings-group"><div class="settings-cell"><span class="settings-label">${t('darkMode')}</span><input type="checkbox" ${document.body.classList.contains('dark-mode') ? 'checked' : ''} onchange="toggleTheme()"></div><div class="settings-cell"><span class="settings-label">${t('soundEffects')}</span><input type="checkbox" ${soundsEnabled ? 'checked' : ''} onchange="toggleSounds()"></div><div class="settings-cell" onclick="switchLang()"><span class="settings-label">${t('language')}</span><span style="color:var(--primary-color); font-weight:600;">${currentLang === 'en' ? 'English' : 'Română'}</span></div></div><div class="settings-group"><div class="settings-cell" onclick="tg.close()"><span class="settings-label" style="color:#ff3b30">${t('closeApp')}</span></div></div><p style="font-size:12px; color:var(--secondary-text); text-align:center;">Toolkit Bot v2.5 • [⌬]</p>`; }
function startMetronome() { if (isMetronomeRunning) return; isMetronomeRunning = true; document.getElementById('metro-btn').innerText = "Stop"; const circle = document.getElementById('metro-circle'); nextBeatTime = performance.now(); const tick = () => { if (!isMetronomeRunning) return; playSound('click'); haptic.impactOccurred('medium'); circle.classList.add('metro-active'); setTimeout(() => circle.classList.remove('metro-active'), 100); const interval = (60 / bpm) * 1000; nextBeatTime += interval; metronomeInterval = setTimeout(tick, Math.max(0, interval - (performance.now() - nextBeatTime))); }; tick(); }
function stopMetronome() { isMetronomeRunning = false; if (metronomeInterval) clearTimeout(metronomeInterval); const btn = document.getElementById('metro-btn'); if (btn) btn.innerText = "Start"; }
function toggleMetronome() { if (isMetronomeRunning) stopMetronome(); else startMetronome(); }
function updateBPM(val) { bpm = val; if (document.getElementById('bpm-val')) document.getElementById('bpm-val').innerText = bpm; if (document.getElementById('metro-circle')) document.getElementById('metro-circle').innerText = bpm; if (isMetronomeRunning) { stopMetronome(); startMetronome(); } }
function handleAudioFile(input) { if (input.files && input.files[0]) { selectedAudioFile = input.files[0]; const info = document.getElementById('audio-info'); info.innerText = `Selected: ${selectedAudioFile.name}`; info.style.display = 'block'; document.getElementById('conv-btn').style.display = 'flex'; playSound('click'); haptic.impactOccurred('light'); } }
function updateTextStats() { const textInput = document.getElementById('text-input'); if (!textInput) return; const text = textInput.value; document.getElementById('text-stats').innerText = `${t('chars')}: ${text.length} | ${t('words')}: ${text.trim() ? text.trim().split(/\s+/).length : 0}`; }
initTheme(); switchView('tools'); updateUIVocabulary();
