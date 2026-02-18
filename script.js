const tg = window.Telegram.WebApp;
tg.expand();

function showTool(toolName) {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('tool-container').style.display = 'block';
    const content = document.getElementById('tool-content');

    if (toolName === 'speedtest') {
        content.innerHTML = `
            <div id="speedtest-ui">
                <div id="meta-info" style="font-size: 12px; color: #888; margin-bottom: 10px;">Initializing...</div>
                <div class="speed-gauge">
                    <span id="speed-display" class="speed-value">0.0</span>
                    <span class="speed-unit">Mbps</span>
                </div>
                <div id="test-status" style="margin-top: -10px; color: #666; font-size: 14px; font-weight: 500;">Ready</div>
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
    
    // ... rest of showTool functions (password, ipinfo) stay the same ...
    if (toolName === 'password') {
        const newPass = Math.random().toString(36).slice(-10) + Math.random().toString(36).toUpperCase().slice(-2);
        content.innerHTML = `
            <div style="padding: 20px; background: #eee; border-radius: 10px; margin-top: 20px;">
                <h3>Your Secure Password:</h3>
                <h2 style="color: #007aff;">${newPass}</h2>
                <button onclick="showTool('password')">🔄 Generate New</button>
            </div>`;
    }

    if (toolName === 'ipinfo') {
        content.innerHTML = `<div id="loading-spinner" style="padding: 20px;">🔍 Fetching IP Info...</div>`;
        fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
                content.innerHTML = `
                    <div style="text-align: left; padding: 10px; line-height: 1.6;">
                        <h3>Your Connection Info</h3>
                        <p><strong>IP:</strong> ${data.ip}</p>
                        <p><strong>City:</strong> ${data.city}</p>
                        <p><strong>Region:</strong> ${data.region}</p>
                        <p><strong>Country:</strong> ${data.country_name}</p>
                        <p><strong>ISP:</strong> ${data.org}</p>
                    </div>`;
            })
            .catch(() => {
                content.innerHTML = `<p style="color: red;">Failed to fetch IP info. Please try again.</p>`;
            });
    }
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

    restartBtn.style.display = 'none';
    progressBar.style.width = '0%';
    speedDisplay.innerText = '0.0';
    pingDisplay.innerText = '--';
    jitterDisplay.innerText = '--';
    downloadDisplay.innerText = '--';
    uploadDisplay.innerText = '--';

    try {
        const TEST_DURATION = 10000; // 10 seconds per phase

        // 0. Get Meta Info
        const metaRes = await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' });
        const colo = metaRes.headers.get('cf-meta-colo') || 'Unknown';
        const country = metaRes.headers.get('cf-meta-country') || '';
        metaInfo.innerText = `Server: ${colo} (${country}) • Provider: ${metaRes.headers.get('server') || 'Cloudflare'}`;

        // 1. Latency & Jitter (20 samples)
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

        // 2. Timed Download Test (10 Seconds)
        statusText.innerText = 'Testing Download Speed...';
        let dlReceived = 0;
        const startDlTime = performance.now();
        
        while (performance.now() - startDlTime < TEST_DURATION) {
            const response = await fetch(`https://speed.cloudflare.com/__down?bytes=25000000`, { cache: 'no-store' }); // 25MB chunks
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

        // 3. Timed Upload Test (10 Seconds)
        statusText.innerText = 'Testing Upload Speed...';
        let ulSent = 0;
        const startUlTime = performance.now();
        const ulChunkSize = 5 * 1024 * 1024; // 5MB chunks
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
        statusText.innerText = 'Test Failed. Check connection.';
        restartBtn.style.display = 'block';
    }
}

function goBack() {
    document.getElementById('menu').style.display = 'block';
    document.getElementById('tool-container').style.display = 'none';
    document.getElementById('tool-content').innerHTML = "";
}