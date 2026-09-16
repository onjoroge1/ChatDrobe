import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {databaseUrl} from './database-config.mjs';
import {connectStore} from './pg-store.mjs';
import {migrateDatabase} from './database-migrations.mjs';
export async function runMigration(env=process.env) {
  const {pool}=await connectStore(databaseUrl(env,{migration:true}));
  try{return await migrateDatabase(pool);}finally{await pool.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{const result=await runMigration();console.log(`[database] ${result.version}: ${result.applied?'applied':'already applied'}; schema ready.`);}
  catch{console.error('[database] Migration failed. Verify server environment, database reachability and schema permissions. No credentials are printed.');process.exitCode=1;}
}
