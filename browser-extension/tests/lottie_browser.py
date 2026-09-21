"""Real packaged Lottie/ESM/CSP and lifecycle fixture. No installed-Chrome or live ChatGPT claim."""
import functools
import gzip
import http.server
import json
import os
import shutil
import threading
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'preview'
OUT.mkdir(exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript'}
    def end_headers(self):
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; object-src 'none'; connect-src 'none'; base-uri 'none'")
        super().end_headers()
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
checks=[]
def passed(message):checks.append(message);print('PASS:',message,flush=True)
def wait_until(page,predicate,description,timeout_ms=10000):
    """Poll from the test process: page-side wait_for_function compiles strings with eval.

    Direct DevTools evaluation is supported under CSP; an in-page polling function
    calling eval is not. Keep the page's actual script-src self policy intact.
    """
    deadline=time.monotonic()+timeout_ms/1000
    while time.monotonic()<deadline:
        if predicate():return
        page.wait_for_timeout(50)
    raise AssertionError('Timed out waiting for '+description)
try:
    with sync_playwright() as p:
        options={'headless':True,'args':['--no-sandbox']}
        executable=os.getenv('CHROMIUM_PATH') or shutil.which('chromium')
        if executable:options['executable_path']=executable
        browser=p.chromium.launch(**options)
        page=browser.new_page(viewport={'width':780,'height':700})
        errors=[];requests=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda request:requests.append(request.url))
        page.goto(origin+'/tests/lottie-fixture.html')
        wait_until(page,lambda:page.evaluate('() => window.pilot !== undefined'),'fixture module readiness')
        assert not any('lottie-light-5.13.0' in url for url in requests)
        expect(page.locator('#fallback')).to_be_visible()
        passed('Still uses the existing SVG without downloading or parsing the player')
        page.evaluate('''()=>{window.pilotRafCallbacks=0;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(time=>{window.pilotRafCallbacks++;callback(time);});}''')
        page.get_by_role('button',name='Play',exact=True).click()
        wait_until(page,lambda:page.evaluate('() => pilot.diagnostics().loaded && pilot.diagnostics().frame >= 5'),'loaded player reaching frame 5')
        expect(page.locator('#animation svg')).to_have_count(1)
        assert page.locator('#animation path').count()==2
        assert page.evaluate('pilot.diagnostics().playing')
        assert page.evaluate('window.lottie === undefined && window.bodymovin === undefined')
        assert not any('must-not-load' in url for url in requests)
        page.screenshot(path=str(OUT/'lottie-tokyo-steam.png'))
        passed('Real SVG light runtime paints two keyframed paths under script-src self without globals or page auto-discovery')
        for patch in [{'busy':True},{'streaming':True},{'focused':True,'quiet':True},{'motion':False},{'active':False},{'pose':'sleep'}]:
            page.evaluate('patch=>updatePilot({...{motion:true,active:true,busy:false,streaming:false,focused:false,quiet:false,pose:"rest"},...patch})',patch)
            assert not page.evaluate('pilot.diagnostics().playing')
            frame=page.evaluate('pilot.diagnostics().frame');page.wait_for_timeout(180)
            assert page.evaluate('pilot.diagnostics().frame')==frame
            page.evaluate('updatePilot({motion:true,active:true,busy:false,streaming:false,focused:false,quiet:false,pose:"rest"})')
            wait_until(page,lambda:page.evaluate('frame => pilot.diagnostics().frame !== frame',frame),'frame advance after resume')
        page.emulate_media(reduced_motion='reduce')
        assert not page.evaluate('pilot.diagnostics().playing')
        frame=page.evaluate('pilot.diagnostics().frame');page.wait_for_timeout(180)
        assert page.evaluate('pilot.diagnostics().frame')==frame
        page.emulate_media(reduced_motion='no-preference')
        wait_until(page,lambda:page.evaluate('() => pilot.diagnostics().playing'),'resume after reduced motion')
        page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
        assert not page.evaluate('pilot.diagnostics().playing')
        frame=page.evaluate('pilot.diagnostics().frame');page.wait_for_timeout(180)
        assert page.evaluate('pilot.diagnostics().frame')==frame
        page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))")
        wait_until(page,lambda:page.evaluate('() => pilot.diagnostics().playing'),'resume after visibility restoration')
        assert sum('lottie-light-5.13.0' in url for url in requests)==1
        passed('Busy/streaming/Quiet Focus/Still/sleep/inactive/reduced-motion/hidden states freeze frames and resume the same player')
        session=page.context.new_cdp_session(page)
        session.send('Performance.enable')
        def metrics():return {item['name']:item['value'] for item in session.send('Performance.getMetrics')['metrics']}
        active_before=metrics();raf_before=page.evaluate('pilotRafCallbacks');page.wait_for_timeout(1200);active_after=metrics()
        active_callbacks=page.evaluate('pilotRafCallbacks')-raf_before
        assert active_callbacks>0
        page.get_by_role('button',name='Busy',exact=True).click();page.wait_for_timeout(100)
        paused_before=metrics();raf_before=page.evaluate('pilotRafCallbacks');page.wait_for_timeout(1200);paused_after=metrics()
        paused_callbacks=page.evaluate('pilotRafCallbacks')-raf_before
        assert paused_callbacks==0, paused_callbacks
        performance={'sampleMilliseconds':1200,'activeTaskMilliseconds':round((active_after['TaskDuration']-active_before['TaskDuration'])*1000,3),'pausedTaskMilliseconds':round((paused_after['TaskDuration']-paused_before['TaskDuration'])*1000,3),'activeRafCallbacks':active_callbacks,'pausedRafCallbacks':paused_callbacks,'activeHeapDeltaBytes':active_after['JSHeapUsedSize']-active_before['JSHeapUsedSize']}
        passed('Paused player stops scheduling RAF; active/paused renderer task time and heap delta recorded (fixture measurements only)')
        nodes=page.locator('#animation *').count()
        assert nodes<=25, nodes
        assert all(url.startswith(origin+'/') for url in requests),requests
        assert page.evaluate('window.policyViolations')==[],page.evaluate('window.policyViolations')
        page.get_by_role('button',name='Dispose').click()
        expect(page.locator('#animation svg')).to_have_count(0)
        expect(page.locator('#fallback')).to_be_visible()
        assert page.evaluate('pilot.diagnostics().disposed && !pilot.diagnostics().playing')
        page.wait_for_timeout(100);raf_before=page.evaluate('pilotRafCallbacks');page.wait_for_timeout(200)
        assert page.evaluate('pilotRafCallbacks')==raf_before
        assert not errors,errors
        passed('No remote requests or CSP violations; teardown removes player SVG and restores fallback')
        failure=browser.new_page()
        failure.route('**/lottie-light-5.13.0.mjs',lambda route:route.abort())
        failure.goto(origin+'/tests/lottie-fixture.html')
        failure.get_by_role('button',name='Play',exact=True).click()
        wait_until(failure,lambda:failure.evaluate('() => pilot.diagnostics().failed'),'graceful blocked-import failure')
        expect(failure.locator('#fallback')).to_be_visible()
        expect(failure.locator('#animation svg')).to_have_count(0)
        passed('Blocked runtime import leaves original artwork visible without an unhandled error')
        baseline=browser.new_page()
        baseline.goto(origin+'/tests/lottie-fixture.html')
        baseline.get_by_role('button',name='CSS baseline',exact=True).click()
        baseline_session=baseline.context.new_cdp_session(baseline)
        baseline_session.send('Performance.enable')
        def baseline_metrics():return {item['name']:item['value'] for item in baseline_session.send('Performance.getMetrics')['metrics']}
        baseline_before=baseline_metrics();baseline.wait_for_timeout(1200);baseline_after=baseline_metrics()
        performance['cssBaselineTaskMilliseconds']=round((baseline_after['TaskDuration']-baseline_before['TaskDuration'])*1000,3)
        performance['cssBaselineHeapDeltaBytes']=baseline_after['JSHeapUsedSize']-baseline_before['JSHeapUsedSize']
        assert not baseline.evaluate('pilot.diagnostics().loaded')
        runtime=(ROOT/'extension/living/vendor/lottie-light-5.13.0.mjs').read_bytes()
        result={'scope':'Real local ESM/SVG runtime in synthetic Chromium fixture; not installed extension or live ChatGPT','browser':browser.version,'checks':checks,'runtimeBytes':len(runtime),'runtimeGzipBytes':len(gzip.compress(runtime,mtime=0)),'animationDomNodes':nodes,'performance':performance}
        (OUT/'lottie-browser-results.json').write_text(json.dumps(result,indent=2)+'\n')
        print('LOTTIE_METRICS',json.dumps(result),flush=True)
        browser.close()
finally:server.shutdown()
