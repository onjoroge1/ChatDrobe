import fs from 'node:fs';
import path from 'node:path';
import {escape,layout,documentPage} from './render.mjs';
export function releaseSettings(config,env={}){
 const raw=env.SITE_URL||config.siteUrl||'';let origin='';
 if(raw){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error('SITE_URL must be a bare HTTPS origin without credentials.');origin=u.origin;}
 const requested=env.SITE_INDEXABLE==='true';
 const indexable=requested&&env.VERCEL_ENV==='production';
 if(requested&&!origin)throw new Error('An approved SITE_URL is required before enabling indexing.');
 const download=config.downloadUrl||'',sha=config.downloadSha256||'',store=config.storeUrl||'';
 if(Boolean(download)!==Boolean(sha))throw new Error('A public extension download requires both its URL and SHA-256.');
 if(download){const u=new URL(download);if(u.origin!=='https://github.com'||u.username||u.password||u.search||u.hash||!u.pathname.startsWith('/onjoroge1/ChatDrobe/releases/download/')||!u.pathname.endsWith('.zip')||!/^\w[\w.-]*\/[^/]+\.zip$/.test(u.pathname.split('/releases/download/')[1])||!/^[a-f0-9]{64}$/i.test(sha))throw new Error('Use a verified ZIP release in the ChatDrobe repository and a 64-digit SHA-256.');}
 if(store){const u=new URL(store);if(u.origin!=='https://chromewebstore.google.com'||u.username||u.password||u.search||u.hash||!/^\/detail\/[a-z0-9-]+\/[a-p]{32}$/.test(u.pathname))throw new Error('Use an approved Chrome Web Store detail URL.');}
 return {origin,indexable,download,sha,store};
}
const summaries={
 '/':'Original cat, mecha and comic themes for your ChatGPT workspace. Preview 15 worlds, explore local tools and try the desktop Chrome private beta.',
 '/themes/':'Browse 15 original ChatDrobe worlds. Search, filter light and dark palettes, save local favorites and download appearance settings.',
 '/install/':'Install the ChatDrobe private beta in desktop Chrome, import appearance files, restore the original look and troubleshoot setup.',
 '/how-it-works/':'Learn how ChatDrobe combines a CSS-first appearance layer with side-panel prompts, notes, reading controls and a focus timer.',
 '/pricing/':'Compare proposed ChatDrobe Free and Plus plans. 11 Free worlds and four Premium previews; checkout and paid subscriptions are not active.',
 '/help/':'Troubleshoot ChatDrobe setup, themes and appearance imports. Find privacy-conscious bug-report guidance and public GitHub support.',
 '/privacy/':'How the ChatDrobe website handles local favorites, appearance files, hosting requests and support reports. No application analytics or ad tracking.',
 '/architecture/':'Explore the separate website and extension architecture, CSS-first integration, local side-panel tools and performance testing boundaries.',
 '/changelog/':'Follow ChatDrobe website releases, extension beta status and the remaining checks before a public or paid launch.',
 '/beta-use/':'Understand the ChatDrobe private beta, local-data limitations, original artwork, independent branding and support boundaries.',
 '/404/':'This ChatDrobe page could not be found. Return home or explore the original theme worlds.'
};
const betaContent='<p>This is a test release, not a paid service agreement. These notes describe current product boundaries; final commercial terms require review before paid launch.</p><h2>What the beta does</h2><p>ChatDrobe changes presentation and provides local tools. It is independent of OpenAI, does not provide ChatGPT access and does not improve or guarantee model answers. Only original artwork is included.</p><h2>Keep a backup</h2><p>Unpacked extensions and their local storage can change or be removed. Do not rely on the scratchpad as your only copy of important information. The website does not back up or synchronize extension data.</p><h2>Support and known limitations</h2><p>Desktop Chrome and signed-in ChatGPT compatibility are still being tested. No uptime commitment, completion date or premium feature delivery is promised. Follow the <a href="/help/">troubleshooting guide</a> and avoid sharing private chats in public reports.</p><h2>No payment collected</h2><p>Free and Plus are proposed launch plans. There is currently no purchase, subscription, renewal or cancellation process on this website. Billing will require separate disclosures and working cancellation controls before launch.</p><h2>Artwork and source</h2><p>Making source publicly visible does not grant an open-source license. No third-party franchise character license is claimed. ChatDrobe brand and domain clearance remain launch requirements.</p>';
export function finalizeSite(output,config,routes,env=process.env){
 const settings=releaseSettings(config,env),route='/beta-use/';
 const freeCount=JSON.parse(fs.readFileSync(new URL('./themes.json',import.meta.url),'utf8')).filter(t=>t.plan==='free').length;
 fs.mkdirSync(path.join(output,'beta-use'),{recursive:true});
 fs.writeFileSync(path.join(output,'beta-use/index.html'),layout({title:'Using the private beta',path:route,body:documentPage('Using the private beta',betaContent),config}));routes.push(route);
 for(const r of [...routes,'/404/']){
  const file=path.join(output,r==='/404/'?'404.html':r==='/'?'index.html':r.slice(1)+'index.html');let html=fs.readFileSync(file,'utf8');
  const title=html.match(/<title>(.*?)<\/title>/s)[1];
  const desc=summaries[r]?escape(summaries[r]):html.match(/<meta name="description" content="([^"]*)"/)[1];
  html=html.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${desc}">`);
  const indexed=settings.indexable&&r!=='/404/';html=html.replace('content="noindex,nofollow"',`content="${indexed?'index,follow':'noindex,follow'}"`);
  let meta=`<meta property="og:type" content="website"><meta property="og:site_name" content="ChatDrobe"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta name="twitter:card" content="summary">`;
  if(settings.origin&&r!=='/404/'){const url=escape(settings.origin+r);meta+=`<link rel="canonical" href="${url}"><meta property="og:url" content="${url}">`;}
  html=html.replace('</head>',meta+'</head>').replace('<a href="/privacy/">Privacy</a>','<a href="/privacy/">Privacy</a><a href="/beta-use/">Beta use</a>');
  if(settings.store)html=html.replace('Not listed on the Chrome Web Store.','Chrome Web Store listing configured.');
  if(r==='/install/'&&(settings.download||settings.store)){
   const options=`<section class="notice-box"><h2>Approved release links</h2>${settings.store?`<p><a class="btn" href="${escape(settings.store)}">View Chrome Web Store listing ↗</a></p>`:''}${settings.download?`<p><a class="btn" href="${escape(settings.download)}">Download extension ZIP ↗</a></p><p>SHA-256: <code>${escape(settings.sha)}</code></p>`:''}<p>Version ${escape(config.extensionVersion)}. Verify the release notes and checksum before installing.</p></section>`;
   html=html.replace('<h2>Install the test build</h2>',options+'<h2>Install the test build</h2>').replace('The package is currently shared directly with testers. Use the ZIP already provided to you. A public download will appear here only after the release URL is configured and verified.','Release links are provided below. The beta is still subject to the testing limitations in this guide.');
  }
  // Earlier render passes may already replace 12 with the current catalog count.
  // Access wording must remain truthful regardless of that replacement order.
  fs.writeFileSync(file,html.replace(/All \d+ worlds unlocked/g,`${freeCount} Free worlds · Premium tester preview`));
 }
 fs.writeFileSync(path.join(output,'robots.txt'),settings.indexable?`User-agent: *\nAllow: /\nSitemap: ${settings.origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
 if(settings.origin)fs.writeFileSync(path.join(output,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routes.map(r=>`<url><loc>${escape(settings.origin+r)}</loc></url>`).join('')+'</urlset>\n');
 return settings;
}
