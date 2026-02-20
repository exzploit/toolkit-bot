from http.server import BaseHTTPRequestHandler
import json
import requests
import socket
import time
from bs4 import BeautifulSoup
from urllib.parse import urlparse

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urlparse(self.path).query
        params = dict(qc.split("=") for qc in query.split("&")) if query else {}
        url = params.get("url")

        if not url:
            self.send_response(400)
            self.end_headers()
            return

        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        try:
            start_time = time.time()
            # Track redirects and headers
            response = requests.get(url, timeout=10, allow_redirects=True, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ToolkitBot/1.0'
            })
            end_time = time.time()
            
            # Resolve IP
            domain = urlparse(response.url).netloc
            try:
                ip_addr = socket.gethostbyname(domain)
            except:
                ip_addr = "Could not resolve"

            # Metadata extraction
            soup = BeautifulSoup(response.text, 'html.parser')
            title = soup.title.string if soup.title else "No Title"
            
            # Headers analysis
            server = response.headers.get('Server', 'Unknown')
            content_type = response.headers.get('Content-Type', 'Unknown')
            
            result = {
                "success": True,
                "title": title.strip()[:100],
                "status_code": response.status_code,
                "final_url": response.url,
                "ip": ip_addr,
                "server": server,
                "content_type": content_type.split(';')[0],
                "response_time": round((end_time - start_time) * 1000, 2),
                "is_secure": response.url.startswith('https://'),
                "redirect_count": len(response.history)
            }
        except Exception as e:
            result = {"success": False, "error": str(e)}

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))
