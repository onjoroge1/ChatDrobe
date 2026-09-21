from pathlib import Path
from playwright.sync_api import sync_playwright,expect
B=Path(__file__).resolve().parents[1];E=B/'extension';checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':360,'height':950});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content('<html><body></body></html>')
 for f in ['prefs.js','core.js','access.js','commerce-config.js','focus-state.js']:page.add_script_tag(content=(E/f).read_text())
 page.add_script_tag(content="""globalThis.__CHATDROBE_SIDE_FIXTURE__=true;window.saved=MoodDockCore.state();window.progress=ChatDrobeFocus.normalize();window.fixturePremium=false;window.opened=0;window.previewUrls=[];window.chrome={tabs:{create:v=>previewUrls.push(v.url)},runtime:{getURL:p=>'chrome-extension://fixture/'+p,id:'test',onMessage:{addListener:()=>{}},sendMessage:async m=>{
 if(m.kind==='open-upgrade'){opened++;return {ok:true};}
 if(m.kind==='billing-refresh'){fixturePremium=true;return{ok:true,billing:{testSubscription:true}};}
 if(m.kind==='living-state')return {ok:true,progress};
 if(m.kind==='living-reset-progress'){progress=ChatDrobeFocus.normalize();return{ok:true,progress};}
 if(m.kind==='mutate'){saved=MoodDockCore.reduce(saved,m.action);if(m.action.type==='timer')progress=m.action.value?ChatDrobeFocus.start(progress,m.action.value,Date.now(),'id'):ChatDrobeFocus.cancel(progress,Date.now());}
 return{ok:true,state:saved,access:{premium:fixturePremium,testSubscription:fixturePremium,testerPreview:false,paid:false}};
 }},storage:{onChanged:{addListener:()=>{}}}};""")
 for f in ['panel-style.js','workspace.js']:page.add_script_tag(content=(E/f).read_text())
 page.get_by_role('button',name='Living',exact=True).click();expect(page.get_by_role('button',name='Explore Plus',exact=True)).to_be_visible()
 checks.append('Free Living tab presents an upgrade rather than enabling effects')
 page.get_by_role('button',name='Account',exact=True).click();page.get_by_role('button',name='Refresh Premium access',exact=True).click();page.get_by_role('button',name='Living',exact=True).click()
 page.get_by_role('button',name='Enter world',exact=True).nth(1).click();expect(page.get_by_role('button',name='Selected',exact=True)).to_be_visible()
 assert page.evaluate('saved.prefs.livingWorld')=='starship';assert page.evaluate('saved.prefs.theme')=='bridge'
 page.get_by_label('Environment presentation',exact=True).select_option('full');page.get_by_label('Illustrated weather',exact=True).select_option('aurora');page.get_by_label('Scene lighting',exact=True).select_option('journey')
 page.get_by_role('checkbox',name='Ambient scene motion').check();page.get_by_role('checkbox',name='Activity reactions').check()
 assert page.evaluate('saved.prefs.livingMotion && saved.prefs.livingReactions')
 checks.append('Simulated subscriber selects world, presentation, weather, lighting, motion and reactions')
 page.get_by_role('button',name='5 min journey',exact=True).click();assert page.evaluate('progress.session.status')=='running';assert page.evaluate('saved.timerUntil')>0
 page.get_by_role('button',name='Cancel focus session',exact=True).click();assert page.evaluate('progress.session.status')=='cancelled'
 checks.append('Journey controls feed the same timer action used by the background focus broker')
 page.get_by_role('button',name='Turn Living Worlds off',exact=True).click();assert not page.evaluate('saved.prefs.livingEnabled')
 page.get_by_role('button',name='Play',exact=True).click()
 page.get_by_role('button',name='Use the natural cat in this theme',exact=True).click()
 assert page.evaluate("saved.prefs.idleMode==='natural' && saved.prefs.companion==='cat'")
 expect(page.get_by_label('Start after inactivity',exact=True)).to_have_count(0)
 expect(page.get_by_role('button',name='Preview on chat in 3 seconds',exact=True)).to_have_count(0)
 page.get_by_role('button',name='Preview natural motion — no waiting',exact=True).click()
 assert page.evaluate("previewUrls.at(-1)==='chrome-extension://fixture/motion-preview.html'")
 checks.append('Natural static-theme control uses the motion studio, not an incompatible legacy preview or timer')
 page.screenshot(path=str(B/'preview/living-panel.png'),full_page=True)
 assert not errors,errors;browser.close()
print('\n'.join('PASS '+c for c in checks));print(str(len(checks))+' panel scenario groups passed (mock Chrome IPC).')
