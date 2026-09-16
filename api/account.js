import {createAccountHandler} from '../server/accounts-http.mjs';
import {accountRuntime} from '../server/accounts-runtime.mjs';
export const config={api:{bodyParser:false}};
export default createAccountHandler(accountRuntime);
