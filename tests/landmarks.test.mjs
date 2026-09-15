import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const routes=JSON.parse(fs.readFileSync('dist/build-manifest.json')).routes;
test('every page has one primary main landmark, including pages containing fictional previews',()=>{
 for(const route of [...routes,'/404/']){
  const file=route==='/404/'?'dist/404.html':route==='/'?'dist/index.html':`dist${route}index.html`;
  const html=fs.readFileSync(file,'utf8');
  assert.equal((html.match(/<main\b/g)||[]).length,1,route);
  assert.equal((html.match(/<\/main>/g)||[]).length,1,route);
  assert.doesNotMatch(html,/role=["']main["']/i,route);
 }
});
