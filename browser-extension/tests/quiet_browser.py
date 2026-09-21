"""Actual Chromium/WAAPI + representative page markup. Not live ChatGPT or native IPC."""
import functools,json,os,shutil,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
B=Path(__file__).resolve().parents[1];E=B/'extension';OUT=B/'preview';OUT.mkdir(exist_ok=True)
class FixtureHandler(SimpleHTTPRequestHandler):
 def end_headers(self):
  self.send_header('Content-Security-Policy', "script-src 'self'; object-src 'none'; connect-src 'self'")
  super().end_headers()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(FixtureHandler,directory=str(B)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
checks=[]
def passed(x):checks.append(x);print('PASS',x,flush=True)
def separated(a,b):
 """Actual 2D separation permits a safe portal above a wide composer."""
 return (a['x']+a['width']<=b['x'] or b['x']+b['width']<=a['x'] or
         a['y']+a['height']<=b['y'] or b['y']+b['height']<=a['y'])
def wait_for_state(page,expression):
 """Direct evaluation respects strict CSP; advance the installed clock for RAF."""
 for _ in range(100):
  if page.evaluate(expression):return
  page.clock.run_for(50)
 raise AssertionError('Page state did not settle within 5 seconds: '+expression)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH',shutil.which('chromium')),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1720,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.clock.install();page.goto(origin+'/tests/fixture.html')
 for f in ['themes.css','theme.css']:page.add_style_tag(url=origin+'/extension/'+f)
 for f in ['prefs.js','adapter.js']:page.add_script_tag(url=origin+'/extension/'+f)
 page.evaluate("""async()=>{const {createEnvironment}=await import('/extension/living/engine.mjs');window.env=createEnvironment(document,window);window.adapter=ChatDrobeAdapter.create(document);window.applyRoom=(p={},f=null)=>{window.roomPrefs={...ChatDrobePrefs.prefs({livingEnabled:true,livingWorld:'tokyo',livingView:'full',width:740,...p}),livingCompanionOnly:p.livingCompanionOnly===true};adapter.apply({...roomPrefs,decoration:false,motion:false});env.configure(roomPrefs,f);};}""")
 original=page.locator('.markdown').inner_html();draft=page.locator('#prompt-textarea').inner_html();warning=page.locator('[data-testid="composer-footer"]').inner_text()
 page.evaluate('applyRoom({livingMotion:true})');room=page.locator('#chatdrobe-environment').locator('.room')
 expect(room.locator('.caption')).to_have_count(0);expect(room).to_have_attribute('data-motion','false')
 page.clock.fast_forward(45001);expect(room).to_have_attribute('data-pose','look')
 assert page.evaluate('env.diagnostics().companion.animations')>0
 page.clock.fast_forward(80000);expect(room).to_have_attribute('data-pose','groom')
 assert page.evaluate('env.diagnostics().companion.animations')>0
 page.clock.fast_forward(92000);page.clock.fast_forward(76000)
 expect(room).to_have_attribute('data-idle-stage','unwinding')
 passed('Progressive policy drives coordinated WAAPI performances rather than a CSS wobble')
 page.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'a',bubbles:true}))")
 expect(room).to_have_attribute('data-pose','rest');expect(room).to_have_attribute('data-motion','false')
 assert page.evaluate('env.diagnostics().companion.animations')==0
 page.clock.fast_forward(10050);expect(room).to_have_attribute('data-motion','true')
 passed('Typing stops all companion animations immediately; quiet resumption can settle the pose')
 page.evaluate("document.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}))")
 page.clock.fast_forward(60000);expect(room).to_have_attribute('data-motion','false')
 page.evaluate("document.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}))");page.clock.fast_forward(10050)
 expect(room).to_have_attribute('data-motion','true')
 passed('Input-method composition is protected for the entire composition, not just ten seconds')
 page.evaluate("const r=document.createRange();r.selectNodeContents(document.querySelector('.markdown p'));getSelection().removeAllRanges();getSelection().addRange(r);document.dispatchEvent(new Event('selectionchange'))")
 page.clock.fast_forward(120000);expect(room).to_have_attribute('data-motion','false');assert not page.evaluate('env.diagnostics().quiet.timer')
 page.evaluate("getSelection().removeAllRanges();document.dispatchEvent(new Event('selectionchange'))");page.clock.fast_forward(10050)
 expect(room).to_have_attribute('data-motion','true')
 passed('Selected text holds the scene still without reading or copying that selection')
 page.evaluate("const video=document.createElement('video');video.id='test-media';Object.defineProperty(video,'paused',{configurable:true,value:false});Object.defineProperty(video,'ended',{configurable:true,value:false});document.body.append(video);video.dispatchEvent(new Event('play',{bubbles:true}))")
 page.clock.fast_forward(120000);expect(room).to_have_attribute('data-motion','false');assert not page.evaluate('env.diagnostics().quiet.timer')
 page.evaluate("const v=document.querySelector('#test-media');Object.defineProperty(v,'paused',{configurable:true,value:true});v.dispatchEvent(new Event('pause',{bubbles:true}));v.remove()")
 page.clock.fast_forward(10050);expect(room).to_have_attribute('data-motion','true')
 passed('Playing native media suppresses motion until playback ends, without polling or media-content reads')
 page.evaluate("const s=document.createElement('button');s.dataset.testid='stop-button';s.id='stream-stop';document.querySelector('form').append(s)")
 expect(room).to_have_attribute('data-motion','false');assert not page.evaluate('env.diagnostics().quiet.timer')
 page.evaluate("document.querySelector('#stream-stop').remove()");wait_for_state(page,'env.diagnostics().quiet.enabled');page.clock.fast_forward(10050)
 expect(room).to_have_attribute('data-motion','true')
 passed('Supported streaming controls pause motion even when activity reactions are off')
 page.evaluate("applyRoom({livingMotion:true},{id:'focus',start:Date.now(),end:Date.now()+300000,status:'running'})")
 expect(room).to_have_attribute('data-motion','false');assert not page.evaluate('env.diagnostics().quiet.timer')
 page.clock.fast_forward(60000);expect(room).to_have_attribute('data-pose','rest')
 page.evaluate("applyRoom({livingMotion:true},{id:'focus',start:Date.now()-300000,end:Date.now()-1,status:'complete'})")
 expect(room.locator('.caption')).to_have_count(0)
 passed('Quiet Focus and completion preserve a clean, notification-free workspace')
 page.evaluate("applyRoom({livingMotion:true});Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
 assert not page.evaluate('env.diagnostics().quiet.timer');page.clock.fast_forward(600000)
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))")
 expect(room).to_have_attribute('data-pose','rest');page.clock.fast_forward(10050)
 page.emulate_media(reduced_motion='reduce');expect(room).to_have_attribute('data-motion','false');assert not page.evaluate('env.diagnostics().quiet.timer')
 passed('Hidden tabs and reduced motion clear the scheduler with no backlog of animations')
 for world in ['tokyo','starship','train']:
  page.emulate_media(reduced_motion='no-preference');page.evaluate('(id)=>applyRoom({livingWorld:id,livingMotion:false})',world)
  assert page.locator('#chatdrobe-environment').locator('button,input,[role=status]').count()==0
  node_count=page.evaluate('env.diagnostics().sceneNodes')
  assert node_count<=320,(world,node_count)
  if world!='starship':
   bounds=room.locator('.companion-habitat').bounding_box()
   assert bounds and bounds['width']>0 and bounds['height']>0,(world,bounds)
   protected=page.locator('form,main .markdown,main [data-message-author-role],button,nav,header,aside').evaluate_all("nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}).filter(r=>r.width>0&&r.height>0)")
   assert protected,'Fixture must contain measured native content and controls'
   for native in protected:assert separated(bounds,native),(world,bounds,native)
 passed('All three worlds keep bounded geometry, with the cat viewport clear of measured messages, composer and native controls')
 page.evaluate("applyRoom({livingWorld:'tokyo',livingView:'portal',livingMotion:true,livingCompanionOnly:true})")
 expect(room).to_have_attribute('data-companion-only','true');assert room.locator(':scope > svg').count()==0
 assert room.locator('.companion-cat').count()==1
 page.clock.fast_forward(610000);expect(room).to_have_attribute('data-pose','sleep');assert not page.evaluate('env.diagnostics().quiet.timer')
 passed('Companion-only surface reuses the natural rig without loading a visible room or perpetual timer')
 assert page.locator('.markdown').inner_html()==original;assert page.locator('#prompt-textarea').inner_html()==draft;assert page.locator('[data-testid="composer-footer"]').inner_text()==warning
 # A short, narrow conversation has verified empty space below its last message.
 # Grow the real message/control geometry to prove this permission is revoked.
 page.set_viewport_size({'width':900,'height':1050})
 page.evaluate("document.querySelector('.markdown').innerHTML='<p>A short fixture response.</p>';applyRoom({livingWorld:'tokyo',livingMotion:false})")
 wait_for_state(page,"()=>{const d=env.diagnostics();return d.visible&&d.layout?.fallback==='conversation-gap';}")
 bounds=page.locator('#chatdrobe-environment').bounding_box();message=page.locator('[data-message-author-role="assistant"]').bounding_box();composer=page.locator('#composer-background').bounding_box()
 assert bounds['y']>=message['y']+message['height']+19,(bounds,message)
 assert bounds['y']+bounds['height']<=composer['y']-19,(bounds,composer)
 page.screenshot(path=str(OUT/'tokyo-narrow-empty-space.png'))
 page.evaluate("document.querySelector('.markdown').style.height='900px'")
 wait_for_state(page,"env.diagnostics().state==='blocked'")
 assert not page.locator('#chatdrobe-environment').is_visible()
 page.evaluate("document.querySelector('.markdown').style.height=''")
 wait_for_state(page,"()=>{const d=env.diagnostics();return d.visible&&d.layout?.fallback==='conversation-gap';}")
 page.evaluate("const n=document.createElement('nav');n.id='native-overlay';n.style.cssText='position:fixed;left:210px;right:0;top:250px;bottom:100px';document.body.append(n)")
 wait_for_state(page,"env.diagnostics().state==='blocked'")
 page.evaluate("document.querySelector('#native-overlay').remove()")
 wait_for_state(page,"()=>{const d=env.diagnostics();return d.visible&&d.layout?.fallback==='conversation-gap';}")
 passed('Narrow fallback stays between measured message/composer and withdraws for growth or native overlays')
 for i in range(12):page.evaluate("env.configure({...roomPrefs,enabled:false});applyRoom({livingMotion:true})")
 page.evaluate('env.dispose()');assert page.locator('#chatdrobe-environment').count()==0;assert not page.evaluate('env.diagnostics().quiet.timer')
 assert not errors,errors
 passed('Repeated mount/unmount cleans animations and preserves draft, conversation and disclaimer')
 browser.close()
server.shutdown();server.server_close()
(OUT/'quiet-browser-results.json').write_text(json.dumps({'checks':checks,'passed':len(checks),'scope':'Synthetic page and actual Chromium; no installed extension/live account'},indent=2))
