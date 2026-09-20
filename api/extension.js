import {createExtensionHandler} from '../server/extension-http.mjs';
import {accountRuntime} from '../server/accounts-runtime.mjs';
export const config={api:{bodyParser:false}};
export default createExtensionHandler(accountRuntime);
