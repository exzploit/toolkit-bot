from http.server import BaseHTTPRequestHandler
import json
import speedtest

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        try:
            st = speedtest.Speedtest()
            st.get_best_server()
            
            # Perform testing
            download_speed = st.download() / 1_000_000 # Convert to Mbps
            upload_speed = st.upload() / 1_000_000 # Convert to Mbps
            results = st.results.dict()

            response = {
                "success": True,
                "download": round(download_speed, 2),
                "upload": round(upload_speed, 2),
                "ping": round(results['ping'], 2),
                "server": results['server']['name'],
                "location": results['server']['country']
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            response = {"success": False, "error": str(e)}
            self.wfile.write(json.dumps(response).encode('utf-8'))
