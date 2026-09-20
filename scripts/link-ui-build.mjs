import fs from 'node:fs';import path from 'node:path';
/** Adds only first-party account UI to existing account shells; no operator values in HTML. */
export function installLinkUi(root,output){
 fs.copyFileSync(path.join(root,'src/account-link-ui.js'),path.join(output,'assets/account-link-ui.js'));
 for(const route of ['signup','signin','account','admin']){const file=path.join(output,route,'index.html');let html=fs.readFileSync(file,'utf8');if(route==='admin')html=html.replace('Verified accounts','Registered accounts');html=html.replace('</head>','<script type="module" src="/assets/account-link-ui.js"></script></head>');fs.writeFileSync(file,html);}
 const file=path.join(output,'assets/accounts.js');let js=fs.readFileSync(file,'utf8');
 const original='location.assign(destination());';
 if(!js.includes(original))throw new Error('Review the changed login redirect before building.');
 js=js.replace(original,"const link=new URLSearchParams(location.hash.slice(1)).get('link')||'';location.assign(destination()+(/^[A-F0-9]{5}(?:-[A-F0-9]{5}){3}$/.test(link)?'#link='+encodeURIComponent(link):''));");
 js=js.replace("emailDelivery:'Verified sender / email API'","authentication:'Verified email login or configured owner login'");
 fs.writeFileSync(file,js);
 const privacy=path.join(output,'privacy/index.html');let html=fs.readFileSync(privacy,'utf8');html=html.replace('<h2>The extension</h2>','<h2>Owner credentials and extension connections</h2><p>An explicitly provisioned owner can authenticate with a server-configured password hash while email delivery is unavailable. This is operator authorization, not proof of inbox ownership and not a Premium grant. Owner sessions expire after one hour and are invalidated when the configured credential changes. Login and device-link events are audited.</p><p>Linking an extension requires matching a short-lived code and confirming it while signed in. Device credential hashes and account associations are stored server-side; the raw credential stays in trusted extension storage. Account status is refreshed periodically. No notes, drafts or conversation text are sent in these requests. Cached access lasts at most ten minutes after remote revocation; disconnecting locally removes it immediately. Connections expire after 30 days unless re-linked.</p><h2>The extension</h2>');fs.writeFileSync(privacy,html);
}
