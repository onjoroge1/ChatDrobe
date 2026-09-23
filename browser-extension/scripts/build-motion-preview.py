"""Copy the real Companion Studio and its local ESM dependencies for HTTP review.

Serve browser-extension/preview/ over HTTP and open motion-studio.html. Do not
flatten modules: the review must execute the same code and licenses as the ZIP.
"""
from pathlib import Path
import shutil

B = Path(__file__).resolve().parents[1]
E = B / 'extension'
OUT = B / 'preview'
OUT.mkdir(exist_ok=True)

# Replace only this generated subtree: old runtime files cannot survive a build,
# but screenshots and evidence from the other browser checks are preserved.
runtime = OUT / 'living'
if runtime.exists():
    shutil.rmtree(runtime)
shutil.copytree(E / 'living', runtime)
for name in ['motion-preview.css', 'motion-preview.mjs']:
    shutil.copyfile(E / name, OUT / name)
shutil.copyfile(E / 'motion-preview.html', OUT / 'motion-studio.html')

files = [p for p in runtime.rglob('*') if p.is_file()]
print(f'Built Companion Studio with {len(files)} unchanged runtime/license files.')
print('Serve browser-extension/preview/ over HTTP; open motion-studio.html.')
