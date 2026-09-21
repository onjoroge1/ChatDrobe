/* CSS-first adapter. Observes only native root appearance attributes, never the transcript. */
(function(root){
 'use strict';
 const P=root.ChatDrobePrefs||(typeof require==='function'?require('./prefs.js'):null);
 function create(doc,now=()=>performance.now()){
  const html=doc.documentElement,win=doc.defaultView||root;
  const attrs=['data-md-enabled','data-md-theme','data-md-scheme','data-md-focus','data-md-motion','data-md-decoration','data-md-bubbles','data-md-visible'];
  const vars=['--md-width','--md-font','--md-font-size','--md-line-height','--md-accent','--md-link','--md-button-ink'];
  const originals=new Map(vars.map(k=>[k,[html.style.getPropertyValue(k),html.style.getPropertyPriority(k)]]));
  const originalAttrs=new Map(attrs.map(k=>[k,html.getAttribute(k)]));
  let prefs=null,key='',scene=null,disposed=false,observer=null;
  const media=typeof win.matchMedia==='function'?win.matchMedia('(prefers-color-scheme: dark)'):null;
  const stats={applyCount:0,writeCount:0,lastApplyJSms:0,maxApplyJSms:0};
  const attr=(k,v)=>{if(html.getAttribute(k)===v)return;if(v===null)html.removeAttribute(k);else html.setAttribute(k,v);stats.writeCount++;};
  const prop=(k,v,p='')=>{if(html.style.getPropertyValue(k)===v&&html.style.getPropertyPriority(k)===p)return;if(v)html.style.setProperty(k,v,p);else html.style.removeProperty(k);stats.writeCount++;};
  const removeScene=()=>{if(scene){scene.remove();scene=null;stats.writeCount++;}};
  function nativeDark(){const explicit=html.getAttribute('data-theme')||html.getAttribute('data-color-scheme');if(explicit==='dark'||explicit==='light')return explicit==='dark';const classes=(html.getAttribute('class')||'').split(/\s+/);if(classes.includes('dark'))return true;if(classes.includes('light'))return false;return !!media?.matches;}
  function colorMode(){
   if(disposed||!prefs?.enabled)return;
   const mode=P.scheme(prefs,{nativeDark:nativeDark(),systemDark:!!media?.matches});
   attr('data-md-scheme',mode);
   if(prefs.accent){const palette=P.themeById(prefs.theme).variants[mode];const readable=['bg','surface','panel','soft'].every(k=>P.contrast(prefs.accent,palette[k])>=4.5);prop('--md-accent',prefs.accent);prop('--md-link',readable?prefs.accent:palette.text);prop('--md-button-ink',P.ink(prefs.accent));}
   else for(const k of ['--md-accent','--md-link','--md-button-ink']){const[v,p]=originals.get(k);prop(k,v,p);}
  }
  function subscriptions(){
   if(prefs?.enabled&&prefs.mode==='chatgpt'&&!observer&&typeof win.MutationObserver==='function'){
    observer=new win.MutationObserver(colorMode);
    observer.observe(html,{attributes:true,attributeFilter:['class','data-theme','data-color-scheme']});
   }else if((!prefs?.enabled||prefs.mode!=='chatgpt')&&observer){observer.disconnect();observer=null;}
  }
  function updateScene(){
   if(disposed)return;
   if(!prefs?.enabled||!prefs.decoration){removeScene();return;}
   if(!doc.body||scene?.isConnected)return;
   scene=doc.createElement('div');scene.id='chatdrobe-scene';scene.setAttribute('aria-hidden','true');
   doc.body.append(scene);stats.writeCount++;
  }
  function apply(value){
   if(disposed)return;
   const next=P.prefs(value),nextKey=JSON.stringify(next);if(key===nextKey)return;
   const start=now();key=nextKey;prefs=next;stats.applyCount++;
   if(!next.enabled){for(const[k,v]of originalAttrs)attr(k,v);for(const[k,[v,p]]of originals)prop(k,v,p);removeScene();}
   else{
    attr('data-md-enabled','true');attr('data-md-theme',next.theme);
    for(const k of ['focus','motion','decoration','bubbles'])attr('data-md-'+k,String(next[k]));
    attr('data-md-visible',String(!doc.hidden));
    prop('--md-width',next.width+'px');prop('--md-font',P.FONTS[next.font]);prop('--md-font-size',next.fontSize+'px');prop('--md-line-height',String(next.lineHeight));
    colorMode();updateScene();
   }
   subscriptions();stats.lastApplyJSms=now()-start;stats.maxApplyJSms=Math.max(stats.maxApplyJSms,stats.lastApplyJSms);
  }
  const visible=()=>{if(!disposed&&prefs?.enabled)attr('data-md-visible',String(!doc.hidden));};
  const systemChanged=()=>{if(prefs?.mode==='system'||prefs?.mode==='chatgpt')colorMode();};
  doc.addEventListener('visibilitychange',visible);media?.addEventListener('change',systemChanged);
  if(!doc.body)doc.addEventListener('DOMContentLoaded',updateScene,{once:true});
  return Object.freeze({apply,diagnostics:()=>({...stats,extraDOMNodes:scene?.isConnected?1:0,rootAppearanceObserver:!!observer}),dispose(){
   if(disposed)return;apply({...prefs,enabled:false});disposed=true;observer?.disconnect();observer=null;
   doc.removeEventListener('visibilitychange',visible);doc.removeEventListener('DOMContentLoaded',updateScene);media?.removeEventListener('change',systemChanged);
  }});
 }
 const api=Object.freeze({create});if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ChatDrobeAdapter=api;
})(globalThis);
