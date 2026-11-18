"""Cache the homepage covers and the station's photographs for the Pages build."""
import hashlib
import io
import json
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

root = Path("dist")
media = root / "media"
media.mkdir(exist_ok=True)
pages = list(root.glob("*/index.html"))
docs = {page: page.read_text(encoding="utf-8") for page in pages}
urls = set()
for html in docs.values():
    urls.update(re.findall(r'<img\b[^>]*\bsrc="(https://[^"]+)"', html))

info = (root / "main/station-info.js").read_text(encoding="utf-8")
urls.update(re.findall(r'"(https://[^"]+\.jpg)"', info))
base = re.search(r'const assetRoot="([^"]+)"', info).group(1)
urls.update(base + path for path in re.findall(r'assetRoot\+"([^"]+)"', info))
catalog = json.loads((root / "library.json").read_text(encoding="utf-8"))
for record in catalog[:28] + [r for r in catalog if r.get("kind") == "series" or r.get("show_artwork")]:
    art = record.get("show_artwork") or record.get("artwork")
    if art and art.startswith(("https://","http://")):
        urls.add(art)


def cache(url):
    key = hashlib.sha256(url.encode()).hexdigest()[:20] + ".webp"
    dest = media / key
    try:
        request = Request(url.replace("http://","https://",1), headers={"User-Agent":"BGU-Radio-Pages/1.0"})
        with urlopen(request, timeout=12) as response:
            with Image.open(io.BytesIO(response.read())) as img:
                img = ImageOps.exif_transpose(img).convert("RGB")
                img.thumbnail((1400,1400))
                img.save(dest, format="WEBP", quality=84)
        return url, "../media/" + key
    except (OSError, ValueError) as error:
        print("Retaining original URL:", url, str(error)[:80])
        return url, None


with ThreadPoolExecutor(max_workers=8) as pool:
    mapped = {url: local for url, local in pool.map(cache, sorted(urls)) if local}
for path, html in docs.items():
    for url, local in mapped.items():
        html = html.replace('src="'+url+'"','src="'+local+'"')
    path.write_text(html, encoding="utf-8")
(root/"main/media-map.js").write_text("window.BGU_ASSETS = "+json.dumps(mapped, ensure_ascii=False)+";", encoding="utf-8")
print(f"Cached {len(mapped)} of {len(urls)} artwork and studio URLs.")
