import test from 'node:test';
import assert from 'node:assert/strict';
import {identityConfiguration,accountAuthenticator,stableAccountId,registerAccount} from '../account-identity.mjs';
const cfg=identityConfiguration({BILLING_IDENTITY_MODE:'account',AUTH_SUPABASE_URL:'https://example-ref.supabase.co',AUTH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'a'.repeat(20)});
const user={id:'59a8ac8e-4c45-4dce-97c7-c81c2b0a72f0',aud:'authenticated',email:'person@example.test',email_confirmed_at:'2026-01-01T00:00:00Z',is_anonymous:false};
const header='Bearer header.payload.signature';
test('account configuration rejects unsafe origins and server-only Auth keys',()=>{
 assert.deepEqual(identityConfiguration({}),{mode:'installation'});
 for(const patch of [{BILLING_IDENTITY_MODE:'bad'},{AUTH_SUPABASE_URL:'https://bad.test'},{AUTH_SUPABASE_URL:'https://user:pass@example-ref.supabase.co'},{AUTH_SUPABASE_PUBLISHABLE_KEY:'sb_secret_forbidden'}])assert.throws(()=>identityConfiguration({BILLING_IDENTITY_MODE:'account',AUTH_SUPABASE_URL:cfg.origin,AUTH_SUPABASE_PUBLISHABLE_KEY:cfg.publicKey,...patch}));
});
test('a new login or changed email preserves the verified user billing ID',async()=>{
 const a=await accountAuthenticator(cfg,async()=>new Response(JSON.stringify(user)))(header);
 const b=await accountAuthenticator(cfg,async()=>new Response(JSON.stringify({...user,email:'changed@example.test'})))('Bearer second.payload.signature');
 assert.equal(a.id,b.id);assert.equal(a.id,stableAccountId(cfg.origin,user.id));assert.notEqual(stableAccountId('https://other.supabase.co',user.id),a.id);
});
test('installation secrets do not substitute for account login',async()=>{
 let calls=0;const auth=accountAuthenticator(cfg,async()=>{calls++;return new Response('{}');});
 for(const token of ['', 'Bearer '+'a'.repeat(43), 'Bearer '+'a'.repeat(9000)])await assert.rejects(auth(token),{code:'SIGN_IN_REQUIRED'});
 assert.equal(calls,0);
});
test('anonymous, unconfirmed, banned and malformed users are rejected',async()=>{
 for(const patch of [{is_anonymous:true},{email_confirmed_at:null},{banned_until:'2999-01-01T00:00:00Z'},{id:'bad'},{aud:'anon'}])await assert.rejects(accountAuthenticator(cfg,async()=>new Response(JSON.stringify({...user,...patch})))(header),{code:'VERIFIED_ACCOUNT_REQUIRED'});
});
test('Auth errors do not reflect private provider bodies',async()=>{
 await assert.rejects(accountAuthenticator(cfg,async()=>new Response('PRIVATE_BODY',{status:401}))(header),e=>e.code==='SIGN_IN_REQUIRED'&&!e.message.includes('PRIVATE_BODY'));
});
test('registration preserves billing fields and omits tokens and email',async()=>{
 const rows=new Map(),store={mutate:async(id,action)=>{const row=structuredClone(rows.get(id)||{}),result=await action(row);rows.set(id,row);return result;}};
 const identity=await accountAuthenticator(cfg,async()=>new Response(JSON.stringify(user)))(header);
 await registerAccount(store,identity);rows.get(identity.id).customerId='cus_existing';await registerAccount(store,identity);
 assert.equal(rows.size,1);assert.equal(rows.get(identity.id).customerId,'cus_existing');assert.ok(!JSON.stringify(rows.get(identity.id)).includes('example.test'));
 rows.get(identity.id).accountDisabled=true;await assert.rejects(registerAccount(store,identity),{code:'ACCOUNT_DISABLED'});
});
