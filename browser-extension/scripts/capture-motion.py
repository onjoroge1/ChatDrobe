from pathlib import Path
import io,re
from PIL import Image
from playwright.sync_api import sync_playwright
B=Path(__file__).resolve().parents[1];E=B/'extension';OUT=B/'preview'
def plain(p):return re.sub(r'\bexport (?=(?:function|const|class)\b)','',re.sub(r'^import .*?;\n','',p.read_text(),flags=re.M))
code='\n'.join(plain(E/'living'/f) for f in ['companion-motion.mjs','companion-rig.mjs'])
frames=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':640,'height':450},device_scale_factor=1)
 page.set_content('<html><head><style>*{box-sizing:border-box}body{margin:0;background:#f4f0e6;color:#344334;font:16px system-ui}header{padding:22px 28px 0;display:flex;align-items:center;justify-content:space-between}strong{font-size:21px}small{font-size:10px;letter-spacing:.1em}#actor{position:absolute;top:58px;left:0;width:640px;height:340px}svg{width:100%;height:100%;display:block}footer{position:absolute;bottom:18px;left:28px;right:28px;font-size:12px;display:flex;justify-content:space-between}#name{font-weight:600}</style></head><body><header><strong>ChatDrobe</strong><small>PREMIUM MOTION · 0.8.0</small></header><div id="actor"></div><footer><span id="name"></span><span>Original speed · idle gaps omitted</span></footer></body></html>')
 page.add_script_tag(content=code+"\nwindow.cat=createCatRig(document);document.getElementById('actor').append(cat.element);window.pose=(action,t)=>cat.pose(action,t);")
 for action,label,duration in [('groom','Paw wash → face groom',8.4),('stretch','Weight shift → grounded stretch',9.6)]:
  page.locator('#name').evaluate('(n,v)=>n.textContent=v',label)
  n=round(duration*12)
  for i in range(n+1):
   page.evaluate('([a,t])=>pose(a,t)',[action,i/n])
   img=Image.open(io.BytesIO(page.screenshot())).convert('RGB').resize((512,360),Image.Resampling.LANCZOS)
   frames.append(img)
 b.close()
# A shared palette prevents frame-by-frame palette shimmer in this illustrative proof.
contact=Image.new('RGB',(512*4,360*4))
for i in range(16):contact.paste(frames[round(i*(len(frames)-1)/15)],((i%4)*512,(i//4)*360))
palette=contact.quantize(colors=128)
indexed=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
indexed[0].save(OUT/'natural-cat-sampler.gif',save_all=True,append_images=indexed[1:],duration=83,loop=0,optimize=False,disposal=2)
print('Frames:',len(frames),'GIF bytes:',(OUT/'natural-cat-sampler.gif').stat().st_size)
