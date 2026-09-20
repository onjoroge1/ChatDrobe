"""HTTP page/CSP coverage with simulated account API; no owner secrets or provider traffic."""
from pathlib import Path
import json, os, subprocess, time, urllib.request
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1];BASE='http://127.0.0.1:4191'
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':'4191'},stdout=subprocess.DEVNULL)
try:
    for _ in range(60):
        try:urllib.request.urlopen(BASE,timeout=1).close();break
        except OSError:time.sleep(.1)
    else:raise RuntimeError('Server unavailable')
    with sync_playwright() as p:
        opts={'headless':True}
        if os.environ.get('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**opts);page=browser.new_page(viewport={'width':1440,'height':1100})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('window.violations=[];document.addEventListener("securitypolicyviolation",e=>violations.push(e.violatedDirective));')
        state={'signed':False,'owner':False,'linked':False};calls=[]
        code='ABCDE-12345-ABCDE-12345'
        def api(route):
            action=parse_qs(urlparse(route.request.url).query).get('action',[''])[0];status=200
            body=route.request.post_data_json if route.request.method=='POST' else {}
            calls.append(action)
            if action=='status':data={'signInAvailable':False,'method':'email_code','livePayments':False,'ownerLoginAvailable':state['owner']}
            elif action=='owner-login':
                assert route.request.headers.get('x-chatdrobe-request')=='account-v1'
                if body.get('password')!='fixture-long-owner-password':status=401;data={'error':{'message':'Owner email or password is incorrect.'}}
                else:state['signed']=True;data={'user':{'role':'admin','emailVerified':False}}
            elif action=='me':
                if not state['signed']:status=401;data={'error':{'message':'Sign in.','code':'SIGN_IN_REQUIRED'}}
                else:data={'extensionLinkingAvailable':True,'user':{'email':'owner@example.test','role':'admin','emailVerified':False},'subscription':{'plan':'free','status':'free'},'payments':{'enabled':False,'mode':'off'}}
            elif action=='devices':data={'devices':([{'id':'a'*64,'extension_id':'b'*32,'linked_at':'2026-09-20T18:00:00Z'}] if state['linked'] else [])}
            elif action=='link-extension':
                assert body=={'code':code,'confirmed':True};state['linked']=True;data={'linked':True}
            elif action=='revoke-device':assert body=={'deviceId':'a'*64};state['linked']=False;data={'ok':True}
            elif action=='signout':state['signed']=False;data={'ok':True}
            else:raise AssertionError('Unexpected action '+action)
            route.fulfill(status=status,content_type='application/json',body=json.dumps(data))
        page.route('**/api/account?*',api)
        page.goto(BASE+'/signin/?next=account#link='+code,wait_until='networkidle')
        expect(page.get_by_label('Owner email',exact=True)).to_be_hidden()
        state['owner']=True;page.reload();expect(page.get_by_label('Owner email',exact=True)).to_be_visible()
        expect(page.locator('[data-auth-email]')).to_be_hidden()
        page.get_by_label('Owner email',exact=True).fill('owner@example.test')
        page.get_by_label('Owner password',exact=True).fill('bad')
        page.get_by_role('button',name='Sign in as owner',exact=True).click()
        expect(page.get_by_text('Owner email or password is incorrect.',exact=True)).to_be_visible()
        expect(page.get_by_label('Owner password',exact=True)).to_have_value('')
        page.get_by_label('Owner password',exact=True).fill('fixture-long-owner-password')
        page.get_by_role('button',name='Sign in as owner',exact=True).click()
        expect(page).to_have_url(BASE+'/account/#link='+code)
        expect(page.get_by_label('Code shown in your extension')).to_have_value(code)
        page.get_by_role('button',name='Connect this extension',exact=True).click()
        assert 'link-extension' not in calls
        page.get_by_label('I started this connection',exact=False).check()
        page.get_by_role('button',name='Connect this extension',exact=True).click()
        expect(page.get_by_text('Connected. Return to ChatDrobe',exact=False)).to_be_visible()
        expect(page).to_have_url(BASE+'/account/')
        expect(page.get_by_role('button',name='Disconnect',exact=True)).to_be_visible()
        page.on('dialog',lambda dialog:dialog.accept())
        page.get_by_role('button',name='Disconnect',exact=True).click()
        expect(page.get_by_text('No extensions linked yet.',exact=True)).to_be_visible()
        assert page.evaluate('localStorage.length')==0
        assert page.evaluate('violations')==[]
        for width in [360,390,768,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            for path in ['/signin/','/account/']:
                page.goto(BASE+path,wait_until='networkidle')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,path)
        page.screenshot(path=str(OUT/'owner-account.png'),full_page=True)
        page.get_by_role('button',name='Sign out',exact=True).click()
        expect(page.get_by_role('heading',name='Connected extensions')).to_be_hidden()
        assert not errors,errors
        browser.close();print('Owner/link HTTP UI passed: disabled config, bad/good login, fragment continuity, consent, device revoke, responsive layouts, logout and CSP.')
finally:
    server.terminate()
    try:server.wait(timeout=5)
    except subprocess.TimeoutExpired:server.kill();server.wait()
