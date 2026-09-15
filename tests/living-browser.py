"""Real HTTP checks of the Living-first website. No simulated HTTP pass on blocked hosts."""
from pathlib import Path
import json
import os
import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:4185'
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
server = subprocess.Popen(['node', 'scripts/serve.mjs'], cwd=ROOT,
    env={**os.environ, 'PORT':'4185'}, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
try:
    for _ in range(50):
        if server.poll() is not None:
            raise RuntimeError('Local server exited unexpectedly.')
        try:
            urllib.request.urlopen(BASE, timeout=1).close()
            break
        except OSError:
            time.sleep(.1)
    else:
        raise RuntimeError('Local server did not start.')
    with sync_playwright() as p:
        args = {'headless':True}
        if os.environ.get('CHROMIUM_PATH'):
            args['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**args)
        context = browser.new_context(viewport={'width':1440,'height':1000})
        context.tracing.start(screenshots=True,snapshots=True,sources=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        try:
            page.goto(BASE,wait_until='networkidle')
            expect(page.locator('h1')).to_have_count(1)
            expect(page.locator('[data-living-preview]')).to_have_attribute('data-motion','false')
            for id, name in [('starship','Starship Journey'),('train','Cozy Train Journey'),('tokyo','Rainy Tokyo Loft')]:
                page.get_by_role('button', name=name,exact=True).click()
                expect(page.locator('[data-env-status]')).to_contain_text(name)
                expect(page.locator(f'[data-living-preview] [data-env-room="{id}"]')).to_be_visible()
            page.get_by_role('button',name='Night view',exact=True).click()
            expect(page.locator('[data-living-preview]')).to_have_attribute('data-day','night')
            page.get_by_role('button',name='Enable motion',exact=True).click()
            expect(page.locator('[data-living-preview]')).to_have_attribute('data-motion','true')
            page.emulate_media(reduced_motion='reduce')
            expect(page.locator('[data-living-preview]')).to_have_attribute('data-motion','false')
            expect(page.get_by_role('button',name='Reduced motion enabled')).to_be_disabled()
            page.emulate_media(reduced_motion='no-preference')
            page.goto(BASE)
            page.screenshot(path=str(OUT/'living-home-desktop.png'),full_page=False)
            for width in [360,390,768,1440]:
                page.set_viewport_size({'width':width,'height':950})
                for route in ['/','/themes/','/premium/','/pricing/','/living-worlds/']:
                    response = page.goto(BASE+route,wait_until='networkidle')
                    assert response.status == 200,route
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),(width,route)
                    expect(page.locator('main')).to_have_count(1)
                    expect(page.locator('h1')).to_have_count(1)
            page.goto(BASE+'/themes/')
            expect(page.locator('.env-card')).to_have_count(3)
            expect(page.locator('.world-card')).to_have_count(15)
            page.locator('.env-card a[href="/living-worlds/#train"]').click()
            expect(page).to_have_url(BASE+'/living-worlds/#train')
            expect(page.locator('#train h2')).to_have_text('Cozy Train Journey')
            page.goto(BASE+'/pricing/')
            expect(page.locator('.price-card.plus .price')).to_have_text('$29 / year')
            assert 'proposed' not in page.locator('body').inner_text().lower()
            expect(page.get_by_text('No payment is being collected in this beta.',exact=False).first).to_be_visible()
            page.screenshot(path=str(OUT/'living-pricing-desktop.png'),full_page=True)
            page.set_viewport_size({'width':390,'height':844})
            page.goto(BASE)
            page.get_by_role('button',name='Starship Journey',exact=True).focus()
            page.keyboard.press('Enter')
            expect(page.locator('[data-env-status]')).to_contain_text('Starship Journey')
            page.screenshot(path=str(OUT/'living-home-mobile.png'),full_page=True)
            plain = browser.new_context(java_script_enabled=False)
            tab = plain.new_page()
            tab.goto(BASE+'/themes/')
            expect(tab.locator('.env-card a')).to_have_count(3)
            tab.locator('.env-card a[href="/living-worlds/#tokyo"]').click()
            expect(tab.locator('#tokyo h2')).to_have_text('Rainy Tokyo Loft')
            expect(tab.locator('.env-controls')).not_to_be_visible()
            plain.close()
            assert not errors,errors
            (OUT/'living-checks.json').write_text(json.dumps({'passed':['world switching, night, opt-in motion and reduced motion','five page layouts at four widths','catalog links and no-JavaScript discovery','annual pricing and checkout disclosure','keyboard operation and no uncaught JS errors']}))
            print('5 Living website HTTP browser groups passed.')
        finally:
            context.tracing.stop(path=str(OUT/'living-trace.zip'))
            browser.close()
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()
