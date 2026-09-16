import {randomUUID} from 'node:crypto';
import {hash,billingId,sameHash,SESSION_SECONDS,ADMIN_SESSION_SECONDS,AccountError} from './accounts-policy.mjs';
function user(row){return row?{id:row.id,email:row.email,billingId:row.billing_id,role:row.role,verifiedAt:row.verified_at,createdAt:row.created_at,lastLoginAt:row.last_login_at,disabledAt:row.disabled_at,authenticatedAt:row.authenticated_at?Math.floor(new Date(row.authenticated_at).getTime()/1000):0}:null;}
export function accountsStore(pool){
 async function tx(action){const c=await pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='5s'");const r=await action(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}}
 return {
  async challenge({nonceHash,codeHash,email,mode,expiresAt}){await pool.query("DELETE FROM public.chatdrobe_login_challenges WHERE expires_at<now()-interval '1 day'");await pool.query('INSERT INTO public.chatdrobe_login_challenges(nonce_hash,code_hash,email,mode,expires_at) VALUES($1,$2,$3,$4,to_timestamp($5))',[nonceHash,codeHash,email,mode,expiresAt]);},
  async invalidate(nonceHash){await pool.query('DELETE FROM public.chatdrobe_login_challenges WHERE nonce_hash=$1',[nonceHash]);},
  async verify({nonceHash,codeHash,tokenHash,now}){return tx(async c=>{
   const r=await c.query('SELECT * FROM public.chatdrobe_login_challenges WHERE nonce_hash=$1 FOR UPDATE',[nonceHash]),challenge=r.rows[0];
   if(!challenge||challenge.consumed_at||new Date(challenge.expires_at).getTime()<=now*1000||challenge.attempts>=5)return {ok:false};
   if(!sameHash(challenge.code_hash,codeHash)){await c.query('UPDATE public.chatdrobe_login_challenges SET attempts=attempts+1 WHERE nonce_hash=$1',[nonceHash]);return {ok:false};}
   await c.query('UPDATE public.chatdrobe_login_challenges SET consumed_at=to_timestamp($2) WHERE nonce_hash=$1',[nonceHash,now]);
   const existing=(await c.query('SELECT * FROM public.chatdrobe_accounts WHERE email=$1',[challenge.email])).rows[0];
   if(!existing&&challenge.mode==='signin')return {ok:false,signupRequired:true};if(existing?.disabled_at)return {ok:false};let account=existing;
   if(!account){const id=randomUUID();account=(await c.query(`INSERT INTO public.chatdrobe_accounts(id,email,billing_id,verified_at,last_login_at,accepted_beta_at) VALUES($1,$2,$3,to_timestamp($4),to_timestamp($4),to_timestamp($4)) ON CONFLICT(email) DO UPDATE SET last_login_at=EXCLUDED.last_login_at RETURNING *`,[id,challenge.email,billingId(id),now])).rows[0];}
   account=(await c.query('SELECT * FROM public.chatdrobe_accounts WHERE id=$1 FOR UPDATE',[account.id])).rows[0];if(account.disabled_at)return {ok:false};
   const invite=(await c.query('SELECT * FROM public.chatdrobe_admin_invites WHERE email_hash=$1 FOR UPDATE',[hash(challenge.email)])).rows[0];
   if(invite&&!invite.claimed_by){await c.query('UPDATE public.chatdrobe_admin_invites SET claimed_by=$2,claimed_at=to_timestamp($3) WHERE email_hash=$1',[invite.email_hash,account.id,now]);await c.query("UPDATE public.chatdrobe_accounts SET role='admin' WHERE id=$1",[account.id]);account.role='admin';await c.query("INSERT INTO public.chatdrobe_account_audit(actor,action) VALUES($1,'admin_claimed')",[account.id]);}
   // A claimed email invitation never re-grants a subsequently demoted administrator.
   await c.query('UPDATE public.chatdrobe_accounts SET last_login_at=to_timestamp($2) WHERE id=$1',[account.id,now]);
   const identity={kind:'account',issuer:'chatdrobe-native-email-v1',subject:account.id};
   await c.query('INSERT INTO public.chatdrobe_billing_installs(id,state) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',[account.billing_id,JSON.stringify({identity,billingEnvironment:'test'})]);
   const linked=(await c.query('SELECT state FROM public.chatdrobe_billing_installs WHERE id=$1',[account.billing_id])).rows[0];
   if(linked.state.identity?.issuer!==identity.issuer||linked.state.identity?.subject!==identity.subject)throw new AccountError('IDENTITY_CONFLICT','Account access requires review.',409);
   const seconds=account.role==='admin'?ADMIN_SESSION_SECONDS:SESSION_SECONDS;
   await c.query('DELETE FROM public.chatdrobe_sessions WHERE account_id=$1 AND expires_at<=to_timestamp($2)',[account.id,now]);
   await c.query('DELETE FROM public.chatdrobe_sessions WHERE token_hash IN(SELECT token_hash FROM public.chatdrobe_sessions WHERE account_id=$1 ORDER BY authenticated_at DESC,token_hash OFFSET 9)',[account.id]);
   await c.query('INSERT INTO public.chatdrobe_sessions(token_hash,account_id,authenticated_at,expires_at) VALUES($1,$2,to_timestamp($3),to_timestamp($4))',[tokenHash,account.id,now,now+seconds]);
   return {ok:true,user:user({...account,authenticated_at:new Date(now*1000),last_login_at:new Date(now*1000)}),seconds};
  });},
  async session(tokenHash,now){return user((await pool.query(`SELECT a.*,s.authenticated_at FROM public.chatdrobe_sessions s JOIN public.chatdrobe_accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at>to_timestamp($2) AND a.disabled_at IS NULL`,[tokenHash,now])).rows[0]);},
  async signout(tokenHash){await pool.query('DELETE FROM public.chatdrobe_sessions WHERE token_hash=$1',[tokenHash]);},
  async signoutAll(accountId){await tx(async c=>{await c.query('DELETE FROM public.chatdrobe_sessions WHERE account_id=$1',[accountId]);await c.query("INSERT INTO public.chatdrobe_account_audit(actor,action) VALUES($1,'signed_out_all')",[accountId]);});},
  async enabled(){return (await pool.query("SELECT value FROM public.chatdrobe_app_settings WHERE key='test_checkout'")).rows[0]?.value===true;},
  async activation(actor,enabled){await tx(async c=>{const a=(await c.query('SELECT role,disabled_at FROM public.chatdrobe_accounts WHERE id=$1 FOR UPDATE',[actor])).rows[0];if(a?.role!=='admin'||a.disabled_at)throw new AccountError('FORBIDDEN','Administrator access required.',403);await c.query("UPDATE public.chatdrobe_app_settings SET value=$1::jsonb,updated_at=now() WHERE key='test_checkout'",[JSON.stringify(enabled)]);await c.query('INSERT INTO public.chatdrobe_account_audit(actor,action) VALUES($1,$2)',[actor,enabled?'test_checkout_enabled':'test_checkout_disabled']);});},
  async adminUsers(actor,{q='',plan='all',page=1,now=Math.floor(Date.now()/1000)}={}){
   if(!['all','free','test_plus'].includes(plan)||typeof q!=='string'||q.length>100||!Number.isInteger(page)||page<1||page>100000)throw new AccountError('FILTER','Invalid account filter.');
   const escaped=q.replace(/[\\%_]/g,'\\$&');
   const cte=`WITH users AS(SELECT a.id,a.email,a.role,a.created_at,a.last_login_at,a.disabled_at,CASE WHEN a.disabled_at IS NULL AND b.state->>'status'='active' AND COALESCE(b.state->>'hold','')='' AND CASE WHEN b.state->>'paidUntil' ~ '^[0-9]{1,12}$' THEN (b.state->>'paidUntil')::numeric ELSE 0 END>$1 THEN 'test_plus' ELSE 'free' END AS plan,COALESCE(b.state->>'status','free') AS subscription_status,b.state->>'verifiedAt' AS last_verified_at,b.state->>'paidUntil' AS paid_until FROM public.chatdrobe_accounts a LEFT JOIN public.chatdrobe_billing_installs b ON b.id=a.billing_id)`;
   const filter=" WHERE email ILIKE $2 ESCAPE '\\' AND ($3='all' OR plan=$3)",params=[now,'%'+escaped+'%',plan];
   const rows=await pool.query(cte+' SELECT * FROM users'+filter+' ORDER BY created_at DESC,id LIMIT 25 OFFSET $4',[...params,(page-1)*25]);
   const total=await pool.query(cte+' SELECT count(*)::integer AS count FROM users'+filter,params);
   const counts=await pool.query(cte+" SELECT count(*)::integer AS registered,count(*) FILTER(WHERE plan='free')::integer AS free,count(*) FILTER(WHERE plan='test_plus')::integer AS test_plus FROM users",[now]);
   await pool.query("INSERT INTO public.chatdrobe_account_audit(actor,action) VALUES($1,'admin_users_read')",[actor]);
   return {users:rows.rows,total:total.rows[0].count,page,pageSize:25,counts:{...counts.rows[0],paid_live:0},asOf:now,coverage:'Registered, email-verified ChatDrobe accounts only. Anonymous extension installations are not counted. Subscription columns are last-verified snapshots, not a live Stripe census.'};
  }
 };
}
