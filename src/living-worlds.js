const worlds={
 tokyo:{name:'Rainy Tokyo Loft',description:'A warm studio above a neon street. Rain moves across the glass, distant traffic glows, and the room shifts toward night.',accent:'#ff8b72',sky:'#26324a',ground:'#151923'},
 starship:{name:'Starship Journey',description:'Your workspace travels from Earth orbit into deep space while tiny ships cross the viewport and stars drift behind the chat.',accent:'#7fd9ff',sky:'#081326',ground:'#101b32'},
 train:{name:'Cozy Train Journey',description:'A quiet rail carriage where the landscape changes as your focus session advances—from city to fields, mountains, sunset and night.',accent:'#d8a66c',sky:'#8db9c9',ground:'#4b392f'},
 oceanlab:{name:'Underwater Research Station',description:'An ocean-window workspace with drifting particles, passing fish silhouettes and a research-console glow around the conversation.',accent:'#5fe0d5',sky:'#063e52',ground:'#082c3a'},
 wizard:{name:'Wizard’s Study',description:'The whole toolset participates in the world: prompts become spell cards, workspaces become grimoires, and the focus timer becomes an hourglass.',accent:'#d8b4ff',sky:'#241c32',ground:'#17121f'},
 colony:{name:'Robot Colony',description:'A tiny settlement grows with your usage. Sessions add lights, antennas, greenhouses and new explorer bots without reading conversation content.',accent:'#f4ca64',sky:'#34291f',ground:'#1e2422'}
};

const stage=document.querySelector('#lw-stage');
if(stage){
 const name=document.querySelector('#lw-name');
 const caption=document.querySelector('#lw-caption-name');
 const description=document.querySelector('#lw-description');
 const setPressed=(selector,active)=>document.querySelectorAll(selector).forEach(el=>el.setAttribute('aria-pressed',String(el===active)));
 document.querySelectorAll('[data-lw-world]').forEach(button=>button.addEventListener('click',()=>{
   const id=button.dataset.lwWorld,w=worlds[id];
   stage.dataset.world=id;stage.style.setProperty('--lw-accent',w.accent);stage.style.setProperty('--lw-sky',w.sky);stage.style.setProperty('--lw-ground',w.ground);
   name.textContent=w.name;caption.textContent=w.name;description.textContent=w.description;
   document.querySelectorAll('[data-lw-world]').forEach(el=>el.classList.toggle('is-active',el===button));setPressed('[data-lw-world]',button);
   stage.classList.remove('event-stream','event-focus','event-idle');void stage.offsetWidth;stage.classList.add('world-enter');setTimeout(()=>stage.classList.remove('world-enter'),900);
 }));
 document.querySelectorAll('[data-lw-mode]').forEach(button=>button.addEventListener('click',()=>{
   stage.dataset.mode=button.dataset.lwMode;document.querySelectorAll('[data-lw-mode]').forEach(el=>el.classList.toggle('is-active',el===button));setPressed('[data-lw-mode]',button);
 }));
 document.querySelectorAll('[data-lw-weather]').forEach(button=>button.addEventListener('click',()=>{
   stage.dataset.weather=button.dataset.lwWeather;document.querySelectorAll('[data-lw-weather]').forEach(el=>el.classList.toggle('is-active',el===button));setPressed('[data-lw-weather]',button);
 }));
 const portal=document.querySelector('[data-lw-portal]');portal?.addEventListener('click',()=>{const on=!stage.classList.contains('portal-mode');stage.classList.toggle('portal-mode',on);portal.classList.toggle('is-active',on);portal.setAttribute('aria-pressed',String(on));});
 document.querySelectorAll('[data-lw-event]').forEach(button=>button.addEventListener('click',()=>{
   stage.classList.remove('event-stream','event-focus','event-idle');void stage.offsetWidth;stage.classList.add('event-'+button.dataset.lwEvent);setTimeout(()=>stage.classList.remove('event-'+button.dataset.lwEvent),2600);
 }));
}
