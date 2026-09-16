import {databaseProbe} from './database-readiness.mjs';
const result=await databaseProbe()();
console.log(JSON.stringify(result));
if(!result.schemaReady)process.exitCode=1;
