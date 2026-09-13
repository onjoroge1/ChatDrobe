import {notify} from './client.js';
import {favoriteIds} from './preferences.js';
const form=document.querySelector('#catalog-form');
if(form){
 const grid=document.querySelector('#catalog-grid'),cards=[...grid.children],fields=form.elements;
 let favorites=new Set();try{favorites=favoriteIds(localStorage.getItem('chatdrobe:favorites:v1'));}catch{/* Private browsing may deny storage. */}
 const favoriteButtons=new Map();
 function persist(){try{localStorage.setItem('chatdrobe:favorites:v1',JSON.stringify([...favorites]));}catch{notify('Favorites are available for this visit only; browser storage is blocked.');}}
 function refresh(){
  const query=fields.q.value.trim().toLowerCase();let count=0;
  const sorted=fields.sort.value==='name'?[...cards].sort((a,b)=>a.dataset.name.localeCompare(b.dataset.name)):cards;
  grid.append(...sorted);
  for(const card of cards){const d=card.dataset;const match=(!query||(d.name+' '+card.querySelector('p').textContent).toLowerCase().includes(query))&&(!fields.category.value||d.category===fields.category.value)&&(!fields.tone.value||d.tone===fields.tone.value)&&(!fields.plan.value||d.plan===fields.plan.value)&&(!fields.favorites.checked||favorites.has(d.id));card.hidden=!match;if(match)count++;const b=favoriteButtons.get(d.id);b.setAttribute('aria-pressed',String(favorites.has(d.id)));b.textContent=favorites.has(d.id)?'★':'☆';}
  document.querySelector('#catalog-count').textContent=`${count} ${count===1?'world':'worlds'}${fields.favorites.checked?' in your favorites':''}`;
  document.querySelector('#catalog-empty').hidden=count!==0;
  const params=new URLSearchParams();for(const key of ['q','category','tone','plan','sort'])if(fields[key].value&&fields[key].value!=='featured')params.set(key,fields[key].value);if(fields.favorites.checked)params.set('favorites','1');
  history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);
 }
 for(const card of cards){const b=document.createElement('button');b.type='button';b.className='favorite';b.setAttribute('aria-label','Favorite '+card.dataset.name);b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{const id=card.dataset.id;favorites.has(id)?favorites.delete(id):favorites.add(id);persist();refresh();});favoriteButtons.set(card.dataset.id,b);card.append(b);}
 const restore=()=>{form.reset();const params=new URLSearchParams(location.search);for(const key of ['q','category','tone','plan','sort'])if(params.has(key))fields[key].value=params.get(key).slice(0,80);if(!fields.sort.value)fields.sort.value='featured';fields.favorites.checked=params.get('favorites')==='1';refresh();};
 form.addEventListener('input',refresh);form.addEventListener('submit',e=>{e.preventDefault();refresh();});
 document.querySelector('#reset-catalog').addEventListener('click',()=>{form.reset();refresh();fields.q.focus();});
 document.querySelector('#clear-favorites').addEventListener('click',()=>{if(confirm('Clear saved website favorites? Extension data is not affected.')){favorites.clear();try{localStorage.removeItem('chatdrobe:favorites:v1');}catch{}refresh();notify('Website favorites cleared.');}});
 window.addEventListener('popstate',restore);restore();
}
