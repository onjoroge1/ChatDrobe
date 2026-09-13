import {notify,saveJson} from './client.js';
import {normalize,appearance,parseAppearance,fromQuery,toQuery} from './preferences.js';
const form=document.querySelector('#showroom-form');
if(form){
 const theme=form.dataset.themeId,fields=form.elements,preview=document.querySelector('[data-preview]'),mock=preview.querySelector('.mock-browser'),sample=document.querySelector('#reading-sample');
 const fonts={system:'system-ui, sans-serif',serif:'Georgia, serif',mono:'ui-monospace, monospace'};
 let prefs=fromQuery(new URLSearchParams(location.search),theme);
 function paint(){
  sample.style.fontFamily=fonts[prefs.font];sample.style.fontSize=prefs.fontSize+'px';sample.style.lineHeight=String(prefs.lineHeight);sample.style.maxWidth=(prefs.width/1400*100)+'%';
  mock.classList.toggle('preview-focus',prefs.focus);mock.classList.toggle('preview-no-decoration',!prefs.decoration);mock.classList.toggle('preview-no-bubbles',!prefs.bubbles);
  mock.style.setProperty('--reading-family',fonts[prefs.font]);mock.classList.add('custom-reading');
  for(const key of ['fontSize','lineHeight','width'])document.querySelector('[data-value="'+key+'"]').textContent=String(prefs[key]);
 }
 function restore(){for(const key of ['font','fontSize','lineHeight','width'])fields[key].value=String(prefs[key]);for(const key of ['decoration','focus','bubbles'])fields[key].checked=prefs[key];paint();}
 function collect(){const v={font:fields.font.value};for(const key of ['fontSize','lineHeight','width'])v[key]=Number(fields[key].value);for(const key of ['decoration','focus','bubbles'])v[key]=fields[key].checked;prefs=normalize(v,theme);paint();}
 form.addEventListener('input',collect);form.addEventListener('submit',e=>e.preventDefault());
 document.querySelector('#reset-look').addEventListener('click',()=>{prefs=normalize({},theme);history.replaceState(null,'',location.pathname);restore();notify('Preview controls reset.');});
 document.querySelector('#export-look').addEventListener('click',()=>{saveJson(appearance(prefs,theme),'chatdrobe-'+theme+'-custom.json');notify('Custom appearance saved. Import it in the extension’s About section.');});
 // The preview's quick-save must include the customized settings, not stale defaults.
 const quick=preview.querySelector('[data-save-look]'),replacement=quick.cloneNode(true);quick.replaceWith(replacement);replacement.addEventListener('click',()=>document.querySelector('#export-look').click());
 document.querySelector('#share-look').addEventListener('click',async()=>{const url=new URL(location.pathname,location.origin),query=toQuery(prefs);url.search=query;const output=document.querySelector('#share-url');output.value=url.href;output.hidden=false;try{await navigator.clipboard.writeText(url.href);notify('Link copied. Only appearance settings are included.');}catch{output.focus();output.select();notify('Copy the selected appearance link.');}});
 document.querySelector('#import-look').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>16384)throw new Error('Use an appearance JSON smaller than 16 KB.');prefs=parseAppearance(await file.text(),theme);restore();notify('Appearance loaded in this preview. Nothing was installed.');}catch(error){notify(error.message);}finally{e.target.value='';}});
 window.addEventListener('popstate',()=>{prefs=fromQuery(new URLSearchParams(location.search),theme);restore();});restore();
}
