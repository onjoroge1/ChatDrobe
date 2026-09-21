"""Real HTTP/CSP success UI; account/provider replies are simulated, no actual purchase."""
from pathlib import Path
import os,subprocess,time,urllib.request,json
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];BASE='http://127.0.0.1:4192'
server=subprocess.Popen(['node','scripts/serve.mjs'],cwd=ROOT,env={**os.environ,'PORT':'4192'},stdout=subprocess.DEVNULL)
try:
 for _ in range(60):
  try:urllib.request.urlopen(BASE,timeout=1).close();break
  except OSError:time.sleep(.1)
 else:raise RuntimeError('Server unavailable')
 with sync_playwright() as p:
  opts={'headless':True}
  if os.environ.get('CHROMIUM_PATH'):opts['executable_path']=os.environ['CHROMIUM_PATH']
  b=p.chromium.launch(**opts);page=b.new_page(viewport={'width':1440,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script('window.violations=[];document.addEventListener("securitypolicyviolation",e=>violations.push(e.violatedDirective));')
  state={'signing':False,'admin':True,'paid':False,'approved':False};calls=[];code='ABCDE-12345-ABCDE-12345'
  def api(route):
   action=parse_qs(urlparse(route.request.url).query).get('action',[''])[0];calls.append(action);status=200
   if action=='me':data={'extensionLinkingAvailable':True,'user':{'email':'member@example.test','role':'admin' if state['admin'] else 'user'},'access':{'premium':state['admin'] or state['paid'],'complimentary':state['admin']},'subscription':{'plan':'test_plus' if state['paid'] else 'free','status':'active' if state['paid'] else 'free'},'payments':{'enabled':False}}
   elif action=='health':data={'signing':{'configured':state['signing'],'ready':state['signing'],'matchesExtension':state['signing'],'expectedKeyId':'665a83c1cc892eab','status':'ready' if state['signing'] else 'missing'}}
   elif action=='devices':data={'devices':[{'id':'a'*64,'extension_id':'b'*32,'expires_at':'2026-10-20T20:00:00Z'}]}
   elif action=='link-extension':assert route.request.post_data_json=={'code':code,'confirmed':True};state['approved']=True;data={'linked':True}
   elif action=='entitlement':
    if not state['paid']:status=503;data={'error':{'message':'Verification temporarily unavailable.','code':'PROVIDER_UNAVAILABLE'}}
    else:data={'plan':'plus'}
   else:raise AssertionError(action)
   route.fulfill(status=status,content_type='application/json',body=json.dumps(data))
  page.route('**/api/*',api)
  r=page.goto(BASE+'/account/?flow=extension',wait_until='networkidle');assert "connect-src 'self'" in r.headers['content-security-policy']
  card=page.locator('[data-connection-success]');expect(card).to_have_attribute('data-state','setup-required');expect(card.get_by_role('link',name='Open ChatGPT')).to_be_hidden();assert 'entitlement' not in calls
  state['signing']=True;page.get_by_role('button',name='Check activation',exact=True).click();expect(card).to_have_attribute('data-state','needs-connection');expect(card.get_by_role('link',name='Open ChatGPT')).to_have_attribute('href','https://chatgpt.com/')
  page.goto(BASE+'/account/#link='+code,wait_until='networkidle');expect(card).to_have_attribute('data-state','needs-connection');expect(page.get_by_label('Code shown in your extension')).to_have_value(code)
  page.get_by_label('I started this connection',exact=False).check();page.get_by_role('button',name='Connect this extension',exact=True).click();expect(card).to_have_attribute('data-state','needs-extension-check');assert state['approved'];expect(page.get_by_label('Code shown in your extension')).to_be_hidden()
  state['admin']=False;page.goto(BASE+'/account/?checkout=returned',wait_until='networkidle');expect(card).to_have_attribute('data-state','payment-pending');expect(card.get_by_role('link',name='Open ChatGPT')).to_be_hidden()
  state['paid']=True;page.get_by_role('button',name='Check activation',exact=True).click();expect(card).to_have_attribute('data-state','needs-connection');assert 'entitlement' in calls
  for width in [360,390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  assert page.evaluate('violations')==[];assert not errors,errors;b.close();print('5 activation HTTP groups passed: missing signer, old-installation ambiguity, account-only approval, failed/verified payment return and responsive/CSP checks.')
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:server.kill();server.wait()
