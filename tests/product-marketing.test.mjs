import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {counts,featuresPage,premiumPage,pricingPage,upgradeLegacyCopy} from '../src/product.mjs';

const themes=JSON.parse(fs.readFileSync('src/themes.json','utf8'));
const config=JSON.parse(fs.readFileSync('site.config.json','utf8'));

test('product counts match the Explorer collection',()=>{
  assert.deepEqual(counts(themes),{total:15,free:11,plus:4,palettes:30});
});

test('legacy 12-world launch copy is upgraded from catalog truth',()=>{
  const result=upgradeLegacyCopy('All 12 worlds unlocked. Explore all 12 worlds. 12 original worlds. 8 complete original worlds.',themes);
  assert.equal(result,'All 15 worlds unlocked. Explore all 15 worlds. 15 original worlds. 11 complete original worlds.');
});

test('features page separates current premium previews from planned work',()=>{
  const html=featuresPage(themes);
  assert.match(html,/Rally Garage cruise/);
  assert.match(html,/Orbital Bridge drone/);
  assert.match(html,/Solar Observatory orbit/);
  assert.match(html,/Word Bites/);
  assert.match(html,/Advanced scene editor/);
  assert.match(html,/Scheduled worlds/);
  assert.match(html,/Private beta/);
  assert.match(html,/Planned/);
});

test('premium page names all four Plus-preview worlds',()=>{
  const html=premiumPage(themes);
  for(const name of ['Starlit Cat','Mecha Reactor','Neon Sentinel','Retro Arcade']) assert.match(html,new RegExp(name));
});

test('pricing remains proposed and explicitly does not collect payment',()=>{
  const html=pricingPage(themes,config);
  assert.match(html,/\$29/);
  assert.match(html,/proposed/i);
  assert.match(html,/No payment is being collected/);
  assert.match(html,/11 original worlds/);
  assert.match(html,/4 premium-preview worlds/);
});
