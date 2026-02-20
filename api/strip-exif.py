from http.server import BaseHTTPRequestHandler
import json
import cgi
import io
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

        try:
            img = Image.open(io.BytesIO(image_data))
            
            # Create a clean image without EXIF
            data = list(img.getdata())
            clean_img = Image.new(img.mode, img.size)
            clean_img.putdata(data)
            
            output = io.BytesIO()
            clean_img.save(output, format=img.format if img.format else 'JPEG')
            output.seek(0)

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
