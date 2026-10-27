# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8080"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_context().new_page()
    page.goto(BASE + "/", wait_until="domcontentloaded")

    for code in ["en", "zh", "ko", "ja"]:
        page.add_init_script(f"localStorage.setItem('d4_lang', '{code}')")
        page.goto(BASE + "/dish/3")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        btn = page.locator(".ctrl-btn:has-text('Nghe'), .ctrl-btn[aria-label*='Nghe'], .audio-player")
        st = page.evaluate("""() => {
          const a = document.querySelector('.audio-player audio') || document.querySelector('audio');
          return a ? { src: a.currentSrc && a.currentSrc.split('/').pop(), ready: a.readyState } : null;
        }""")
        # click the listen-dish button for the dish player
        dish_btn = page.locator("button.ctrl-btn:has(span)").filter(has_text="Nghe")
        if dish_btn.count():
            dish_btn.first.click()
            page.wait_for_timeout(1200)
            clicked = page.evaluate("""() => {
              const a = document.querySelector('audio');
              if (!a) return null;
              a.load();
              return { src: a.currentSrc && a.currentSrc.split('/').pop(), ready: a.readyState };
            }""")
        print(code, "guide player ->", st)
    browser.close()
