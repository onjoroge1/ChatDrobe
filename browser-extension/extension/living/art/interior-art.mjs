// Original, checked-in interiors shared by the live scene and static previews.
// Material depth comes from a few broad planes; no texture assets or animation.
const path=(d,fill,extra={})=>['path',{d,fill,...extra}];
const rect=(x,y,width,height,rx,fill,extra={})=>['rect',{x,y,width,height,rx,fill,...extra}];
const ellipse=(cx,cy,rx,ry,fill,extra={})=>['ellipse',{cx,cy,rx,ry,fill,...extra}];
const line=(d,stroke,width=2,extra={})=>path(d,'none',{stroke,'stroke-width':width,'stroke-linecap':'round',...extra});
// Keep cup and steam left of the companion, including the larger portal habitat.
export const TOKYO_TEA_OFFSET=-332;
export const INTERIOR_ART={
 tokyo:{
  desk:[
   rect(0,518,1000,142,0,'var(--wood)'),
   path('M0 522H1000V538H0Z','#fff3d5',{opacity:'.13'}),
   line('M0 521H1000','var(--frame)',5),
   line('M25 577Q135 570 255 578M32 621Q204 613 370 622M523 629Q625 622 714 628','#30272d',2,{opacity:'.14'}),
   ellipse(510,586,110,10,'#201e29',{opacity:'.13'}),
   rect(407,534,202,58,8,'var(--frame)'),
   rect(410,530,196,55,7,'var(--pane)'),
   line('M428 544H529M428 555H565M428 566H510','var(--frame)',2,{opacity:'.75'}),
   line('M588 535V580','var(--wood)',2,{opacity:'.3'}),
   path('M578 530v23l5-4l5 4v-23Z','#a16f67'),
   ['g',{'data-interior-prop':'tea-cup',transform:`translate(${TOKYO_TEA_OFFSET} 0)`},[
   ellipse(698,546,39,9,'#201e29',{opacity:'.17'}),
   ellipse(698,541,34,7,'var(--pane)'),
   line('M717 501Q746 508 719 526','var(--frame)',7),
   rect(675,492,43,48,8,'var(--pane)'),
   path('M709 497v31q0 8-8 9h10q7 0 7-8v-32Z','var(--frame)',{opacity:'.4'}),
   ellipse(696.5,495,21.5,6,'var(--frame)'),
   ellipse(696.5,496,17,3.5,'#675345'),
   line('M681 505V524','#fff9e9',2,{opacity:'.4'})
   ]]
  ],
  lamp:[
   ellipse(165,512,150,62,'#ffe4a25c',{class:'lamp-glow'}),
   ellipse(159,518,49,9,'#201e29',{opacity:'.17'}),
   line('M163 510V418L209 380','var(--frame)',9),
   path('M183 355Q235 333 262 375L190 398Z','var(--frame)'),
   path('M190 359Q224 342 247 362L192 388Z','#fff1cf',{opacity:'.26'}),
   ellipse(227,385,35,7,'#ffdda0'),
   ellipse(159,513,44,8,'var(--frame)'),
   line('M127 510Q158 505 189 510','#fff1cf',2,{opacity:'.3'})
  ]
 },
 train:{
  carriage:[
   path('M0 481H1000V660H0Z','var(--wall)'),
   path('M0 482H1000V496H0Z','var(--frame)',{opacity:'.35'}),
   line('M0 501H1000','var(--frame)',6),
   line('M0 509H1000','var(--pane)',2,{opacity:'.7'}),
   line('M38 517V552M962 517V552','var(--frame)',2,{opacity:'.55'}),
   rect(0,547,285,113,33,'var(--carriage-seat,#527674)'),
   rect(720,547,280,113,33,'var(--carriage-seat,#527674)'),
   path('M0 595H285V660H0ZM720 595H1000V660H720Z','#142f37',{opacity:'.18'}),
   line('M14 588H263Q273 588 273 599V647M737 647V599Q737 588 747 588H986','#d0dfcf',2,{opacity:'.3'}),
   line('M28 558V579M92 554V579M158 554V579M224 558V579M766 558V579M831 554V579M897 554V579M961 558V579','#d0dfcf',2,{opacity:'.2'}),
   path('M477 577H517L529 660H466Z','var(--frame)'),
   path('M484 581H504V660H478Z','#24323b',{opacity:'.15'}),
   rect(291,553,422,29,12,'var(--wood)'),
   path('M302 551H702Q711 551 713 559H291Q293 551 302 551Z','var(--frame)'),
   line('M308 568H697','#e8d4b5',2,{opacity:'.35'}),
   ellipse(373,553,33,6,'#28383a',{opacity:'.18'}),
   ellipse(373,550,30,5,'var(--pane)'),
   line('M387 524Q410 535 388 545','var(--pane)',6),
   rect(356,516,32,34,5,'var(--pane)'),
   ellipse(372,518,16,4,'var(--frame)'),
   ellipse(372,519,12,2,'#675345')
  ]
 },
 starship:{
  console:[
   path('M0 530L94 484H910L1000 529V660H0Z','var(--pane)',{stroke:'var(--frame)','stroke-width':5}),
   path('M0 588H1000V660H0Z','var(--wall)'),
   line('M0 588H1000','var(--frame)',3),
   path('M94 484H910L932 499H69Z','#fff',{opacity:'.15'}),
   line('M331 500L354 580M671 500L649 580','var(--frame)',2,{opacity:'.55'}),
   path('M69 513H296L315 585H44Z','var(--frame)'),
   path('M704 513H931L956 585H680Z','var(--frame)'),
   path('M76 519H291L307 579H51Z','#1b3c54'),
   path('M709 519H926L948 579H687Z','#1b3c54'),
   path('M76 519H291L295 534H72ZM709 519H926L932 534H705Z','#41647b',{opacity:'.35'}),
   line('M105 542H248M100 555H188M742 542H891','#79bcce',3,{opacity:'.8'}),
   line('M101 566H136M145 566H162','#79bcce',2,{opacity:'.45'}),
   line('M749 559H757M778 559H786M807 559H815M836 559H844M865 559H873','#9cd8c9',5,{class:'signal'}),
   rect(379,611,242,32,8,'var(--frame)',{opacity:'.22'}),
   line('M403 622H462M403 632H489M535 622H591M561 632H591','var(--frame)',2,{opacity:'.5'}),
   line('M27 610V642M973 610V642','var(--frame)',3,{opacity:'.4'})
  ]
 }
};
