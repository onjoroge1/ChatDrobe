import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SCHEMA_VERSION,schemaReady} from './database-schema.mjs';
const FILE=new URL('./migrations/001_billing.sql',import.meta.url);
/** Only the reviewed initial billing migration is enabled; future files are not auto-discovered. */
export async function migrateDatabase(pool,{read=()=>fs.readFile(FILE,'utf8')}={}) {
  const sql=await read(), trimmed=sql.trim();
  if(!/^BEGIN;[\s\S]*COMMIT;$/.test(trimmed))throw new Error('Unexpected billing migration format.');
  const checksum=createHash('sha256').update(sql).digest('hex');
  const body=trimmed.slice('BEGIN;'.length,-'COMMIT;'.length);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query('SET LOCAL search_path TO public');
    await client.query('SELECT pg_advisory_xact_lock(1128546866,1)');
    await client.query(`CREATE TABLE IF NOT EXISTS public.chatdrobe_billing_schema_migrations (
      version TEXT PRIMARY KEY, checksum TEXT NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const previous=await client.query('SELECT checksum FROM public.chatdrobe_billing_schema_migrations WHERE version=$1',[SCHEMA_VERSION]);
    if(previous.rowCount && previous.rows[0].checksum!==checksum)throw new Error('Applied billing migration checksum changed; review required.');
    if(!previous.rowCount){
      await client.query(body);
      await client.query('INSERT INTO public.chatdrobe_billing_schema_migrations (version,checksum) VALUES ($1,$2)',[SCHEMA_VERSION,checksum]);
    }
    // Only our four tables. Do not touch other applications, users, schemas or role privileges.
    await client.query(`REVOKE ALL ON TABLE public.chatdrobe_billing_installs, public.chatdrobe_billing_events,
      public.chatdrobe_billing_limits, public.chatdrobe_billing_schema_migrations FROM PUBLIC`);
    if(!await schemaReady(client))throw new Error('Billing schema does not match the supported contract.');
    await client.query('COMMIT');
    return {version:SCHEMA_VERSION,applied:previous.rowCount===0,ready:true};
  } catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
}
