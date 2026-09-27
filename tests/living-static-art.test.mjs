import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {livingArt} from '../src/living-collection.mjs';
import {staticCatArt,staticWorldProps} from '../src/living-static-art.mjs';
import {WORLD_ART} from '../browser-extension/extension/living/art/world-art.mjs';
import {TOKYO_PLANT_ART} from '../browser-extension/extension/living/art/tokyo-plant-art.mjs';

const geometry=specs=>specs.flatMap(([,attrs,children=[]])=>[...(attrs.d?[attrs.d]:[]),...geometry(children)]);
test('static website cats keep the canonical rest anatomy without animation or CSS-dependent paths',()=>{
 const art=staticCatArt('test-cat');
 const bones=[...art.matchAll(/data-bone="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(bones.length,28);assert.equal(new Set(bones).size,28);
 assert.equal(bones.filter(name=>name==='frontNearPaw').length,1,'append must move the foreground paw instead of duplicating it');
 assert.match(art,/data-bone="tailSkin" d="M /);assert.match(art,/data-bone="tailBands"[^>]* d="M /);
 assert.match(art,/data-bone="head" transform="translate\(118 77\) rotate\(-3\) scale\(1 1\)"/);
 assert.doesNotMatch(art,/<script|<foreignObject|\son\w+=|\sstyle=|path\(&quot;|\b(?:px|deg)\b|<animate/);
 assert.throws(()=>staticCatArt('bad"instance'));
 const source=fs.readFileSync('src/living-static-art.mjs','utf8');
 assert.match(source,/createCatRig\(document\)/);assert.doesNotMatch(source,/\.play\(/);
});
test('static world props use the curated source geometry and defined website colors',()=>{
 for(const[id,assets]of [['tokyo',Object.values(TOKYO_PLANT_ART)],['train',Object.values(WORLD_ART.train)],['starship',[WORLD_ART.starship['earth-surface'],WORLD_ART.starship['planet-shade']]]]){
  const art=staticWorldProps(id,'test-'+id);
  for(const d of assets.flatMap(geometry))assert.ok(art.includes(`d="${d}"`),`${id}: shared path geometry`);
  for(const[,name]of art.matchAll(/var\(--([^)]+)\)/g))assert.ok(['env-grass','env-city'].includes(name),`${id}: ${name}`);
  assert.doesNotMatch(art,/<script|<foreignObject|\son\w+=|\shref=|\sstyle=/);
 }
 assert.throws(()=>staticWorldProps('unknown','test'));
});
test('repeated no-JavaScript world illustrations have local, unique SVG references',()=>{
 const art=['tokyo','train','starship'].flatMap(id=>['card','detail','fallback'].map(view=>livingArt(id,`${view}-${id}`))).join('');
 const ids=[...art.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const[,id]of art.matchAll(/url\(#([^)]+)\)/g))assert.ok(ids.includes(id),id);
 assert.equal((art.match(/data-artwork="canonical-cat"/g)||[]).length,6);
 for(const name of ['dicebear-sprouts','dicebear-landscape','dicebear-planets'])assert.equal((art.match(new RegExp(`data-artwork="${name}"`,'g'))||[]).length,3);
});
