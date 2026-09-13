"""Real HTTP Chromium checks. Fails rather than disguising blocked navigation as a pass."""
from pathlib import Path
import json
import os
import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / 'test-results'
RESULTS.mkdir(exist_ok=True)
BASE = 'http://127.0.0.1:4174'
checks = []
server = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT,
                          env={**os.environ, 'PORT': '4174'},
                          stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
try:
    for _ in range(50):
        if server.poll() is not None:
            raise RuntimeError('Preview server exited: ' + server.stderr.read().decode())
        try:
            urllib.request.urlopen(BASE, timeout=1).close()
            break
        except OSError:
            time.sleep(0.1)
    else:
        raise RuntimeError('Preview server did not become ready.')
    with sync_playwright() as p:
        launch = {'headless': True}
        if os.environ.get('CHROMIUM_PATH'):
            launch['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**launch)
        context = browser.new_context(viewport={'width': 1440, 'height': 980}, accept_downloads=True)
        context.tracing.start(screenshots=True, snapshots=True, sources=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            manifest = json.loads((ROOT / 'dist/build-manifest.json').read_text())
            for route in manifest['routes']:
                response = page.goto(BASE + route, wait_until='networkidle')
                assert response.status == 200, route
                expect(page.locator('h1')).to_have_count(1)
                expect(page.locator('main')).to_be_visible()
                assert 'script-src' in response.headers.get('content-security-policy', '')
            checks.append('All 22 routes load over HTTP with security headers and one main heading')
            assert page.goto(BASE + '/not-a-real-page/').status == 404
            checks.append('Unknown paths return HTTP 404')
            page.goto(BASE)
            page.get_by_role('button', name='Preview Circuit Bay', exact=True).click()
            expect(page.locator('[data-preview-name]')).to_have_text('Circuit Bay')
            page.get_by_role('button', name='Compare original', exact=True).click()
            expect(page.locator('[data-preview-name]')).to_have_text('Unthemed illustration')
            page.get_by_role('button', name='Back to my world', exact=True).click()
            checks.append('World switching and original comparison work')
            page.goto(BASE + '/themes/')
            page.get_by_label('Search worlds').fill('cat')
            expect(page.locator('.world-card:visible')).to_have_count(2)
            page.get_by_role('button', name='Reset filters').click()
            page.get_by_label('Collection', exact=True).select_option('Mecha')
            expect(page.locator('.world-card:visible')).to_have_count(2)
            page.get_by_label('Launch plan').select_option('free')
            expect(page.locator('.world-card:visible')).to_have_count(1)
            page.get_by_role('button', name='Reset filters').click()
            page.get_by_label('Search worlds').fill('no-world-like-this')
            expect(page.locator('#catalog-empty')).to_be_visible()
            page.get_by_role('button', name='Reset filters').click()
            page.get_by_role('button', name='Favorite Mooncat Café', exact=True).click()
            page.get_by_label('Favorites only').check()
            page.reload()
            expect(page.locator('.world-card:visible')).to_have_count(1)
            expect(page.get_by_role('button', name='Favorite Mooncat Café', exact=True)).to_have_attribute('aria-pressed', 'true')
            checks.append('Search, combined filters, empty state and persisted favorites work')
            page.goto(BASE + '/themes/mooncat/')
            page.get_by_label('Font family').select_option('serif')
            page.get_by_label('Text size').fill('20')
            assert page.locator('#reading-sample').evaluate('(n)=>getComputedStyle(n).fontSize') == '20px'
            page.get_by_label('Show companion').uncheck()
            page.get_by_label('Focus mode').check()
            assert page.locator('.mock-sidebar').is_hidden()
            with page.expect_download() as event:
                page.get_by_role('button', name='Save custom appearance').click()
            data = json.loads(Path(event.value.path()).read_text())
            assert data['format'] == 'chatdrobe-appearance'
            assert data['prefs']['fontSize'] == 20 and data['prefs']['font'] == 'serif'
            assert data['prefs']['focus'] is True and data['prefs']['motion'] is False
            page.get_by_role('button', name='Copy look link').click()
            shared = page.locator('#share-url').input_value()
            page.goto(shared)
            expect(page.get_by_label('Font family')).to_have_value('serif')
            expect(page.get_by_label('Text size')).to_have_value('20')
            page.locator('#import-look').set_input_files({'name': 'bad.json', 'mimeType': 'application/json', 'buffer': b'{"format":"bad"}'})
            expect(page.locator('#toast')).to_contain_text('version 1 appearance')
            page.locator('#import-look').set_input_files({'name': 'ok.json', 'mimeType': 'application/json', 'buffer': json.dumps(data).encode()})
            expect(page.locator('#toast')).to_contain_text('Appearance loaded')
            checks.append('Reading controls, real JSON download/import and share-link round trip work')
            for width in [360, 390, 768, 1440]:
                page.set_viewport_size({'width': width, 'height': 900})
                for route in ['/', '/themes/', '/themes/mooncat/', '/pricing/', '/install/']:
                    page.goto(BASE + route)
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (width, route)
            checks.append('Five key pages fit 360/390/768/1440 pixel viewports')
            page.set_viewport_size({'width': 390, 'height': 844})
            page.goto(BASE)
            page.get_by_role('button', name='Menu', exact=True).click()
            expect(page.get_by_role('link', name='Worlds', exact=True)).to_be_visible()
            page.keyboard.press('Escape')
            expect(page.get_by_role('button', name='Menu', exact=True)).to_be_focused()
            checks.append('Mobile menu supports Escape and focus return')
            page.locator('body').click(position={'x': 1, 'y': 1})
            page.screenshot(path=str(RESULTS / 'mobile-home.png'), full_page=True)
            page.set_viewport_size({'width': 1440, 'height': 980})
            page.goto(BASE)
            page.screenshot(path=str(RESULTS / 'desktop-home.png'), full_page=True)
            context2 = browser.new_context(java_script_enabled=False)
            page2 = context2.new_page()
            page2.goto(BASE + '/themes/')
            expect(page2.locator('.world-card')).to_have_count(12)
            page2.goto(BASE + '/themes/mooncat/')
            expect(page2.get_by_role('link', name='Download appearance')).to_be_visible()
            context2.close()
            checks.append('Catalog and default appearance links work without JavaScript')
            assert not errors, errors
            checks.append('No uncaught page JavaScript errors')
            (RESULTS / 'browser-results.json').write_text(json.dumps({'passed': checks}, indent=2))
            print(f'{len(checks)} HTTP browser test groups passed.')
        finally:
            context.tracing.stop(path=str(RESULTS / 'trace.zip'))
            browser.close()
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()
