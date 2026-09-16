import {databaseUrl,hasDatabase} from './database-config.mjs';
import {schemaReady} from './database-schema.mjs';
const connectStore=async target=>(await import('./pg-store.mjs')).connectStore(target);
/** Cached, coalesced SELECT-only probe. No SQL, host, users, row counts or credentials in JSON. */
export function databaseProbe({env=process.env,connect=connectStore,now=Date.now,ttl=60000}={}) {
  let cached,expires=0,pending;
  const base={configured:false,connected:false,schemaReady:false};
  async function check(){
    if(!hasDatabase(env))return {...base,status:'not_configured'};
    let target;
    try{target=databaseUrl(env);}catch{return {...base,configured:true,status:'configuration_error'};}
    let pool,client,connected=false;
    try{
      ({pool}=await connect(target));
      client=await pool.connect();
      await client.query('BEGIN READ ONLY');connected=true;
      await client.query("SET LOCAL statement_timeout = '5s'");
      await client.query('SET LOCAL search_path TO public');
      const ready=await schemaReady(client);
      await client.query('COMMIT');
      return {configured:true,connected:true,schemaReady:ready,status:ready?'ready':'schema_pending'};
    }catch{
      if(client)await client.query('ROLLBACK').catch(()=>{});
      return {configured:true,connected,schemaReady:false,status:connected?'schema_unavailable':'unavailable'};
    }finally{client?.release();if(pool)await pool.end().catch(()=>{});}
  }
  return async()=>{
    if(cached&&now()<expires)return {...cached};
    if(!pending)pending=check().then(value=>{cached=value;expires=now()+ttl;return value;}).finally(()=>{pending=null;});
    return {...await pending};
  };
}
