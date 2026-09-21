const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const E=path.join(__dirname,'../extension');
const ctx=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(E,'commerce-config.js'),'utf8'),ctx);
const config=ctx.ChatDrobeCommerceConfig;
const A=require('../extension/access.js');

test('commerce routes and manifest homepage use the exact approved www origin',()=>{
 assert.equal(config.websiteOrigin,'https://www.chatdrobe.com');
 assert.equal(config.billingOrigin,config.websiteOrigin);
 assert.equal(config.billingApiUrl,'https://www.chatdrobe.com/api/billing');
 const routes={home:'/',premium:'/premium/',pricing:'/pricing/',help:'/help/',privacy:'/privacy/'};
 for(const [name,route] of Object.entries(routes))assert.equal(config[name+'Url'],config.websiteOrigin+route);
 assert.equal(require('../extension/manifest.json').homepage_url,config.homeUrl);
 assert.ok(Object.isFrozen(config));
});

test('website links are fixed public pages, without return URL or credential parameters',()=>{
 const links=A.websiteLinks(config);
 assert.equal(Object.keys(links).length,5);
 for(const value of Object.values(links)){
  const u=new URL(value);assert.equal(u.origin,'https://www.chatdrobe.com');
  assert.equal(u.username+u.password+u.search+u.hash,'');
 }
 assert.ok(Object.isFrozen(links));
});

test('missing config or lookalike origins cannot produce external links',()=>{
 assert.deepEqual(A.websiteLinks({}),{});
 for(const websiteOrigin of ['http://www.chatdrobe.com','https://chatdrobe.com','https://www.chatdrobe.com.evil.example','https://www.chatdrobe.com/'])
  assert.deepEqual(A.websiteLinks({...config,websiteOrigin}),{});
});

test('modified link targets are rejected individually rather than used as open redirects',()=>{
 for(const premiumUrl of ['javascript:alert(1)','https://www.chatdrobe.com/premium/?token=secret','https://www.chatdrobe.com/premium/#isPro','https://user:password@www.chatdrobe.com/premium/','https://elsewhere.invalid/']){
  const links=A.websiteLinks({...config,premiumUrl});
  assert.equal(links.premium,undefined);assert.equal(links.help,config.helpUrl);
 }
});

test('sandbox integration flags do not grant access without a verified entitlement',()=>{
 assert.equal(config.channel,'sandbox');assert.equal(config.checkoutEnabled,true);assert.equal(config.licensingReady,true);assert.equal(config.allowTesterPreview,false);assert.equal(config.checkoutUrl,'');
 assert.equal(A.checkout(config).ready,false);
 assert.equal(A.access({isPro:true,paid:true,token:'fake'},config).premium,false);
 assert.equal(A.access({testerPreview:true},config).paid,false);
});

test('account requests require optional exact-origin permission and never add ChatGPT page scripts',()=>{
 const m=require('../extension/manifest.json');
 assert.deepEqual(m.permissions,['storage','sidePanel','alarms']);
 assert.deepEqual(m.host_permissions,['https://chatgpt.com/*']);
 assert.deepEqual(m.optional_host_permissions,['https://www.chatdrobe.com/*']);
 assert.equal(m.externally_connectable,undefined);
 assert.ok(m.content_security_policy.extension_pages.includes('connect-src https://www.chatdrobe.com'));assert.ok(!m.content_security_policy.extension_pages.includes('*'));
 assert.deepEqual(m.content_scripts[0].js,['prefs.js','adapter.js','boot.js']);
 assert.doesNotMatch(fs.readFileSync(path.join(E,'upgrade.js'),'utf8'),/\b(fetch|XMLHttpRequest|WebSocket)\s*\(/);
});

test('metadata and About version agree; checkout UI exposes no card input',()=>{
 const version=require('../package.json').version;
 assert.equal(require('../extension/manifest.json').version,version);
 assert.equal(require('../../release.json').extension.version,version);
 assert.match(fs.readFileSync(path.join(E,'workspace.js'),'utf8'),/chrome\.runtime\.getManifest\?\.\(\)\?\.version|chrome\.runtime\.getManifest\(\)\.version/);
 const html=fs.readFileSync(path.join(E,'upgrade.html'),'utf8');
 assert.match(html,/data-site-link="premium"/);assert.match(html,/id="checkout" disabled/);
 assert.doesNotMatch(html,/<input\b/);assert.match(html,/Rainy Tokyo Loft/);
});

test('runtime contains no payment secrets or private signing keys',()=>{
 function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);}
 for(const file of walk(E).filter(f=>/\.(js|mjs|json|html|css|txt)$/.test(f))){
  const text=fs.readFileSync(file,'utf8');
  assert.doesNotMatch(text,/\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]{16,}/,file);
  assert.doesNotMatch(text,/-----BEGIN (?:EC |RSA )?PRIVATE KEY-----/,file);
 }
});
