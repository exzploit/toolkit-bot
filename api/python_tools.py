from http.server import BaseHTTPRequestHandler
import json
import requests
import socket
import time
import hashlib
import io
import os
from bs4 import BeautifulSoup
from urllib.parse import urlparse, parse_qs
from gtts import gTTS

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urlparse(self.path).query
        params = parse_qs(query)
        tool = params.get("tool", [""])[0]

        if tool == "inspect":
            return self.handle_inspect(params)
        elif tool == "crack":
            return self.handle_crack(params)
        elif tool == "tts":
            return self.handle_tts(params)
        
        self.send_response(400)
        self.end_headers()

    def handle_inspect(self, params):
        url = params.get("url", [""])[0]
        if not url.startswith(('http://', 'https://')): url = 'https://' + url
        try:
            start_time = time.time()
            response = requests.get(url, timeout=10, allow_redirects=True)
            end_time = time.time()
            domain = urlparse(response.url).netloc
            ip_addr = socket.gethostbyname(domain)
            soup = BeautifulSoup(response.text, 'html.parser')
            title = soup.title.string if soup.title else "No Title"
            result = {
                "success": True, "title": title.strip()[:100], "status_code": response.status_code,
                "ip": ip_addr, "server": response.headers.get('Server', 'Unknown'),
                "response_time": round((end_time - start_time) * 1000, 2), "is_secure": response.url.startswith('https://')
            }
        except Exception as e: result = {"success": False, "error": str(e)}
        self.send_json(result)

    def handle_crack(self, params):
        hash_val = params.get("hash", [""])[0].lower()
        algo = params.get("type", ["md5"])[0].lower()
        wordlist = ["123456", "password", "12345678", "qwerty", "12345", "admin", "welcome"]
        found = None
        for word in wordlist:
            if algo == "md5": h = hashlib.md5(word.encode()).hexdigest()
            elif algo == "sha1": h = hashlib.sha1(word.encode()).hexdigest()
            else: h = hashlib.sha256(word.encode()).hexdigest()
            if h == hash_val: found = word; break
        self.send_json({"success": True, "password": found} if found else {"success": False})

    def handle_tts(self, params):
        text = params.get("text", [""])[0]
        lang = params.get("lang", ["en"])[0]
        chat_id = params.get("chatId", [""])[0]
        bot_token = os.environ.get('BOT_TOKEN')
        try:
            tts = gTTS(text=text, lang=lang)
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            mp3_fp.seek(0)
            if chat_id and bot_token:
                files = {'voice': ('speech.mp3', mp3_fp, 'audio/mpeg')}
                requests.post(f"https://api.telegram.org/bot{bot_token}/sendVoice", data={'chat_id': chat_id}, files=files)
                self.send_json({"success": True})
            else:
                self.send_response(200)
                self.send_header('Content-type', 'audio/mpeg')
                self.end_headers()
                self.wfile.write(mp3_fp.read())
        except Exception as e: self.send_json({"success": False, "error": str(e)})

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
