"""Explorer worlds: local synthetic page with real Chromium rendering/animations.
No signed-in ChatGPT, network, payment provider, or real user text involved.
"""
import json, os, shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'extension';OUT=ROOT/'preview';OUT.mkdir(exist_ok=True)
checks=[]
def passed(s): checks.append(s);print('PASS:',s,flush=True)
def bootstrap(page):
    page.set_content((ROOT/'tests/fixture.html').read_text())
    for name in ['themes.css','theme.css']:page.add_style_tag(content=(E/name).read_text())
    for name in ['prefs.js','adapter.js']:page.add_script_tag(content=(E/name).read_text())
    source=(E/'world-routines.js').read_text().replace('export function ','function ').replace('export const ','const ')
    page.add_script_tag(content=source+';window.worlds={WORLD_IDS,marginStage,createWorldVisual};')
    page.add_script_tag(content=(E/'idle.js').read_text().replace('export function ','function '))
    page.evaluate('window.loads=0;window.adapter=ChatDrobeAdapter.create(document);window.idle=createIdleController(document,window,async()=>{loads++;return worlds});')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH',shutil.which('chromium')),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1660,'height':1100})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    bootstrap(page)
    original=page.locator('[data-message-author-role="assistant"]').inner_html();draft=page.locator('#prompt-textarea').inner_html()
    page.evaluate('adapter.apply({});idle.configure(ChatDrobePrefs.prefs({}));')
    expect(page.locator('html')).to_have_attribute('data-md-scheme','light')
    assert page.evaluate('loads')==0 and not page.evaluate('idle.diagnostics().pendingTimer')
    passed('Light is the fresh default; effects Off load no routine module and arm no idle timer')
    names={'rally':'Rally Garage','bridge':'Orbital Bridge','observatory':'Solar Observatory'}
    for theme,label in names.items():
        for mode in ['light','dark']:
            page.evaluate('p=>{adapter.apply(p);idle.configure(ChatDrobePrefs.prefs({...p,idleMode:"off"}));}',{'theme':theme,'mode':mode})
            expect(page.locator('html')).to_have_attribute('data-md-scheme',mode)
            assert page.locator('[data-message-author-role="assistant"]').inner_html()==original
            assert page.locator('#prompt-textarea').inner_html()==draft
            expect(page.locator('[data-testid="composer-footer"]')).to_have_text('ChatGPT can make mistakes. Check important info.')
            page.screenshot(path=str(OUT/f'{theme}-{mode}.png'))
        page.evaluate('theme=>{adapter.apply({theme,mode:"light"});idle.configure(ChatDrobePrefs.prefs({theme,mode:"light",idleMode:"stroll",companion:"theme"}));idle.preview();}',theme)
        page.wait_for_timeout(3400)
        assert page.evaluate('idle.diagnostics().running'),page.evaluate('idle.diagnostics()')
        assert page.locator('#chatdrobe-idle').get_attribute('data-world-routine')==theme
        b=page.locator('#chatdrobe-idle').bounding_box();f=page.locator('form').bounding_box()
        assert b['y']+b['height']<f['y'] and (b['x']>f['x']+f['width'] or b['x']+b['width']<f['x'])
        assert page.evaluate('idle.diagnostics().wordScans')==0
        assert page.evaluate('idle.diagnostics().shortLivedTextObserver') is False
        page.screenshot(path=str(OUT/f'{theme}-routine.png'))
        page.mouse.move(12+len(theme),12)
        assert page.locator('#chatdrobe-idle').count()==0
        passed(f'{label}: both palettes, draft/warning preservation, clear-margin routine, zero text scans and pointer cancellation')
    assert page.evaluate('loads')==1
    passed('Routines share one lazily loaded local module, reused after switching worlds')
    # One fully completed native animation sequence, no timer loop afterward.
    page.evaluate('idle.configure(ChatDrobePrefs.prefs({theme:"bridge",idleMode:"stroll"}));idle.preview()')
    page.wait_for_timeout(11000)
    assert page.locator('#chatdrobe-idle').count()==0 and not page.evaluate('idle.diagnostics().pendingTimer')
    passed('Drone finishes and parks within eight seconds, leaving no animation host or repeated idle timer')
    # Margin changes are a cancellation trigger; tiny margins cause a safe skip.
    page.set_viewport_size({'width':850,'height':1100})
    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    page.evaluate('idle.configure(ChatDrobePrefs.prefs({theme:"rally",idleMode:"stroll"}));idle.preview()')
    page.wait_for_timeout(3250)
    assert page.locator('#chatdrobe-idle').count()==0
    assert page.evaluate('idle.diagnostics().lastReason')=='not-enough-clear-margin',page.evaluate('idle.diagnostics()')
    passed('Narrow conversation columns skip rather than overlaying text or controls')
    page.set_viewport_size({'width':1660,'height':1100})
    page.emulate_media(reduced_motion='reduce')
    assert page.evaluate('idle.preview().ok') is False
    assert not page.evaluate('idle.diagnostics().pendingTimer')
    page.emulate_media(reduced_motion='no-preference')
    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    passed('Reduced motion suppresses new world routines and clears pending work')
    # Use a fresh page so delayed reduced-motion/resize callbacks from the prior
    # scenario cannot cancel this preview before its intentionally blocked import.
    delayed=browser.new_page(viewport={'width':1660,'height':1100})
    delayed.on('pageerror',lambda e:errors.append(str(e)))
    bootstrap(delayed)
    delayed.evaluate('idle.dispose();window.resolveLoad=null;window.late=createIdleController(document,window,()=>new Promise(r=>resolveLoad=r));late.configure(ChatDrobePrefs.prefs({theme:"rally",idleMode:"stroll",companion:"theme"}));late.preview()')
    delayed.wait_for_function('typeof resolveLoad==="function"')
    delayed.keyboard.press('Shift')
    delayed.evaluate('resolveLoad(worlds)');delayed.wait_for_timeout(100)
    assert delayed.locator('#chatdrobe-idle').count()==0 and not delayed.evaluate('late.diagnostics().running')
    delayed.evaluate('late.dispose()');delayed.close()
    passed('Keyboard cancellation during an isolated delayed lazy load cannot append a late visual')
    assert not errors,errors
    browser.close()
(OUT/'explorer-results.json').write_text(json.dumps({'environment':'local Chromium synthetic page; no real ChatGPT session','groups':len(checks),'passed':checks},indent=2)+'\n')
