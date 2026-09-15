import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {deploymentRoutes} from '../scripts/build-vercel.mjs';
test('Build Output is the single routing authority and retains the original shared security headers',()=>{
 const config=JSON.parse(fs.readFileSync('vercel.json'));
 for(const key of ['headers','trailingSlash','cleanUrls','routes','rewrites','redirects'])assert.equal(Object.hasOwn(config,key),false,key);
 const policy=JSON.parse(fs.readFileSync('src/deployment-headers.json'));
 const routes=deploymentRoutes({routes:['/','/premium/']},policy);
 const global=routes.find(r=>r.continue===true).headers;
 for(const header of policy.headers[0].headers)assert.equal(global[header.key],header.value);
 assert.equal(global['X-Frame-Options'],'DENY');
 assert.equal(global['X-Content-Type-Options'],'nosniff');
 assert.match(routes[0].headers['Cache-Control'],/no-store/);
 assert.equal(routes.find(r=>r.src==='^/premium$').status,308);
});
