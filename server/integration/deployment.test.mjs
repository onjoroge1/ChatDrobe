import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {buildVercelOutput} from '../../scripts/build-vercel.mjs';

const root=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const probe = `
 import assert from 'node:assert/strict';
 import http from 'node:http';
 import fs from 'node:fs';
 import path from 'node:path';
 import {pathToFileURL} from 'node:url';
 const bundle=process.argv[1];
 const config=JSON.parse(fs.readFileSync(path.join(bundle,'.vc-config.json')));
 assert.equal(config.runtime,'nodejs22.x'); assert.equal(config.shouldAddHelpers,false);
 const {default:handler}=await import(pathToFileURL(path.join(bundle,config.handler)).href);
 const originalFetch=globalThis.fetch; let outward=0;
 globalThis.fetch=async()=>{outward++; throw Error('Unexpected external request');};
 const server=http.createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const base='http://127.0.0.1:'+server.address().port;
  for(const url of ['/api/billing?action=health','/api/billing/?action=health']){
   const response=await originalFetch(base+url);assert.equal(response.status,200);
   assert.match(response.headers.get('content-type'),/application\\/json/);
   assert.match(response.headers.get('cache-control'),/no-store/);
   assert.deepEqual(await response.json(),{enabled:false,mode:'off',livePayments:false});
  }
  for(const action of ['checkout','portal','webhook','entitlement']){
   const response=await originalFetch(base+'/api/billing?action='+action,{method:'POST',body:'{}',headers:{'content-type':'application/json'}});
   assert.equal(response.status,503);assert.equal((await response.json()).error.code,'BILLING_DISABLED');
  }
  const returned=await originalFetch(base+'/api/billing?action=return&paid=true');assert.equal(returned.status,200);
  assert.match(await returned.text(),/visiting this page cannot/);
  assert.equal(outward,0);
  console.log('Isolated deployed handler: health JSON, disabled actions, no external calls');
 } finally {await new Promise(resolve=>server.close(resolve));}
`;

for (const nested of [false,true]) test(`deployable artifact contains the executable API for ${nested?'nested tests':'repository'} root`,t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chatdrobe-deploy-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 for(const name of ['scripts','src','api','server','package.json','vercel.json','site.config.json'])
  fs.cpSync(path.join(root,name),path.join(dir,name),{recursive:true});
 fs.mkdirSync(path.join(dir,'tests'),{recursive:true});
 fs.writeFileSync(path.join(dir,'server','.env'),'PRIVATE_CANARY=not-for-artifacts');
 fs.writeFileSync(path.join(dir,'server','signing-private.pem'),'PRIVATE_CANARY');
 const invocation=nested?path.join(dir,'tests'):dir;
 const env={PATH:process.env.PATH,VERCEL:'1',VERCEL_ENV:'preview',INIT_CWD:invocation,SITE_INDEXABLE:'false'};
 const built=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:dir,env,encoding:'utf8',timeout:15000});
 assert.equal(built.status,0,built.stderr);
 const result=buildVercelOutput(dir,{cwd:dir,env});
 assert.equal(result.output,path.join(invocation,'.vercel/output'));
 assert.deepEqual(result.functions,['/api/billing']);
 const outputConfig=JSON.parse(fs.readFileSync(path.join(result.output,'config.json')));
 assert.equal(outputConfig.version,3);assert.equal(outputConfig.routes[0].dest,'/api/billing');
 const fn=path.join(result.output,'functions/api/billing.func');
 assert.ok(fs.statSync(path.join(fn,'api/billing.js')).isFile());
 assert.ok(fs.statSync(path.join(fn,'node_modules/pg/package.json')).isFile());
 for(const file of ['server/.env','server/signing-private.pem','server/tests','server/setup-test.mjs'])assert.equal(fs.existsSync(path.join(fn,file)),false,file);
 for(const file of ['api','server','node_modules','contracts'])assert.equal(fs.existsSync(path.join(result.output,'static',file)),false,file);
 const before=JSON.parse(fs.readFileSync(path.join(invocation,'dist/build-manifest.json')));
 assert.equal(result.staticRoutes,before.routes.length);
 for(const route of before.routes){const file=route==='/'?'index.html':route.slice(1)+'index.html';assert.equal(fs.readFileSync(path.join(result.output,'static',file),'utf8'),fs.readFileSync(path.join(invocation,'dist',file),'utf8'));}
 // No source-directory dependencies can accidentally rescue the isolated function.
 fs.renameSync(path.join(dir,'server'),path.join(dir,'source-server-removed'));
 const smoked=spawnSync(process.execPath,['--input-type=module','-e',probe,fn],{cwd:os.tmpdir(),env:{PATH:process.env.PATH,BILLING_MODE:'off'},encoding:'utf8',timeout:15000});
 assert.equal(smoked.status,0,smoked.stderr);assert.match(smoked.stdout,/Isolated deployed handler/);
});
