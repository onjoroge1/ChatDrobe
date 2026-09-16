import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {layout,home,catalog,world,documents,documentPage} from '../src/render.mjs';
import {enhance} from '../src/enhance.mjs';import {finalizeSite} from '../src/release.mjs';
import {injectHome,upgradeLegacyCopy,featuresPage,premiumPage,pricingPage,marketingPage} from '../src/product.mjs';
import {livingWorldsShowcase} from '../src/living-worlds.mjs';import {livingPreview} from '../src/living-collection.mjs';import {writeLivingAssets} from './living-assets.mjs';
import {buildContext,verifyBuildOutput} from './build-contract.mjs';import {accountPages} from '../src/accounts-pages.mjs';import {protectAccountPages,accountPageCopy} from './accounts-build.mjs';
const context=buildContext(path.dirname(path.dirname(fileURLToPath(import.meta.url)))),{root,output}=context;
console.log(`[build] Node ${process.version}; source=${root}; cwd=${context.workingDirectory}; invokedFrom=${context.invocationDirectory}; output=${output}`);
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),config=read('site.config.json'),themes=read('src/themes.json'),art={...read('src/art.json'),...read('src/explorer-art.json')};
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(path.join(output,'assets'),{recursive:true});
function write(file,value){const p=path.join(output,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,value);}
for(const[id,svg]of Object.entries(art))write('assets/'+id+'.svg',svg);
for(const file of ['styles.css','client.js','preferences.js','catalog.js','showroom.js','experience.css','living-worlds.js','living-worlds.css','accounts.js','accounts.css'])fs.copyFileSync(path.join(root,'src',file),path.join(output,'assets',file));
writeLivingAssets(root,path.join(output,'assets'));fs.appendFileSync(path.join(output,'assets','styles.css'),'\n'+fs.readFileSync(path.join(root,'src','marketing.css'),'utf8'));
const colors={bg:'bg',surface:'surface',panel:'panel',ink:'text',muted:'muted',accent:'accent',soft:'soft',line:'line'};
write('assets/worlds.css',themes.map(t=>`[data-theme="${t.id}"]{${Object.entries(colors).map(([key,col])=>`--world-${key}:${t[col]}`).join(';')}}.swatch[data-theme="${t.id}"]{background:${t.accent}}`+['bg','surface','accent','text'].map(k=>`.palette-${t.id}-${k}{background:${t[k]}}`).join('')).join('\n')+'\n.unthemed{--world-bg:#fff!important;--world-surface:#fff!important;--world-panel:#f4f4f4!important;--world-ink:#262626!important;--world-muted:#606060!important;--world-soft:#eee!important;--world-accent:#464646!important;--world-line:#ddd!important}\n');
const routes=[];
function page(route,title,body,summary,scripts=[]){
 routes.push(route);body=accountPageCopy(route,body);if(route==='/premium/')body=body.replace('<div class="env-grid">',livingPreview('tokyo','premium-demo')+'<div class="env-grid">');
 const illustrated=body.includes('env-room'),account=body.includes('data-account-page'),modules=[...new Set([...scripts,...(body.includes('data-living-preview')?['living-worlds.js']:[]),...(account?['accounts.js']:[])])];
 let raw=layout({title,summary,path:route,body,config,scripts:modules});raw=raw.replace('<a href="/pricing/">Pricing</a>','<a href="/pricing/">Pricing</a><a href="/living-worlds/">Living Worlds</a>');raw=raw.replace('</nav><a class="btn small"','<a href="/signin/">Sign in</a></nav><a class="btn small"');
 if(illustrated)raw=raw.replace('</head>','<link rel="stylesheet" href="/assets/living-worlds.css"></head>');if(account)raw=raw.replace('</head>','<link rel="stylesheet" href="/assets/accounts.css"></head>');
 write(route==='/'?'index.html':route.slice(1)+'index.html',enhance(upgradeLegacyCopy(raw,themes),route,themes));
}
page('/','Living worlds for your ChatGPT workspace',injectHome(home(themes,config),themes),'Explore Rainy Tokyo Loft, Starship Journey and Cozy Train Journey, plus a complete wardrobe of static themes for ChatGPT.');
page('/themes/','Living environments and static themes',catalog(themes));
for(const t of themes){page('/themes/'+t.id+'/',t.name+' theme for your workspace',world(t,themes),t.description+' Preview this original ChatDrobe theme and download appearance settings.');write('downloads/appearances/'+t.id+'.json',JSON.stringify({format:'chatdrobe-appearance',version:1,prefs:{theme:t.id,enabled:true,motion:false,decoration:true}},null,2)+'\n');}
for(const[route,doc]of Object.entries(documents(config))){if(route==='/pricing/')continue;page(route,doc.title,documentPage(doc.title,doc.content));}
page('/features/','Features',featuresPage(themes),'Explore Free themes and Plus Living environments, reading controls and local workspace tools for ChatGPT.');
page('/premium/','ChatDrobe Plus — Living Worlds',premiumPage(themes),'Meet Rainy Tokyo Loft, Starship Journey and Cozy Train Journey. Plus includes all static themes and three Living environments; checkout is not enabled yet.');
page('/pricing/','Free vs Plus',pricingPage(themes,config),`ChatDrobe Plus is $${config.plusAnnualUsd}/year. Compare static themes, Living Worlds and local tools. Live checkout is not enabled yet.`);
page('/living-worlds/','Living Worlds — Tokyo, Starship and Train',livingWorldsShowcase(),'Explore the three Living environments in the private extension build: Rainy Tokyo Loft, Starship Journey and Cozy Train Journey.');
page('/go-to-market/','Launch strategy',marketingPage(),'ChatDrobe launch positioning for its private beta: Living environments, original static themes and practical workspace tools.');
for(const[route,doc]of Object.entries(accountPages()))page(route,doc.title,doc.body,'Manage your verified ChatDrobe account, subscription status and secure sign-in. No private account data is included in this page.');
write('404.html',upgradeLegacyCopy(layout({title:'This world is not here',body:documentPage('A wrong turn, not a dead end.','<p>The page could not be found. <a href="/themes/">Find a theme</a> or <a href="/">go home</a>.'),path:'/404/',config}),themes));
const release=finalizeSite(output,config,routes);protectAccountPages(output);
write('build-manifest.json',JSON.stringify({websiteVersion:'0.6.0',extensionVersion:config.extensionVersion,routes,themes:themes.length},null,2)+'\n');verifyBuildOutput(output);
console.log(`[build] Verified deployable output at ${output}`);console.log(`Built ${routes.length} pages and ${themes.length} appearance files. Indexing: ${release.indexable?'enabled':'disabled'}.`);
