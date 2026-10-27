from playwright.sync_api import sync_playwright

BASE = 'http://localhost:8080'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 420, 'height': 900})
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    page.goto(f'{BASE}/place/1')
    page.wait_for_load_state('networkidle')

    # Wait for banner (guest session + /me need a beat)
    page.wait_for_selector('.lang-banner', timeout=15000)
    print('STEP1 banner_first=', True)
    page.screenshot(path='tmp/s1_banner.png')

    # Pick 1st free language
    page.locator('.lang-pill').first.click()
    page.wait_for_timeout(1000)
    print('STEP2 banner_closed_after_1st=', page.locator('.lang-banner').count() == 0)
    page.screenshot(path='tmp/s2_after_first.png')

    # Re-open from navbar globe button, pick 2nd free language
    page.locator('.lang-nav-btn').click()
    page.wait_for_selector('.lang-banner', timeout=5000)
    pills = page.locator('.lang-pill')
    print('STEP3 reopened, pills=', pills.count())
    # pick an unlocked? -> 1st is selected; pick the 2nd language (next free slot)
    pills.nth(1).click()
    page.wait_for_timeout(1000)
    print('STEP4 banner_closed_after_2nd=', page.locator('.lang-banner').count() == 0)

    # Re-open and pick a THIRD -> pay panel
    page.locator('.lang-nav-btn').click()
    page.wait_for_selector('.lang-banner', timeout=5000)
    page.locator('.lang-pill.locked').first.click()  # locked chip with no free slots -> pay panel
    page.wait_for_timeout(500)
    pay = page.locator('.lang-pay-panel button')
    print('STEP5 pay_button_visible=', pay.count() > 0)
    page.screenshot(path='tmp/s5_paypanel.png')
    if pay.count():
        pay.first.click()
        page.wait_for_timeout(2500)
        banner_after = page.locator('.lang-banner')
        print('STEP6 paying_done_banner_closed=', banner_after.count() == 0)
        page.screenshot(path='tmp/s6_unlocked.png')
        # Verify all chips are unlocked in DB sense: open banner again — no locked chips
        page.locator('.lang-nav-btn').click()
        page.wait_for_selector('.lang-banner', timeout=5000)
        locked = page.locator('.lang-pill.free-available').count() + page.locator('.lang-pill.locked').count()
        print('STEP7 locked_chips_left=', locked)
        page.screenshot(path='tmp/s7_all_unlocked.png')

    print('page_errors=', errors[:3])
    browser.close()
