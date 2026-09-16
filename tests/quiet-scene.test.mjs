import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {QUIET_CSS} from '../src/living-runtime/quiet-scene.mjs';
test('quiet refinement keeps routines finite and suppresses competing motion',()=>{
 for(const name of ['quiet-blink','quiet-lick','quiet-scratch','quiet-inspect'])assert.ok(QUIET_CSS.includes(name));
 assert.match(QUIET_CSS,/\.caption\{display:none!important\}/);
 assert.match(QUIET_CSS,/prefers-reduced-motion/);
 assert.doesNotMatch(QUIET_CSS,/infinite|z-index|position:fixed/);
});
test('quiet modules and styling remain lazy first-party assets within explicit incremental budgets',()=>{
 assert.ok(fs.statSync('dist/assets/living-quiet.js').size<3500);
 assert.ok(fs.statSync('dist/assets/living-quiet.css').size<4000);
 const script=fs.readFileSync('dist/assets/living-worlds.js','utf8');
 assert.match(script,/import\('\.\/living-quiet.js'\)/);
 const renderer=fs.readFileSync('dist/assets/living-quiet.js','utf8');
 assert.match(renderer,/from '\.\/living-renderer.js'/);
 assert.doesNotMatch(renderer,/BASE_CSS|QUIET_CSS|innerHTML|fetch\(/);
 assert.match(fs.readFileSync('dist/assets/living-runtime.css','utf8'),/^@import url\('\.\/living-quiet.css'\);/);
 for(const route of JSON.parse(fs.readFileSync('dist/build-manifest.json')).routes){const html=fs.readFileSync(route==='/'?'dist/index.html':`dist${route}index.html`,'utf8');assert.doesNotMatch(html,/src="[^\"]*living-quiet|rel="stylesheet" href="[^\"]*living-quiet/);}
});
test('the refinement removes internal captions and never reads form or transcript contents',()=>{
 const source=fs.readFileSync('src/living-runtime/quiet-scene.mjs','utf8');
 assert.match(source,/querySelector\('\.caption'\)\?\.remove/);
 assert.match(source,/s\.busy\|\|s\.streaming/);
 // Property access is forbidden; object spread (...value) is not an input.value read.
 assert.doesNotMatch(source,/setInterval|localStorage|textContent|(?<!\.)\.\s*value\b/);
 assert.match('input.value',/(?<!\.)\.\s*value\b/);
 assert.doesNotMatch('...value',/(?<!\.)\.\s*value\b/);
});
