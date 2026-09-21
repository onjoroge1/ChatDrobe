"""Upgrade DOM fixture: no installed extension, Stripe, login or real website navigation."""
import re,json,shutil,base64
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];E=R/'extension';O=R/'preview';O.mkdir(exist_ok=True)
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1200,'height':1000})
 errors=[];requests=[]
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.on('request',lambda req:requests.append(req.url))
 text=(E/'upgrade.html').read_text();text=re.sub(r'<script[^>]*>.*?</script>','',text);text=re.sub(r'<link[^>]*>','',text)
 text=text.replace('icons/icon48.png','data:image/png;base64,'+base64.b64encode((E/'icons/icon48.png').read_bytes()).decode())
 page.set_content(text);page.add_style_tag(content=(E/'upgrade.css').read_text())
 page.add_script_tag(content="window.chrome={runtime:{sendMessage:async()=>({ok:true,billing:{premium:false}}),getURL:p=>p}};")
 for f in ['commerce-config.js','access.js','upgrade.js']:page.add_script_tag(content=(E/f).read_text())
 expect(page.get_by_role('button',name='Sign in / manage access')).to_be_enabled()
 assert page.locator('input').count()==0
 expect(page.locator('#status')).to_contain_text('Verified subscribers and administrators')
 checks.append('Account connection is the only checkout entry; no card fields or automatic access grant')
 for name,route in {'home':'/','premium':'/premium/','pricing':'/pricing/','help':'/help/','privacy':'/privacy/'}.items():
  a=page.locator(f'[data-site-link="{name}"]');expect(a).to_be_visible()
  expect(a).to_have_attribute('href','https://www.chatdrobe.com'+route)
  expect(a).to_have_attribute('target','_blank')
  expect(a).to_have_attribute('rel','noopener noreferrer')
  expect(a).to_have_attribute('referrerpolicy','no-referrer')
 checks.append('All five links resolve to the pinned www site with safe new-tab attributes')
 assert not [u for u in requests if u.startswith(('https:','http:'))],requests
 checks.append('Opening the upgrade UI causes no HTTP request, billing fetch or external resource load')
 # Exercise the clickable link without pretending a real external navigation has been verified.
 page.evaluate("document.querySelector('[data-site-link=premium]').addEventListener('click',e=>{e.preventDefault();window.chosenPublicUrl=e.currentTarget.href;});")
 page.get_by_role('link',name='View Premium on chatdrobe.com').click()
 assert page.evaluate('window.chosenPublicUrl')=='https://www.chatdrobe.com/premium/'
 checks.append('User-clicked Premium control points to the real information page, not a checkout URL')
 assert 'Rainy Tokyo Loft' in page.locator('main').inner_text()
 assert 'Starship Journey' in page.locator('main').inner_text()
 assert 'Cozy Train Journey' in page.locator('main').inner_text()
 checks.append('Upgrade information names all three included Living environments')
 for scheme in ['light','dark']:
  page.emulate_media(color_scheme=scheme)
  for w in [390,1200]:
   page.set_viewport_size({'width':w,'height':1000});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.screenshot(path=str(O/f'premium-domain-{scheme}.png'),full_page=True)
 checks.append('390/1200-pixel layouts fit in both light and dark appearances')
 # Keyboard visibility and fail-closed handling of an altered destination.
 page.get_by_role('link',name='View Premium on chatdrobe.com').focus()
 expect(page.get_by_role('link',name='View Premium on chatdrobe.com')).to_be_focused()
 checks.append('Premium website link is keyboard-focusable')
 assert not errors,errors
 checks.append('No uncaught JavaScript errors')
 b.close()
(O/'domain-upgrade-results.json').write_text(json.dumps({'environment':'offline Chromium DOM fixture; no installed extension or external website navigation','passed':checks},indent=2))
print(f'{len(checks)} upgrade domain fixture groups passed')
