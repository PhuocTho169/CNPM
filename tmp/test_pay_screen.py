from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8080'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 420, 'height': 900})
    page = ctx.new_page()

    page.goto(f'{BASE}/place/1')
    page.wait_for_load_state('networkidle')
    page.wait_for_selector('.lang-banner', timeout=15000)

    # 2 free selections
    page.locator('.lang-pill').first.click()
    page.wait_for_timeout(1000)
    page.locator('.lang-nav-btn').click()
    page.wait_for_selector('.lang-banner', timeout=5000)
    page.locator('.lang-pill').nth(1).click()
    page.wait_for_timeout(1000)

    # Third language -> pay panel -> tap pay -> capture BOTH pay screens
    page.locator('.lang-nav-btn').click()
    page.wait_for_selector('.lang-banner', timeout=5000)
    page.locator('.lang-pill.locked').first.click()
    page.wait_for_selector('.lang-pay-panel button', timeout=5000)
    page.locator('.lang-pay-panel button').first.click()
    page.wait_for_selector('.pay-overlay', timeout=5000)
    page.screenshot(path='tmp/pay_processing.png')
    print('processing_overlay_shown=', page.locator('.pay-card .pay-spinner').count() > 0)

    page.wait_for_timeout(2200)
    success_shown = page.locator('.pay-card .pay-check').count() > 0
    print('success_overlay_shown=', success_shown)
    page.screenshot(path='tmp/pay_success.png')

    page.wait_for_timeout(2000)
    print('both_closed=', page.locator('.pay-overlay').count() == 0 and page.locator('.lang-banner').count() == 0)
