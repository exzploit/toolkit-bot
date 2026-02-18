const tg = window.Telegram.WebApp;
tg.expand(); // Makes the app take up the full Telegram screen

function showSpeedTest() {
    document.getElementById('speedtest-btn').style.display = 'none';
    document.getElementById('tool-container').style.display = 'block';
    // We use a free widget for the speed test
    document.getElementById('speed-frame').src = "https://openspeedtest.com/Get-Widget";
}

function goBack() {
    document.getElementById('speedtest-btn').style.display = 'block';
    document.getElementById('tool-container').style.display = 'none';
    document.getElementById('speed-frame').src = "";
}