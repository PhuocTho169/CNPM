# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8080"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    requests = []
    page.on("response", lambda r: requests.append((r.url, r.status)))

    # 1) Admin login
    page.goto(BASE + "/admin/login")
    page.wait_for_load_state("networkidle")
    page.fill("#email", "admin@district4.local")
    page.fill("#password", "Admin@123456")
    page.click("button.btn-orange")
    page.wait_for_url("**/admin", timeout=15000)
    page.wait_for_load_state("networkidle")
    print("A1 admin dashboard loaded:", "/admin" in page.url)

    # 2) Go to public site while logged in -> navbar should show user + logout
    page.goto(BASE + "/")
    page.wait_for_load_state("networkidle")
    nav = page.locator(".navbar")
    body = nav.inner_text()
    logout_btn = page.locator(".nav-user .logout-btn")
    print("A2 navbar shows user name:", ("admin" in body.lower()) or ("@" in body))
    visible = False
    try:
        visible = logout_btn.is_visible()
    except Exception:
        visible = False
    print("A3 logout button visible:", visible)

    # 3) Click logout -> user disappears from navbar
    if visible:
        logout_btn.click()
        page.wait_for_load_state("networkidle")
        gone = page.locator(".nav-user .logout-btn")
        still = False
        try:
            still = gone.is_visible()
        except Exception:
            still = False
        print("A4 logout clicked, button hidden:", not still)

    # 4) Place guide: audio player + file loads
    page.goto(BASE + "/place/1")
    page.wait_for_load_state("networkidle")
    audio_ok = False
    audio_err = False
    for url, status in requests:
        if "/uploads/audio/" in url:
            if status == 200:
                audio_ok = True
            if status >= 400:
                audio_err = True
    print("B1 guide page audio file served 200:", audio_ok, "| any 4xx/5xx audio:", audio_err)
    play = page.locator(".audio-player")
    print("B2 audio player present:", play.count() > 0)

    # 5) Switch language via banner (open-language-banner event button) to en, zh, ko, ja
    page.click(".lang-nav-btn")
    page.wait_for_timeout(500)
    lang_note = page.inner_text("body")
    codes = ["English", "中文", "한국어", "日本語"]
    for name in codes:
        el = page.locator(f".lang-banner .lang-pill:has-text('{name}')")
        if el.count():
            el.first.click()
            page.wait_for_timeout(700)
            page.locator(".audio-player")
            got200 = any(["/uploads/audio/" in u and s == 200 for u, s in requests])
            print(f"B3 {name} selected -> audio 200: {got200}")
        else:
            print(f"B3 {name} pill not found")
    browser.close()
