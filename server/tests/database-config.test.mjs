import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseUrl,hasDatabase,poolConfiguration,productionDatabaseRelease} from '../database-config.mjs';
const direct='postgresql://example_user:fixture_only@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const pooled=direct.replace('ep-example.','ep-example-pooler.');
test('DATABASE_URL works without a duplicate billing variable; legacy configurations remain supported',()=>{
 assert.ok(hasDatabase({DATABASE_URL:direct}));assert.ok(!hasDatabase({}));
 assert.equal(databaseUrl({DATABASE_URL:direct}),direct);assert.equal(databaseUrl({BILLING_DATABASE_URL:direct}),direct);
 assert.equal(databaseUrl({DATABASE_URL:direct,BILLING_DATABASE_URL:direct}),direct);assert.throws(()=>databaseUrl({}));
});
test('conflicting URLs fail closed without leaking values',()=>{
 assert.throws(()=>databaseUrl({DATABASE_URL:direct,BILLING_DATABASE_URL:pooled}),e=>!e.message.includes('fixture_only')&&!e.message.includes('ep-example'));
});
test('Neon direct and pooled endpoints are supported without silently rewriting targets',()=>{
 assert.equal(databaseUrl({DATABASE_URL:pooled}),pooled);
 assert.equal(databaseUrl({DATABASE_URL:pooled,DATABASE_URL_UNPOOLED:direct},{migration:true}),direct);
 assert.throws(()=>databaseUrl({DATABASE_URL:pooled,DATABASE_URL_UNPOOLED:direct.replace('ep-example.','ep-other.')},{migration:true}));
 assert.throws(()=>databaseUrl({DATABASE_URL:pooled,DATABASE_URL_UNPOOLED:direct.replace('/neondb','/different')},{migration:true}));
});
test('TLS validates certificates and channel binding is explicitly negotiated by pg',()=>{
 const options=poolConfiguration(direct,{env:{VERCEL:'1'}});
 assert.equal(options.ssl.rejectUnauthorized,true);assert.equal(options.ssl.minVersion,'TLSv1.2');
 assert.equal(options.enableChannelBinding,true);assert.equal(options.max,3);
 assert.ok(!options.connectionString.includes('sslmode'));assert.ok(!options.connectionString.includes('channel_binding'));
 assert.ok(options.connectionTimeoutMillis<=10000);assert.ok(options.statement_timeout<=15000);
});
test('URL options cannot turn off remote TLS or override host/credentials/connection settings',()=>{
 for(const value of [direct.replace('sslmode=require','sslmode=disable'),direct+'&host=evil.example',direct+'&password=changed',direct+'&ssl=0',direct+'&sslrootcert=/private/path'])assert.throws(()=>poolConfiguration(value));
 for(const value of ['not-a-url','file:///etc/passwd','https://database.example/db','postgresql:///db',direct+'#fragment'])assert.throws(()=>databaseUrl({DATABASE_URL:value}));
});
test('local PostgreSQL is allowed for isolated CI but never from a Vercel function',()=>{
 const value='postgresql://postgres:fixture@127.0.0.1:5432/test';
 assert.equal(poolConfiguration(value,{env:{}}).ssl,false);assert.throws(()=>poolConfiguration(value,{env:{VERCEL:'1'}}));
});
test('only this repository production main deployment may run the approved initial schema job',()=>{
 const env={VERCEL:'1',VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main',VERCEL_GIT_REPO_OWNER:'onjoroge1',VERCEL_GIT_REPO_SLUG:'ChatDrobe'};
 assert.equal(productionDatabaseRelease(env),true);assert.equal(productionDatabaseRelease({}),false);
 for(const patch of [{VERCEL_ENV:'preview'},{VERCEL_GIT_COMMIT_REF:'billing/neon-database'},{VERCEL_GIT_REPO_SLUG:'another-app'},{VERCEL_GIT_REPO_OWNER:'someoneelse'},{VERCEL:''}])assert.equal(productionDatabaseRelease({...env,...patch}),false);
});
