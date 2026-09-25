#!/usr/bin/env python3
"""Génère icônes PWA, favicon PNG et image de partage (Open Graph) avec Chrome headless.

Usage : python tools/render-assets.py
Prérequis : Google Chrome (ou Chromium / Edge) installé, Pillow (pip install pillow).
"""
import os
import shutil
import subprocess
import sys
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "assets" / "icons"
IMG = ROOT / "assets" / "img"

CANDIDATES = [
    os.environ.get("CHROME_PATH", ""),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    shutil.which("google-chrome") or "",
    shutil.which("chromium") or "",
    shutil.which("chromium-browser") or "",
]


class Quiet(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".webp": "image/webp"}

    def log_message(self, *args):
        pass


def chrome():
    for c in CANDIDATES:
        if c and Path(c).exists():
            return c
    sys.exit("Chrome introuvable : définissez CHROME_PATH.")


def shot(browser, url, w, h, out):
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run([
            browser, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
            f"--user-data-dir={profile}", "--default-background-color=00000000",
            f"--window-size={w},{h}", "--virtual-time-budget=8000", f"--screenshot={out}", url,
        ], check=True, capture_output=True, timeout=90)


def main():
    browser = chrome()
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT)))
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{port}/tools/render"
    ICONS.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        shot(browser, f"{base}/icon.html?v=any", 1024, 1024, tmp / "any.png")
        shot(browser, f"{base}/icon.html?v=maskable", 1024, 1024, tmp / "maskable.png")
        shot(browser, f"{base}/icon.html?v=apple", 1024, 1024, tmp / "apple.png")
        shot(browser, f"{base}/og.html", 1200, 630, tmp / "og.png")
        any_ = Image.open(tmp / "any.png").convert("RGBA")
        for size in (512, 192, 32):
            any_.resize((size, size), Image.LANCZOS).save(ICONS / f"icon-{size}.png" if size != 32 else ICONS / "favicon-32.png")
        Image.open(tmp / "maskable.png").convert("RGB").resize((512, 512), Image.LANCZOS).save(ICONS / "icon-maskable-512.png")
        Image.open(tmp / "apple.png").convert("RGB").resize((180, 180), Image.LANCZOS).save(ICONS / "apple-touch-icon.png")
        Image.open(tmp / "og.png").convert("RGB").save(IMG / "og-cafe-laitue.jpg", quality=86, optimize=True, progressive=True)
    server.shutdown()
    for p in sorted(list(ICONS.glob("*.png")) + [IMG / "og-cafe-laitue.jpg"]):
        print(f"{p.relative_to(ROOT)}  {p.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    main()
