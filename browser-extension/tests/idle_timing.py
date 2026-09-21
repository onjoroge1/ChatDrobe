"""Fake-clock timing checks on a synthetic document, not a real user account."""
from pathlib import Path
import json
import os
import shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'extension'
checks=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH',shutil.which('chromium')),headless=True,args=['--no-sandbox'])
    page=b.new_page(viewport={'width':1440,'height':1040})
    page.clock.install()
    page.set_content((ROOT/'tests/fixture.html').read_text())
    for name in ['themes.css','theme.css']:page.add_style_tag(content=(E/name).read_text())
    for name in ['prefs.js','adapter.js']:page.add_script_tag(content=(E/name).read_text())
    page.add_script_tag(content=(E/'idle.js').read_text().replace('export function ','function '))
    page.evaluate("window.idle=createIdleController(document,window);ChatDrobeAdapter.create(document).apply({});idle.configure(ChatDrobePrefs.prefs({idleMode:'stroll',idleSeconds:30}));")
    page.clock.run_for(29000)
    assert not page.evaluate('idle.diagnostics().running')
    page.mouse.move(10,10)
    page.clock.run_for(29900)
    assert not page.evaluate('idle.diagnostics().running')
    page.clock.run_for(150)
    assert page.evaluate('idle.diagnostics().running')
    assert page.evaluate('idle.diagnostics().wordScans')==0
    checks.append('Real inactivity threshold waits 30 seconds and resets after pointer motion; stroll never scans text')
    page.keyboard.press('Shift')
    assert not page.evaluate('idle.diagnostics().running')
    assert page.locator('#chatdrobe-idle').count()==0
    checks.append('Keyboard activity removes the running overlay immediately')
    page.evaluate("idle.configure(ChatDrobePrefs.prefs({idleMode:'off'}))")
    page.clock.run_for(300000)
    assert not page.evaluate('idle.diagnostics().enabled')
    assert not page.evaluate('idle.diagnostics().pendingTimer')
    checks.append('Effects off stays timer-free across five simulated minutes')
    b.close()
(ROOT/'preview/idle-timing-results.json').write_text(json.dumps({'environment':'Chromium offline fixture with Playwright fake clock','groups':len(checks),'passed':checks},indent=2)+'\n')
for x in checks:print('PASS:',x)
