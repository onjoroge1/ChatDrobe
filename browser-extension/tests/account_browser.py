"""Actual Chromium rendering; mocked worker replies, not native extension IPC."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'extension'
(ROOT/'preview').mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
 page=b.new_page(viewport={'width':1100,'height':950});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=re.sub(r'<script[^>]*>.*?</script>|<link[^>]*>','',(E/'account.html').read_text())
 page.set_content(html);page.add_style_tag(content=(E/'upgrade.css').read_text());page.add_style_tag(content=(E/'account.css').read_text())
 page.add_script_tag(content="""window.calls=[];window.permission=false;window.plus=false;window.admin=false;window.linked=false;window.chrome={permissions:{request:async v=>{calls.push('permission');return permission;}},runtime:{sendMessage:async m=>{calls.push(m.kind);if(m.kind==='billing-start')return {ok:true,billing:{linkCode:'ABCDE-12345-ABCDE-12345',premium:false}};if(m.kind==='billing-disconnect'){linked=false;plus=false;admin=false;}return {ok:true,billing:{premium:plus||admin,adminPremium:admin,testSubscription:plus&&!admin,connected:linked,accountEmail:linked?'member@example.test':'',linkCode:''}};}}};""")
 page.add_script_tag(content=(E/'account.js').read_text())
 expect(page.locator('#plan')).to_have_text('Free');expect(page.locator('#pairing')).to_be_hidden();assert page.evaluate('calls')==['billing-status']
 page.get_by_role('button',name='Sign in / connect account').click();expect(page.locator('#status')).to_contain_text('Website access is needed');assert page.evaluate("calls.includes('billing-start')")==False
 page.evaluate('permission=true');page.get_by_role('button',name='Sign in / connect account').click();expect(page.locator('#code')).to_have_text('ABCDE-12345-ABCDE-12345')
 page.evaluate("linked=true;window.dispatchEvent(new Event('focus'))")
 expect(page.locator('#email')).to_have_text('member@example.test');expect(page.locator('#plan')).to_have_text('Free')
 page.get_by_role('button',name='View account / test checkout').click();assert page.evaluate("calls.includes('billing-website')")
 page.evaluate('plus=true');page.get_by_role('button',name='Refresh access').click();expect(page.locator('#plan')).to_contain_text('Test Plus');expect(page.locator('#website')).to_be_hidden();expect(page.locator('#continue')).to_be_visible()
 page.evaluate("admin=true;window.dispatchEvent(new Event('focus'))");expect(page.locator('#plan')).to_have_text('Admin Premium — complimentary');expect(page.locator('#status')).to_contain_text('Premium is ready');expect(page.locator('#remembered')).to_contain_text('30 days');expect(page.locator('#website')).to_be_hidden()
 for width in [360,390,768,1200]:
  page.set_viewport_size({'width':width,'height':950});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
 page.screenshot(path=str(ROOT/'preview/admin-premium.png'),full_page=True)
 page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Disconnect this extension').click();expect(page.locator('#plan')).to_have_text('Free');expect(page.locator('#email')).not_to_contain_text('member@example.test');expect(page.locator('#continue')).to_be_hidden()
 assert page.locator('input').count()==0;assert not errors,errors;b.close()
print('8 account-page fixture groups passed: initial state, permission, pairing, focus refresh, Free billing navigation, subscriber/admin no-upsell, layout, disconnect.')
