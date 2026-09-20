import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {deploymentRoutes} from '../scripts/build-vercel.mjs';
test('owner/device controls stay on account routes with no credentials or private source in public HTML',()=>{
 const routes=['/signup/','/signin/','/account/','/admin/'];
 for(const r of JSON.parse(fs.readFileSync('dist/build-manifest.json')).routes){const h=fs.readFileSync(r==='/'?'dist/index.html':`dist${r}index.html`,'utf8');assert.equal(h.includes('/assets/account-link-ui.js'),routes.includes(r),r);assert.doesNotMatch(h,/scrypt-v1\$|BEGIN PRIVATE KEY/);}
 const js=fs.readFileSync('dist/assets/account-link-ui.js','utf8');assert.doesNotMatch(js,/innerHTML|localStorage\.|sessionStorage\./);assert.match(js,/confirmed:confirm.checked/);assert.ok(fs.statSync('dist/assets/account-link-ui.js').size<8000);
});
test('extension API is exact and private; billing/account route order stays unchanged',()=>{const policy=JSON.parse(fs.readFileSync('src/deployment-headers.json')),routes=deploymentRoutes({routes:['/','/account/']},policy);assert.equal(routes[0].dest,'/api/billing');assert.equal(routes[1].dest,'/api/account');assert.equal(routes[2].dest,'/api/extension');assert.ok(!routes[2].status);assert.match(routes[2].headers['Cache-Control'],/no-store/);assert.doesNotMatch('/api/extension.js',new RegExp(routes[2].src));});
