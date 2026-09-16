import {AccountError} from './accounts-policy.mjs';
/** Codes are sent only on request. Never log or echo them in HTTP responses. */
export function codeMailer(config,fetcher=fetch){return async function send({email,code,requestId}){
 if(!config.emailReady)throw new AccountError('EMAIL_NOT_READY','Email verification is not configured yet. No code was sent.',503);
 let response;try{response=await fetcher('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+config.emailKey,'Content-Type':'application/json','Idempotency-Key':'chatdrobe-login/'+requestId},body:JSON.stringify({from:config.emailFrom,to:[email],subject:'Your ChatDrobe sign-in code',text:`Your ChatDrobe verification code is ${code}.\n\nEnter it in the browser where you requested it. It expires in 10 minutes and works once.\n\nThis code creates or signs into your ChatDrobe account; it does not purchase a subscription. Never share it. Ignore this message if you did not request it.`})});}catch{throw new AccountError('EMAIL_UNAVAILABLE','Unable to send a verification code. Please try again later.',503);}
 if(!response.ok)throw new AccountError('EMAIL_UNAVAILABLE','Unable to send a verification code. Please try again later.',503);return {sent:true};
};}
