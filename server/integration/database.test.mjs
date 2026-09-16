import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {randomBytes} from 'node:crypto';
import {connectStore} from '../pg-store.mjs';import {migrateDatabase} from '../database-migrations.mjs';
import {schemaReady} from '../database-schema.mjs';import {databaseProbe} from '../database-readiness.mjs';
const original=await fs.readFile(new URL('../migrations/001_billing.sql',import.meta.url),'utf8');
async function isolated(t){
 const value=process.env.BILLING_DATABASE_URL||process.env.DATABASE_URL;
 if(!value)throw new Error('Use the isolated PostgreSQL CI service.');
 const u=new URL(value);
 // This suite creates/drops only random databases on the disposable localhost CI service.
 if(!['localhost','127.0.0.1'].includes(u.hostname))throw new Error('Refusing database tests against a remote host.');
 const admin=await connectStore(value),name='cd_fixture_'+randomBytes(10).toString('hex');
 await admin.pool.query(`CREATE DATABASE ${name}`);u.pathname='/'+name;
 const connection=await connectStore(u.href);
 t.after(async()=>{await connection.pool.end();await admin.pool.query(`DROP DATABASE ${name} WITH (FORCE)`);await admin.pool.end();});
 return {...connection,url:u.href};
}
test('real PostgreSQL: empty DB, concurrent schema setup, idempotent rerun and readonly readiness',async t=>{
 const {pool,url}=await isolated(t);assert.equal(await schemaReady(pool),false);
 const results=await Promise.all([migrateDatabase(pool),migrateDatabase(pool)]);
 assert.equal(results.filter(x=>x.applied).length,1);assert.equal(results.filter(x=>!x.applied).length,1);
 assert.equal(await schemaReady(pool),true);
 const history=await pool.query('SELECT version,checksum FROM public.chatdrobe_billing_schema_migrations');assert.equal(history.rowCount,1);assert.equal(history.rows[0].version,'001_billing');
 const ready=await databaseProbe({env:{DATABASE_URL:url}})();
 assert.deepEqual(ready,{configured:true,connected:true,schemaReady:true,status:'ready'});
 const publicAcl=await pool.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
 LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
 WHERE n.nspname='public' AND c.relname LIKE 'chatdrobe_billing_%' AND a.grantee=0`);
 assert.equal(publicAcl.rowCount,0);
});
test('real PostgreSQL: adopting the original pilot schema preserves existing records and rejects checksum changes',async t=>{
 const {pool}=await isolated(t);await pool.query(original);
 const id='a'.repeat(64);await pool.query('INSERT INTO public.chatdrobe_billing_installs (id,state) VALUES ($1,$2)',[id,{sentinel:'preserve-me',customerId:'cus_fixture'}]);
 assert.equal((await migrateDatabase(pool)).applied,true);assert.equal((await migrateDatabase(pool)).applied,false);
 assert.equal((await pool.query('SELECT state FROM public.chatdrobe_billing_installs WHERE id=$1',[id])).rows[0].state.sentinel,'preserve-me');
 await assert.rejects(migrateDatabase(pool,{read:async()=>original.replace('BEGIN;','BEGIN;\n-- changed checksum')}),/checksum changed/);
 assert.equal(await schemaReady(pool),true);
});
test('real PostgreSQL: incompatible pre-existing schema rolls the entire migration back without destructive repair',async t=>{
 const {pool}=await isolated(t);
 await pool.query('CREATE TABLE public.chatdrobe_billing_installs(id TEXT PRIMARY KEY,state TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL)');
 await assert.rejects(migrateDatabase(pool));
 const result=await pool.query("SELECT to_regclass('public.chatdrobe_billing_schema_migrations') AS history, to_regclass('public.chatdrobe_billing_events') AS events");
 assert.equal(result.rows[0].history,null);assert.equal(result.rows[0].events,null);
 assert.equal((await pool.query("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='chatdrobe_billing_installs' AND column_name='state'")).rows[0].data_type,'text');
});
