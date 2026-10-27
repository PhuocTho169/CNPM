# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8080"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_context().new_page()
    page.goto(BASE + "/", wait_until="domcontentloaded")

    for code in ["ko", "ja", "en", "zh"]:
        page.add_init_script(f"localStorage.setItem('d4_lang', '{code}')")
        page.goto(BASE + "/place/1")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1800)
        st = page.evaluate("""() => {
          const a = document.querySelector('.audio-player audio');
          if (!a) return {src: null, ready: -1};
          return { src: a.currentSrc && a.currentSrc.split('/').pop(), ready: a.readyState };
        }""")
        print(code, "->", st)
    browser.close()
