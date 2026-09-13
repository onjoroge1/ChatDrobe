/* Appearance v1 contract compatible with extension 0.2.0; no arbitrary CSS or code. */
export const IDS=Object.freeze(['mooncat','circuit','comic','aurora','paper','midnight','forest','ocean','starlit','reactor','sentinel','arcade']);
export const DEFAULTS=Object.freeze({font:'system',fontSize:16,lineHeight:1.65,width:850,decoration:true,focus:false,bubbles:true});
const number=(n,min,max,fallback)=>typeof n==='number'&&Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
export function normalize(value={},theme='mooncat'){
 const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 if(!IDS.includes(theme))throw new Error('Unknown theme.');
 return {theme,enabled:true,motion:false,font:['system','serif','mono'].includes(v.font)?v.font:'system',fontSize:number(v.fontSize,13,24,16),lineHeight:number(v.lineHeight,1.3,2.2,1.65),width:number(v.width,600,1400,850),decoration:typeof v.decoration==='boolean'?v.decoration:true,focus:typeof v.focus==='boolean'?v.focus:false,bubbles:typeof v.bubbles==='boolean'?v.bubbles:true};
}
export function appearance(value,theme){return {format:'chatdrobe-appearance',version:1,prefs:normalize(value,theme)};}
export function parseAppearance(text,theme){
 if(typeof text!=='string'||text.length>16384)throw new Error('Use an appearance JSON smaller than 16 KB.');
 let data;try{data=JSON.parse(text);}catch{throw new Error('This is not valid JSON.');}
 if(!data||data.format!=='chatdrobe-appearance'||data.version!==1||!data.prefs||data.prefs.theme!==theme)throw new Error('Choose a version 1 appearance file for this world.');
 return normalize(data.prefs,theme);
}
export function fromQuery(params,theme){const v={};for(const key of ['fontSize','lineHeight','width'])if(params.has(key))v[key]=Number(params.get(key));if(params.has('font'))v.font=params.get('font');for(const key of ['decoration','focus','bubbles'])if(params.has(key))v[key]=params.get(key)==='1';return normalize(v,theme);}
export function toQuery(prefs){const clean=normalize(prefs,prefs.theme),params=new URLSearchParams();for(const[key,value]of Object.entries(DEFAULTS))if(clean[key]!==value)params.set(key,typeof clean[key]==='boolean'?String(Number(clean[key])):String(clean[key]));return params.toString();}
export function favoriteIds(raw){try{const values=JSON.parse(raw||'[]');return new Set(Array.isArray(values)?values.filter(x=>IDS.includes(x)):[]);}catch{return new Set();}}
