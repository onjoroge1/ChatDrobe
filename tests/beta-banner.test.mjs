import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('dist/build-manifest.json','utf8'));
const freeCount=JSON.parse(fs.readFileSync('src/themes.json','utf8')).filter(theme=>theme.plan==='free').length;
test('every generated beta banner distinguishes Free from explicit Premium tester access',()=>{
 for(const route of [...manifest.routes,'/404/']){
  const file=route==='/404/'?'dist/404.html':route==='/'?'dist/index.html':`dist${route}index.html`;
  const html=fs.readFileSync(file,'utf8'),banner=html.match(/<div class="beta-bar">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(banner,`Missing beta banner: ${route}`);assert.ok(banner.includes(`${freeCount} Free worlds`),route);assert.match(banner,/Premium tester preview/,route);assert.doesNotMatch(banner,/All \d+ worlds unlocked/i,route);
 }
});
