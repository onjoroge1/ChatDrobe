import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const P=createRequire(import.meta.url)('../browser-extension/extension/prefs.js');
const themes=JSON.parse(fs.readFileSync('src/themes.json'));
test('catalog preserves 15 unique worlds and 11 proposed free themes',()=>{assert.equal(themes.length,15);assert.equal(new Set(themes.map(t=>t.id)).size,15);assert.equal(themes.filter(t=>t.plan==='free').length,11);});
test('every world has a pre-rendered page and compatible appearance export',()=>{for(const t of themes){assert.ok(fs.readFileSync(`dist/themes/${t.id}/index.html`,'utf8').includes(t.name.replaceAll('&','&amp;')));const appearance=JSON.parse(fs.readFileSync(`dist/downloads/appearances/${t.id}.json`));assert.equal(appearance.format,'chatdrobe-appearance');assert.equal(appearance.version,1);assert.equal(appearance.prefs.theme,t.id);assert.equal(appearance.prefs.motion,false);assert.equal(P.scheme(P.prefs(appearance.prefs)),t.dark?'dark':'light');}});
test('static output excludes extension runtime and remains private by default',()=>{assert.ok(!fs.existsSync('dist/browser-extension'));assert.ok(!fs.existsSync('dist/background.js'));assert.match(fs.readFileSync('dist/robots.txt','utf8'),/Disallow: \//);assert.ok(!JSON.parse(fs.readFileSync('package.json')).dependencies);});
