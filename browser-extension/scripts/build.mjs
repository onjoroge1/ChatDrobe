/* Bundles local palettes and original SVGs; never touches the website repository. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const base=path.dirname(path.dirname(fileURLToPath(import.meta.url))),E=path.join(base,'extension');
const commerceContext=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(E,'commerce-config.js'),'utf8'),commerceContext);
const commerce=commerceContext.ChatDrobeCommerceConfig;
const origin='https://www.chatdrobe.com';
if(commerce.websiteOrigin!==origin||commerce.billingOrigin!==origin||commerce.billingApiUrl!==origin+'/api/billing')throw new Error('Public website and reserved API must use the approved www.chatdrobe.com origin.');
for(const [name,route] of Object.entries({home:'/',premium:'/premium/',pricing:'/pricing/',help:'/help/',privacy:'/privacy/'})){
 if(commerce[name+'Url']!==origin+route)throw new Error('Unexpected public website route: '+name);
}
if(commerce.checkoutUrl)throw new Error('Do not use a website/return URL as a checkout integration.');
const manifest=JSON.parse(fs.readFileSync(path.join(E,'manifest.json'),'utf8'));
if(manifest.homepage_url!==origin+'/')throw new Error('Manifest homepage must use the approved public site.');

if(commerce.channel!=='sandbox'||!commerce.checkoutEnabled||!commerce.licensingReady||commerce.allowTesterPreview)throw new Error('Build requires the signed-account sandbox contract and no tester bypass.');
if(!commerce.entitlementKey?.keyId||commerce.entitlementKey.publicJwk?.d||commerce.entitlementKey.publicJwk?.crv!=='P-256')throw new Error('Pin a reviewed public P-256 verification key, never a private key.');
if(manifest.version!=='0.7.0'||JSON.stringify(manifest.optional_host_permissions)!==JSON.stringify([origin+'/*']))throw new Error('Unexpected account-integration manifest contract.');
const themes=JSON.parse(fs.readFileSync(path.join(E,'themes.json')));
const variants=JSON.parse(fs.readFileSync(path.join(E,'palettes.json')));
const prefsFile=path.join(E,'prefs.js'),coreFile=path.join(E,'core.js');
fs.writeFileSync(prefsFile,fs.readFileSync(prefsFile,'utf8').replace(/const THEMES=.*?;\n/,`const THEMES=${JSON.stringify(themes.map(t=>({id:t.id,dark:t.dark,variants:variants[t.id]})))};\n`));
fs.writeFileSync(coreFile,fs.readFileSync(coreFile,'utf8').replace(/  const THEMES = [^\n]+;/,`  const THEMES = ${JSON.stringify(themes)};`));
const P=createRequire(import.meta.url)(prefsFile);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
class Element{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=v;}append(...c){this.children.push(...c);}toString(){return `<${this.tag} ${Object.entries(this.attrs).map(([k,v])=>`${k}="${escape(v)}"`).join(' ')}>${this.children.join('')}</${this.tag}>`;}}
const ctx=vm.createContext({document:{createElementNS:(ns,t)=>new Element(t)}});
vm.runInContext(fs.readFileSync(path.join(base,'scripts/art-source.js'),'utf8'),ctx);
let css='/* Generated light and dark variants. Original SVG companions only. */\n';
for(const t of themes){
 const art=ctx.art(t);art.setAttribute('xmlns','http://www.w3.org/2000/svg');
 css+=`html[data-md-theme="${t.id}"]{--md-art:url("data:image/svg+xml,${encodeURIComponent(String(art))}");}\n`;
 for(const scheme of ['light','dark']){
  const palette=variants[t.id][scheme];
  const modeArt=ctx.art({...t,...palette,dark:scheme==='dark'});modeArt.setAttribute('xmlns','http://www.w3.org/2000/svg');
  const line=palette.line+'22',glow=palette.accent+'0a';
  const patterns={dots:[`radial-gradient(${line} .8px,transparent .8px)`,'22px 22px'],grid:[`linear-gradient(90deg,${line} 1px,transparent 1px),linear-gradient(${line} 1px,transparent 1px)`,'44px 44px'],lines:[`linear-gradient(transparent 31px,${line} 32px)`,'100% 32px'],glow:[`radial-gradient(ellipse at 95% 6%,${glow},transparent 55%)`,'100% 100%'],stars:[`radial-gradient(${line} 1px,transparent 1px)`,'73px 71px']};
  const [pattern,patternSize]=patterns[t.pattern]||patterns.dots;

  let link=palette.accent;
  if(['bg','surface','panel','soft'].some(k=>P.contrast(link,palette[k])<4.5)){
   const channels=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
   const a=channels(palette.accent),b=channels(palette.text);
   for(let step=1;step<=20;step++){
    link='#'+a.map((n,i)=>Math.round(n+(b[i]-n)*step/20).toString(16).padStart(2,'0')).join('');
    if(['bg','surface','panel','soft'].every(k=>P.contrast(link,palette[k])>=4.5))break;
   }
  }
  css+=`html[data-md-theme="${t.id}"][data-md-scheme="${scheme}"]{${Object.entries(palette).map(([k,v])=>`--md-${k}:${v}`).join(';')};${['rally','bridge','observatory'].includes(t.id)?`--md-art:url("data:image/svg+xml,${encodeURIComponent(String(modeArt))}");`:''}--md-link:${link};--md-button-ink:${P.ink(palette.accent)};--md-color-scheme:${scheme};--md-pattern:${pattern};--md-pattern-size:${patternSize};}\n`;
 }
}
fs.writeFileSync(path.join(E,'themes.css'),css);
fs.writeFileSync(path.join(E,'panel-style.js'),'/* Generated from panel.css. */\nglobalThis.MoodDockPanelCSS='+JSON.stringify(fs.readFileSync(path.join(E,'panel.css'),'utf8'))+';\n');
console.log(`Built ${themes.length*2} palette variants and original artwork. Website files untouched.`);
