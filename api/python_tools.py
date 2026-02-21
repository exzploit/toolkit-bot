from http.server import BaseHTTPRequestHandler
import json
import requests
import socket
import time
import hashlib
import io
import os
import re
from bs4 import BeautifulSoup
from urllib.parse import urlparse, parse_qs, urljoin
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
        elif tool == "scrape":
            return self.handle_scrape(params)
        elif tool == "tg_scrape":
            return self.handle_tg_scrape(params)
        elif tool == "track_user":
            return self.handle_username_search(params)
        
        self.send_response(400)
        self.end_headers()

    def handle_username_search(self, params):
        username = params.get("username", [""])[0].strip()
        if not username: return self.send_json({"success": False, "error": "Username required"})
        
        platforms = {
            "Instagram": f"https://www.instagram.com/{username}/",
            "GitHub": f"https://github.com/{username}",
            "Reddit": f"https://www.reddit.com/user/{username}",
            "Twitter (X)": f"https://twitter.com/{username}",
            "TikTok": f"https://www.tiktok.com/@{username}",
            "Pinterest": f"https://www.pinterest.com/{username}/",
            "YouTube": f"https://www.youtube.com/@{username}",
            "Steam": f"https://steamcommunity.com/id/{username}",
            "Spotify": f"https://open.spotify.com/user/{username}",
            "Medium": f"https://medium.com/@{username}"
        }
        
        results = []
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        
        for name, url in platforms.items():
            try:
                # Use a small timeout for speed
                res = requests.head(url, headers=headers, timeout=3, allow_redirects=True)
                if res.status_code == 200:
                    results.append({"name": name, "url": url, "found": True})
            except:
                pass
        
        self.send_json({"success": True, "results": results, "username": username})

    def handle_tg_scrape(self, params):
        username = params.get("username", [""])[0].strip().replace('@', '')
        if not username: return self.send_json({"success": False, "error": "Username required"})
        try:
            url = f"https://t.me/{username}"
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            response = requests.get(url, timeout=10, headers=headers)
            soup = BeautifulSoup(response.text, 'html.parser')
            name_el = soup.find('div', class_='tgme_page_title')
            bio_el = soup.find('div', class_='tgme_page_description')
            extra_el = soup.find('div', class_='tgme_page_extra')
            photo_el = soup.find('img', class_='tgme_page_photo_image')
            result = {
                "success": True, "username": f"@{username}",
                "display_name": name_el.get_text(strip=True) if name_el else "Unknown",
                "bio": bio_el.get_text(strip=True) if bio_el else "No Bio",
                "extra": extra_el.get_text(strip=True) if extra_el else "",
                "photo": photo_el.get('src') if photo_el else None
            }
        except Exception as e: result = {"success": False, "error": str(e)}
        self.send_json(result)

    def handle_scrape(self, params):
        url = params.get("url", [""])[0]
        if not url.startswith(('http://', 'https://')): url = 'https://' + url
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            response = requests.get(url, timeout=10, headers=headers)
            soup = BeautifulSoup(response.text, 'html.parser')
            emails = list(set(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', response.text)))
            phones = list(set(re.findall(r'\+?\d[\d\s\-\(\)]{8,}\d', response.text)))
            images = []
            for img in soup.find_all('img'):
                src = img.get('src'); if src: images.append(urljoin(url, src))
            for script in soup(["script", "style"]): script.decompose()
            text = soup.get_text(separator=' ')
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            clean_text = '\n'.join(chunk for chunk in chunks if chunk)[:2000]
            result = {"success": True, "title": soup.title.string if soup.title else "No Title", "emails": emails[:10], "phones": phones[:10], "image_count": len(images), "images": images[:5], "text_preview": clean_text}
        except Exception as e: result = {"success": False, "error": str(e)}
        self.send_json(result)

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
            result = {
                "success": True, "title": soup.title.string.strip()[:100] if soup.title else "No Title",
                "status_code": response.status_code, "ip": ip_addr, "server": response.headers.get('Server', 'Unknown'),
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
        text = params.get("text", [""])[0]; lang = params.get("lang", ["en"])[0]; chat_id = params.get("chatId", [""])[0]; bot_token = os.environ.get('BOT_TOKEN')
        try:
            tts = gTTS(text=text, lang=lang); mp3_fp = io.BytesIO(); tts.write_to_fp(mp3_fp); mp3_fp.seek(0)
            if chat_id and bot_token:
                files = {'voice': ('speech.mp3', mp3_fp, 'audio/mpeg')}
                requests.post(f"https://api.telegram.org/bot{bot_token}/sendVoice", data={'chat_id': chat_id}, files=files)
                self.send_json({"success": True})
            else:
                self.send_response(200); self.send_header('Content-type', 'audio/mpeg'); self.end_headers(); self.wfile.write(mp3_fp.read())
        except Exception as e: self.send_json({"success": False, "error": str(e)})

    def send_json(self, data):
        self.send_response(200); self.send_header('Content-type', 'application/json'); self.end_headers(); self.wfile.write(json.dumps(data).encode('utf-8'))
