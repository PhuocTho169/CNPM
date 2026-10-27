from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8080'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 420, 'height': 900})
    msgs = []
    errors = []
    page.on('console', lambda m: msgs.append(f'{m.type}: {m.text}'))
    page.on('pageerror', lambda e: errors.append(str(e)))
    failed = []
    page.on('requestfailed', lambda r: failed.append(f'{r.url} -> {r.failure}'))

    page.goto(f'{BASE}/place/1')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)

    print('html_len=', len(page.content()))
    print('banner=', page.locator('.lang-banner').count())
    print('spinner=', page.locator('.spinner').count())
    print('page_errors=', errors[:5])
    print('failed_requests=', failed[:8])
    print('console_sample=', msgs[:12])
    browser.close()
