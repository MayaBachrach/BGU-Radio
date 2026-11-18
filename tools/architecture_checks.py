"""Targeted architecture and shared-content validation; no browser required."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
data = root / "data"
station = json.loads((data / "station.json").read_text(encoding="utf-8"))
manifest = json.loads((data / "sites.json").read_text(encoding="utf-8"))
library = json.loads((data / "library.json").read_text(encoding="utf-8"))
expected = {"soft-signal", "after-hours", "pixel-frequency"}
assert {site["id"] for site in manifest["sites"]} == expected
assert len(manifest["sites"]) == 3
assert len(library) > 100 and all(r.get("title") and r.get("source") for r in library)
assert station["liveStreamUrl"].startswith("https://")
assert station["nowPlayingUrl"].startswith("https://")
assert len(station["gallery"]) >= 10
assert station["featuredCovers"]

for item in manifest["sites"]:
    slug = item["id"]
    assert item["url"].endswith("/" + slug + "/")
    assert item["previewImages"]["desktop"].endswith("/" + slug + "-1440.png")
    assert item["previewImages"]["mobile"].endswith("/" + slug + "-390.png")
    folder = root / "sites" / slug
    html = (folder / "index.html").read_text(encoding="utf-8")
    app = (folder / "app.js").read_text(encoding="utf-8")
    css = (folder / "core.css").read_text(encoding="utf-8")
    (folder / "edition.css").read_text(encoding="utf-8")
    assert css and app and html
    assert 'href="core.css"' in html and 'href="edition.css"' in html
    assert 'href="fonts/fonts.css"' in html and 'src="app.js"' in html
    assert 'src="media-map.js"' in html  # generated per site at publish time
    assert "../main/" not in html and "../main/" not in app
    for other in expected - {slug}:
        assert "../" + other + "/" not in html
        assert "../" + other + "/" not in app
    assert "fetch('../data/station.json')" in app
    assert "fetch('../data/library.json')" in app
    assert "station.liveStreamUrl" in app and "fetch(station.nowPlayingUrl)" in app
    assert not re.search(r'<img\b[^>]*\bsrc="https?://', html)
    for program in re.findall(r'data-program-art="([^"]+)"', html):
        assert program in station["featuredCovers"], (slug, program)
    for photo in re.findall(r'data-station-photo="(\d+)"', html):
        assert int(photo) < len(station["gallery"])
    font_css = (folder / "fonts" / "fonts.css").read_text(encoding="utf-8")
    for filename in re.findall(r'url\("\./([^"]+)"\)', font_css):
        assert (folder / "fonts" / filename).exists(), filename
    for filename in ("rubik-OFL.txt", "handjet-OFL.txt", "frankruhllibre-OFL.txt"):
        assert (folder / "fonts" / filename).exists()

for filename in ("camera.png", "crate.png", "mail.png", "studio-desktop.png", "studio-mobile.png"):
    assert (root / "sites/pixel-frequency/art" / filename).exists()
print(f"PASS: {len(library)} catalogue entries, {len(station['gallery'])} photos, "
      "3 independent sites loading the same data/station.json and data/library.json")
