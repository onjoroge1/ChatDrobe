"""Extension account flow in actual Chromium with mocked worker replies; no native IPC."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'extension';(ROOT/'preview').mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True);page=b.new_page(viewport={'width':1100,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=re.sub(r'<script[^>]*>.*?</script>|<link[^>]*>','',(E/'account.html').read_text());page.set_content(html);page.add_style_tag(content=(E/'upgrade.css').read_text());page.add_style_tag(content=(E/'account.css').read_text())
 page.add_script_tag(content="""window.calls=[];window.state={premium:false,connected:false,linkCode:'ABCDE-12345-ABCDE-12345',linkExpires:1800000000};window.chrome={permissions:{request:async()=>true},runtime:{sendMessage:async m=>{calls.push(m.kind);return {ok:true,billing:state};}}};""")
 page.add_script_tag(content=(E/'account.js').read_text());expect(page.locator('#pairing')).to_be_visible();expect(page.locator('#pairing li')).to_have_count(3)
 page.screenshot(path=str(ROOT/'preview/activation-instructions.png'),full_page=True)
 page.get_by_role('button',name='Approve connection on ChatDrobe').click();assert 'billing-website' in page.evaluate('calls');assert 'billing-start' not in page.evaluate('calls')
 page.evaluate("state={premium:false,connected:true,accountEmail:'owner@example.test',linkCode:'',lastErrorCode:'ACCESS_SIGNING_NOT_READY',lastError:'BILLING_SIGNING_PRIVATE_KEY has an invalid format. Keep this account connected.'}")
 page.get_by_role('button',name='Refresh access',exact=True).click();expect(page.locator('#setup')).to_be_visible();expect(page.locator('#plan')).to_have_text('Connected — Premium setup required');expect(page.locator('#continue')).to_be_hidden();expect(page.locator('#pairing')).to_be_hidden()
 page.screenshot(path=str(ROOT/'preview/activation-setup.png'),full_page=True)
 page.evaluate("state={premium:true,adminPremium:true,connected:true,accountEmail:'owner@example.test',linkCode:''}")
 page.get_by_role('button',name='Refresh access',exact=True).click();expect(page.locator('#setup')).to_be_hidden();expect(page.locator('#success')).to_be_visible();expect(page.locator('#plan')).to_have_text('Admin Premium — complimentary')
 page.get_by_role('button',name='Open ChatGPT').click();assert 'billing-return' in page.evaluate('calls')
 for width in [360,390,768,1200]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 page.screenshot(path=str(ROOT/'preview/activation-ready.png'),full_page=True)
 assert not errors,errors;b.close();print('4 activation UI groups passed: instructions/current-code link, setup failure, signed success/return action, responsive layouts.')
