"""Real HTTP/CSP UI tests; account/Stripe endpoints mocked, no email or charge."""
from pathlib import Path
import os, subprocess, time, urllib.request, json
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
BASE='http://127.0.0.1:4190'
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':'4190'},stdout=subprocess.DEVNULL)
try:
    for _ in range(60):
        try:
            urllib.request.urlopen(BASE,timeout=1).close();break
        except OSError:time.sleep(.1)
    else:raise RuntimeError('Static server did not start.')
    with sync_playwright() as p:
        args={'headless':True}
        if os.environ.get('CHROMIUM_PATH'):args['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**args)
        context=browser.new_context(viewport={'width':1440,'height':1100})
        context.tracing.start(screenshots=True,snapshots=True,sources=True)
        page=context.new_page();errors=[];calls=[];state={'ready':False,'role':None,'enabled':False}
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script('window.cspErrors=[];document.addEventListener("securitypolicyviolation",e=>cspErrors.push(e.violatedDirective));')
        def api(route):
            action=parse_qs(urlparse(route.request.url).query).get('action',[''])[0]
            body=route.request.post_data_json if route.request.method=='POST' else {}
            calls.append({'action':action,'body':body,'headers':route.request.headers})
            status=200
            if action=='status':data={'signInAvailable':state['ready'],'method':'email_code','livePayments':False}
            elif action=='request-code':
                assert body['mode']=='signup' and body['acceptBeta'] is True
                assert body['email']=='member@example.test'
                assert route.request.headers.get('x-chatdrobe-request')=='account-v1'
                data={'ok':True,'message':'Check your email for a code.'};status=202
            elif action=='verify-code':
                if body['code']=='00000000':data={'error':{'code':'CODE_INVALID','message':'The code is invalid or expired.'}};status=401
                else:state['role']='user';data={'user':{'email':'member@example.test','role':'user'}}
            elif action=='me':
                if state['role'] is None:data={'error':{'code':'SIGN_IN_REQUIRED','message':'Sign into your ChatDrobe account.'}};status=401
                else:data={'user':{'id':'fixture','email':'member@example.test','role':state['role']},'subscription':{'plan':'free','status':'free','paidUntil':None,'cancelAtPeriodEnd':False},'payments':{'enabled':state['enabled'],'mode':'test' if state['enabled'] else 'off','livePayments':False}}
            elif action=='admin-users':
                assert state['role']=='admin'
                data={'users':[{'id':'fixture','email':'<img src=x onerror=alert(1)>@example.test','plan':'test_plus','role':'user','subscription_status':'active','created_at':'2026-09-16T12:00:00Z','last_login_at':'2026-09-16T13:00:00Z','disabled_at':None}],'total':1,'page':body.get('page',1),'pageSize':25,'counts':{'registered':2,'free':1,'test_plus':1,'paid_live':0},'asOf':1789570000,'coverage':'Registered, email-verified accounts only. Test subscriptions are not live paying users.'}
            elif action=='admin-setup':data={'ready':state['ready'],'enabled':state['enabled'],'checks':{'emailDelivery':state['ready'],'testSecret':state['ready'],'webhookEndpoint':False},'mode':'test','livePayments':False}
            elif action in ['signout','signout-all']:state['role']=None;data={'ok':True}
            elif action=='entitlement':data={'error':{'code':'BILLING_DISABLED','message':'Test billing is not configured.'}};status=503
            elif action=='admin-activate':state['enabled']=body['enabled'];data={'enabled':state['enabled'],'mode':'test','livePayments':False}
            else:raise AssertionError('Unexpected API action: '+action)
            route.fulfill(status=status,content_type='application/json',body=json.dumps(data),headers={'Cache-Control':'no-store'})
        page.route('**/api/*',api)
        try:
            response=page.goto(BASE+'/signup/',wait_until='networkidle')
            assert "connect-src 'self'" in response.headers['content-security-policy']
            expect(page.locator('[data-auth-email]')).to_be_hidden()
            expect(page.locator('[data-account-message]')).to_contain_text('not connected')
            state['ready']=True;page.reload();expect(page.locator('[data-auth-email]')).to_be_visible()
            page.get_by_label('Email address',exact=True).fill('member@example.test')
            page.get_by_role('checkbox').check();page.get_by_role('button',name='Email me a sign-in code').click()
            expect(page.locator('[data-auth-code]')).to_be_visible()
            page.get_by_label('Eight-digit email code').fill('00000000');page.get_by_role('button',name='Verify and continue').click()
            expect(page.locator('[data-account-message]')).to_contain_text('invalid')
            page.get_by_label('Eight-digit email code').fill('12345678');page.get_by_role('button',name='Verify and continue').click()
            expect(page).to_have_url(BASE+'/account/')
            expect(page.locator('[data-account-email]')).to_have_text('member@example.test')
            expect(page.get_by_role('button',name='Start Stripe test checkout')).to_be_disabled()
            expect(page.locator('[data-account-admin]')).to_be_hidden()
            assert page.evaluate('localStorage.length')==0
            page.goto(BASE+'/admin/');expect(page.locator('[data-admin-content]')).to_be_hidden()
            expect(page.locator('[data-account-message]')).to_contain_text('does not have administrator access')
            assert not any(x['action']=='admin-users' for x in calls)
            state['role']='admin';state['ready']=False;page.reload();expect(page.locator('[data-admin-content]')).to_be_visible()
            expect(page.locator('[data-admin-users] tr')).to_have_count(1)
            expect(page.locator('[data-admin-users] img')).to_have_count(0)
            expect(page.locator('[data-admin-users]')).to_contain_text('<img src=x onerror=alert(1)>@example.test')
            expect(page.locator('[data-metric="paid_live"]')).to_have_text('0')
            expect(page.get_by_role('button',name='Enable test checkout',exact=True)).to_be_disabled()
            page.get_by_label('Email search').fill('member')
            with page.expect_response(lambda r:'action=admin-users' in r.url):page.get_by_role('button',name='Search / refresh').click()
            expect(page).to_have_url(BASE+'/admin/')
            assert next(x for x in reversed(calls) if x['action']=='admin-users')['body']['q']=='member'
            page.screenshot(path=str(OUT/'accounts-admin-desktop.png'),full_page=True)
            for width in [360,390,768,1440]:
                page.set_viewport_size({'width':width,'height':950})
                for path in ['/signup/','/signin/','/account/','/admin/']:
                    page.goto(BASE+path,wait_until='networkidle')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'),(width,path)
                    expect(page.locator('h1')).to_have_count(1)
                    expect(page.locator('meta[name="robots"]')).to_have_attribute('content','noindex,nofollow')
            page.goto(BASE+'/account/');page.get_by_role('button',name='Sign out',exact=True).click()
            expect(page.locator('[data-account-content]')).to_be_hidden()
            expect(page.locator('[data-account-email]')).to_have_text('')
            page.goto(BASE+'/admin/');expect(page.locator('[data-admin-content]')).to_be_hidden()
            assert page.evaluate('window.cspErrors')==[],page.evaluate('window.cspErrors')
            assert not errors,errors
            page.set_viewport_size({'width':390,'height':844});state['ready']=True;page.goto(BASE+'/signup/')
            page.screenshot(path=str(OUT/'accounts-signup-mobile.png'),full_page=True)
            (OUT/'accounts-ui-results.json').write_text(json.dumps({'passed':['configured/unconfigured email signup and OTP error/success','Free profile and no local-storage credentials','member/anonymous admin exclusion','XSS-safe user listing and zero live-paid count','POST email search and unavailable payment gate','four pages at four widths, noindex and CSP','signout clears account content'],'boundary':'Account/Resend/Stripe responses mocked; server integration tested separately.'}))
            print('7 account/admin HTTP browser groups passed with simulated account API.')
        finally:
            context.tracing.stop(path=str(OUT/'accounts-trace.zip'));browser.close()
finally:
    server.terminate()
    try:server.wait(timeout=5)
    except subprocess.TimeoutExpired:server.kill();server.wait()
