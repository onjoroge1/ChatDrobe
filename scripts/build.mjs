// Preserve the existing static-site build and apply the reviewed account-link UI layer.
import './build-site.mjs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {buildContext} from './build-contract.mjs';import {installLinkUi} from './link-ui-build.mjs';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),context=buildContext(root);
installLinkUi(root,context.output);
console.log('[accounts] Owner sign-in and explicit extension-link controls added. No credentials are embedded.');
