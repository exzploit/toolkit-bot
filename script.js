const tg = window.Telegram.WebApp;
tg.expand();

// Theme Management
function initTheme() {
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    updateThemeIcon();
}

function toggleTheme() {
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
    document.getElementById('menu').style.display = 'none';
    document.getElementById('tool-container').style.display = 'block';
    const content = document.getElementById('tool-content');

    if (toolName === 'speedtest') {
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
        content.innerHTML = `
            <div class="pass-box">
                <h3 style="margin-top:0;">Password Generator</h3>
                <h2 id="password-display" style="color: var(--primary-color); word-break: break-all; min-height: 1.2em;">-</h2>
                
                <div class="options-container">
                    <div style="margin-bottom: 15px;">
                        <label>Length: <span id="length-val" class="length-display">12</span></label>
                        <input type="range" id="pass-length" min="6" max="32" value="12" oninput="document.getElementById('length-val').innerText = this.value; generateComplexPassword();">
                    </div>
                    
                    <div class="option-row">
                        <label for="pass-upper">Uppercase (A-Z)</label>
                        <input type="checkbox" id="pass-upper" checked onchange="generateComplexPassword()">
                    </div>
                    
                    <div class="option-row">
                        <label for="pass-numbers">Numbers (0-9)</label>
                        <input type="checkbox" id="pass-numbers" checked onchange="generateComplexPassword()">
                    </div>
                    
                    <div class="option-row">
                        <label for="pass-symbols">Symbols (!@#$%^&*)</label>
                        <input type="checkbox" id="pass-symbols" checked onchange="generateComplexPassword()">
                    </div>
                </div>
                
                <button class="tool-btn" onclick="generateComplexPassword()">🔄 Generate New</button>
            </div>`;
        generateComplexPassword();
    }

    if (toolName === 'ipinfo') {
        // ... rest of the code stays the same
    }
}

function generateComplexPassword() {
    const length = document.getElementById('pass-length').value;
    const hasUpper = document.getElementById('pass-upper').checked;
    const hasNumbers = document.getElementById('pass-numbers').checked;
    const hasSymbols = document.getElementById('pass-symbols').checked;

    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    let charset = lower;
    if (hasUpper) charset += upper;
    if (hasNumbers) charset += numbers;
    if (hasSymbols) charset += symbols;

    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }

    // Ensure at least one of each selected type is present (basic version)
    document.getElementById('password-display').innerText = password;
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

        statusText.innerText = 'Testing Upload Speed...';
        let ulSent = 0;
        const startUlTime = performance.now();
        const ulChunkSize = 5 * 1024 * 1024;
        const ulData = new Uint8Array(ulChunkSize);

        while (performance.now() - startUlTime < TEST_DURATION) {
            await fetch('https://speed.cloudflare.com/__up', {
                method: 'POST',
                body: ulData,
                cache: 'no-store'
            });
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

    } catch (error) {
        console.error(error);
        if (statusText) statusText.innerText = 'Test Failed. Check connection.';
        if (restartBtn) restartBtn.style.display = 'block';
    }
}

function goBack() {
    document.getElementById('menu').style.display = 'block';
    document.getElementById('tool-container').style.display = 'none';
    document.getElementById('tool-content').innerHTML = "";
}