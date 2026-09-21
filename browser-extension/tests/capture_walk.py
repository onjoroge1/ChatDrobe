from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io,shutil
R=Path(__file__).resolve().parents[1];E=R/'extension';frames=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1040})
 page.set_content((R/'tests/fixture.html').read_text())
 for f in ['themes.css','theme.css']:page.add_style_tag(content=(E/f).read_text())
 for f in ['prefs.js','adapter.js']:page.add_script_tag(content=(E/f).read_text())
 page.add_script_tag(content=(E/'idle.js').read_text().replace('export function ','function '))
 page.evaluate("ChatDrobeAdapter.create(document).apply({mode:'light'});window.idle=createIdleController(document,window);idle.configure(ChatDrobePrefs.prefs({idleMode:'stroll',companion:'cat'}));idle.preview();")
 page.wait_for_timeout(3100)
 for i in range(20):
  shot=page.screenshot(clip={'x':210,'y':730,'width':1230,'height':310})
  frames.append(Image.open(io.BytesIO(shot)).convert('RGB').resize((861,217)))
  page.wait_for_timeout(240)
 b.close()
frames[0].save(R/'preview/walking-cat-demo.gif',save_all=True,append_images=frames[1:],duration=270,loop=0,optimize=True)
print('Captured local-fixture walk demonstration')
