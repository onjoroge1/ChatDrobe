import {randomBytes} from 'node:crypto';
import {AccountError,hash} from './accounts-policy.mjs';
const CODE=/^[A-F0-9]{20}$/;
export function cleanLinkCode(value){return typeof value==='string'?value.toUpperCase().replaceAll('-','').replaceAll(' ',''):'';}
export function extensionDevices({pool,store,owner,now=()=>Math.floor(Date.now()/1000)}){
 async function transaction(fn){const c=await pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
 async function start(credentialHash,extensionId,ip){
  if(!/^[a-p]{32}$/.test(extensionId||''))throw new AccountError('EXTENSION_ID','Unsupported extension identifier.');
  await store.limit('device-start-global',200,3600,now());await store.limit('device-start-ip:'+hash(ip),10,600,now());
  await pool.query('DELETE FROM public.chatdrobe_extension_devices WHERE account_id IS NULL AND expires_at<now()');
  const code=randomBytes(10).toString('hex').toUpperCase();
  await transaction(async c=>{
   const row=(await c.query('SELECT * FROM public.chatdrobe_extension_devices WHERE credential_hash=$1 FOR UPDATE',[credentialHash])).rows[0];
   if(row?.account_id||row?.revoked_at)throw new AccountError('DEVICE_ALREADY_LINKED','Disconnect before linking a different account.',409);
   const inserted=await c.query('INSERT INTO public.chatdrobe_extension_devices(credential_hash,code_hash,extension_id,expires_at) VALUES($1,$2,$3,to_timestamp($4)) ON CONFLICT(credential_hash) DO UPDATE SET code_hash=EXCLUDED.code_hash,extension_id=EXCLUDED.extension_id,expires_at=EXCLUDED.expires_at WHERE chatdrobe_extension_devices.account_id IS NULL AND chatdrobe_extension_devices.revoked_at IS NULL',[credentialHash,hash(code),extensionId,now()+600]);
   if(!inserted.rowCount)throw new AccountError('DEVICE_ALREADY_LINKED','Start a new connection from the extension.',409);
  });
  return {code:code.match(/.{1,5}/g).join('-'),expiresAt:now()+600};
 }
 async function approve(user,value){
  const code=cleanLinkCode(value);if(!CODE.test(code))throw new AccountError('LINK_CODE','Enter the code displayed by your installed ChatDrobe extension.');
  await store.limit('device-approve:'+user.id,15,600,now());
  return transaction(async c=>{
   const active=(await c.query('SELECT id,disabled_at FROM public.chatdrobe_accounts WHERE id=$1 FOR UPDATE',[user.id])).rows[0];if(!active||active.disabled_at)throw new AccountError('SIGN_IN_REQUIRED','Sign in again.',401);
   const row=(await c.query('SELECT * FROM public.chatdrobe_extension_devices WHERE code_hash=$1 FOR UPDATE',[hash(code)])).rows[0];
   if(!row||row.account_id||row.revoked_at||new Date(row.expires_at).getTime()<=now()*1000)throw new AccountError('LINK_EXPIRED','This code expired or was used. Start a new connection from the extension.',409);
   const count=(await c.query('SELECT count(*)::int AS n FROM public.chatdrobe_extension_devices WHERE account_id=$1 AND revoked_at IS NULL AND expires_at>to_timestamp($2)',[user.id,now()])).rows[0].n;
   if(count>=10)throw new AccountError('DEVICE_LIMIT','Disconnect an old extension before adding another.',409);
   const ownerVersion=user.identitySource==='operator_credentials'?owner.version:null;
   await c.query('UPDATE public.chatdrobe_extension_devices SET account_id=$2,owner_version=$3,linked_at=to_timestamp($4),expires_at=to_timestamp($5) WHERE credential_hash=$1',[row.credential_hash,user.id,ownerVersion,now(),now()+30*86400]);
   await c.query("INSERT INTO public.chatdrobe_access_audit(account_id,action) VALUES($1,'device_linked')",[user.id]);return {linked:true};
  });
 }
 async function device(credentialHash,{pending=false}={}){
  await store.limit('device-api-global',1200,60,now());await store.limit('device-api:'+credentialHash,30,60,now());
  const row=(await pool.query('SELECT d.*,a.email,a.billing_id,a.disabled_at FROM public.chatdrobe_extension_devices d LEFT JOIN public.chatdrobe_accounts a ON a.id=d.account_id WHERE d.credential_hash=$1',[credentialHash])).rows[0];
  if(!row||row.revoked_at||row.disabled_at||new Date(row.expires_at).getTime()<=now()*1000||(row.owner_version&&(!owner.ready||row.owner_version!==owner.version)))throw new AccountError('DEVICE_SIGN_IN_REQUIRED','Reconnect this extension to your ChatDrobe account.',401);
  if(!pending&&!row.account_id)throw new AccountError('LINK_PENDING','Approve the matching code on the ChatDrobe website.',409);
  return row;
 }
 async function poll(credentialHash){const row=await device(credentialHash,{pending:true});return row.account_id?{linked:true,account:{email:row.email,billingId:row.billing_id}}:{linked:false,pending:true};}
 async function list(user){const r=await pool.query('SELECT credential_hash AS id,extension_id,linked_at,last_seen,expires_at FROM public.chatdrobe_extension_devices WHERE account_id=$1 AND revoked_at IS NULL AND expires_at>to_timestamp($2) ORDER BY linked_at DESC',[user.id,now()]);return {devices:r.rows};}
 async function revoke(user,id){if(!/^[a-f0-9]{64}$/.test(id||''))throw new AccountError('DEVICE_ID','Invalid device.');await transaction(async c=>{const r=await c.query('UPDATE public.chatdrobe_extension_devices SET revoked_at=now() WHERE credential_hash=$1 AND account_id=$2 AND revoked_at IS NULL RETURNING credential_hash',[id,user.id]);if(r.rowCount)await c.query("INSERT INTO public.chatdrobe_access_audit(account_id,action) VALUES($1,'device_revoked')",[user.id]);});return {ok:true};}
 async function disconnect(id){await pool.query('UPDATE public.chatdrobe_extension_devices SET revoked_at=now() WHERE credential_hash=$1',[id]);return {ok:true};}
 async function revokeAll(user){await pool.query('UPDATE public.chatdrobe_extension_devices SET revoked_at=now() WHERE account_id=$1 AND revoked_at IS NULL',[user.id]);}
 return {start,approve,device,poll,list,revoke,disconnect,revokeAll};
}
