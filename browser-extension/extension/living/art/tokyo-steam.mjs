/* ChatDrobe original keyframed artwork, CC0-1.0. No fonts, images, audio or expressions.
 * Coordinate space 52x64, designed for the Tokyo desk cup. This is the pilot data,
 * not a claim that lottie-web includes an artwork collection. */
const ease={i:{x:[0.65],y:[1]},o:{x:[0.35],y:[0]}};
function plume(index,x,delay){
 return {ddd:0,ind:index,ty:4,nm:'Tea steam '+index,sr:1,ip:0,op:240,st:0,bm:0,
  ks:{a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]},r:{a:0,k:0},
   p:{a:1,k:[{t:0,s:[x,0,0],e:[x+2,-7,0],...ease},{t:120,s:[x+2,-7,0],e:[x,0,0],...ease},{t:240,s:[x,0,0]}]},
   o:{a:1,k:[{t:0,s:[delay?13:30],e:[delay?32:13],...ease},{t:120,s:[delay?32:13],e:[delay?13:30],...ease},{t:240,s:[delay?13:30]}]}},
  shapes:[{ty:'gr',nm:'Soft steam',it:[
   {ty:'sh',ks:{a:0,k:{i:[[0,0],[-7,5],[5,5]],o:[[-6,-6],[7,-5],[0,0]],v:[[0,59],[0,43],[0,27]],c:false}},nm:'Steam curve'},
   {ty:'st',c:{a:0,k:[0.96,0.89,0.79,1]},o:{a:0,k:100},w:{a:0,k:2.2},lc:2,lj:2,bm:0,nm:'Cream stroke'},
   {ty:'tr',p:{a:0,k:[0,0]},a:{a:0,k:[0,0]},s:{a:0,k:[100,100]},r:{a:0,k:0},o:{a:0,k:100},sk:{a:0,k:0},sa:{a:0,k:0}}
  ]}]
 };
}
export const TOKYO_STEAM={v:'5.13.0',fr:30,ip:0,op:240,w:52,h:64,nm:'ChatDrobe Tokyo tea steam',ddd:0,assets:[],layers:[plume(1,14,false),plume(2,29,true)]};
