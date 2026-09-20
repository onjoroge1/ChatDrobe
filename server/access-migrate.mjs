import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
async function schemaReady(c){
 const tables={chatdrobe_owner_bindings:{account_id:['uuid',true],credential_version:['text',true]},chatdrobe_owner_sessions:{token_hash:['text',true],credential_version:['text',true]},chatdrobe_extension_devices:{credential_hash:['text',true],code_hash:['text',true],extension_id:['text',true],account_id:['uuid',false],owner_version:['text',false],created_at:['timestamp with time zone',true],expires_at:['timestamp with time zone',true],linked_at:['timestamp with time zone',false],revoked_at:['timestamp with time zone',false],last_seen:['timestamp with time zone',false]},chatdrobe_access_audit:{id:['bigint',true],account_id:['uuid',false],action:['text',true],created_at:['timestamp with time zone',true]}};
 const names=Object.keys(tables),cols=(await c.query("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])",[names])).rows;
 for(const [table,spec]of Object.entries(tables))for(const[name,[type,required]]of Object.entries(spec))if(!cols.some(x=>x.table_name===table&&x.column_name===name&&x.data_type===type&&x.is_nullable===(required?'NO':'YES')))return false;
 const constraints=(await c.query("SELECT c.relname,k.contype,pg_get_constraintdef(k.oid) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[])",[names])).rows;
 const required=[['chatdrobe_owner_bindings','p','PRIMARY KEY (account_id)'],['chatdrobe_owner_sessions','p','PRIMARY KEY (token_hash)'],['chatdrobe_extension_devices','p','PRIMARY KEY (credential_hash)'],['chatdrobe_extension_devices','u','UNIQUE (code_hash)'],['chatdrobe_access_audit','p','PRIMARY KEY (id)']];
 for(const [table,type,definition]of required)if(!constraints.some(x=>x.relname===table&&x.contype===type&&x.definition===definition))return false;
 for(const [table,column,target,key,suffix]of [['chatdrobe_owner_bindings','account_id','chatdrobe_accounts','id',''],['chatdrobe_owner_sessions','token_hash','chatdrobe_sessions','token_hash',' ON DELETE CASCADE'],['chatdrobe_extension_devices','account_id','chatdrobe_accounts','id',''],['chatdrobe_access_audit','account_id','chatdrobe_accounts','id','']]){
  if(!constraints.some(x=>x.relname===table&&x.contype==='f'&&x.definition.replace('REFERENCES public.','REFERENCES ')===`FOREIGN KEY (${column}) REFERENCES ${target}(${key})${suffix}`))return false;
 }
 const exposed=(await c.query('SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE n.nspname=$1 AND c.relname=ANY($2::text[]) AND a.grantee=0',['public',names])).rows[0].n;
 return exposed===0;
}
export async function migrateAccess(pool){
 const sql=await fs.readFile(new URL('./migrations/003_owner_devices.sql',import.meta.url),'utf8'),checksum=createHash('sha256').update(sql).digest('hex'),c=await pool.connect();
 try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='10s'");await c.query("SET LOCAL statement_timeout='15s'");await c.query('SELECT pg_advisory_xact_lock(1128546866,3)');
  const before=(await c.query('SELECT checksum FROM public.chatdrobe_billing_schema_migrations WHERE version=$1',['003_owner_devices'])).rows[0];
  if(before&&before.checksum!==checksum)throw new Error('Owner/device migration checksum mismatch.');
  if(!before){await c.query(sql);await c.query('INSERT INTO public.chatdrobe_billing_schema_migrations(version,checksum) VALUES($1,$2)',['003_owner_devices',checksum]);}
  if(!await schemaReady(c))throw new Error('Owner/device schema contract mismatch.');
  await c.query('COMMIT');return {version:'003_owner_devices',applied:!before};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}
