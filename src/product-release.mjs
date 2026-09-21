import fs from 'node:fs';
/** Product copy follows the same version as the packaged extension. */
export const extensionVersion=JSON.parse(fs.readFileSync(new URL('../release.json',import.meta.url),'utf8')).extension.version;
