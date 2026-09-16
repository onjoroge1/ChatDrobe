import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {runMigration} from './migrate.mjs';
import {productionDatabaseRelease} from './database-config.mjs';
/** Release job for the user's approved initial schema. Never runs via an HTTP request. */
export async function deployDatabase({env=process.env,migrate=runMigration,log=console.log}={}){
  if(!productionDatabaseRelease(env)){log('[database] Preview/local build: no schema writes.');return {skipped:true};}
  // Only additive initial migration 001 is approved here; new schema work requires review.
  const result=await migrate(env);
  log(`[database] ${result.version}: ${result.applied?'applied':'already applied'}; schema ready. Payments unchanged.`);
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{await deployDatabase();}catch{
    console.error('[database] Production schema setup failed. Deployment stopped; previous deployment remains available. Check DATABASE_URL and permissions in server settings.');
    process.exitCode=1;
  }
}
