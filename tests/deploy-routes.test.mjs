import test from 'node:test';
import assert from 'node:assert/strict';
import {deploymentRoutes} from '../scripts/build-vercel.mjs';
const manifest={routes:['/','/themes/','/themes/mooncat/']};
const config={headers:[{source:'/(.*)',headers:[{key:'X-Frame-Options',value:'DENY'}]}]};
test('the billing API has an exact, query-preserving internal route before static pages',()=>{
 const [api]=deploymentRoutes(manifest,config);
 assert.equal(api.dest,'/api/billing');assert.ok(!api.status);assert.ok(!api.methods);
 assert.equal(api.headers['Cache-Control'],'no-store, private');
 for(const p of ['/api/billing','/api/billing/'])assert.match(p,new RegExp(api.src));
 for(const p of ['/api/billing.js','/api/billing/other','/server/security.mjs'])assert.doesNotMatch(p,new RegExp(api.src));
});
test('all page routes map to HTML, preserve trailing-slash canonicalization and keep real 404s',()=>{
 const routes=deploymentRoutes(manifest,config);
 for(const p of manifest.routes){const match=routes.find(r=>r.dest===(p==='/'?'/index.html':p+'index.html'));assert.ok(match,p);assert.match(p,new RegExp(match.src));}
 const redirect=routes.find(r=>r.src==='^/themes$');assert.equal(redirect.status,308);assert.deepEqual(redirect.methods,['GET','HEAD']);
 assert.deepEqual(routes.at(-2),{handle:'filesystem'});assert.deepEqual(routes.at(-1),{src:'^/.*$',dest:'/404.html',status:404});
 assert.equal(routes[1].headers['X-Frame-Options'],'DENY');
});
test('route compiler fails closed on duplicates, API shadowing and unhandled header changes',()=>{
 for(const routes of [[],['/','/'],['/','/api/private/'],['/','/../server/']])assert.throws(()=>deploymentRoutes({routes},config));
 assert.throws(()=>deploymentRoutes(manifest,{headers:[{source:'/new-rule',headers:[]}]}));
});
