import {AccountError,email,secret,freshCode,hash,codeDigest,CODE_SECONDS,safeUser,subscriptionSummary,requireAdmin} from './accounts-policy.mjs';
export function accountService({accounts,billingStore,mailer,config,payments,now=()=>Math.floor(Date.now()/1000)}){
 return {
  async requestCode(input,{ip='unknown',previous=null}={}){
   if(!config.emailReady)throw new AccountError('EMAIL_NOT_READY','Email sign-in is not configured yet. No code was sent.',503);
   const address=email(input.email);
   if(!['signup','signin'].includes(input.mode)||input.mode==='signup'&&input.acceptBeta!==true)throw new AccountError('CONSENT','Accept the beta terms and privacy notice to create an account.');
   await billingStore.limit('auth-global',1000,86400,now());await billingStore.limit('auth-email:'+hash(address),5,3600,now());await billingStore.limit('auth-ip:'+hash(ip),12,3600,now());
   const nonce=secret(),code=freshCode(),nonceHash=hash(nonce);if(previous)await accounts.invalidate(hash(previous));
   await accounts.challenge({nonceHash,codeHash:codeDigest(nonce,code),email:address,mode:input.mode,expiresAt:now()+CODE_SECONDS});
   try{await mailer({email:address,code,requestId:nonceHash});}catch(e){await accounts.invalidate(nonceHash);throw e;}
   return {nonce,public:{ok:true,message:'Check your email for an eight-digit code. It works in this browser for ten minutes.'}};
  },
  async verifyCode(nonce,code,{ip='unknown'}={}){
   if(!nonce||!/^\d{8}$/.test(code||''))throw new AccountError('CODE_INVALID','The code is invalid or expired. Request a new code.',401);
   await billingStore.limit('auth-verify-global',600,60,now());await billingStore.limit('auth-verify-ip:'+hash(ip),60,600,now());await billingStore.limit('auth-verify:'+hash(nonce),15,600,now());
   const token=secret(),result=await accounts.verify({nonceHash:hash(nonce),codeHash:codeDigest(nonce,code),tokenHash:hash(token),now:now()});
   if(result.signupRequired)throw new AccountError('SIGNUP_REQUIRED','Email verified. Use Create account to register first.',409);
   if(!result.ok)throw new AccountError('CODE_INVALID','The code is invalid or expired. Request a new code.',401);
   return {token,seconds:result.seconds,user:safeUser(result.user)};
  },
  async authenticate(token){if(!token)throw new AccountError('SIGN_IN_REQUIRED','Sign into your ChatDrobe account.',401);await billingStore.limit('account-auth-global',1000,60,now());const user=await accounts.session(hash(token),now());if(!user)throw new AccountError('SIGN_IN_REQUIRED','Your session expired. Sign in again.',401);return user;},
  async profile(user){const state=await billingStore.read(user.billingId)||{};return {user:safeUser(user),subscription:subscriptionSummary(state,now()),payments:await payments.status()};},
  async signout(token){if(token)await accounts.signout(hash(token));return {ok:true};},
  async signoutAll(user){await accounts.signoutAll(user.id);return {ok:true};},
  async admin(user,filters){requireAdmin(user);await billingStore.limit('admin-list:'+user.id,30,60,now());return accounts.adminUsers(user.id,{...filters,now:now()});},
  async setup(user){requireAdmin(user);return payments.setup();},
  async activate(user,enabled){requireAdmin(user,{fresh:enabled,now:now()});return payments.activate(user,enabled);}
 };
}
