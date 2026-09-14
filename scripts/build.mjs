import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {layout,home,catalog,world,documents,documentPage} from '../src/render.mjs';
import {enhance} from '../src/enhance.mjs';
import {finalizeSite} from '../src/release.mjs';
import {buildContext,verifyBuildOutput} from './build-contract.mjs';
const context=buildContext(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const {root,output}=context;
console.log(`[build] Node ${process.version}; source=${root}; cwd=${context.workingDirectory}; invokedFrom=${context.invocationDirectory}; output=${output}`);
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const config=read('site.config.json'),themes=read('src/themes.json'),art={...read('src/art.json'),...read('src/explorer-art.json')};
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(path.join(output,'assets'),{recursive:true});
function write(file,value){const p=path.join(output,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,value);}
for(const[id,svg]of Object.entries(art))write('assets/'+id+'.svg',svg);
for(const file of ['styles.css','client.js','preferences.js','catalog.js','showroom.js','experience.css'])fs.copyFileSync(path.join(root,'src',file),path.join(output,'assets',file));
const colors={bg:'bg',surface:'surface',panel:'panel',ink:'text',muted:'muted',accent:'accent',soft:'soft',line:'line'};
write('assets/worlds.css',themes.map(t=>`[data-theme="${t.id}"]{${Object.entries(colors).map(([key,col])=>`--world-${key}:${t[col]}`).join(';')}}.swatch[data-theme="${t.id}"]{background:${t.accent}}`+['bg','surface','accent','text'].map(k=>`.palette-${t.id}-${k}{background:${t[k]}}`).join('')).join('\n')+'\n.unthemed{--world-bg:#fff!important;--world-surface:#fff!important;--world-panel:#f4f4f4!important;--world-ink:#262626!important;--world-muted:#606060!important;--world-soft:#eee!important;--world-accent:#464646!important;--world-line:#ddd!important}\n');
const routes=[];
function page(route,title,body,summary){routes.push(route);write(route==='/'?'index.html':route.slice(1)+'index.html',enhance(layout({title,summary,path:route,body,config}),route,themes));}
page('/','Personal themes for your ChatGPT workspace',home(themes,config));
page('/themes/','Explore original theme worlds',catalog(themes));
for(const t of themes){page('/themes/'+t.id+'/',t.name+' theme for your workspace',world(t,themes),t.description+' Preview this original ChatDrobe theme and download appearance settings.');write('downloads/appearances/'+t.id+'.json',JSON.stringify({format:'chatdrobe-appearance',version:1,prefs:{theme:t.id,enabled:true,motion:false,decoration:true}},null,2)+'\n');}
for(const[route,doc]of Object.entries(documents(config)))page(route,doc.title,documentPage(doc.title,doc.content));
write('404.html',layout({title:'This world is not here',body:documentPage('A wrong turn, not a dead end.','<p>The page could not be found. <a href="/themes/">Find a theme</a> or <a href="/">go home</a>.'),path:'/404/',config}));
const release=finalizeSite(output,config,routes);
write('build-manifest.json',JSON.stringify({websiteVersion:'0.3.0',extensionVersion:config.extensionVersion,routes,themes:themes.length},null,2)+'\n');
verifyBuildOutput(output);
console.log(`[build] Verified deployable output at ${output}`);
console.log(`Built ${routes.length} pages and ${themes.length} appearance files. Indexing: ${release.indexable?'enabled':'disabled'}.`);
