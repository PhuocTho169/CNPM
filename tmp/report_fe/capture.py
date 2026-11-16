"""Capture before/after evidence for the frontend-only report (Playwright + installed Chrome)."""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)))
TAG = sys.argv[1] if len(sys.argv) > 1 else 'after'


def login(page):
    page.goto(f'{BASE}/admin/login')
    page.fill('#email', 'admin@district4.local')
    page.fill('#password', 'Admin@123456')
    page.click('form.login-card button.btn-orange')
    page.wait_for_url('**/admin', timeout=15000)
    page.wait_for_selector('.admin-sidebar', timeout=15000)


def main():
    result = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)

        # --- public place guide: is the tips section rendered twice? ---
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = ctx.new_page()
        page.goto(f'{BASE}/place/1')
        page.wait_for_selector('.lang-banner', timeout=15000)
        page.locator('.lang-pill').first.click()
        page.wait_for_selector('.lang-banner', state='detached', timeout=10000)
        page.wait_for_timeout(600)
        heads = page.eval_on_selector_all(
            '.guide-section h2', 'els => els.map(e => e.textContent.trim())')
        result['place_headings'] = heads
        result['tips_count'] = sum(1 for h in heads if h.lower().startswith('mẹo'))
        ctx.close()

        # --- admin pages ---
        ctx = browser.new_context(viewport={'width': 1440, 'height': 950})
        page = ctx.new_page()
        login(page)

        page.goto(f'{BASE}/admin')
        page.wait_for_selector('.chart-box', timeout=20000)
        page.wait_for_timeout(800)
        card = page.locator('.chart-box').filter(has_text='Signature dishes').first
        card.screenshot(path=os.path.join(OUT, f'fe_dash_{TAG}.png'))
        result['dash_signature_bars'] = page.locator('.chart-box').filter(
            has_text='Signature dishes').locator('.bar-row').count()
        result['dash_signature_items'] = card.locator('.signature-list li').count()

        page.goto(f'{BASE}/admin/languages')
        page.wait_for_selector('.admin-form', timeout=20000)
        page.wait_for_timeout(600)
        page.locator('.admin-form').screenshot(path=os.path.join(OUT, f'fe_langs_{TAG}.png'))
        btn = page.locator('.admin-form button.btn-orange').first
        result['lang_button_disabled'] = btn.is_disabled()

        # dishes: time from navigation to the first rendered row
        page.goto(f'{BASE}/admin/dishes')
        t0 = time.perf_counter()
        page.wait_for_selector('.admin-table tbody tr', timeout=20000)
        result['dishes_ms'] = round((time.perf_counter() - t0) * 1000)

        # places: how many /places requests does typing trigger?
        page.goto(f'{BASE}/admin/places')
        page.wait_for_selector('.admin-table tbody tr', timeout=20000)
        page.wait_for_timeout(700)
        seen = []
        page.on('request', lambda r: seen.append(r.url) if '/places?' in r.url else None)
        box = page.locator('input[type="search"]').first
        box.click()
        page.keyboard.type('banh mi', delay=110)
        page.wait_for_timeout(1400)
        result['places_requests'] = sum(1 for u in seen if '/places?' in u)
        result['places_q_requests'] = sum(1 for u in seen if 'q=banh' in u)
        ctx.close()
        browser.close()

    path = os.path.join(OUT, f'measure_{TAG}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(TAG, json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
