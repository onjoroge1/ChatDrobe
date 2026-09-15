/* Page-local illustrative controls. No persistence, network, timers or access grants. */
const names={tokyo:'Rainy Tokyo Loft',starship:'Starship Journey',train:'Cozy Train Journey'};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
for(const preview of document.querySelectorAll('[data-living-preview]')){
 let world='tokyo',requested=false,visible=true;
 const buttons=[...preview.querySelectorAll('[data-env-select]')];
 world=buttons.find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.envSelect||world;
 const motion=preview.querySelector('[data-env-motion]'),light=preview.querySelector('[data-env-light]');
 const paint=()=>{
  const animate=requested&&!reduced.matches;
  preview.dataset.motion=String(animate);
  preview.dataset.active=String(visible&&!document.hidden&&document.hasFocus());
  motion.disabled=reduced.matches;motion.setAttribute('aria-pressed',String(animate));
  motion.textContent=reduced.matches?'Reduced motion enabled':animate?'Pause motion':'Enable motion';
  preview.querySelector('[data-env-status]').textContent=`${names[world]} · ${preview.dataset.day==='night'?'Night':'Day'} · ${animate?'Motion on':'Motion off'}`;
 };
 for(const button of buttons)button.addEventListener('click',()=>{
  world=button.dataset.envSelect;if(!Object.hasOwn(names,world))return;
  for(const room of preview.querySelectorAll('[data-env-room]'))room.hidden=room.dataset.envRoom!==world;
  for(const b of buttons)b.setAttribute('aria-pressed',String(b===button));paint();
 });
 light.addEventListener('click',()=>{const night=preview.dataset.day!=='night';preview.dataset.day=night?'night':'day';light.setAttribute('aria-pressed',String(night));paint();});
 motion.addEventListener('click',()=>{requested=!requested;paint();});
 reduced.addEventListener('change',()=>{if(reduced.matches)requested=false;paint();});
 for(const event of ['focus','blur','pageshow'])window.addEventListener(event,paint);
 document.addEventListener('visibilitychange',paint);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;paint();}).observe(preview);
 paint();
}
