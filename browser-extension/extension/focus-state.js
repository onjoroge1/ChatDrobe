/* One local wall-clock focus session. Aggregate counts are not measured productivity. */
(function(root){'use strict';
 function normalize(v={}){v=v&&typeof v==='object'?v:{};const f=v.session;const session=f&&typeof f.id==='string'&&f.id.length<=100&&Number.isFinite(f.start)&&Number.isFinite(f.end)&&f.end>f.start&&f.end-f.start<=10800000&&['running','complete','cancelled'].includes(f.status)?{id:f.id,start:f.start,end:f.end,status:f.status}:null;return {session,completed:Number.isSafeInteger(v.completed)?Math.max(0,Math.min(100000,v.completed)):0,minutes:Number.isFinite(v.minutes)?Math.max(0,Math.min(18000000,v.minutes)):0};}
 function settle(raw,now){const v=normalize(raw);if(v.session?.status==='running'&&v.session.end<=now){v.session.status='complete';v.completed=Math.min(100000,v.completed+1);v.minutes=Math.min(18000000,v.minutes+Math.round((v.session.end-v.session.start)/60000));}return v;}
 function start(raw,end,now,id){const v=settle(raw,now);if(!Number.isFinite(end)||end-now<60000||end-now>10800000)throw new Error('Choose a focus session between 1 and 180 minutes.');v.session={id:String(id).slice(0,100),start:now,end,status:'running'};return v;}
 function cancel(raw,now){const v=settle(raw,now);if(v.session?.status==='running')v.session.status='cancelled';return v;}
 const api={normalize,settle,start,cancel};if(typeof module!=='undefined')module.exports=api;root.ChatDrobeFocus=api;
})(globalThis);
