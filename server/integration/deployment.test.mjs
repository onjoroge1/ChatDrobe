import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {buildVercelOutput} from '../../scripts/build-vercel.mjs';
const root=path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const probe=`
 import assert from 'node:assert/strict';import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
 const bundle=process.argv[1],kind=process.argv[2],config=JSON.parse(fs.readFileSync(path.join(bundle,'.vc-config.json')));assert.equal(config.runtime,'nodejs22.x');assert.equal(config.shouldAddHelpers,false);
 const {default:handler}=await import(pathToFileURL(path.join(bundle,config.handler)).href);const fetcher=globalThis.fetch;let outward=0;globalThis.fetch=async()=>{outward++;throw Error('Unexpected external request');};const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base='http://127.0.0.1:'+server.address().port;
 if(kind==='billing'){
  for(const url of ['/api/billing?action=health','/api/billing/?action=health']){const r=await fetcher(base+url);assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/application\\/json/);assert.match(r.headers.get('cache-control'),/no-store/);assert.deepEqual(await r.json(),{enabled:false,mode:'off',livePayments:false});}
  for(const a of ['checkout','portal','webhook','entitlement']){const r=await fetcher(base+'/api/billing?action='+a,{method:'POST',body:'{}',headers:{'content-type':'application/json'}});assert.equal(r.status,503);assert.equal((await r.json()).error.code,'BILLING_DISABLED');}
  const r=await fetcher(base+'/api/billing?action=return&paid=true');assert.equal(r.status,200);assert.match(await r.text(),/visiting this page cannot/);
 }else if(kind==='account'){
  const r=await fetcher(base+'/api/account?action=status');assert.equal(r.status,200);assert.deepEqual(await r.json(),{signInAvailable:false,method:'email_code',livePayments:false});
  for(const action of ['me','admin-setup','devices']){const denied=await fetcher(base+'/api/account?action='+action);assert.equal(denied.status,401);assert.equal((await denied.json()).error.code,'SIGN_IN_REQUIRED');}
  const headers={origin:'https://www.chatdrobe.com','x-chatdrobe-request':'account-v1','content-type':'application/json'};
  for(const action of ['admin-users','owner-login']){const denied=await fetcher(base+'/api/account?action='+action,{method:'POST',headers,body:'{}'});assert.equal(denied.status,action==='owner-login'?503:401);assert.match(denied.headers.get('cache-control'),/no-store/);}
 }else{
  const headers={'content-type':'application/json'};const get=await fetcher(base+'/api/extension?action=entitlement');assert.equal(get.status,405);
  for(const action of ['start','poll','entitlement','disconnect']){const r=await fetcher(base+'/api/extension?action='+action,{method:'POST',headers,body:'{}'});assert.equal(r.status,401);assert.match(r.headers.get('cache-control'),/no-store/);}
 }
 assert.equal(outward,0);console.log('Isolated deployed handler passed: '+kind);
 }finally{await new Promise(r=>server.close(r));}
`;
for(const nested of [false,true])test('deployable billing/account/extension bundles work from '+(nested?'nested tests':'repository')+' root',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chatdrobe-deploy-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));for(const name of ['scripts','src','api','server','browser-extension/extension','release.json','package.json','vercel.json','site.config.json'])fs.cpSync(path.join(root,name),path.join(dir,name),{recursive:true});fs.mkdirSync(path.join(dir,'tests'),{recursive:true});fs.writeFileSync(path.join(dir,'server','.env'),'PRIVATE_CANARY=not-for-artifacts');fs.writeFileSync(path.join(dir,'server','signing-private.pem'),'PRIVATE_CANARY');
 const invocation=nested?path.join(dir,'tests'):dir,env={PATH:process.env.PATH,VERCEL:'1',VERCEL_ENV:'preview',INIT_CWD:invocation,SITE_INDEXABLE:'false'};
 const built=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:dir,env,encoding:'utf8',timeout:15000});assert.equal(built.status,0,built.stderr);const result=buildVercelOutput(dir,{cwd:dir,env});assert.equal(result.output,path.join(invocation,'.vercel/output'));assert.deepEqual(result.functions,['/api/billing','/api/account','/api/extension']);const config=JSON.parse(fs.readFileSync(path.join(result.output,'config.json')));assert.equal(config.version,3);assert.equal(config.routes[0].dest,'/api/billing');assert.equal(config.routes[1].dest,'/api/account');assert.equal(config.routes[2].dest,'/api/extension');
 for(const name of ['api','server','node_modules','contracts','browser-extension','release.json'])assert.equal(fs.existsSync(path.join(result.output,'static',name)),false,name);
 const manifest=JSON.parse(fs.readFileSync(path.join(invocation,'dist/build-manifest.json')));assert.equal(result.staticRoutes,manifest.routes.length);for(const route of manifest.routes){const file=route==='/'?'index.html':route.slice(1)+'index.html';assert.equal(fs.readFileSync(path.join(result.output,'static',file),'utf8'),fs.readFileSync(path.join(invocation,'dist',file),'utf8'));}
 fs.renameSync(path.join(dir,'server'),path.join(dir,'source-server-removed'));
 for(const kind of ['billing','account','extension']){const fn=path.join(result.output,'functions/api/'+kind+'.func');assert.ok(fs.statSync(path.join(fn,'api/'+kind+'.js')).isFile());assert.ok(fs.statSync(path.join(fn,'node_modules/pg/package.json')).isFile());for(const file of ['server/.env','server/signing-private.pem','server/tests','server/setup-test.mjs','server/migrations','server/accounts-migrate.mjs','server/access-migrate.mjs'])assert.equal(fs.existsSync(path.join(fn,file)),false,file);const smoked=spawnSync(process.execPath,['--input-type=module','-e',probe,fn,kind],{cwd:os.tmpdir(),env:{PATH:process.env.PATH,BILLING_MODE:'off'},encoding:'utf8',timeout:15000});assert.equal(smoked.status,0,smoked.stderr);assert.match(smoked.stdout,/Isolated deployed handler passed/);}
});
