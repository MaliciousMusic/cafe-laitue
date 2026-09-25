#!/usr/bin/env python3
"""Rapatrie les polices Google Fonts dans assets/fonts/ (hébergement local, RGPD-friendly).

Usage : python tools/fetch-fonts.py
Génère assets/css/fonts.css et télécharge les fichiers .woff2 (sous-ensembles latin + latin étendu)
ainsi que les licences SIL OFL de chaque famille.
"""
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "assets" / "fonts"
CSS = ROOT / "assets" / "css" / "fonts.css"
API = (
    "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800"
    "&family=Caveat:wght@600&family=Lilita+One&family=Patrick+Hand+SC&display=swap"
)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
KEEP = {"latin", "latin-ext"}
LICENSES = {
    "bricolage-grotesque": "https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/OFL.txt",
    "caveat": "https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/OFL.txt",
    "lilita-one": "https://raw.githubusercontent.com/google/fonts/main/ofl/lilitaone/OFL.txt",
    "patrick-hand-sc": "https://raw.githubusercontent.com/google/fonts/main/ofl/patrickhandsc/OFL.txt",
}


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return data if binary else data.decode("utf-8")


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main():
    FONTS.mkdir(parents=True, exist_ok=True)
    css = get(API)
    blocks = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S)
    out = [
        "/* Polices hébergées localement (SIL Open Font License, voir assets/fonts/LICENSE-*.txt).",
        "   Généré par tools/fetch-fonts.py — ne pas modifier à la main. */",
        "",
    ]
    total = 0
    for subset, body in blocks:
        if subset not in KEEP:
            continue
        prop = lambda k: (re.search(rf"{k}:\s*([^;]+);", body) or [None, ""])[1].strip()
        family = prop("font-family").strip("'\"")
        weight = prop("font-weight")
        style = prop("font-style") or "normal"
        rng = prop("unicode-range")
        url = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
        name = f"{slug(family)}-{weight.replace(' ', '-')}-{subset}.woff2"
        data = get(url, binary=True)
        (FONTS / name).write_bytes(data)
        total += len(data)
        print(f"{name:52s} {len(data) // 1024:4d} Ko")
        out += [
            "@font-face {",
            f"  font-family: '{family}';",
            f"  font-style: {style};",
            f"  font-weight: {weight};",
            "  font-display: swap;",
            f"  src: url('../fonts/{name}') format('woff2');",
            f"  unicode-range: {rng};",
            "}",
            "",
        ]
    CSS.write_text("\n".join(out), encoding="utf-8")
    for key, url in LICENSES.items():
        try:
            (FONTS / f"LICENSE-{key}.txt").write_text(get(url), encoding="utf-8")
        except Exception as exc:  # licence introuvable : on le signale sans bloquer
            print(f"Licence {key} non récupérée : {exc}")
    print(f"Total polices : {total // 1024} Ko · {CSS.relative_to(ROOT)} écrit")


if __name__ == "__main__":
    main()
