"""Capture the comparison images and exercise the assembled Pages site."""
import base64
import json
import hashlib
import io
import re
import urllib.request
from PIL import Image, ImageOps
from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path("dist/shots")
output.mkdir(exist_ok=True)
# Keep the first screen independent of third-party image server latency.
media = Path("dist/media")
media.mkdir(exist_ok=True)
for branch in ("soft-signal","after-hours","pixel-frequency"):
    index = Path("dist") / branch / "index.html"
    document = index.read_text()
    for url in set(re.findall(r'<img[^>]*?src="(https://[^"]+)"', document)):
        name = hashlib.sha256(url.encode()).hexdigest()[:18] + ".webp"
        asset = media / name
        if not asset.exists():
            try:
                with urllib.request.urlopen(url,timeout=16) as response:
                    with Image.open(io.BytesIO(response.read())) as source:
                        image = ImageOps.exif_transpose(source).convert("RGB")
                        image.thumbnail((1400,1400))
                        image.save(asset,quality=85)
            except (OSError,ValueError) as error:
                print("Original image retained",url,error)
                continue
        document = document.replace(url,"../media/"+name)
    index.write_text(document)
results = []
with sync_playwright() as studio:
    browser = studio.chromium.launch()
    for branch in ["soft-signal","after-hours","pixel-frequency"]:
        page = browser.new_page(reduced_motion="no-preference")
        for width, height in [(320,640),(375,812),(390,844),(430,932),(600,860),(768,1024),(844,390),(1024,768),(1440,900)]:
            print(branch, width, flush=True)
            page.set_viewport_size({"width":width,"height":height})
            if width == 320:
                page.goto("http://localhost:8765/"+branch+"/",wait_until="domcontentloaded")
            else:
                page.locator('header nav a[href="#home"]').click()
            page.locator("#onair").wait_for()
            if width in [390,1440]:
                page.locator("[data-page=home] img").evaluate_all("images => Promise.all(images.map(i => i.decode()))")
                page.screenshot(path=str(output/f"{branch}-{width}.png"),timeout=45000)
            if width in [390,1440]:
                tile=page.locator("[data-page=home] .tile").last
                tile.hover()
                tile.click()
                page.locator("details[open] .episode-line").first.wait_for()
                page.locator('header nav a[href="#home"]').click()
                if branch=="pixel-frequency":
                    page.locator(".shelves").click()
                    page.locator("#query").wait_for()
                    page.locator('header nav a[href="#home"]').click()
            overflow = page.evaluate("document.documentElement.scrollWidth > innerWidth")
            assert not overflow, (branch,width)
            page.locator('header nav a[href="#archive"]').click()
            page.locator("#groups details summary").first.wait_for()
            if width in [390, 1440]:
                archive = page.locator("#archive")
                archive.locator(".recent").scroll_into_view_if_needed()
                cover = archive.locator(".sleeve-art img").first
                cover.scroll_into_view_if_needed()
                cover.evaluate("(img) => img.decode()", timeout=20000)
                assert cover.evaluate("img => img.naturalWidth > 0")
                page.screenshot(path=str(output/f"archive-{branch}-{width}.png"))
                program = archive.locator("#groups details").first
                if program.get_attribute("open") is None:
                    program.locator("summary").click()
                program.locator(".episode-line").first.wait_for()
                program.locator("summary").click()
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            page.locator("#query").fill("רדיו")
            page.locator("#query").fill("")
            page.locator('header nav a[href="#gallery"]').click()
            count = page.locator("#count").inner_text()
            page.locator("#next").click()
            gallery_changed = count != page.locator("#count").inner_text()
            page.locator('header nav a[href="#contact"]').click()
            results.append(dict(branch=branch,width=width,height=height,overflow=overflow,gallery=gallery_changed,contact=page.locator("#contact").is_visible()))
        page.close()
    browser.close()
(output/"checks.json").write_text(json.dumps(results,indent=2))

# Inline lightweight comparison artwork so all six previews arrive with the page.
def preview_source(match):
    filename = match.group(1)
    with Image.open(output / filename) as shot:
        shot.thumbnail((720, 560))
        buffer = io.BytesIO()
        shot.convert("RGB").save(buffer, format="WEBP", quality=78)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f'src="data:image/webp;base64,{encoded}"'

template = Path("compare.html")
template.write_text(re.sub(r'src="\.\./shots/([^"]+)"', preview_source, template.read_text()))
