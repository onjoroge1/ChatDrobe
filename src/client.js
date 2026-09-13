/* Only local, fictional UI previews. No ChatGPT access, analytics or remote APIs. */
'use strict';
document.documentElement.classList.add('js');
const menu=document.querySelector('#menu-toggle'),nav=document.querySelector('#main-nav');
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('is-open')){nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false');menu.focus();}});
let notification;
export function notify(message){const toast=document.querySelector('#toast');if(!toast)return;toast.textContent=message;toast.hidden=false;clearTimeout(notification);notification=setTimeout(()=>{toast.hidden=true;},4000);}
export function saveJson(value,filename){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
for(const preview of document.querySelectorAll('[data-preview]')){
 const worlds=[...preview.querySelectorAll('[data-world]')];const mock=preview.querySelector('.mock-browser');
 let selected=preview.dataset.initial||'mooncat',plain=false;
 const paint=()=>{const button=worlds.find(b=>b.dataset.world===selected)||worlds[0];if(!button)return;
  mock.dataset.theme=button.dataset.world;mock.classList.toggle('unthemed',plain);
  mock.querySelector('.hero-companion').src='/assets/'+button.dataset.world+'.svg';mock.querySelector('.hero-companion').hidden=plain;
  preview.querySelector('[data-preview-name]').textContent=plain?'Unthemed illustration':button.dataset.name;
  for(const b of worlds)b.setAttribute('aria-pressed',String(b===button&&!plain));
  const compare=preview.querySelector('[data-compare]');compare.textContent=plain?'Back to my world':'Compare original';compare.setAttribute('aria-pressed',String(plain));
 };
 for(const b of worlds)b.addEventListener('click',()=>{selected=b.dataset.world;plain=false;paint();});
 preview.querySelector('[data-compare]').addEventListener('click',()=>{plain=!plain;paint();});
 preview.querySelector('[data-save-look]')?.addEventListener('click',()=>{saveJson({format:'chatdrobe-appearance',version:1,prefs:{theme:selected,enabled:true,decoration:true,motion:false}},'chatdrobe-'+selected+'.json');notify('Appearance file saved. Import it in the extension’s About section.');});paint();
}
