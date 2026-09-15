"""Actual HTTP/CSP check for the manual quiet-companion website demonstration."""
from pathlib import Path
import os, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:4186'
server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':'4186'},stdout=subprocess.DEVNULL)
try:
    for _ in range(50):
        try:
            urllib.request.urlopen(BASE,timeout=1).close();break
        except OSError:time.sleep(.1)
    else:raise RuntimeError('Server unavailable')
    with sync_playwright() as p:
        args={'headless':True}
        if os.environ.get('CHROMIUM_PATH'):args['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**args)
        page=browser.new_page(viewport={'width':1440,'height':1500})
        page.add_init_script('window.violations=[];document.addEventListener("securitypolicyviolation",e=>violations.push(e.violatedDirective));')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE,wait_until='networkidle')
        page.get_by_role('button',name='Rainy Tokyo Loft',exact=True).click()
        preview=page.locator('[data-living-preview]');room=preview.locator('[data-env-live]').locator('.room')
        expect(preview).to_have_attribute('data-ready','true')
        expect(room.locator('.caption')).to_have_count(0)
        expect(page.locator('[data-env-badge]')).to_be_hidden()
        page.locator('.env-options summary').click()
        for event,part,animation in [('COMPANION_BLINK','.quiet-cat-eyes','quiet-blink'),('COMPANION_GROOM','.quiet-cat-paw','quiet-paw'),('COMPANION_SCRATCH','.quiet-cat-hind','quiet-scratch')]:
            page.get_by_label('Session moment').select_option(event)
            expect(room).to_have_attribute('data-motion','true')
            assert room.locator(part).evaluate('(n)=>getComputedStyle(n).animationName')==animation
            assert room.locator(part).evaluate('(n)=>getComputedStyle(n).animationIterationCount')=='1'
        page.get_by_label('Session moment').select_option('FOCUS_STARTED')
        expect(room).to_have_attribute('data-motion','false')
        expect(room).to_have_attribute('data-pose','rest')
        page.get_by_role('button',name='Starship Journey',exact=True).click()
        # A disabled <option> is not a disabled <select>. Check the native option
        # property directly instead of the generic control-actionability matcher.
        expect(page.locator('[value="COMPANION_GROOM"]')).to_have_js_property('disabled',True)
        page.get_by_label('Session moment').select_option('DRONE_INSPECT')
        expect(room).to_have_attribute('data-pose','inspect')
        assert room.locator('.drone').evaluate('(n)=>getComputedStyle(n).animationName')=='quiet-inspect'
        page.emulate_media(reduced_motion='reduce')
        expect(room).to_have_attribute('data-motion','false')
        assert page.evaluate('violations')==[]
        assert not errors,errors
        browser.close()
        print('Quiet companion HTTP test passed: finite actions, hidden labels, focus/reduced-motion gates and unchanged CSP.')
finally:
    server.terminate()
    try:server.wait(timeout=5)
    except subprocess.TimeoutExpired:server.kill();server.wait()
