import fs from 'node:fs';import path from 'node:path';
const ROUTES=['/signup/','/signin/','/account/','/admin/'];
export function protectAccountPages(output){
 for(const route of ROUTES){const file=path.join(output,route.slice(1),'index.html');let html=fs.readFileSync(file,'utf8');html=html.replace(/<meta name="robots" content="[^"]*">/,'<meta name="robots" content="noindex,nofollow">');fs.writeFileSync(file,html);}
 const beta=path.join(output,'beta-use/index.html');if(fs.existsSync(beta)){const html=fs.readFileSync(beta,'utf8').replace('There is currently no purchase, subscription, renewal or cancellation process on this website.','Sandbox checkout and test billing management may be enabled for testing. Live subscriptions are not offered by this beta.');fs.writeFileSync(beta,html);}
 const sitemap=path.join(output,'sitemap.xml');if(fs.existsSync(sitemap)){let xml=fs.readFileSync(sitemap,'utf8');xml=xml.replace(/<url><loc>[^<]+\/(?:signup|signin|account|admin)\/<\/loc><\/url>/g,'');fs.writeFileSync(sitemap,xml);}
}
export function accountPageCopy(route,html){
 if(route==='/privacy/'){
  html=html.replace('The application includes no advertising, analytics, tracking pixels, third-party fonts or account forms.','The public pages include no advertising, analytics, tracking pixels or third-party fonts. Optional account forms contact the same-origin account API when you use them.');
  html=html.replace('Paid checkout, licensing, cloud sync and analytics are not active.','Live payment collection, cloud sync and analytics are not active. A separately configured Stripe sandbox may be used for test subscriptions.');
  html=html.replace('<h2>The extension</h2>','<h2>Optional website accounts</h2><p>To sign up or sign in, you provide an email address. When configured, Resend delivers a one-time verification code. Verified accounts, sign-in timestamps, hashed sessions and subscription identifiers are stored in our Neon PostgreSQL database. Session cookies are Secure and HttpOnly. No authentication credential is stored in browser localStorage.</p><p>Login challenges expire after ten minutes; expired challenge rows are removed during subsequent code requests. Hashed email/IP rate-limit keys help limit abuse. Administrator reads and payment-activation changes create audit records. Account and audit records are retained for operation and support; a self-service deletion interface is not yet included in this private beta.</p><p>When sandbox checkout is enabled, Stripe processes the test payment. We store the customer/subscription identifiers and access state, not card numbers. Test subscriptions are labeled separately from real paid subscriptions. No notes, drafts or ChatGPT conversations are uploaded for account or billing purposes.</p><h2>The extension</h2>');
 }
 return html;
}
