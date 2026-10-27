# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8080"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()

    def audio_state():
        return page.evaluate("""() => {
          const a = document.querySelector('.audio-player audio');
          return a ? { src: a.currentSrc.split('/').pop(), ready: a.readyState } : null;
        }""")

    page.goto(BASE + "/place/1")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    print("vi ->", audio_state())

    # fresh guest: forced banner is open
    for name in ["English", "中文", "한국어", "日本語"]:
        pill = page.locator(f".lang-banner .lang-pill:has-text('{name}')")
        if pill.count() == 0:
            # banner closed already — reopen via navbar globe
            try:
                page.click(".lang-nav-btn", timeout=3000)
                page.wait_for_timeout(500)
            except Exception:
                page.wait_for_timeout(500)
            pill = page.locator(f".lang-banner .lang-pill:has-text('{name}')")
        pill.first.click()
        page.wait_for_timeout(2500)
        print(name, "->", audio_state())
    print("DONE")
    browser.close()
