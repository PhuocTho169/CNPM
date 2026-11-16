"""Repeated timing/request measurement so the before/after numbers are not a single warm-up hit."""
import json
import os
import sys
import time

from playwright.sync_api import sync_playwright

BASE = 'http://localhost:5173'
OUT = os.path.dirname(os.path.abspath(__file__))
TAG = sys.argv[1] if len(sys.argv) > 1 else 'after'


def login(page):
    page.goto(f'{BASE}/admin/login')
    page.fill('#email', 'admin@district4.local')
    page.fill('#password', 'Admin@123456')
    page.click('form.login-card button.btn-orange')
    page.wait_for_url('**/admin', timeout=15000)
    page.wait_for_selector('.admin-sidebar', timeout=15000)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    ctx = browser.new_context(viewport={'width': 1440, 'height': 950})
    page = ctx.new_page()
    login(page)

    # warm the module graph once, then measure 3 clean navigations
    page.goto(f'{BASE}/admin/dishes')
    page.wait_for_selector('.admin-table tbody tr', timeout=20000)
    times = []
    for _ in range(3):
        t0 = time.perf_counter()
        page.goto(f'{BASE}/admin/dishes')
        page.wait_for_selector('.admin-table tbody tr', timeout=20000)
        times.append(round((time.perf_counter() - t0) * 1000))
        time.sleep(0.4)

    req_counts = []
    page.goto(f'{BASE}/admin/places')
    page.wait_for_selector('.admin-table tbody tr', timeout=20000)
    page.wait_for_timeout(500)
    seen = []
    page.on('request', lambda r: seen.append(r.url) if '/places?' in r.url else None)
    for _ in range(2):
        seen.clear()
        box = page.locator('input[type="search"]').first
        box.fill('')
        box.click()
        page.keyboard.type('banh mi', delay=110)
        page.wait_for_timeout(1400)
        req_counts.append(len(seen))
    ctx.close()
    browser.close()

result = {'dishes_ms_runs': times, 'dishes_ms_min': min(times), 'places_requests_runs': req_counts}
with open(os.path.join(OUT, f'measure2_{TAG}.json'), 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print(TAG, json.dumps(result))
