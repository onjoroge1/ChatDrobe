  function art(theme){
    const ns='http://www.w3.org/2000/svg';
    const n=(tag,attributes,...children)=>{const x=document.createElementNS(ns,tag);Object.entries(attributes).forEach(([k,v])=>x.setAttribute(k,String(v)));children.forEach(c=>x.append(c));return x;};
    const svg=n('svg',{viewBox:'0 0 200 200',fill:'none','aria-hidden':'true'});
    const a=theme.accent,b=theme.second,stroke=theme.dark?theme.text:theme.muted;
    svg.append(n('circle',{cx:111,cy:91,r:67,fill:a,opacity:.12}));
    if(theme.motif==='cat'){
      svg.append(n('path',{d:'M68 135 Q38 140 49 162 Q80 189 131 156 Q149 143 138 113 L135 61 L111 80 Q99 78 87 81 L63 62 L67 105 Q57 119 68 135Z',fill:b,stroke:stroke,'stroke-width':3,'stroke-linejoin':'round'}));
      svg.append(n('path',{d:'M88 137 Q69 157 97 164 M138 146 Q180 155 175 123 Q171 108 160 115',stroke:stroke,'stroke-width':7,'stroke-linecap':'round'}));
      svg.append(n('ellipse',{cx:86,cy:108,rx:3,ry:5,fill:stroke}),n('ellipse',{cx:116,cy:107,rx:3,ry:5,fill:stroke}),n('path',{d:'M98 117 L103 117 M101 121 Q109 128 115 121',stroke:stroke,'stroke-width':3,'stroke-linecap':'round'}));
      svg.append(n('path',{d:'M128 56 Q143 40 146 59 Q148 44 164 50 Q149 51 151 69 Q144 55 128 56Z',fill:a}));
      svg.append(n('circle',{cx:88,cy:89,r:4,fill:theme.surface}),n('circle',{cx:96,cy:92,r:2,fill:theme.surface}));
    }else if(theme.motif==='robot'){
      svg.append(n('rect',{x:60,y:69,width:85,height:73,rx:26,fill:a,stroke:stroke,'stroke-width':3}));
      svg.append(n('rect',{x:72,y:84,width:61,height:31,rx:14,fill:theme.bg}),n('circle',{cx:88,cy:100,r:6,fill:b}),n('circle',{cx:116,cy:100,r:6,fill:b}));
      svg.append(n('path',{d:'M101 69V49 M79 146 L73 165 H87 M124 146 L130 165 H116 M57 103 L44 115 M150 101 L165 113',stroke:stroke,'stroke-width':6,'stroke-linecap':'round'}));
      svg.append(n('circle',{cx:101,cy:44,r:7,fill:b}),n('path',{d:'M87 126 H117',stroke:theme.bg,'stroke-width':4,'stroke-linecap':'round'}));
      svg.append(n('circle',{cx:166,cy:60,r:13,stroke:b,'stroke-width':3}));
    }else if(theme.motif==='burst'){
      svg.append(n('path',{d:'M102 28 L117 65 L158 51 L145 91 L182 110 L143 129 L155 169 L115 155 L94 185 L77 148 L36 162 L49 121 L18 101 L58 85 L47 43 L84 59Z',fill:b,stroke:stroke,'stroke-width':3,'stroke-linejoin':'round'}));
      svg.append(n('circle',{cx:101,cy:105,r:37,fill:a,stroke:stroke,'stroke-width':3}),n('ellipse',{cx:101,cy:105,rx:48,ry:15,transform:'rotate(-35 101 105)',stroke:theme.surface,'stroke-width':5}),n('circle',{cx:101,cy:105,r:10,fill:theme.surface}));
    }else if(theme.motif==='rally'){
      svg.append(n('rect',{x:14,y:23,width:172,height:146,rx:17,fill:theme.surface,stroke:theme.line,'stroke-width':2}));
      svg.append(n('path',{d:'M29 44 H170 M29 54 H112 M30 145 H168 M39 31 V157 M164 31 V157',stroke:theme.line,'stroke-width':1}));
      svg.append(n('path',{d:'M25 138 H177',stroke:stroke,'stroke-width':3,'stroke-linecap':'round'}));
      svg.append(n('path',{d:'M38 104 L61 80 Q65 75 79 75 H116 L142 99 L164 105 L170 123 H31 L32 111Z',fill:b,stroke:stroke,'stroke-width':3,'stroke-linejoin':'round'}));
      svg.append(n('path',{d:'M67 82 H86 V98 H54Z M94 82 H114 L135 98 H94Z',fill:'#4f6875'}));
      svg.append(n('path',{d:'M145 106 H163 V112 H145Z',fill:'#ffdf8b'}));
      for(const x of [60,141])svg.append(n('circle',{cx:x,cy:125,r:14,fill:'#303841',stroke:theme.surface,'stroke-width':2}),n('circle',{cx:x,cy:125,r:6,fill:'#b9c4cc'}));
      svg.append(n('rect',{x:87,y:102,width:25,height:17,rx:3,fill:theme.surface}),n('path',{d:'M93 108 H102 L94 115 H103 M107 107 H111 L108 116',stroke:stroke,'stroke-width':1.5,'stroke-linejoin':'round'}));
      svg.append(n('path',{d:'M26 70 H45 M36 60 V80',stroke:a,'stroke-width':2}));
    }else if(theme.motif==='bridge'){
      svg.append(n('rect',{x:11,y:20,width:178,height:153,rx:27,fill:theme.surface,stroke:theme.line,'stroke-width':2}));
      svg.append(n('rect',{x:24,y:33,width:152,height:87,rx:25,fill:'#132d49',stroke:a,'stroke-width':3}));
      svg.append(n('circle',{cx:129,cy:73,r:29,fill:'#7cafd9'}),n('path',{d:'M112 53 Q138 46 145 68 L128 70 L125 85 L105 86',fill:'#bce0e5',opacity:.8}));
      for(const [x,y,r]of [[41,54,1.5],[72,83,2],[88,45,1],[151,102,1]])svg.append(n('circle',{cx:x,cy:y,r,fill:'#fff7d3'}));
      svg.append(n('path',{d:'M20 147 L35 132 H166 L181 148 L175 163 H26Z',fill:theme.soft,stroke:theme.line,'stroke-width':2}));
      svg.append(n('path',{d:'M36 144 H80 M122 144 H163 M35 154 H63',stroke:a,'stroke-width':3,'stroke-linecap':'round'}));
      svg.append(n('ellipse',{cx:95,cy:115,rx:29,ry:9,fill:theme.line,opacity:.3}));
      svg.append(n('path',{d:'M58 101 L68 91 M58 101 L73 108 M126 101 L115 91 M126 101 L110 108',stroke:b,'stroke-width':5,'stroke-linecap':'round'}));
      svg.append(n('rect',{x:70,y:77,width:44,height:36,rx:14,fill:'#eef6fb',stroke:a,'stroke-width':2}),n('rect',{x:77,y:85,width:30,height:15,rx:6,fill:'#234361'}));
      svg.append(n('circle',{cx:85,cy:92,r:3,fill:'#95e1df'}),n('circle',{cx:99,cy:92,r:3,fill:'#95e1df'}),n('path',{d:'M92 77 V67',stroke:a,'stroke-width':2}),n('circle',{cx:92,cy:65,r:3,fill:b}));
    }else if(theme.motif==='observatory'){
      svg.append(n('rect',{x:13,y:20,width:174,height:154,rx:20,fill:theme.surface,stroke:theme.line,'stroke-width':2}));
      svg.append(n('circle',{cx:102,cy:92,r:66,fill:theme.bg,stroke:theme.line,'stroke-width':1}));
      svg.append(n('ellipse',{cx:101,cy:94,rx:66,ry:28,transform:'rotate(-22 101 94)',stroke:a,'stroke-width':1.5}),n('ellipse',{cx:101,cy:94,rx:48,ry:46,transform:'rotate(15 101 94)',stroke:theme.line,'stroke-width':1.5}));
      svg.append(n('circle',{cx:101,cy:94,r:19,fill:b}),n('circle',{cx:96,cy:88,r:9,fill:'#ffcf77',opacity:.8}));
      svg.append(n('circle',{cx:153,cy:63,r:11,fill:'#5b86b0',stroke:theme.surface,'stroke-width':2}),n('circle',{cx:51,cy:126,r:6,fill:'#a181bc'}),n('circle',{cx:63,cy:62,r:4,fill:a}));
      svg.append(n('path',{d:'M101 137 V154 M82 157 H120 M36 159 H62 M139 159 H164',stroke:a,'stroke-width':3,'stroke-linecap':'round'}));
      svg.append(n('path',{d:'M29 38 H46 M37 30 V47 M150 35 H168',stroke:theme.line,'stroke-width':2}));
    }else if(theme.motif==='leaf'){
      svg.append(n('path',{d:'M101 168 V65',stroke:a,'stroke-width':5,'stroke-linecap':'round'}));
      svg.append(n('path',{d:'M98 137 Q43 139 43 98 Q87 93 99 137 M105 108 Q159 116 164 69 Q115 65 105 108 M99 82 Q64 75 73 39 Q109 45 99 82',fill:a,stroke:stroke,'stroke-width':2}));
      svg.append(n('path',{d:'M73 174 H130',stroke:b,'stroke-width':7,'stroke-linecap':'round'}));
    }else{
      svg.append(n('circle',{cx:109,cy:106,r:40,fill:a,opacity:.8}),n('ellipse',{cx:109,cy:106,rx:76,ry:23,transform:'rotate(-28 109 106)',stroke:b,'stroke-width':6}),n('circle',{cx:58,cy:42,r:8,fill:b}),n('circle',{cx:157,cy:156,r:5,fill:a}));
    }
    return svg;
  }
