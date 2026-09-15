import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {releaseSettings} from '../src/release.mjs';
const config=JSON.parse(fs.readFileSync('site.config.json'));
test('indexing requires an explicit production origin and opt-in',()=>{assert.equal(releaseSettings(config).indexable,false);assert.equal(releaseSettings(config,{SITE_URL:'https://chatdrobe.example',SITE_INDEXABLE:'true',VERCEL_ENV:'preview'}).indexable,false);assert.equal(releaseSettings(config,{SITE_URL:'https://chatdrobe.example',SITE_INDEXABLE:'true',VERCEL_ENV:'production'}).indexable,true);assert.throws(()=>releaseSettings(config,{SITE_INDEXABLE:'true'}));});
test('origins cannot contain credentials, paths or executable protocols',()=>{for(const url of ['http://example.com','https://user:pass@example.com','https://example.com/path','javascript:alert(1)'])assert.throws(()=>releaseSettings(config,{SITE_URL:url}));});
test('downloads require an approved repository release and matching checksum field',()=>{assert.throws(()=>releaseSettings({...config,downloadUrl:'https://bad.example/extension.zip'}));assert.throws(()=>releaseSettings({...config,downloadUrl:'https://bad.example/extension.zip',downloadSha256:'a'.repeat(64)}));assert.equal(releaseSettings({...config,downloadUrl:'https://github.com/onjoroge1/ChatDrobe/releases/download/v0.2.0/extension.zip',downloadSha256:'a'.repeat(64)}).sha.length,64);});
test('store links reject arbitrary origins and tracking queries',()=>{assert.throws(()=>releaseSettings({...config,storeUrl:'https://evil.example/detail/a/b'}));assert.ok(releaseSettings({...config,storeUrl:'https://chromewebstore.google.com/detail/chatdrobe/'+'a'.repeat(32)}).store);});
const manifest=JSON.parse(fs.readFileSync('dist/build-manifest.json'));const pages=[...manifest.routes,'/404/'];
test('all pages have one main heading, descriptions, social titles, and no inline scripts',()=>{for(const route of pages){const file=route==='/404/'?'dist/404.html':route==='/'?'dist/index.html':'dist'+route+'index.html';const html=fs.readFileSync(file,'utf8');assert.equal((html.match(/<h1\b/g)||[]).length,1,route);assert.match(html,/<meta name="description" content="[^"]{40,}"/);assert.match(html,/property="og:title"/);assert.ok(!/<script(?![^>]*src=)[^>]*>/i.test(html));assert.ok(!/\son(?:click|load|error)=/i.test(html));assert.match(html,/href="\/beta-use\/"/);}});
test('internal links and local assets resolve; sections have targets',()=>{for(const route of pages){const current=route==='/404/'?'dist/404.html':route==='/'?'dist/index.html':'dist'+route+'index.html';const html=fs.readFileSync(current,'utf8');for(const match of html.matchAll(/(?:href|src)="([^\"]+)"/g)){const href=match[1];if(!href.startsWith('/')&&!href.startsWith('#'))continue;const [pathname,hash]=href.split('#');let target=pathname?'dist'+pathname:current;if(target.endsWith('/'))target+='index.html';assert.ok(fs.existsSync(target),`${route}: ${href}`);if(hash)assert.ok(fs.readFileSync(target,'utf8').includes(`id="${hash}"`),`${route}: ${href}`);}}});
test('core budgets stay bounded and additional scene code is a separate on-demand budget',()=>{
 const bytes=file=>fs.statSync('dist/assets/'+file).size;
 const files=fs.readdirSync('dist/assets');
 const coreJs=files.filter(f=>f.endsWith('.js')&&!f.startsWith('living-')).reduce((sum,f)=>sum+bytes(f),0);
 assert.ok(coreJs<15000,`Core scripts: ${coreJs}`);assert.ok(bytes('client.js')<5000);
 // Four explicit companion demonstrations add UI text/control handling only on preview pages.
 const controls=bytes('living-worlds.js')+bytes('living-tour.js');
 assert.ok(controls<12000,`Preview controls exceed the revised 12 KB cap: ${controls}`);
 assert.ok(bytes('living-model.js')+bytes('living-renderer.js')<18000,'Lazy base renderer exceeds 18 KB');
 assert.ok(bytes('living-quiet.js')<3500,'Lazy quiet refinement exceeds 3.5 KB');
 assert.ok(bytes('living-quiet.css')<4000,'Lazy quiet CSS exceeds 4 KB');
 assert.ok(bytes('living-runtime.css')<7000,'Lazy base CSS exceeds 7 KB');
 const coreCss=files.filter(f=>f.endsWith('.css')&&!f.startsWith('living-')).reduce((sum,f)=>sum+bytes(f),0);
 assert.ok(coreCss<24000,`Core CSS: ${coreCss}`);assert.ok(bytes('living-worlds.css')<8000);
 const illustrated=new Set(['/','/themes/','/features/','/premium/','/living-worlds/']);
 const interactive=new Set(['/','/living-worlds/','/premium/']);
 for(const route of pages){
  const file=route==='/404/'?'dist/404.html':route==='/'?'dist/index.html':'dist'+route+'index.html',html=fs.readFileSync(file,'utf8');
  const styles=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(styles.includes('/assets/living-worlds.css'),illustrated.has(route),route);
  assert.equal(html.includes('src="/assets/living-worlds.js"'),interactive.has(route),route);
  for(const deferred of ['living-renderer.js','living-model.js','living-runtime.css','living-quiet.js','living-quiet.css'])assert.ok(!html.includes(deferred),route+' eagerly loads '+deferred);
  const css=styles.reduce((sum,url)=>sum+fs.statSync('dist'+url).size,0);
  assert.ok(css<(illustrated.has(route)?32000:24000),`Per-route CSS: ${route} (${css})`);
 }
});
test('security headers prohibit remote scripts and framing without blocking style controls',()=>{const headers=JSON.parse(fs.readFileSync('src/deployment-headers.json')).headers[0].headers;const csp=headers.find(h=>h.key==='Content-Security-Policy').value;assert.match(csp,/script-src 'self'/);assert.match(csp,/frame-ancestors 'none'/);assert.match(csp,/style-src-attr 'unsafe-inline'/);assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"));});
