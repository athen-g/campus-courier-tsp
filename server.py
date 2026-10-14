"""Local, dependency-free web app. Run: python server.py"""
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from solver import DEMO, solve


class Handler(SimpleHTTPRequestHandler):
    def send_json(self, status, body):
        raw = json.dumps(body, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/api/demo":
            self.send_json(200, {"stops": DEMO})
        else:
            super().do_GET()

    def do_POST(self):
        if self.path != "/api/solve":
            self.send_json(404, {"error": "Unknown endpoint."})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 32768:
                raise ValueError("Request size must be between 1 and 32768 bytes.")
            data = json.loads(self.rfile.read(size))
            self.send_json(200, solve(data))
        except (ValueError, TypeError, UnicodeError) as error:
            self.send_json(400, {"error": str(error)})


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    root = str(Path(__file__).parent / "static")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(Handler, directory=root))
    print(f"Campus Courier is ready at http://127.0.0.1:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
