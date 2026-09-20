import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {connectionState} from '../src/connection-flow.js';
const good={ready:true,matchesExtension:true,status:'ready'},admin={user:{email:'owner@example.test'},access:{premium:true,complimentary:true}},subscriber={user:{email:'user@example.test'},access:{premium:true},subscription:{plan:'test_plus'}},free={user:{email:'user@example.test'},access:{premium:false},subscription:{plan:'free'}};
test('a fabricated checkout return never upgrades a Free or signed-out user',()=>{assert.equal(connectionState(free,true,good,true).kind,'payment-pending');assert.equal(connectionState(null,true,good,true).kind,'signed-out');});
test('an administrator or verified subscriber is ready only with a link and matching configured signer',()=>{
 for(const profile of [admin,subscriber]){assert.equal(connectionState(profile,true,good).kind,'ready');assert.equal(connectionState(profile,false,good).kind,'needs-connection');for(const signing of [{ready:false},null,{ready:true,matchesExtension:false,status:'key_mismatch'}])assert.equal(connectionState(profile,true,signing).kind,'setup-required');}
});
test('complimentary access and Free connection have clear distinct statuses',()=>{assert.match(connectionState(admin,true,good).title,/Admin Premium/);assert.match(connectionState(free,true,good).detail,/no second code/);});
test('approval and success helpers are limited to account routes and have an explicit budget',()=>{
 assert.ok(fs.statSync('src/connection-flow.js').size<7000);
 const code=fs.readFileSync('src/connection-flow.js','utf8');assert.doesNotMatch(code,/localStorage|innerHTML|setInterval|chrome-extension:\/\//);assert.match(code,/https:\/\/chatgpt.com\//);assert.match(code,/attempts<3/);
});
