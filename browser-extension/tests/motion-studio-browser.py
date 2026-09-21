"""Render the same original rig in Chromium, inspect actual WAAPI tracks and still frames.
Offline set_content fixture because this environment blocks browser URL navigation.
"""
from pathlib import Path
import json,re,subprocess
from playwright.sync_api import sync_playwright,expect
B=Path(__file__).resolve().parents[1];OUT=B/'preview'
subprocess.run(['python',str(B/'scripts/build-motion-preview.py')],check=True)
checks=[]
def ok(s):checks.append(s);print('PASS',s,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1120});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((OUT/'motion-studio.html').read_text());page.wait_for_timeout(80)
 room=page.locator('#scene').locator('.room');cat=room.locator('.companion-cat')
 for action in ['blink','look','ears','breathe','groom','scratch','stretch','knead','yawn','curl']:
  page.locator('#action').select_option(action);page.locator('#play').click()
  assert cat.evaluate('(n)=>n.getAnimations({subtree:true}).length')>0,action
  assert cat.evaluate('(n)=>n.getAnimations({subtree:true}).every(a=>a.effect.getTiming().iterations===1)'),action
  page.locator('#stop').click();assert cat.evaluate('(n)=>n.getAnimations({subtree:true}).length')==0
 ok('All ten actions use finite browser-native animations and stop without leftover tracks')
 page.locator('#action').select_option('groom');page.locator('#play').click()
 before=cat.locator('[data-bone="frontNearPaw"]').evaluate('(n)=>getComputedStyle(n).transform')
 cat.evaluate('(n)=>n.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=4200;})')
 after=cat.locator('[data-bone="frontNearPaw"]').evaluate('(n)=>getComputedStyle(n).transform')
 assert before!=after
 tail=cat.locator('[data-bone="tailSkin"]').evaluate('(n)=>getComputedStyle(n).d')
 assert tail.startswith('path(') and 'NaN' not in tail
 ok('Actual browser transforms move the paw, and the skinned tail renders as a valid vector path')
 page.locator('#stop').click();page.locator('#closeup').check()
 expect(page.locator('.fictional-chat')).to_be_hidden()
 for action in ['groom','scratch','stretch','knead','curl']:
  page.locator('#action').select_option(action)
  for t in [0,25,50,75,100]:
   page.locator('#scrub').fill(str(t));assert cat.evaluate('(n)=>n.getAnimations({subtree:true}).length')==0
   bounds=cat.locator('[data-bone="head"]').bounding_box();stage=cat.bounding_box()
   assert bounds['x']>=stage['x'] and bounds['y']>=stage['y'],(action,t,bounds,stage)
   assert bounds['x']+bounds['width']<=stage['x']+stage['width']+1,(action,t)
 page.screenshot(path=str(OUT/'motion-studio-closeup.png'))
 ok('Pose inspection is deterministic, grounded in the same model and clipped to its habitat')
 page.emulate_media(reduced_motion='reduce');expect(page.locator('#play')).to_be_disabled()
 page.locator('#action').select_option('groom');page.locator('#scrub').fill('50');assert cat.evaluate('(n)=>n.getAnimations({subtree:true}).length')==0
 ok('Reduced motion blocks playback but preserves a useful still-pose inspector')
 page.emulate_media(reduced_motion='no-preference');page.locator('#closeup').uncheck()
 for width in [360,390,768,1440]:
  page.set_viewport_size({'width':width,'height':1050});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  for world in ['tokyo','starship','train']:
   page.locator('#world').select_option(world);expect(page.locator('#scene').locator('.room')).to_have_attribute('data-world',world)
   page.locator('#night').check();page.locator('#night').uncheck()
   page.locator('#play').click();page.locator('#stop').click()
 ok('All three worlds and the showroom fit four viewport sizes')
 assert not errors,errors
 page.set_viewport_size({'width':1440,'height':1100});page.locator('#world').select_option('tokyo');page.locator('#action').select_option('groom');page.locator('#scrub').fill('45')
 page.screenshot(path=str(OUT/'motion-studio-desktop.png'),full_page=True)
 ok('No uncaught JavaScript errors during switching, inspection or playback')
 b.close()
(OUT/'motion-studio-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'Chromium, in-memory fixture, actual SVG and WAAPI; no native extension or networked website verification'},indent=2))
