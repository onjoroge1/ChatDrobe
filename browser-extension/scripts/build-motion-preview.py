from pathlib import Path
import re
B=Path(__file__).resolve().parents[1]
E=B/'extension'
def module_text(file):
    s=file.read_text()
    if file.name=='scene.mjs':
        s=s.replace('export const SCENE_CSS=', 'export const BASE_CSS=').replace('export function createScene(', 'export function baseScene(')
    s=re.sub(r'^import .*?;\n','',s,flags=re.M)
    return re.sub(r'\bexport (?=(?:function|const|class)\b)','',s)
parts=['living/model.mjs','living/scene.mjs','living/companion-motion.mjs','living/companion-rig.mjs','living/quiet-scene.mjs','motion-preview.mjs']
code='\n'.join(module_text(E/f) for f in parts)
html=(E/'motion-preview.html').read_text().replace('<link rel="stylesheet" href="motion-preview.css">','<style>'+(E/'motion-preview.css').read_text()+'</style>').replace('<script type="module" src="motion-preview.mjs"></script>','<script type="module">'+code+'</script>')
(B/'preview').mkdir(exist_ok=True)
(B/'preview/motion-studio.html').write_text(html)
print('Built standalone motion showroom:',len(html.encode()),'bytes')
