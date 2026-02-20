from http.server import BaseHTTPRequestHandler
import json
import cgi
import io
import os
import requests
from PIL import Image

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={'REQUEST_METHOD': 'POST'}
        )

        if "file" not in form:
            self.send_response(400)
            self.end_headers()
            return

        file_item = form["file"]
        image_data = file_item.file.read()
        chat_id = form.getvalue("chatId")
        bot_token = os.environ.get('BOT_TOKEN')

        try:
            img = Image.open(io.BytesIO(image_data))
            
            # Create a clean image without EXIF
            # Method: re-save without metadata
            output = io.BytesIO()
            img.save(output, format=img.format if img.format else 'JPEG')
            output.seek(0)

            if chat_id and bot_token:
                # Send to Telegram
                files = {'document': ('clean_image.jpg', output, 'image/jpeg')}
                payload = {'chat_id': chat_id, 'caption': '✅ EXIF Data Stripped!'}
                tg_res = requests.post(f"https://api.telegram.org/bot{bot_token}/sendDocument", data=payload, files=files)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "tg_res": tg_res.json()}).encode('utf-8'))
            else:
                # Fallback to browser download if no chatId
                self.send_response(200)
                self.send_header('Content-type', 'image/jpeg')
                self.send_header('Content-Disposition', 'attachment; filename="stripped_image.jpg"')
                self.end_headers()
                self.wfile.write(output.read())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
