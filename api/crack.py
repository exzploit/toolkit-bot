from http.server import BaseHTTPRequestHandler
import json
import hashlib
from urllib.parse import urlparse

# Simple wordlist for common passwords
WORDLIST = ["123456", "password", "12345678", "qwerty", "12345", "123456789", "football", "admin", "123123", "welcome"]

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urlparse(self.path).query
        params = dict(qc.split("=") for qc in query.split("&")) if query else {}
        hash_val = params.get("hash", "").lower()
        algo = params.get("type", "md5").lower()

        found = None
        for word in WORDLIST:
            if algo == "md5":
                h = hashlib.md5(word.encode()).hexdigest()
            elif algo == "sha1":
                h = hashlib.sha1(word.encode()).hexdigest()
            elif algo == "sha256":
                h = hashlib.sha256(word.encode()).hexdigest()
            else:
                break
            
            if h == hash_val:
                found = word
                break

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        if found:
            self.wfile.write(json.dumps({"success": True, "password": found}).encode('utf-8'))
        else:
            self.wfile.write(json.dumps({"success": False, "error": "Not found in common dictionary"}).encode('utf-8'))
