from http.server import BaseHTTPRequestHandler
import json
import requests
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
            # Track redirects
            response = requests.get(url, timeout=10, allow_redirects=True)
            
            # Metadata extraction
            soup = BeautifulSoup(response.text, 'html.parser')
            title = soup.title.string if soup.title else "No Title"
            desc = soup.find("meta", attrs={"name": "description"})
            description = desc["content"] if desc else "No description available"
            
            redirect_chain = [r.url for r in response.history] + [response.url]
            
            result = {
                "success": True,
                "title": title.strip(),
                "description": description.strip(),
                "status_code": response.status_code,
                "final_url": response.url,
                "is_secure": response.url.startswith('https://'),
                "redirect_count": len(response.history),
                "chain": redirect_chain
            }
        except Exception as e:
            result = {"success": False, "error": str(e)}

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))
