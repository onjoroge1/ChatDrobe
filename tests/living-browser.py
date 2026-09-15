"""HTTP/CSP browser tests for the real-renderer preview. External APIs are never involved."""
from pathlib import Path
import json
import os
import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:4185'
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':'4185'},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
    for _ in range(50):
        if server.poll() is not None: raise RuntimeError('Local server exited.')
        try:
            urllib.request.urlopen(BASE,timeout=1).close();break
        except OSError: time.sleep(.1)
    else: raise RuntimeError('Local server did not start.')
    with sync_playwright() as p:
        args={'headless':True}
        if os.environ.get('CHROMIUM_PATH'): args['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**args)
        context=browser.new_context(viewport={'width':1440,'height':1100})
        context.tracing.start(screenshots=True,snapshots=True,sources=True)
        page=context.new_page();errors=[];requests=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:requests.append(r.url))
        page.add_init_script('window.cspViolations=[];document.addEventListener("securitypolicyviolation",e=>window.cspViolations.push(e.violatedDirective));')
        page.clock.install()
        try:
            page.goto(BASE,wait_until='networkidle')
            preview=page.locator('[data-living-preview]');room=preview.locator('[data-env-live]').locator('.room')
            expect(preview).to_have_attribute('data-motion','false')
            assert not any('/living-renderer.js' in r or '/living-model.js' in r or '/living-runtime.css' in r for r in requests)
            page.get_by_role('button',name='Starship Journey',exact=True).click()
            expect(preview).to_have_attribute('data-ready','true')
            expect(room).to_have_attribute('data-world','starship')
            for name in ['living-renderer.js','living-model.js','living-runtime.css']: assert any('/'+name in r for r in requests),name
            page.get_by_role('button',name='Watch a 30-second journey',exact=True).click()
            page.clock.fast_forward(6500);expect(room).to_have_attribute('data-stage','1')
            page.get_by_role('button',name='Pause journey',exact=True).click()
            page.clock.fast_forward(60000);expect(room).to_have_attribute('data-stage','1')
            page.get_by_label('Journey progress').fill('65');expect(room).to_have_attribute('data-stage','3')
            expect(page.locator('[data-env-chapter]')).to_contain_text('Jupiter flyby')
            page.locator('.env-options summary').click()
            page.get_by_label('Atmosphere',exact=True).select_option('aurora');expect(room).to_have_attribute('data-weather','aurora')
            page.get_by_role('button',name='Enable motion',exact=True).click()
            page.get_by_label('Session moment').select_option('RESPONSE_STREAMING');expect(room).to_have_attribute('data-streaming','true')
            page.get_by_role('button',name='Portal mode',exact=True).click()
            live=page.locator('[data-env-live]').bounding_box();chat=page.locator('.env-chat').bounding_box()
            assert live['x']>=chat['x']+chat['width'],(live,chat)
            page.get_by_role('button',name='Rainy Tokyo Loft',exact=True).click();expect(room).to_have_attribute('data-world','tokyo')
            page.get_by_label('Atmosphere',exact=True).select_option('snow');expect(room).to_have_attribute('data-weather','snow')
            page.get_by_label('Session moment').select_option('USER_IDLE');expect(room).to_have_attribute('data-idle','true')
            page.get_by_label('Session moment').select_option('USER_RETURNED');expect(room).to_have_attribute('data-idle','false')
            page.get_by_role('button',name='Enable motion',exact=True).click()
            page.get_by_label('Session moment').select_option('FOCUS_STARTED');expect(room).to_have_attribute('data-focused','true')
            assert room.locator('.snow').evaluate('(e)=>getComputedStyle(e).animationPlayState')=='paused'
            page.emulate_media(reduced_motion='reduce');expect(preview).to_have_attribute('data-motion','false')
            page.get_by_label('Journey progress').fill('100');expect(room).to_have_attribute('data-arrived','true')
            expect(page.get_by_role('button',name='Reduced motion enabled')).to_be_disabled()
            page.emulate_media(reduced_motion='no-preference')
            page.get_by_role('button',name='Reset preview').click();expect(preview).to_have_attribute('data-motion','false')
            assert page.evaluate('window.cspViolations')==[],page.evaluate('window.cspViolations')
            page.get_by_role('button',name='Watch a 30-second journey',exact=True).click()
            before=page.locator('[data-env-progress]').input_value()
            page.evaluate('scrollTo(0,document.body.scrollHeight)');expect(preview).to_have_attribute('data-active','false')
            page.clock.fast_forward(60000);assert page.locator('[data-env-progress]').input_value()==before
            for width in [360,390,768,1440]:
                page.set_viewport_size({'width':width,'height':950})
                for route in ['/','/themes/','/premium/','/pricing/','/living-worlds/']:
                    response=page.goto(BASE+route,wait_until='networkidle');assert response.status==200
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,route)
                    expect(page.locator('main')).to_have_count(1);expect(page.locator('h1')).to_have_count(1)
            page.goto(BASE+'/premium/');expect(page.get_by_role('button',name='Watch a 30-second journey')).to_be_visible()
            page.get_by_role('button',name='Cozy Train Journey',exact=True).click();expect(room).to_have_attribute('data-world','train')
            page.get_by_label('Journey progress').fill('65');expect(room).to_have_attribute('data-stage','3')
            expect(page.locator('[data-env-chapter]')).to_contain_text('Snow country')
            page.screenshot(path=str(OUT/'living-motion-premium.png'),full_page=True)
            page.goto(BASE+'/themes/');expect(page.locator('.env-card')).to_have_count(3);expect(page.locator('.world-card')).to_have_count(15)
            page.locator('.env-card a[href="/living-worlds/#train"]').click();expect(page).to_have_url(BASE+'/living-worlds/#train')
            expect(page.locator('#train h2')).to_have_text('Cozy Train Journey')
            page.goto(BASE+'/pricing/');expect(page.locator('.price-card.plus .price')).to_have_text('$29 / year')
            assert 'proposed' not in page.locator('body').inner_text().lower()
            expect(page.get_by_text('No payment is being collected in this beta.',exact=False).first).to_be_visible()
            page.set_viewport_size({'width':390,'height':844});page.goto(BASE)
            page.get_by_role('button',name='Starship Journey',exact=True).focus();page.keyboard.press('Enter')
            expect(page.locator('[data-env-status]')).to_contain_text('Starship Journey')
            page.screenshot(path=str(OUT/'living-motion-mobile.png'),full_page=True)
            plain=browser.new_context(java_script_enabled=False);tab=plain.new_page();tab.goto(BASE+'/themes/')
            expect(tab.locator('.env-card a')).to_have_count(3)
            tab.locator('.env-card a[href="/living-worlds/#tokyo"]').click();expect(tab.locator('#tokyo h2')).to_have_text('Rainy Tokyo Loft')
            expect(tab.locator('.env-controls')).not_to_be_visible();plain.close()
            failure=browser.new_context();bad=failure.new_page();bad.route('**/assets/living-renderer.js',lambda route:route.abort())
            bad.goto(BASE);bad.get_by_role('button',name='Watch a 30-second journey',exact=True).click()
            expect(bad.locator('[data-env-error]')).to_contain_text('could not load')
            expect(bad.locator('[data-env-room="tokyo"]').first).to_be_visible();failure.close()
            assert not errors,errors
            assert all(url.startswith(BASE) for url in requests),'Unexpected third-party request'
            (OUT/'living-checks.json').write_text(json.dumps({'passed':['lazy renderer loading and existing CSP','accelerated chapters, pause and scrub','weather, idle, return, streaming and Quiet Focus','Portal geometry and reduced motion','offscreen pause','five pages at four widths','catalog, pricing, keyboard and no-JavaScript','load failure keeps the static fallback']}))
            print('8 Living website HTTP browser groups passed.')
        finally:
            context.tracing.stop(path=str(OUT/'living-trace.zip'));browser.close()
finally:
    server.terminate()
    try:server.wait(timeout=5)
    except subprocess.TimeoutExpired:server.kill();server.wait()
