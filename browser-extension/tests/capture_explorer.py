"""Capture original routine animations in an enlarged, isolated demo stage."""
from pathlib import Path
import io,json,shutil
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'extension';OUT=ROOT/'preview'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':760,'height':295},device_scale_factor=1)
 page.set_content('''<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;background:#f6f5ee;color:#263127;font:14px system-ui}header{padding:16px 24px;font-weight:650;font-size:16px}p{margin:0;position:absolute;top:48px;font-size:12px;color:#53624b}.note{position:fixed;bottom:7px;left:24px;font-size:11px;font-weight:400}</style></head><body><header>ChatDrobe · Explorer routines</header><p style="left:24px">Rally Garage</p><p style="left:273px">Orbital Bridge</p><p style="left:518px">Solar Observatory</p><div class="note">Enlarged animation demo. In the extension, effects are opt-in and run once per idle spell.</div></body></html>''')
 code=(E/'world-routines.js').read_text().replace('export function ','function ').replace('export const ','const ')
 page.add_script_tag(content=code)
 pal=json.loads((E/'palettes.json').read_text())
 page.evaluate('''pal=>{window.visuals=[];for(const [i,id]of ['rally','bridge','observatory'].entries()){const visual=createWorldVisual(document,id,{x:24+i*247,y:74,width:218.4,height:179.4,scale:1.3});visual.host.id='demo-'+id;for(const [k,v]of Object.entries(pal[id].light))visual.host.style.setProperty('--md-'+k,v);document.body.append(visual.host);visuals.push(visual);}window.go=()=>Promise.all(visuals.map(async v=>{for(const s of v.steps){v.stage.dataset.phase=s.phase;const a=v.actor.animate(s.frames,{duration:s.duration,easing:s.easing||'ease-in-out',fill:'forwards'});await a.finished;}}));}''',pal)
 page.evaluate('void go()')
 frames=[]
 for i in range(45):
  frames.append(Image.open(io.BytesIO(page.screenshot())).convert('RGB'))
  page.wait_for_timeout(160)
 frames[0].save(OUT/'explorer-routines.gif',save_all=True,append_images=frames[1:],duration=180,loop=0,optimize=True)
 page.screenshot(path=str(OUT/'explorer-routines-still.png'))
 b.close()
print('Captured the three real routine implementations in a synthetic demo stage.')
