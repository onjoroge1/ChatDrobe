import {randomUUID} from 'node:crypto';
import {AccountError,email,secret,hash,billingId} from './accounts-policy.mjs';
import {verifyOwnerPassword} from './owner-credentials.mjs';
const SECONDS=3600;
/** Operator-provisioned identity only. A password never grants a paid plan. */
export function ownerAccess({pool,store,accounts,configuration,now=()=>Math.floor(Date.now()/1000)}){
 async function authenticateSession(tokenHash,at){
  const user=await accounts.session(tokenHash,at);if(!user)return null;
  const row=(await pool.query('SELECT credential_version FROM public.chatdrobe_owner_sessions WHERE token_hash=$1',[tokenHash])).rows[0];
  if(row&&(!configuration.ready||row.credential_version!==configuration.version||user.email!==configuration.email))return null;
  if(row){user.identitySource='operator_credentials';user.emailVerified=false;}else{user.identitySource='email_code';user.emailVerified=true;}
  return user;
 }
 async function login(input,ip='unknown'){
  if(!configuration.ready)throw new AccountError('OWNER_LOGIN_UNAVAILABLE','Owner credentials have not been configured.',503);
  const candidate=email(input.email);
  await store.limit('owner-login-global',20,60,now());
  await store.limit('owner-login-ip:'+hash(ip),10,600,now());
  await store.limit('owner-login-address:'+hash(candidate),10,600,now());
  const valid=await verifyOwnerPassword(input.password,configuration.passwordHash);
  if(!valid||candidate!==configuration.email)throw new AccountError('OWNER_LOGIN_INVALID','Owner email or password is incorrect.',401);
  const token=secret(),tokenHash=hash(token),c=await pool.connect();
  try{
   await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");
   const invite=(await c.query('SELECT * FROM public.chatdrobe_admin_invites WHERE email_hash=$1 FOR UPDATE',[hash(candidate)])).rows[0];
   if(!invite)throw new AccountError('OWNER_NOT_RESERVED','This address is not the reserved owner for this application.',403);
   let account=(await c.query('SELECT * FROM public.chatdrobe_accounts WHERE email=$1 FOR UPDATE',[candidate])).rows[0];
   if(account?.disabled_at||(invite.claimed_by&&(!account||invite.claimed_by!==account.id||account.role!=='admin')))throw new AccountError('OWNER_REVIEW_REQUIRED','Owner access requires operator review.',403);
   if(!account){const id=randomUUID();account=(await c.query("INSERT INTO public.chatdrobe_accounts(id,email,billing_id,role,verified_at,last_login_at,accepted_beta_at) VALUES($1,$2,$3,'admin',to_timestamp($4),to_timestamp($4),to_timestamp($4)) RETURNING *",[id,candidate,billingId(id),now()])).rows[0];}
   if(!invite.claimed_by){await c.query("UPDATE public.chatdrobe_accounts SET role='admin' WHERE id=$1",[account.id]);await c.query('UPDATE public.chatdrobe_admin_invites SET claimed_by=$2,claimed_at=to_timestamp($3) WHERE email_hash=$1',[hash(candidate),account.id,now()]);}
   const identity={kind:'account',issuer:'chatdrobe-native-email-v1',subject:account.id};
   await c.query('INSERT INTO public.chatdrobe_billing_installs(id,state) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[account.billing_id,JSON.stringify({identity,billingEnvironment:'test'})]);
   const linked=(await c.query('SELECT state FROM public.chatdrobe_billing_installs WHERE id=$1',[account.billing_id])).rows[0];
   if(linked.state.identity?.subject!==account.id||linked.state.identity?.issuer!==identity.issuer)throw new AccountError('IDENTITY_CONFLICT','Billing identity requires review.',409);
   const old=(await c.query('SELECT credential_version FROM public.chatdrobe_owner_bindings WHERE account_id=$1 FOR UPDATE',[account.id])).rows[0];
   if(old&&old.credential_version!==configuration.version){await c.query('DELETE FROM public.chatdrobe_sessions WHERE account_id=$1',[account.id]);await c.query('UPDATE public.chatdrobe_extension_devices SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL',[account.id]);}
   await c.query('INSERT INTO public.chatdrobe_owner_bindings(account_id,credential_version) VALUES($1,$2) ON CONFLICT(account_id) DO UPDATE SET credential_version=EXCLUDED.credential_version',[account.id,configuration.version]);
   await c.query('DELETE FROM public.chatdrobe_sessions WHERE account_id=$1 AND expires_at<=to_timestamp($2)',[account.id,now()]);
   await c.query('DELETE FROM public.chatdrobe_sessions WHERE token_hash IN(SELECT token_hash FROM public.chatdrobe_sessions WHERE account_id=$1 ORDER BY authenticated_at DESC,token_hash OFFSET 9)',[account.id]);
   await c.query('INSERT INTO public.chatdrobe_sessions(token_hash,account_id,authenticated_at,expires_at) VALUES($1,$2,to_timestamp($3),to_timestamp($4))',[tokenHash,account.id,now(),now()+SECONDS]);
   await c.query('INSERT INTO public.chatdrobe_owner_sessions(token_hash,credential_version) VALUES($1,$2)',[tokenHash,configuration.version]);
   await c.query('UPDATE public.chatdrobe_accounts SET last_login_at=to_timestamp($2) WHERE id=$1',[account.id,now()]);
   await c.query("INSERT INTO public.chatdrobe_access_audit(account_id,action) VALUES($1,'owner_login')",[account.id]);
   await c.query('COMMIT');
   return {token,seconds:SECONDS,user:{id:account.id,email:candidate,role:'admin',identitySource:'operator_credentials',emailVerified:false}};
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
 }
 return {login,authenticateSession};
}
