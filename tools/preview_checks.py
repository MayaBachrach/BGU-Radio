"""Capture the comparison images and exercise the assembled Pages site."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path("dist/shots")
output.mkdir(exist_ok=True)
results = []
with sync_playwright() as studio:
    browser = studio.chromium.launch()
    for branch in ["main","design-campus","design-studio","design-poolsuite","design-shuffle"]:
        page = browser.new_page(reduced_motion="reduce")
        for width, height in [(320,640),(375,812),(390,844),(430,932),(600,860),(768,1024),(844,390),(1024,768),(1440,900)]:
            page.set_viewport_size({"width":width,"height":height})
            page.goto("http://localhost:8765/"+branch+"/",wait_until="domcontentloaded")
            page.locator("#onair").wait_for()
            if width in [390,1440]:
                page.screenshot(path=str(output/f"{branch}-{width}.png"),timeout=45000)
            overflow = page.evaluate("document.documentElement.scrollWidth > innerWidth")
            page.locator('header nav a[href="#archive"]').click()
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
