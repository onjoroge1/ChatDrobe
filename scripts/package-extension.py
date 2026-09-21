"""Create a deterministic, load-unpacked review ZIP from the checked-in runtime."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
RELEASE = json.loads((ROOT / 'release.json').read_text())['extension']
SOURCE = ROOT / RELEASE['source']
VERSION = RELEASE['version']
manifest = json.loads((SOURCE / 'manifest.json').read_text())
assert manifest['version'] == VERSION, 'Build version differs from release.json'
output = ROOT / 'artifacts' / 'extension'
output.mkdir(parents=True, exist_ok=True)
archive = output / f'chatdrobe-extension-{VERSION}.zip'
files = sorted(p for p in SOURCE.rglob('*') if p.is_file())
assert files and not any(p.is_symlink() for p in SOURCE.rglob('*')), 'Runtime must contain regular files only'
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as package:
    for file in files:
        name = file.relative_to(SOURCE).as_posix()
        assert not any(part.startswith('.') for part in Path(name).parts), f'Unexpected hidden file: {name}'
        assert file.suffix in {'.js', '.mjs', '.css', '.html', '.json', '.png', '.txt'}, f'Unexpected runtime file: {name}'
        info = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        package.writestr(info, file.read_bytes(), compresslevel=9)
with ZipFile(archive) as package:
    assert package.testzip() is None
    assert json.loads(package.read('manifest.json'))['version'] == VERSION
    assert len(package.namelist()) == len(files)
    for file in files:
        assert package.read(file.relative_to(SOURCE).as_posix()) == file.read_bytes()
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(output / (archive.name + '.sha256')).write_text(f'{digest}  {archive.name}\n')
print(f'{archive.relative_to(ROOT)}: {len(files)} files; SHA-256 {digest}')
