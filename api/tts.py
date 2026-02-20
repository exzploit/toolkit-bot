from http.server import BaseHTTPRequestHandler
import json
import io
import os
import requests
from gtts import gTTS
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urlparse(self.path).query
        params = parse_qs(query)
        
        text = params.get("text", [""])[0]
        chat_id = params.get("chatId", [""])[0]
        lang = params.get("lang", ["en"])[0]
        bot_token = os.environ.get('BOT_TOKEN')

        if not text:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": "No text provided"}).encode('utf-8'))
            return

        try:
            # Generate TTS
            tts = gTTS(text=text, lang=lang)
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            mp3_fp.seek(0)

            if chat_id and bot_token:
                # Send to Telegram
                files = {'voice': ('speech.mp3', mp3_fp, 'audio/mpeg')}
                payload = {'chat_id': chat_id, 'caption': '🎙️ Your TTS Audio'}
                tg_res = requests.post(f"https://api.telegram.org/bot{bot_token}/sendVoice", data=payload, files=files)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "tg_res": tg_res.json()}).encode('utf-8'))
            else:
                # Browser download
                self.send_response(200)
                self.send_header('Content-type', 'audio/mpeg')
                self.send_header('Content-Disposition', 'attachment; filename="speech.mp3"')
                self.end_headers()
                self.wfile.write(mp3_fp.read())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
