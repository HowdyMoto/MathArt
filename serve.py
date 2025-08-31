#!/usr/bin/env python3
"""
Simple HTTP server with auto-reload for shader development.
Watches for file changes and automatically reloads the browser.
"""

import http.server
import socketserver
import os
from pathlib import Path

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

PORT = 8000
print(f"Starting server at http://localhost:{PORT}")
print("The page will auto-reload when you save changes to shader files")
print("Press Ctrl+C to stop")

os.chdir(Path(__file__).parent)
with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    httpd.serve_forever()