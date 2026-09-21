import {validateWorld} from './model.mjs';
/* Bundled vector layer vocabulary. No innerHTML, external assets, canvas loop or script rules. */
const NS='http://www.w3.org/2000/svg';
function svgNode(doc,tag,attrs={},children=[]){const n=doc.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));n.append(...children);return n;}
export const SCENE_CSS=`
:host{display:block;contain:layout style paint;pointer-events:none!important;user-select:none!important;overflow:hidden;isolation:isolate}
*{box-sizing:border-box;pointer-events:none!important} .room{width:100%;height:100%;overflow:hidden;position:relative;border-radius:inherit;background:#dde7e8;--sky:#c4dce1;--sky-low:#f8debd;--wall:#f2e5d3;--wood:#8c6049;--far:#718f9b;--near:#334e64;--grass:#789477;--field:#718b69;--sun:#f5c56e;--glow:#ffdf91;--frame:#b0977e;--pane:#f9f2e6;--star-opacity:0;--window-light:.15}
.room[data-light=night]{--sky:#101c38;--sky-low:#47576b;--wall:#302b37;--wood:#624858;--far:#39496a;--near:#22314d;--grass:#405555;--sun:#f4e2b4;--frame:#766578;--pane:#403749;--star-opacity:.9;--window-light:.9}
.room[data-light=dusk]{--sky:#a393b0;--sky-low:#f0b58d;--wall:#e6c7b4;--wood:#936459;--far:#897d99;--near:#554c71;--grass:#868876;--frame:#9b817b;--pane:#f1dcc7;--star-opacity:.3;--window-light:.5}
.room[data-world=starship]{--wall:#dbe7ef;--frame:#91abc2;--pane:#eff6fb;--near:#244960;--sky:#112944;--sky-low:#385c7c;--star-opacity:.85}.room[data-world=starship][data-light=night]{--wall:#172c41;--frame:#46627e;--pane:#233c54;--sky:#081321;--sky-low:#223551}
svg{display:block;width:100%;height:100%}.windows{opacity:var(--window-light)}.stars{opacity:var(--star-opacity)}.room .sun{fill:var(--sun)}.room .sky{fill:url(#cd-sky)}
.caption{position:absolute;inset:auto 12px 10px;font:10px/1.45 system-ui;letter-spacing:.12em;color:#f7f2e8;text-transform:uppercase;display:flex;justify-content:space-between;gap:12px}.caption span{padding:5px 8px;border-radius:5px;background:#152434d9}.caption .arrival{display:none;background:#3d604ee6}.room[data-arrived=true] .caption .arrival{display:inline}.room[data-arrived=true] .caption .phase{display:none}
.weather{opacity:0;visibility:hidden}.room[data-weather=rain] .rain,.room[data-weather=snow] .snow,.room[data-weather=fog] .fog,.room[data-weather=aurora] .aurora{opacity:1;visibility:visible}.rain{stroke:#ecf6f7;stroke-width:1.8;opacity:.45}.snow{fill:#fffaf1}.fog{fill:#e2eef0;opacity:.35}.aurora{fill:none;stroke:#92dabd;stroke-width:48;opacity:.3}
.lamp-glow{opacity:0;fill:#ffe4a25c}.room[data-lamp=true] .lamp-glow{opacity:1}.signal{fill:#9cd8c9}.eyes-sleep{display:none}.room[data-idle=true] .eyes-open{display:none}.room[data-idle=true] .eyes-sleep{display:inline}
.traffic,.craft,.rain,.snow,.landscape-move,.planet-turn,.drone,.aurora{transform-box:fill-box;transform-origin:center;animation-play-state:paused!important}
.room[data-motion=true][data-active=true] .traffic{animation:cd-traffic 32s linear infinite;animation-play-state:running!important}
.room[data-motion=true][data-active=true] .rain{animation:cd-rain 2.8s linear infinite;animation-play-state:running!important}
.room[data-motion=true][data-active=true] .snow{animation:cd-snow 22s linear infinite;animation-play-state:running!important}
.room[data-motion=true][data-active=true] .landscape-move{animation:cd-hills 65s linear infinite alternate;animation-play-state:running!important}
.room[data-motion=true][data-active=true] .planet-turn{animation:cd-planet 160s linear infinite alternate;animation-play-state:running!important}
.room[data-motion=true][data-active=true] .craft{animation:cd-craft 65s ease-in-out infinite;animation-play-state:running!important}
.room[data-motion=true][data-active=true] .drone{animation:cd-hover 9s ease-in-out infinite;animation-play-state:running!important}
.room[data-motion=true][data-active=true] .aurora{animation:cd-aurora 36s ease-in-out infinite alternate;animation-play-state:running!important}
.room[data-streaming=true][data-motion=true][data-active=true] .signal{animation:cd-signal 2s ease-in-out infinite}
.room[data-focused=true][data-quiet=true] .traffic,.room[data-focused=true][data-quiet=true] .craft,.room[data-focused=true][data-quiet=true] .drone,.room[data-focused=true][data-quiet=true] .rain,.room[data-focused=true][data-quiet=true] .snow,.room[data-focused=true][data-quiet=true] .landscape-move,.room[data-focused=true][data-quiet=true] .planet-turn,.room[data-focused=true][data-quiet=true] .aurora{animation-play-state:paused!important;opacity:.35}
.room[data-active=false] *, .room[data-motion=false] *{animation-play-state:paused!important}.room[data-idle=true] .drone{animation-play-state:paused!important}
.room[data-stage="1"]{--far:#7b9a96;--grass:#99ad78}.room[data-world=starship][data-stage="1"] .planet-disc{fill:#cbd1d2}.room[data-world=starship][data-stage="1"] .continents{opacity:.13}.room[data-world=starship][data-stage="2"] .planet-disc{fill:#827b78}.room[data-world=starship][data-stage="2"] .continents{opacity:.2}.room[data-world=starship][data-stage="3"] .planet-disc{fill:#d5ae85}.room[data-world=starship][data-stage="3"] .continents{fill:#aa785d;opacity:.5}.room[data-world=starship][data-stage="4"] .planet{opacity:.1}.asteroids,.moon-craters,.jupiter-bands{display:none}.room[data-stage="2"] .asteroids,.room[data-stage="1"] .moon-craters,.room[data-stage="3"] .jupiter-bands{display:inline}.room[data-stage="2"] .planet{opacity:.35}.room[data-world=train][data-stage="0"] .mountains{opacity:.2}.room[data-world=train]:not([data-stage="0"]) [data-layer="city"]{display:none}.room[data-world=train][data-stage="1"] .mountains{opacity:.15}.room[data-world=train][data-stage="3"]{--grass:#dce6e3;--field:#c8d8d5;--far:#91a7ad;--near:#64858e}.room[data-world=train][data-stage="4"]{--sky:#998fb6;--sky-low:#f3c291;--grass:#9a937b}.room[data-world=tokyo][data-stage="3"] .windows{opacity:.9}
@keyframes cd-traffic{0%,10%{transform:translateX(-140px)}85%,100%{transform:translateX(690px)}}
@keyframes cd-rain{from{transform:translateY(-30px)}to{transform:translateY(45px)}}
@keyframes cd-snow{from{transform:translate(0,-50px)}to{transform:translate(20px,80px)}}
@keyframes cd-hills{from{transform:translateX(0)}to{transform:translateX(-100px)}}
@keyframes cd-planet{from{transform:translateX(-10px) rotate(-5deg)}to{transform:translateX(10px) rotate(6deg)}}
@keyframes cd-craft{0%,60%{transform:translate(-160px,10px);opacity:0}65%{opacity:1}90%{opacity:1}100%{transform:translate(700px,-70px);opacity:0}}
@keyframes cd-hover{50%{transform:translateY(-7px)}}@keyframes cd-aurora{to{transform:translateX(30px) rotate(4deg);opacity:.2}}@keyframes cd-signal{50%{opacity:.3}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
export function createScene(doc,definition){
 const w=validateWorld(definition),room=doc.createElement('div');room.className='room';room.dataset.world=w.id;
 const n=(tag,attrs={},...children)=>svgNode(doc,tag,attrs,children.flat());
 const root=n('svg',{viewBox:'0 0 1000 660',preserveAspectRatio:'xMidYMid slice','aria-hidden':'true'});
 // SVG IDs are scoped to a dedicated ShadowRoot in both extension and website mounts.
 const defs=n('defs',{},n('linearGradient',{id:'cd-sky',x1:0,y1:0,x2:0,y2:1},n('stop',{offset:0,'stop-color':'var(--sky)'}),n('stop',{offset:1,'stop-color':'var(--sky-low)'})),n('clipPath',{id:'cd-view'},n('rect',{x:38,y:28,width:924,height:445,rx:w.id==='starship'?95:22})),n('clipPath',{id:'cd-planet'},n('circle',{cx:735,cy:184,r:99})));
 root.append(defs,n('rect',{width:1000,height:660,fill:'var(--wall)'}));
 const view=n('g',{'clip-path':'url(#cd-view)'});root.append(view);
 const front=n('g');
 function layer(kind){
 const g=n('g',{'data-layer':kind});
 if(kind==='sky'){g.append(n('rect',{width:1000,height:490,class:'sky'}),n('circle',{cx:735,cy:107,r:44,class:'sun'}));}
 if(kind==='city'){
  const far=n('g',{fill:'var(--far)'}),near=n('g',{fill:'var(--near)'}),lights=n('g',{class:'windows',fill:'#ffd99c'});
  for(let i=0;i<12;i++){const x=15+i*85,h=90+((i*47)%160);far.append(n('rect',{x,y:358-h,width:69,height:h+88,rx:3}));}
  for(let i=0;i<9;i++){const x=10+i*124,h=75+(i*31%110);near.append(n('rect',{x,y:405-h,width:100,height:h+52,rx:4}));for(let a=0;a<4;a++)for(let b=0;b<3;b++)if((a+b+i)%3!==0)lights.append(n('rect',{x:x+13+b*27,y:413-h+a*24,width:13,height:10,rx:1}));}
  near.append(n('path',{d:'M400 406 L428 210 L435 210 L464 406 M419 302 L446 302 M414 340 L453 340',fill:'none',stroke:'#925b68','stroke-width':6}),n('rect',{x:320,y:250,width:42,height:87,rx:4,fill:'#b66a80'}));
  g.append(far,near,lights,n('path',{d:'M0 432H1000',stroke:'#b8c8ce','stroke-width':5}));
 }
 if(kind==='traffic'){g.classList.add('traffic');g.append(n('rect',{x:130,y:428,width:85,height:17,rx:7,fill:'#e5ad85'}),n('rect',{x:147,y:420,width:44,height:16,rx:6,fill:'#455d70'}),n('circle',{cx:152,cy:447,r:7,fill:'#223348'}),n('circle',{cx:196,cy:447,r:7,fill:'#223348'}));}
 if(kind==='stars'){g.classList.add('stars');for(let i=0;i<38;i++)g.append(n('circle',{cx:30+(i*173)%950,cy:35+(i*89)%340,r:i%5===0?2:1,fill:'#f6eacb'}));}
 if(kind==='planet'){
  g.classList.add('planet');g.append(n('circle',{cx:735,cy:184,r:105,fill:'#8bc6d4',opacity:.2}),n('circle',{cx:735,cy:184,r:99,class:'planet-disc',fill:'#6e9eb7'}));
  const earth=n('g',{'clip-path':'url(#cd-planet)'});earth.append(n('path',{class:'continents planet-turn',d:'M660 99 L690 122 L720 116 L745 140 L720 160 L703 184 L677 187 L657 172Z M738 178 L774 163 L803 182 L818 215 L784 230 L766 209 L742 221 L730 201Z M692 218 L731 225 L738 259 L720 285 L697 264Z',fill:'#c8ded0'}));const craters=n('g',{class:'moon-craters',fill:'#8f9da5',opacity:.55});for(let i=0;i<8;i++)craters.append(n('circle',{cx:665+i*21,cy:126+(i*33)%119,r:6+(i*7)%17}));earth.append(craters,n('g',{class:'jupiter-bands',stroke:'#a87860','stroke-width':14,opacity:.65},n('path',{d:'M621 129Q731 152 846 129 M620 165Q726 188 846 168 M620 219Q731 243 846 217 M625 260Q723 267 840 251',fill:'none'})));g.append(earth);const rocks=n('g',{class:'asteroids',fill:'#a59b90'});for(let i=0;i<11;i++){const x=78+i*77,y=107+(i*61)%237;rocks.append(n('path',{d:`M${x} ${y}l13 -9l18 9l-3 16l-19 8l-14 -10Z`,opacity:.5+(i%3)*.2}));}g.append(rocks);
 }
 if(kind==='craft'){g.classList.add('craft');g.append(n('path',{d:'M154 134 L196 123 L228 136 L195 142Z',fill:'#e6eff3'}),n('path',{d:'M187 133 L169 115 L200 131 M187 138 L173 151 L201 138',fill:'#c1b28f'}));}
 if(kind==='mountains'){g.classList.add('mountains');g.append(n('path',{d:'M0 326L97 257L192 293L351 114L462 259L571 224L718 93L879 303L1000 192V485H0Z',fill:'var(--far)'}),n('path',{d:'M285 187L351 114L410 189L371 171L350 180L333 163Z M655 173L718 93L780 176L745 151L722 159L700 139Z',fill:'#e7efec'}));}
 if(kind==='landscape'){g.classList.add('landscape-move');g.append(n('path',{d:'M-100 376Q83 270 275 367T585 350T893 363T1210 333V512H-100Z',fill:'var(--grass)'}),n('path',{d:'M-100 444Q155 343 368 432T704 419T1110 385V507H-100Z',fill:'var(--field)'}));for(let i=0;i<12;i++){const x=-60+i*103;g.append(n('path',{d:`M${x} 430l17 -69l18 69Z`,fill:'var(--near)'}));}g.append(n('path',{d:'M250 399h67v45h-67Z',fill:'#c48870'}),n('path',{d:'M238 400l47-34l45 34Z',fill:'#596c69'}));}
 if(kind==='rails'){g.append(n('path',{d:'M0 464H1000 M0 470H1000',stroke:'#81928b','stroke-width':3}));}
 if(kind==='window'){g.append(n('rect',{x:30,y:20,width:940,height:462,rx:w.id==='starship'?105:26,fill:'none',stroke:'var(--frame)','stroke-width':15}),n('rect',{x:42,y:32,width:916,height:437,rx:w.id==='starship'?88:17,fill:'none',stroke:'var(--pane)','stroke-width':4}));if(w.id!=='starship')g.append(n('path',{d:'M335 30V478 M667 30V478',stroke:'var(--frame)','stroke-width':10}));}
 if(kind==='desk'){g.append(n('rect',{x:0,y:518,width:1000,height:142,fill:'var(--wood)'}),n('path',{d:'M0 519H1000',stroke:'#c39672','stroke-width':8}),n('rect',{x:408,y:531,width:200,height:61,rx:9,fill:'#e9d3b7'}),n('path',{d:'M429 545H537 M429 559H562 M429 572H506',stroke:'#a88974','stroke-width':3}),n('rect',{x:675,y:492,width:43,height:52,rx:8,fill:'#e7b892'}),n('path',{d:'M717 499Q748 510 717 526',fill:'none',stroke:'#e7b892','stroke-width':7}));}
 if(kind==='lamp'){g.append(n('ellipse',{class:'lamp-glow',cx:165,cy:512,rx:150,ry:62}),n('path',{d:'M163 510V418L209 380',stroke:'#866c54','stroke-width':9,fill:'none','stroke-linecap':'round'}),n('path',{d:'M183 355Q235 333 262 375L190 398Z',fill:'#d5ab74',stroke:'#906c4d','stroke-width':3}),n('ellipse',{cx:227,cy:385,rx:35,ry:7,fill:'#ffdda0'}),n('ellipse',{cx:159,cy:515,rx:47,ry:9,fill:'#ab855e'}));}
 if(kind==='cat'){
  g.append(n('ellipse',{cx:822,cy:545,rx:66,ry:33,fill:'#c18b61'}),n('path',{d:'M779 531L773 479L795 490L824 486L846 468L851 521Q821 547 779 531Z',fill:'#d7a776'}),n('path',{d:'M861 540Q941 558 915 504',fill:'none',stroke:'#ae7b58','stroke-width':14,'stroke-linecap':'round'}),n('g',{class:'eyes-open'},n('circle',{cx:797,cy:513,r:3,fill:'#493d3c'}),n('circle',{cx:827,cy:509,r:3,fill:'#493d3c'})),n('path',{class:'eyes-sleep',d:'M790 513q7 7 14 0 M819 509q7 7 14 0',stroke:'#493d3c','stroke-width':3,fill:'none'}),n('path',{d:'M809 520l7-1l-3 4Z',fill:'#97685d'}));
 }
 if(kind==='carriage'){g.append(n('path',{d:'M0 481H1000V660H0Z',fill:'var(--wall)'}),n('path',{d:'M0 501H1000',stroke:'#b79b6d','stroke-width':8}),n('rect',{x:0,y:547,width:285,height:113,rx:33,fill:'#527674'}),n('rect',{x:720,y:547,width:280,height:113,rx:33,fill:'#527674'}),n('rect',{x:292,y:552,width:420,height:29,rx:12,fill:'var(--wood)'}),n('path',{d:'M494 581V660',stroke:'var(--frame)','stroke-width':25}),n('rect',{x:356,y:516,width:32,height:39,rx:4,fill:'#faf1d9'}),n('path',{d:'M388 522Q410 535 388 548',stroke:'#faf1d9','stroke-width':6,fill:'none'}));}
 if(kind==='console'){g.append(n('path',{d:'M0 530L94 484H910L1000 529V660H0Z',fill:'var(--pane)',stroke:'var(--frame)','stroke-width':5}),n('path',{d:'M74 517H292L310 584H48Z',fill:'#1b3c54'}),n('path',{d:'M698 517H927L951 584H675Z',fill:'#1b3c54'}),n('path',{d:'M105 539H248 M99 554H188 M741 539H890',stroke:'#79bcce','stroke-width':4}));for(let i=0;i<5;i++)g.append(n('circle',{cx:755+i*29,cy:558,r:4,class:'signal'}));}
 if(kind==='drone'){g.classList.add('drone');g.append(n('ellipse',{cx:828,cy:504,rx:46,ry:10,fill:'#b9ccdc'}),n('rect',{x:792,y:437,width:75,height:55,rx:23,fill:'#e5f0f0',stroke:'#5b8296','stroke-width':3}),n('rect',{x:803,y:449,width:53,height:23,rx:10,fill:'#24445a'}),n('circle',{cx:818,cy:460,r:4,class:'signal'}),n('circle',{cx:842,cy:460,r:4,class:'signal'}),n('path',{d:'M794 464L777 478 M866 465L882 478',stroke:'#bcb699','stroke-width':6,'stroke-linecap':'round'}));}
 return g;
 }
 for(const kind of w.layers){if(['window','desk','lamp','cat','console','drone','carriage'].includes(kind))front.append(layer(kind));else view.append(layer(kind));}
 const rain=n('g',{class:'weather rain'}),snow=n('g',{class:'weather snow'});
 for(let i=0;i<22;i++){const x=42+i*43,y=35+(i*97)%410;rain.append(n('path',{d:`M${x} ${y}l-13 42 M${x+18} ${y+73}l-8 25`}));snow.append(n('circle',{cx:x,cy:y,r:2+i%3}));}
 view.append(rain,snow,n('g',{class:'weather fog'},n('ellipse',{cx:400,cy:370,rx:680,ry:85}),n('ellipse',{cx:630,cy:237,rx:530,ry:45})),n('g',{class:'weather aurora'},n('path',{d:'M-80 179Q169 10 368 139T699 120T1080 128'})));
 root.append(front);room.append(root);
 const caption=doc.createElement('div');caption.className='caption';const label=doc.createElement('span');label.textContent=w.name;
 const phase=doc.createElement('span');phase.className='phase';const arrived=doc.createElement('span');arrived.className='arrival';arrived.textContent='Session complete';caption.append(label,phase,arrived);room.append(caption);
 let last='';return {element:room,update(s){const key=JSON.stringify(s);if(key===last)return;last=key;for(const[k,v]of Object.entries(s))if(k!=='label')room.dataset[k]=String(v);phase.textContent=s.label||w.stages[0];},nodeCount:()=>room.querySelectorAll('*').length};
}
