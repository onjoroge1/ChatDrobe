import {pathToFileURL} from 'node:url';import path from 'node:path';
import {runMigration} from './migrate.mjs';import {migrateAccounts} from './accounts-migrate.mjs';import {migrateAccess} from './access-migrate.mjs';import {connectStore} from './pg-store.mjs';import {productionDatabaseRelease,databaseUrl} from './database-config.mjs';
export async function runAccountMigration(env=process.env){const{pool}=await connectStore(databaseUrl(env,{migration:true}));try{return await migrateAccounts(pool);}finally{await pool.end();}}
export async function runAccessMigration(env=process.env){const{pool}=await connectStore(databaseUrl(env,{migration:true}));try{return await migrateAccess(pool);}finally{await pool.end();}}
export async function deployDatabase({env=process.env,migrate=runMigration,accounts=runAccountMigration,access=runAccessMigration,log=console.log}={}){
 if(!productionDatabaseRelease(env)){log('[database] Preview/local build: no schema writes.');return {skipped:true};}
 const result=await migrate(env);log(`[database] ${result.version}: ${result.applied?'applied':'already applied'}; schema ready. Payments unchanged.`);
 const accountResult=await accounts(env);log(`[accounts] ${accountResult.version}: ${accountResult.applied?'applied':'already applied'}; schema ready.`);
 const accessResult=await access(env);log(`[access] ${accessResult.version}: ${accessResult.applied?'applied':'already applied'}; owner credentials and explicit linking still required.`);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{await deployDatabase();}catch{console.error('[database] Production schema setup failed. Deployment stopped. No credentials are printed.');process.exitCode=1;}}
