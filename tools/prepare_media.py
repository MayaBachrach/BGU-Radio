"""Generate per-site image caches from canonical station and catalogue data.

No website imports media or presentation assets from another website.
"""
import hashlib
import io
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

ROOT = Path("dist")
station = json.loads((ROOT / "data/station.json").read_text(encoding="utf-8"))
catalogue = json.loads((ROOT / "data/library.json").read_text(encoding="utf-8"))
manifest = json.loads((ROOT / "data/sites.json").read_text(encoding="utf-8"))
site_ids = [site["id"] for site in manifest["sites"]]

# The checked-in entry points contain no duplicated editorial image URLs.
# Populate these before capture so the initial HTML already has image sources.
docs = {}
for slug in site_ids:
    page = ROOT / slug / "index.html"
    html = page.read_text(encoding="utf-8")
    for program, url in station["featuredCovers"].items():
        html = html.replace('data-program-art="' + program + '"',
                            'data-program-art="' + program + '" src="' + url + '"')
    for index, photo in enumerate(station["gallery"]):
        html = html.replace('data-station-photo="' + str(index) + '"',
                            'data-station-photo="' + str(index) + '" src="' + photo[1] + '"')
    docs[page] = html

urls = set(station["featuredCovers"].values())
urls.update(photo[1] for photo in station["gallery"])
for html in docs.values():
    urls.update(re.findall(r'<img\b[^>]*\bsrc="(https?://[^"]+)"', html))
for record in catalogue[:28] + [r for r in catalogue if r.get("kind") == "series" or r.get("show_artwork")]:
    art = record.get("show_artwork") or record.get("artwork")
    if art and art.startswith(("https://", "http://")):
        urls.add(art)


def cache(url):
    filename = hashlib.sha256(url.encode()).hexdigest()[:20] + ".webp"
    try:
        request = Request(url.replace("http://", "https://", 1),
                          headers={"User-Agent": "BGU-Radio-Pages/1.0"})
        with urlopen(request, timeout=12) as response:
            with Image.open(io.BytesIO(response.read())) as original:
                image = ImageOps.exif_transpose(original).convert("RGB")
                image.thumbnail((1400, 1400))
                output = io.BytesIO()
                image.save(output, format="WEBP", quality=84)
        return url, filename, output.getvalue()
    except (OSError, ValueError) as error:
        print("Retaining original URL:", url, str(error)[:80])
        return url, filename, None


with ThreadPoolExecutor(max_workers=8) as pool:
    downloaded = list(pool.map(cache, sorted(urls)))

mapped = {url: "media/" + filename for url, filename, content in downloaded if content}
for slug in site_ids + ["main"]:
    directory = ROOT / slug
    folder = directory / "media"
    folder.mkdir(parents=True, exist_ok=True)
    for url, filename, content in downloaded:
        if content:
            (folder / filename).write_bytes(content)
    (directory / "media-map.js").write_text(
        "window.BGU_ASSETS = " + json.dumps(mapped, ensure_ascii=False) + ";",
        encoding="utf-8")

for page, html in docs.items():
    for url, local in mapped.items():
        html = html.replace('src="' + url + '"', 'src="' + local + '"')
    page.write_text(html, encoding="utf-8")

print(f"Cached {len(mapped)} of {len(urls)} media URLs separately under each site.")
