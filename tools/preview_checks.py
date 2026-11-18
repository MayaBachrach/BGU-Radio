"""Exercise routes in Chromium and render normal-motion comparison art from the published files."""
import base64
import os
import io
import json
import re
from pathlib import Path
from urllib.parse import quote

from PIL import Image
from playwright.sync_api import expect, sync_playwright

ROOT = Path("dist")
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
EDITIONS = ("soft-signal","after-hours","pixel-frequency")
SIZES = ([(320,640),(375,812),(390,844),(430,932),(600,860),(768,1024),(844,390),(1024,768),(1440,900)]
         if os.environ.get('BGU_FULL_PREVIEW') == '1' else [(390,844),(1440,900)])
HOST = "http://127.0.0.1:8765"
checks = []


def no_overflow(page, edition, width, route):
    excess = page.evaluate("document.documentElement.scrollWidth - innerWidth")
    assert excess <= 1, (edition,width,route,excess)


def screenshot(page, name):
    page.evaluate("document.fonts.ready")
    page.screenshot(path=str(SHOTS / (name+".png")), animations="allow", timeout=25000)


def home_images(page):
    # The featured stills are pre-optimized by prepare_media, and have intrinsic dimensions.
    images = page.locator('#home img:not([loading="lazy"])')
    images.evaluate_all("imgs => Promise.all(imgs.filter(i=>i.getClientRects().length).map(i=>i.decode()))")
    assert images.count() > 0


with sync_playwright() as api:
    browser = api.chromium.launch()
    for edition in EDITIONS:
        for width,height in SIZES:
            page = browser.new_page(viewport={"width":width,"height":height},has_touch=width<=600,reduced_motion="no-preference")
            errors = []
            page.on("pageerror",lambda error: errors.append(str(error)))
            page.goto(f"{HOST}/{edition}/",wait_until="domcontentloaded")
            print(edition,width,flush=True)
            expect(page.locator("#home h1")).to_be_visible()
            no_overflow(page,edition,width,"home")
            capture = width in (390,1440)
            if capture:
                home_images(page)
                screenshot(page,f"{edition}-{width}")
                if edition=="pixel-frequency":
                    expect(page.locator(".room-art")).to_be_visible()
                    assert page.locator(".room-art").evaluate("i=>i.naturalWidth>150")
                    page.locator(".hot-crate").click()
                else:
                    lead=page.locator(".pick-feature" if edition=="soft-signal" else ".press-image")
                    lead.hover()
                    lead.click()
                    expect(page.locator("#detail h1")).to_be_visible()
                    page.go_back()
                    expect(page.locator("#home h1")).to_be_visible()
            page.locator('[data-nav="archive"]').click()
            expect(page.locator("#groups .sleeve").first).to_be_visible()
            no_overflow(page,edition,width,"archive")
            if capture:
                page.locator("#groups .sleeve img").first.evaluate("i=>i.decode()")
                screenshot(page,f"archive-{edition}-{width}")
            page.locator("#query").fill("ספרות זה הקול")
            href="#program/"+quote("ספרות זה הקול",safe="")
            program=page.locator('#groups a[href="'+href+'"]')
            expect(program).to_be_visible()
            program.click()
            expect(page.locator("#detail h1")).to_have_text("ספרות זה הקול")
            no_overflow(page,edition,width,"program")
            if capture:
                screenshot(page,f"program-{edition}-{width}")
            page.locator("#detail .episode-row").first.click()
            expect(page.locator("#detail [data-listen]")).to_be_visible()
            no_overflow(page,edition,width,"episode")
            if capture:
                page.locator("#detail [data-listen]").click()
                assert page.locator("#radio-audio").evaluate("a=>a.src.startsWith('https://')")
                player_src=page.locator("#radio-audio").get_attribute("src")
                expect(page.locator("#receiver")).to_be_visible()
            page.locator('[data-nav="gallery"]').click()
            if capture:
                assert page.locator("#radio-audio").get_attribute("src")==player_src
            first=page.locator("#photo").get_attribute("src")
            page.locator("#next").click()
            assert first!=page.locator("#photo").get_attribute("src")
            no_overflow(page,edition,width,"gallery")
            page.locator('[data-nav="contact"]').click()
            expect(page.locator('a[href^="mailto:"]')).to_be_visible()
            no_overflow(page,edition,width,"contact")
            if capture:
                page.locator('[data-nav="archive"]').click()
                page.locator("#query").fill("")
                page.locator("#source").select_option(label="Spotify")
                expect(page.locator("#fresh")).to_be_hidden()
                page.locator("#groups .sleeve").first.click()
                page.locator("#detail [data-listen]").click()
                expect(page.locator("#external-player iframe")).to_be_attached()
                page.locator("#collapse").click()
                page.locator('[data-nav="contact"]').click()
                expect(page.locator("#external-player iframe")).to_be_attached()
                page.locator("#dock-play").click()
                expect(page.locator("#external-player iframe")).to_have_count(0)
                if edition=="pixel-frequency":
                    page.locator('[data-nav="home"]').click()
                    page.locator(".hot-mix").click()
                    expect(page.locator("#detail h1")).to_be_visible()
            assert not errors, (edition,width,errors)
            checks.append(dict(edition=edition,width=width,height=height,touch=width<=600,result="pass"))
            page.close()
        reduced=browser.new_page(reduced_motion="reduce")
        reduced.goto(f"{HOST}/{edition}/#archive",wait_until="domcontentloaded")
        reduced.locator("#groups .sleeve").first.press("Enter")
        expect(reduced.locator("#detail h1")).to_be_visible()
        reduced.close()
    browser.close()

(SHOTS/"checks.json").write_text(json.dumps(checks,indent=2),encoding="utf-8")


def inline_preview(match):
    with Image.open(SHOTS/match.group(1)) as shot:
        shot.thumbnail((720,620))
        buffer=io.BytesIO()
        shot.convert("RGB").save(buffer,format="WEBP",quality=83)
    return 'src="data:image/webp;base64,'+base64.b64encode(buffer.getvalue()).decode("ascii")+'"'


template=Path("compare.html").read_text(encoding="utf-8")
(ROOT/"index.html").write_text(re.sub(r'src="\./shots/([^"]+)"',inline_preview,template),encoding="utf-8")
# A downloadable high-resolution board for the design presentation.
board=Image.new("RGB",(1500,350),"#f4f1e9")
for col,edition in enumerate(EDITIONS):
    desktop=Image.open(SHOTS/f"{edition}-1440.png").convert("RGB")
    mobile=Image.open(SHOTS/f"{edition}-390.png").convert("RGB")
    desktop.thumbnail((365,320));mobile.thumbnail((110,310))
    x=1000-col*500
    board.paste(desktop,(x+5,(350-desktop.height)//2))
    board.paste(mobile,(x+380,(350-mobile.height)//2))
board.save(SHOTS/"three-editions.webp",quality=88)
