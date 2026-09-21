import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {livingCollection,livingArt} from '../src/living-collection.mjs';
const get=route=>fs.readFileSync(route==='/'?'dist/index.html':`dist${route}index.html`,'utf8');
const ids=['tokyo','starship','train'];
test('three Living environments remain distinct from static theme IDs and downloads',()=>{
 assert.deepEqual(livingCollection.map(x=>x.id),ids);
 const themes=JSON.parse(fs.readFileSync('src/themes.json'));
 assert.equal(themes.length,15);for(const id of ids){assert.ok(!themes.some(t=>t.id===id));assert.ok(!fs.existsSync(`dist/downloads/appearances/${id}.json`));}
});
test('homepage leads with Living Worlds while preserving the static theme preview',()=>{
 const h=get('/');assert.ok(h.indexOf('LIVING WORLDS FOR CHATGPT')<h.indexOf('THE STATIC WARDROBE'));
 for(const w of livingCollection){assert.ok(h.includes(w.name));assert.ok(h.includes(`href="/living-worlds/#${w.id}"`));}
 assert.match(h,/Preview Circuit Bay/);assert.equal((h.match(/<h1\b/g)||[]).length,1);
});
test('catalog, Plus, features and pricing all name the delivered environments',()=>{
 for(const path of ['/themes/','/premium/','/features/','/pricing/','/living-worlds/'])for(const w of livingCollection)assert.ok(get(path).includes(w.name),path+':'+w.id);
 const catalog=get('/themes/');assert.equal((catalog.match(/class="world-card"/g)||[]).length,15);assert.match(catalog,/Static themes/);
});
test('every illustrated card has a working anchor and every SVG ID is unique per page',()=>{
 const target=get('/living-worlds/');for(const id of ids)assert.ok(target.includes(`id="${id}"`));
 for(const route of ['/','/themes/','/premium/','/features/','/living-worlds/']){
  const h=get(route),found=[...h.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(found).size,found.length,route);
  for(const m of h.matchAll(/url\(#([^\)]+)\)/g))assert.ok(found.includes(m[1]),route+':'+m[1]);
 }
 assert.throws(()=>livingArt('not-a-world','valid'));assert.throws(()=>livingArt('tokyo','unsafe"'));
});
test('annual price is consistent and no public page still calls the price proposed',()=>{
 const config=JSON.parse(fs.readFileSync('site.config.json'));assert.equal(config.plusAnnualUsd,29);
 for(const route of JSON.parse(fs.readFileSync('dist/build-manifest.json')).routes)assert.doesNotMatch(get(route),/proposed/i,route);
 for(const route of ['/','/pricing/']){const h=get(route);assert.match(h,/\$29 <span>\/ year<\/span>/);assert.match(h,/Checkout is not enabled yet/);assert.match(h,/No payment is being collected/);}
});
test('beta setup and future concepts are unambiguous; no false Living appearance download',()=>{
 const h=get('/living-worlds/');assert.match(h,/Still, Subtle or Playful/);assert.match(h,/Check display/);assert.doesNotMatch(h,/Enable private tester preview/);assert.match(h,/not included today/i);
 for(const name of ['Underwater Research Station','Wizard’s Study','Robot Colony','World Studio'])assert.ok(h.includes(name));
 assert.match(get('/install/'),/id="living"/);assert.match(h,/not a live ChatGPT session/);
});
test('previews default to day and no motion, with no network or persistent tracking in the controller',()=>{
 const h=get('/');assert.match(h,/data-day="day" data-motion="false"/);
 const code=fs.readFileSync('src/living-worlds.js','utf8');assert.doesNotMatch(code,/fetch\s*\(|localStorage|setInterval|setTimeout|innerHTML|eval\s*\(/);
 assert.match(code,/prefers-reduced-motion/);assert.match(code,/IntersectionObserver/);assert.match(code,/document.hidden/);
});
