"""Real Chromium rendering with synthetic ChatGPT DOM. Not an installed/account test."""
import json, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
B=Path(__file__).resolve().parents[1];E=B/'extension';OUT=B/'preview';OUT.mkdir(exist_ok=True)
checks=[]
def passed(msg):checks.append(msg);print('PASS',msg)
def module_text(p):
 s=p.read_text();
 if p.name=='scene.mjs' and p.parent.name=='living':s=s.replace('export const SCENE_CSS=', 'export const BASE_CSS=').replace('export function createScene(', 'export function baseScene(')
 s=re.sub(r'^import .*?;\n','',s,flags=re.M);return re.sub(r'\bexport (?=(?:function|const|class)\b)','',s)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1720,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.clock.install()
 page.set_content((B/'tests/fixture.html').read_text())
 for f in ['themes.css','theme.css']:page.add_style_tag(content=(E/f).read_text())
 for f in ['prefs.js','adapter.js']:page.add_script_tag(content=(E/f).read_text())
 page.add_script_tag(content='\n'.join(module_text(E/'living'/f) for f in ['model.mjs','scene.mjs','companion-motion.mjs','companion-rig.mjs','quiet-policy.mjs','quiet-scene.mjs','engine.mjs'])+'''\nwindow.env=createEnvironment(document,window);window.adapter=ChatDrobeAdapter.create(document);window.applyRoom=(p={},f=null)=>{window.roomPrefs=ChatDrobePrefs.prefs({livingEnabled:true,livingWorld:'tokyo',livingView:'full',width:740,...p});adapter.apply({...roomPrefs,decoration:false,motion:false});env.configure(roomPrefs,f);};''')
 original=page.locator('.markdown').inner_html();draft=page.locator('#prompt-textarea').inner_html();warning=page.locator('[data-testid="composer-footer"]').inner_text()
 for world,palette in [('tokyo','mooncat'),('starship','bridge'),('train','paper')]:
  for view in ['portal','full']:
   page.evaluate('(p)=>applyRoom(p)',{'livingWorld':world,'theme':palette,'livingView':view})
   page.wait_for_timeout(80)
   d=page.evaluate('env.diagnostics()');assert d['active'],d;assert d['sceneNodes']<=320,d
   assert page.locator('#chatdrobe-environment').count()==1
   assert page.locator('.markdown').inner_html()==original;assert page.locator('#prompt-textarea').inner_html()==draft
   assert page.locator('[data-testid="composer-footer"]').inner_text()==warning
   assert page.locator('#chatdrobe-environment').evaluate('(n)=>getComputedStyle(n).pointerEvents')=='none'
   assert page.locator('#chatdrobe-environment').bounding_box()['y']+page.locator('#chatdrobe-environment').bounding_box()['height']<page.locator('form').bounding_box()['y']
  page.screenshot(path=str(OUT/(world+'-full-fixture.png')))
 passed('All three worlds mount in Portal/Full with <=320 scene nodes, one host and protected conversation/draft/disclaimer')
 page.evaluate("applyRoom({livingWorld:'tokyo',livingWeather:'snow',livingTime:'night',livingMotion:true,livingReactions:true})")
 room=page.locator('#chatdrobe-environment').locator('.room');expect(room).to_have_attribute('data-weather','snow');expect(room).to_have_attribute('data-light','night')
 expect(room).to_have_attribute('data-motion','false')
 page.clock.fast_forward(10050);expect(room).to_have_attribute('data-motion','true')
 page.emulate_media(reduced_motion='reduce');expect(room).to_have_attribute('data-motion','false')
 page.emulate_media(reduced_motion='no-preference');page.wait_for_function('env.diagnostics().quiet.enabled && env.diagnostics().quiet.busy');page.clock.fast_forward(10050);expect(room).to_have_attribute('data-motion','true')
 passed('Weather/lighting and live reduced-motion changes reach the actual scene')
 # Native response indicator in a known composer container, not transcript observation.
 page.evaluate("applyRoom({livingWorld:'starship',theme:'bridge',livingReactions:true})")
 page.evaluate("const s=document.createElement('button');s.dataset.testid='stop-button';s.id='living-stop';document.querySelector('form').append(s)")
 expect(room).to_have_attribute('data-streaming','true')
 page.evaluate("document.querySelector('#living-stop').remove()")
 expect(room).to_have_attribute('data-streaming','false')
 page.locator('[data-testid="send-button"]').click();expect(room).to_have_attribute('data-lamp','true')
 passed('Optional native composer controls emit streaming/finished and send activation without sampling text')
 before=page.evaluate('env.diagnostics().paints')
 page.evaluate("for(let i=0;i<100;i++)document.querySelector('.markdown p').append(document.createTextNode(' stream'))")
 page.wait_for_timeout(100);assert page.evaluate('env.diagnostics().paints')==before
 passed('100 streamed transcript additions do not trigger scene updates')
 page.evaluate("applyRoom({livingWorld:'starship',livingReactions:false},{id:'session',start:Date.now()-160000,end:Date.now()+140000,status:'running'})")
 expect(room).to_have_attribute('data-stage','2');expect(room).to_have_attribute('data-focused','true')
 page.evaluate("applyRoom({livingWorld:'starship'},{id:'session',start:Date.now()-300000,end:Date.now()-10,status:'complete'})")
 expect(room).to_have_attribute('data-stage','4');expect(room).to_have_attribute('data-arrived','true')
 passed('Persisted focus snapshot selects a mid-journey chapter and completed arrival')
 page.set_viewport_size({'width':920,'height':900});page.wait_for_timeout(80);assert not page.evaluate('env.diagnostics().active')
 page.set_viewport_size({'width':1720,'height':1050});page.wait_for_timeout(80);assert page.evaluate('env.diagnostics().active')
 page.evaluate("const d=document.createElement('div');d.role='dialog';d.setAttribute('aria-modal','true');d.id='modal';document.body.append(d);document.body.click()")
 page.wait_for_timeout(80);assert not page.evaluate('env.diagnostics().active')
 page.evaluate("document.querySelector('#modal').remove();document.body.click()")
 page.wait_for_timeout(80);assert page.evaluate('env.diagnostics().active')
 passed('Narrow viewports and opened dialogs suppress the scene rather than cover controls')
 page.evaluate("applyRoom({livingMotion:true,livingReactions:true});Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
 d=page.evaluate('env.diagnostics()');assert not d['boundaryTimer'] and not d['idleTimer'];expect(room).to_have_attribute('data-active','false')
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));env.configure({...roomPrefs,livingEnabled:false},null)")
 d=page.evaluate('env.diagnostics()');assert not d['active'] and not d['idleTimer'] and not d['controlObserver'];assert page.locator('#chatdrobe-environment').count()==0
 for i in range(12):page.evaluate("applyRoom({livingWorld:'train',livingMotion:true});env.configure({...roomPrefs,livingEnabled:false},null)")
 assert page.locator('#chatdrobe-environment').count()==0;assert page.evaluate('env.diagnostics().sceneNodes')==0
 passed('Hidden lifecycle pauses timelines/timers; repeated enable/disable cleans the host and control observer')
 assert not errors,errors
 # Test lab with the SAME model and renderer; file routes do not need live network.
 page.set_content((B/'lab/index.html').read_text())
 page.add_style_tag(content=(B/'lab/lab.css').read_text())
 page.add_script_tag(content='(()=>{'+module_text(B/'lab/model.mjs')+'\n'+module_text(B/'lab/scene.mjs')+'\n'+module_text(B/'lab/lab.js')+'\n})();')
 for world in ['tokyo','starship','train']:
  page.locator('[data-world="'+world+'"]').first.click()
  page.locator('#time').select_option('night' if world=='starship' else 'day')
  if world=='train':page.locator('#timeline').fill('60')
  page.screenshot(path=str(OUT/(world+'-lab.png')),full_page=True)
  page.locator('#view').select_option('portal');expect(page.locator('#stage')).to_have_class('stage portal')
  page.locator('#view').select_option('full')
 page.locator('[data-event="USER_IDLE"]').click();expect(page.locator('#scene-host').locator('.room')).to_have_attribute('data-idle','true')
 page.locator('[data-event="FOCUS_COMPLETE"]').click();expect(page.locator('#timeline')).to_have_value('100')
 for width in [390,768,1440]:
  page.set_viewport_size({'width':width,'height':950});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
 page.screenshot(path=str(OUT/'lab-responsive.png'),full_page=True)
 passed('Interactive lab world/weather/mode/timeline/event controls work and fit three viewport sizes')
 browser.close()
(OUT/'living-browser-results.json').write_text(json.dumps({'checks':checks,'passed':len(checks),'scope':'Synthetic DOM, real Chromium, not installed extension or live account'},indent=2))
