import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {accountSchemaReady} from './accounts-schema.mjs';
export async function migrateAccounts(pool){
 const sql=await fs.readFile(new URL('./migrations/002_accounts.sql',import.meta.url),'utf8'),checksum=createHash('sha256').update(sql).digest('hex'),c=await pool.connect();
 try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='10s'");await c.query("SET LOCAL statement_timeout='15s'");await c.query('SELECT pg_advisory_xact_lock(1128546866,2)');
  const previous=(await c.query('SELECT checksum FROM public.chatdrobe_billing_schema_migrations WHERE version=$1',['002_accounts'])).rows[0];
  if(previous&&previous.checksum!==checksum)throw new Error('Account migration checksum mismatch.');
  if(!previous){await c.query(sql);await c.query('INSERT INTO public.chatdrobe_billing_schema_migrations(version,checksum) VALUES($1,$2)',['002_accounts',checksum]);}
  if(!await accountSchemaReady(c))throw new Error('Account schema contract mismatch.');await c.query('COMMIT');return {version:'002_accounts',applied:!previous};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}
