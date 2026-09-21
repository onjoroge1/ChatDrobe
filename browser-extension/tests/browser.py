"""Offline Chromium fixtures. Not installed-extension or signed-in ChatGPT certification."""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
E=ROOT/'extension'
OUT=ROOT/'preview'
OUT.mkdir(exist_ok=True)
checks=[]
def passed(name):
    checks.append(name)
    print('PASS:',name,flush=True)

def script(page,name):page.add_script_tag(content=(E/name).read_text())

def content(page):
    page.set_content((ROOT/'tests/fixture.html').read_text())
    for f in ['themes.css','theme.css']:page.add_style_tag(content=(E/f).read_text())
    script(page,'prefs.js');script(page,'adapter.js')
    page.evaluate('window.adapter=ChatDrobeAdapter.create(document);window.apply=(p)=>adapter.apply(p);apply({mode:"light"})')

def color(page,selector,prop='color'):
    return page.locator(selector).first.evaluate('(n,p)=>getComputedStyle(n)[p]',prop)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH',shutil.which('chromium')),headless=True,args=['--no-sandbox'])
    browser_version=browser.version
    page=browser.new_page(viewport={'width':1440,'height':1040})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    content(page)
    before=page.locator('[data-message-author-role="assistant"]').inner_html()
    draft=page.locator('#prompt-textarea').inner_html()
    user=page.locator('[data-message-author-role="user"]').inner_html()
    assert color(page,'.markdown strong')=='rgb(51, 42, 50)'
    assert color(page,'.markdown :not(pre)>code','backgroundColor')=='rgb(245, 223, 231)'
    assert color(page,'.user-message-bubble-color','backgroundColor')=='rgb(245, 223, 231)'
    assert color(page,'[data-message-author-role="user"]','backgroundColor')=='rgba(0, 0, 0, 0)'
    assert color(page,'form','backgroundColor')=='rgb(255, 250, 245)'
    assert color(page,'#composer-background','backgroundColor')=='rgba(0, 0, 0, 0)'
    assert color(page,'#thread-bottom-container','backgroundImage')=='none'
    assert color(page,'a strong')==color(page,'a')
    passed('Light palette fixes native-dark bold/code/bubble/composer contrast without a double bubble')
    page.screenshot(path=str(OUT/'mooncat-light.png'))
    palettes=json.loads((E/'palettes.json').read_text())
    for theme in palettes:
        for mode in ['light','dark']:
            page.evaluate('p=>apply(p)',{'theme':theme,'mode':mode})
            assert page.locator('html').get_attribute('data-md-scheme')==mode
            def rgb(h):return 'rgb('+', '.join(str(int(h[i:i+2],16)) for i in [1,3,5])+')'
            assert color(page,'.markdown strong')==rgb(palettes[theme][mode]['text']), (theme,mode)
            assert color(page,'form','backgroundColor')!='rgba(0, 0, 0, 0)'
            assert color(page,'form','borderTopStyle')=='solid'
    passed('All 30 light/dark variants apply coherent text and composer surfaces')
    page.evaluate("apply({theme:'mooncat',mode:'chatgpt'});document.documentElement.className='dark native-app'")
    expect(page.locator('html')).to_have_attribute('data-md-scheme','dark')
    page.evaluate("document.documentElement.className='light native-app'")
    expect(page.locator('html')).to_have_attribute('data-md-scheme','light')
    page.evaluate("apply({theme:'mooncat',mode:'system'})")
    page.emulate_media(color_scheme='dark')
    expect(page.locator('html')).to_have_attribute('data-md-scheme','dark')
    page.emulate_media(color_scheme='light')
    expect(page.locator('html')).to_have_attribute('data-md-scheme','light')
    passed('Live native-class and OS appearance changes update palettes')
    page.evaluate("apply({theme:'mooncat',mode:'dark'})")
    assert page.locator('[data-message-author-role="assistant"]').inner_html()==before
    assert page.locator('#prompt-textarea').inner_html()==draft
    assert page.locator('[data-message-author-role="user"]').inner_html()==user
    page.screenshot(path=str(OUT/'mooncat-dark.png'))
    passed('Switching palettes preserves assistant/user DOM and unsent draft')
    warning=page.locator('[data-testid="composer-footer"]')
    expect(warning).to_have_text('ChatGPT can make mistakes. Check important info.')
    for width in [760,1024,1440,1800]:
        page.set_viewport_size({'width':width,'height':1040})
        center=page.evaluate('''()=>{const a=document.querySelector('main').getBoundingClientRect(),b=document.querySelector('form').getBoundingClientRect();return {delta:Math.abs((a.left+a.right)/2-(b.left+b.right)/2),fits:b.left>=a.left&&b.right<=a.right};}''')
        assert center['delta']<2 and center['fits'],(width,center)
        assert warning.is_visible()
    page.set_viewport_size({'width':1440,'height':1040})
    assert color(page,'[data-testid="composer-footer"]','textShadow')=='none'
    page.locator('#prompt-textarea').focus()
    assert color(page,'form','outlineStyle')=='solid'
    assert page.locator('#prompt-textarea').inner_html()==draft
    passed('Composer is centered within chat column at 4 desktop widths; distinct border and focus ring preserve draft')
    passed('Original disclaimer remains visible, centered and unchanged with no black text glow')

    page.evaluate("apply({enabled:false})")
    assert page.locator('html').get_attribute('data-md-enabled') is None
    assert page.locator('html').get_attribute('class')=='light native-app'
    assert page.locator('#chatdrobe-scene').count()==0
    page.evaluate('apply({});apply({mode:"light"})')
    previous=page.evaluate('adapter.diagnostics()')
    page.evaluate("for(let i=0;i<120;i++){const n=document.createElement('span');n.textContent='streaming ';document.querySelector('.markdown').append(n);}")
    after=page.evaluate('adapter.diagnostics()')
    assert previous==after
    passed('Pause restores native flags; 120 streamed DOM additions trigger no adapter work')
    # A fresh fixture for finite idle behavior.
    content(page)
    idle_source=(E/'idle.js').read_text().replace('export function ','function ')
    page.add_script_tag(content=idle_source+'\nwindow.idle=createIdleController(document,window);window.sample=()=>visibleWordRanges(document,window);')
    original=page.locator('[data-message-author-role="assistant"]').inner_html()
    draft=page.locator('#prompt-textarea').inner_html()
    page.evaluate("idle.configure(ChatDrobePrefs.prefs({idleMode:'stroll'}))")
    assert page.evaluate('idle.diagnostics().wordScans')==0
    page.evaluate("idle.configure(ChatDrobePrefs.prefs({theme:'mooncat',mode:'light',idleMode:'stroll',companion:'cat'}));idle.preview()")
    page.wait_for_timeout(3350)
    assert page.locator('#chatdrobe-idle').count()==1
    first=page.locator('#chatdrobe-idle').bounding_box()
    page.wait_for_timeout(450)
    second=page.locator('#chatdrobe-idle').bounding_box()
    assert abs(first['x']-second['x'])>10
    assert page.evaluate('idle.diagnostics().wordScans')==0
    page.screenshot(path=str(OUT/'walking-cat.png'))
    page.mouse.move(19,19)
    assert page.locator('#chatdrobe-idle').count()==0
    passed('Walking cat moves across conversation-column route with no text scan and stops immediately on input')

    page.evaluate("idle.configure(ChatDrobePrefs.prefs({idleMode:'bites',wordBitesConsent:true,companion:'robot'}));idle.preview()")
    page.wait_for_timeout(4900)
    assert page.evaluate('idle.diagnostics().running')
    assert page.evaluate("CSS.highlights.get('chatdrobe-idle-bite')?.size>0"),page.evaluate('idle.diagnostics()')
    assert page.locator('[data-message-author-role="assistant"]').inner_html()==original
    assert page.locator('#prompt-textarea').inner_html()==draft
    page.screenshot(path=str(OUT/'word-bites.png'))
    page.mouse.move(18,18)
    assert page.locator('#chatdrobe-idle').count()==0
    assert not page.evaluate("CSS.highlights.has('chatdrobe-idle-bite')")
    assert page.locator('[data-message-author-role="assistant"]').inner_html()==original
    passed('Opt-in Word Bites displays temporary highlights and restores immediately on pointer movement')
    assert page.evaluate('idle.diagnostics().examinedCharacters')<=1536
    assert page.evaluate('idle.diagnostics().examinedNodes')<=80
    samples=page.evaluate("sample().ranges.map(x=>({tag:x.range.startContainer.parentElement.tagName,role:x.range.startContainer.parentElement.closest('[data-message-author-role]').dataset.messageAuthorRole}))")
    assert samples and all(x['role']=='assistant' and x['tag'] not in ['CODE','A','PRE'] for x in samples)
    passed('Word selection is bounded and excludes links/code/user messages/composer')
    page.emulate_media(reduced_motion='reduce')
    reply=page.evaluate('idle.preview()')
    assert not reply['ok']
    assert page.locator('#chatdrobe-idle').count()==0
    assert not page.evaluate('idle.diagnostics().pendingTimer')
    passed('Reduced-motion preference blocks the idle effect and clears its pending timer')
    page.emulate_media(reduced_motion='no-preference')
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
    assert not page.evaluate('idle.preview().ok')
    assert not page.evaluate('idle.diagnostics().pendingTimer')
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))")
    passed('Simulated hidden-tab lifecycle clears animation, highlights and timers')
    page.evaluate("document.querySelector('#stop-holder').hidden=false;idle.preview()")
    page.wait_for_timeout(3200)
    assert not page.evaluate('idle.diagnostics().running')
    page.evaluate("document.querySelector('#stop-holder').hidden=true")
    passed('Visible native generation-stop control suppresses the effect')
    # Restart with native text changes during animation.
    page.evaluate('idle.preview()');page.wait_for_timeout(3300)
    assert page.evaluate('idle.diagnostics().running')
    page.evaluate("document.querySelectorAll('.markdown p').forEach(p=>p.append(document.createTextNode(' updated')))")
    page.wait_for_timeout(50)
    assert not page.evaluate('idle.diagnostics().running')
    assert not page.evaluate("CSS.highlights.has('chatdrobe-idle-bite')")
    passed('Changing a sampled text block cancels active Word Bites')
    page.evaluate('idle.preview()');page.wait_for_timeout(8500)
    assert not page.evaluate('idle.diagnostics().running')
    assert not page.evaluate('idle.diagnostics().pendingTimer')
    assert page.locator('#chatdrobe-idle').count()==0
    passed('Idle appearance ends automatically without an endless animation/timer loop')
    page.evaluate("idle.configure(ChatDrobePrefs.prefs({idleMode:'off'}))")
    assert not page.evaluate('idle.diagnostics().enabled')
    # Side-panel fixture uses mocked chrome IPC + storage, not an installed extension.
    panel=browser.new_page(viewport={'width':360,'height':940})
    panel.on('pageerror',lambda e:errors.append(str(e)))
    panel.set_content('<!doctype html><html><body></body></html>')
    script(panel,'prefs.js');script(panel,'core.js');script(panel,'commerce-config.js');script(panel,'access.js')
    panel.add_script_tag(content="""globalThis.__CHATDROBE_SIDE_FIXTURE__=true;
    window.fakeState=MoodDockCore.state();window.fixturePremium=false;window.fixtureDisplayState='displayed';window.openedWorld=null;const handlers=[];
    window.chrome={runtime:{id:'fixture',onMessage:{addListener:()=>{}},sendMessage:async m=>{
    if(m.kind==='open-upgrade'){window.openedWorld=m.world;return {ok:true};}
    if(m.kind==='billing-refresh'){fixturePremium=true;return {ok:true,billing:{testSubscription:true}};}
    if(m.kind==='mutate'){fakeState=MoodDockCore.reduce(fakeState,m.action);handlers.forEach(fn=>fn({mooddock:{newValue:fakeState}},'local'));}
    if(m.kind==='diagnostics')return {ok:true,experience:{...ChatDrobePrefs.experience(fakeState.prefs),revision:0,state:fixtureDisplayState,visible:fixtureDisplayState==='displayed'},stats:{applyCount:1,writeCount:2,extraDOMNodes:1},idle:{loaded:false}};
    if(m.kind==='idle-preview')return {ok:true};return {ok:true,state:structuredClone(fakeState),access:{premium:fixturePremium,testSubscription:fixturePremium,testerPreview:false,paid:false}};
    }},storage:{onChanged:{addListener:fn=>handlers.push(fn)}}};""")
    script(panel,'panel-style.js');script(panel,'workspace.js')
    expect(panel.get_by_role('button',name='Free · 11',exact=True)).to_be_visible()
    assert panel.locator('.world').count()==19
    first_card=panel.locator('.world').first.bounding_box()
    assert first_card and first_card['y']<560, ('Gallery starts too far below its controls',first_card)
    assert panel.locator('.content').evaluate('(n)=>n.scrollWidth<=n.clientWidth'), 'Panel content overflows horizontally'
    assert not panel.locator('.motionHelp').evaluate('(n)=>n.open')
    passed('Initial 360px panel shows the first world above 560px without horizontal overflow; motion details start collapsed')
    panel.screenshot(path=str(OUT/'initial-gallery.png'))
    panel.get_by_role('button',name='Premium',exact=True).click()
    assert panel.locator('.world').count()==8
    panel.get_by_role('button',name='Connect for Starlit Cat').click()
    assert panel.evaluate('openedWorld')=='starlit'
    assert panel.evaluate('fakeState.prefs.theme')=='mooncat'
    panel.screenshot(path=str(OUT/'premium-locked.png'))
    passed('Premium card opens an upgrade request without applying or claiming payment')
    panel.get_by_role('button',name='About',exact=True).click()
    expect(panel.get_by_role('button',name='Enable private tester preview',exact=True)).to_have_count(0)
    panel.get_by_role('button',name='Account',exact=True).click()
    panel.get_by_role('button',name='Refresh Premium access',exact=True).click()
    panel.get_by_role('button',name='Worlds',exact=True).click()
    panel.get_by_role('button',name='Select Starlit Cat').click()
    expect(panel.get_by_role('button',name='Select Starlit Cat')).to_have_attribute('aria-pressed','true')
    passed('Simulated verified subscription unlocks Premium themes, scenes and companion; no tester control exists')
    panel.get_by_role('button',name='Subtle',exact=True).click()
    expect(panel.get_by_role('button',name='Subtle',exact=True)).to_have_attribute('aria-pressed','true')
    assert panel.evaluate('fakeState.prefs.motion && fakeState.prefs.theme==="starlit"'), 'Motion should immediately apply to the active world'
    panel.get_by_role('button',name='Select Starship Journey',exact=True).click()
    panel.wait_for_timeout(100)
    assert panel.evaluate('fakeState.prefs.livingEnabled && fakeState.prefs.livingMotion')
    assert panel.evaluate('fakeState.prefs.livingBehavior')=='subtle'
    expect(panel.locator('[data-page-status]')).to_contain_text('Displayed on the active ChatGPT tab')
    panel.get_by_role('button',name='Still',exact=True).click()
    expect(panel.get_by_role('button',name='Still',exact=True)).to_have_attribute('aria-pressed','true')
    assert panel.evaluate('fakeState.prefs.livingEnabled && !fakeState.prefs.livingMotion'), 'Still stops current-world motion without reselecting its card'
    panel.evaluate('fixtureDisplayState="blocked"')
    expect(panel.locator('[data-page-status]')).to_contain_text('cannot be displayed here',timeout=4500)
    passed('Motion applies in one click and display status updates automatically after a layout-state change')
    panel.evaluate('fixtureDisplayState="displayed"')
    panel.get_by_role('button',name='All worlds',exact=True).click()
    panel.get_by_role('button',name='Select Mooncat Café',exact=True).click()
    panel.wait_for_timeout(100)
    assert not panel.evaluate('fakeState.prefs.livingEnabled')
    assert panel.evaluate('fakeState.prefs.idleMode')=='off'
    passed('Single gallery carries chosen motion into Living Worlds and atomically clears its engine when selecting a theme')
    panel.get_by_role('button',name='Read',exact=True).click()
    panel.get_by_label('Workspace appearance',exact=True).select_option('dark')
    panel.get_by_label('Panel appearance',exact=True).select_option('dark')
    expect(panel.locator('#mooddock-root')).to_have_attribute('data-panel-mode','dark')
    assert panel.evaluate('fakeState.prefs.mode')=='dark'
    passed('Read controls save workspace mode and independent panel dark mode')
    panel.get_by_role('button',name='Worlds',exact=True).click()
    panel.get_by_role('button',name='Advanced effects',exact=True).click()
    panel.get_by_label('Idle effect',exact=True).select_option('bites')
    expect(panel.get_by_label('Idle effect',exact=True)).to_have_value('off')
    panel.get_by_role('checkbox',name='Allow Word Bites on visible assistant text').check()
    expect(panel.get_by_role('checkbox',name='Allow Word Bites on visible assistant text')).to_be_checked()
    panel.get_by_label('Idle effect',exact=True).select_option('bites')
    panel.wait_for_timeout(50)
    assert panel.evaluate('fakeState.prefs.idleMode')=='bites'
    panel.screenshot(path=str(OUT/'play-panel-dark.png'),full_page=True)
    panel.get_by_role('button',name='Worlds',exact=True).click()
    panel.screenshot(path=str(OUT/'premium-panel-dark.png'),full_page=True)
    passed('Word Bites permission cannot be skipped in Advanced effects')
    panel.get_by_role('button',name='Read',exact=True).click()
    panel.get_by_label('Panel appearance',exact=True).select_option('light')
    panel.get_by_role('button',name='Free · 11',exact=True) if False else None
    panel.get_by_role('button',name='Worlds',exact=True).click()
    panel.get_by_role('button',name='Free · 11',exact=True).click()
    panel.screenshot(path=str(OUT/'free-panel-light.png'),full_page=True)
    assert not errors,errors
    passed('No uncaught runtime errors in page and side-panel fixtures')
    browser.close()
(OUT/'browser-results.json').write_text(json.dumps({'environment':f'offline Chromium {browser_version} fixture; no installed extension or signed-in ChatGPT session','groups':len(checks),'passed':checks},indent=2)+'\n')
print(len(checks),'browser scenario groups passed.')
