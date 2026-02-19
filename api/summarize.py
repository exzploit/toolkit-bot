from http.server import BaseHTTPRequestHandler
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import parse_qs, urlparse

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query parameters
        query = urlparse(self.path).query
        params = parse_qs(query)
        url = params.get('url', [None])[0]

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        if not url:
            response = {"error": "Missing URL parameter"}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        try:
            # Fetch content with a real user agent to avoid blocks
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            res = requests.get(url, headers=headers, timeout=5)
            res.raise_for_status()

            soup = BeautifulSoup(res.text, 'html.parser')
            
            # Extract meaningful data
            title = soup.title.string if soup.title else "No Title"
            
            # Get first 3 meaningful paragraphs
            paragraphs = []
            for p in soup.find_all('p'):
                text = p.get_text().strip()
                if len(text) > 50: # Filter out tiny captions
                    paragraphs.append(text)
                    if len(paragraphs) >= 3:
                        break
            
            summary = "

".join(paragraphs) if paragraphs else "No readable text found."

            response = {
                "success": True,
                "title": title,
                "summary": summary
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            response = {"error": str(e)}
            self.wfile.write(json.dumps(response).encode('utf-8'))
