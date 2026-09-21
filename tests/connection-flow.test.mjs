import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {connectionState,linkCode,linkFragment,authLink} from '../src/connection-flow.js';
const good={ready:true,matchesExtension:true,status:'ready'},admin={user:{email:'owner@example.test'},access:{premium:true,complimentary:true}},subscriber={user:{email:'user@example.test'},access:{premium:true},subscription:{plan:'test_plus'}},free={user:{email:'user@example.test'},access:{premium:false},subscription:{plan:'free'}};
test('a fabricated checkout return never upgrades a Free or signed-out user',()=>{assert.equal(connectionState(free,true,good,true).kind,'payment-pending');assert.equal(connectionState(null,true,good,true).kind,'signed-out');});
test('an old linked device cannot imply this installation is ready',()=>{
 for(const profile of [admin,subscriber]){
  assert.equal(connectionState(profile,true,good).kind,'needs-connection');assert.equal(connectionState(profile,false,good).kind,'needs-connection');
  assert.match(connectionState(profile,true,good).detail,/Other linked installations do not confirm this browser/);
  for(const signing of [{ready:false},null,{ready:true,matchesExtension:false,status:'key_mismatch'}])assert.equal(connectionState(profile,true,signing).kind,'setup-required');
 }
});
test('fresh approval confirms only the account side, never visible extension output',()=>{
 for(const profile of [admin,subscriber]){const result=connectionState(profile,true,good,false,false,true);assert.equal(result.kind,'needs-extension-check');assert.match(result.detail,/cannot confirm the installed extension or page state/);assert.doesNotMatch(result.title,/ready/i);}
});
test('complimentary access and Free connection have clear distinct statuses',()=>{assert.match(connectionState(admin,true,good).title,/Admin Premium/);assert.match(connectionState(free,true,good).detail,/no second code/);});
test('approval and success helpers are limited to account routes and have an explicit budget',()=>{
 assert.ok(fs.statSync('src/connection-flow.js').size<8500);
 const code=fs.readFileSync('src/connection-flow.js','utf8');assert.doesNotMatch(code,/localStorage|innerHTML|setInterval|chrome-extension:\/\//);assert.match(code,/https:\/\/chatgpt.com\//);assert.match(code,/attempts<3/);
});
test('failed fresh payment verification cannot present cached Premium as completed checkout',()=>{assert.equal(connectionState(subscriber,true,good,true,true,true).kind,'payment-pending');assert.equal(connectionState(admin,true,good,true,true,true).kind,'needs-extension-check');});
test('pending approval survives sign-in and signup navigation only as a validated fragment',()=>{
 const code='ABCDE-12345-ABCDE-12345',hash='#link='+code;
 for(const route of ['/signin/','/signup/']){assert.equal(authLink(route,'?next=account',hash),route+'?next=account'+hash);assert.equal(authLink(route,'?next=admin',hash),route+'?next=admin'+hash);assert.equal(authLink(route,'?next=https://attacker.test',hash),route+hash);}
 assert.equal(linkCode(hash),code);assert.equal(linkFragment('#ignored=value&link='+code),hash);
 for(const invalid of ['#link=short','#link='+code+'%0A','#link=<script>','#link=javascript:alert(1)','#link='+code.toLowerCase()]){assert.equal(linkCode(invalid),'');assert.equal(authLink('/signin/','?next=account',invalid),'/signin/?next=account');}
 assert.throws(()=>authLink('https://attacker.test/','',hash),/Unsupported/);
});

test('a cached subscription label cannot override a server denial of Premium access',()=>{assert.equal(connectionState({...subscriber,access:{premium:false}},true,good).kind,'choose-plan');});
