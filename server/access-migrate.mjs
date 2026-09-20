import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
export async function migrateAccess(pool){
 const sql=await fs.readFile(new URL('./migrations/003_owner_devices.sql',import.meta.url),'utf8'),checksum=createHash('sha256').update(sql).digest('hex'),c=await pool.connect();
 try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='10s'");await c.query("SET LOCAL statement_timeout='15s'");await c.query('SELECT pg_advisory_xact_lock(1128546866,3)');
  const before=(await c.query('SELECT checksum FROM public.chatdrobe_billing_schema_migrations WHERE version=$1',['003_owner_devices'])).rows[0];
  if(before&&before.checksum!==checksum)throw new Error('Owner/device migration checksum mismatch.');
  if(!before){await c.query(sql);await c.query('INSERT INTO public.chatdrobe_billing_schema_migrations(version,checksum) VALUES($1,$2)',['003_owner_devices',checksum]);}
  for(const[name,columns]of Object.entries({chatdrobe_owner_bindings:['account_id','credential_version'],chatdrobe_owner_sessions:['token_hash','credential_version'],chatdrobe_extension_devices:['credential_hash','code_hash','account_id','extension_id','owner_version','created_at','expires_at','linked_at','revoked_at','last_seen'],chatdrobe_access_audit:['id','account_id','action','created_at']})){
   const r=await c.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['public',name]);if(!columns.every(k=>r.rows.some(x=>x.column_name===k)))throw new Error('Owner/device schema mismatch.');
  }
  await c.query('COMMIT');return {version:'003_owner_devices',applied:!before};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}
