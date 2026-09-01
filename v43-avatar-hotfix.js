(()=>{
  const cfg={
    0:{g:'girl',skin:'#f0b58f',hair:'#24130f',accent:'#a855f7',hood:'#111827',style:'cat'},
    1:{g:'girl',skin:'#e6a982',hair:'#3a1f18',accent:'#38bdf8',hood:'#121826',style:'long'},
    2:{g:'girl',skin:'#bd7657',hair:'#241711',accent:'#f472b6',hood:'#171827',style:'curl'},
    3:{g:'girl',skin:'#efb895',hair:'#1a1214',accent:'#fb923c',hood:'#191821',style:'bob'},
    4:{g:'girl',skin:'#d58e69',hair:'#111217',accent:'#8b5cf6',hood:'#101218',style:'hijab'},
    10:{g:'boy',skin:'#d99772',hair:'#21130f',accent:'#60a5fa',hood:'#1c2433',style:'messy'},
    11:{g:'boy',skin:'#e6ae87',hair:'#111217',accent:'#a78bfa',hood:'#111827',style:'cap'},
    12:{g:'boy',skin:'#c78663',hair:'#30180f',accent:'#22d3ee',hood:'#1b2531',style:'wave'},
    13:{g:'boy',skin:'#efb28b',hair:'#191313',accent:'#f59e0b',hood:'#171923',style:'soft'},
    14:{g:'boy',skin:'#b87555',hair:'#171215',accent:'#c084fc',hood:'#101621',style:'curl'}
  };
  function svg(i){
    const c=cfg[i]||cfg[0], girl=c.g==='girl';
    const cat=c.style==='cat', hijab=c.style==='hijab', cap=c.style==='cap', curl=c.style==='curl', bob=c.style==='bob';
    const long=girl&&!hijab&&!bob;
    const ears=cat?`<path d="M104 88 78 35l45 27M216 88l26-53-45 27" fill="url(#hair)" stroke="#f2b28d" stroke-width="7"/><path d="M99 72 83 45l27 16M221 72l16-27-27 16" fill="#f6c0ae" opacity=".85"/>`:'';
    const hij=`<path d="M87 245c-23-35-29-96-6-137 16-29 46-48 80-48 39 0 72 22 87 56 18 39 10 94-10 130l-35-26-81 1z" fill="#0d1018"/><path d="M104 102c23-29 72-38 103-4 16 18 18 47 10 74-6-24-19-42-44-50-27-8-49 1-69 25-7-17-7-30 0-45z" fill="#171923"/>`;
    const hairLong=`<path d="M87 151c-10-62 23-111 77-111 58 0 91 48 79 117-7 37-2 72 11 97-21-5-37-18-48-39-13 29-36 44-69 46-31-6-49-22-59-49-9 20-23 32-42 38 14-31 17-65 11-99z" fill="url(#hair)"/><path d="M92 121c10-54 80-87 129-43 12 11 19 27 21 46-24-28-48-42-76-40-32 2-54 16-74 37z" fill="#40241c" opacity=".55"/>`;
    const hairBob=`<path d="M85 143c-2-59 33-99 80-99 55 0 86 43 78 103-4 30-15 54-33 70-3-26-17-41-38-47-31-9-56 6-69 39-15-18-20-39-18-66z" fill="url(#hair)"/><path d="M95 103c27-43 86-58 130-17-18-7-33-9-49-6-34 6-53 17-81 23z" fill="#3d2022" opacity=".5"/>`;
    const hairBoy=`<path d="M91 117c8-50 36-79 75-79 44 0 76 31 80 78-15-14-28-18-40-18 2-10-1-20-9-30-4 14-12 25-24 32-7-13-15-22-28-27 0 13-6 23-18 31-10-4-22 0-36 13z" fill="url(#hair)"/>`;
    const curls=curl?`<g fill="${c.hair}" stroke="#5a3022" stroke-width="3"><circle cx="103" cy="85" r="24"/><circle cx="132" cy="61" r="26"/><circle cx="164" cy="56" r="27"/><circle cx="197" cy="66" r="25"/><circle cx="222" cy="91" r="24"/><circle cx="91" cy="116" r="21"/></g>`:'';
    const capSvg=cap?`<path d="M91 83c17-33 45-48 78-45 36 3 61 19 75 50-42-11-86-10-153-5z" fill="#101116"/><path d="M132 78c38-3 76 0 112 10-30 4-67 8-108 9z" fill="#22252d"/>`:'';
    const glasses=cat?`<g fill="none" stroke="#131722" stroke-width="6"><circle cx="133" cy="151" r="25"/><circle cx="191" cy="151" r="25"/><path d="M158 150h8"/><path d="M108 145 88 136M216 145l22-9"/></g>`:'';
    const headphones=cat?`<path d="M91 119c6-49 35-76 72-77 45-1 75 31 78 77" fill="none" stroke="#161a25" stroke-width="13"/><rect x="75" y="124" width="24" height="55" rx="12" fill="#202635"/><rect x="226" y="124" width="24" height="55" rx="12" fill="#202635"/>`:'';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
      <defs>
        <radialGradient id="bg" cx="70%" cy="18%" r="95%"><stop stop-color="${c.accent}" stop-opacity=".42"/><stop offset=".42" stop-color="#131b2d"/><stop offset="1" stop-color="#060913"/></radialGradient>
        <linearGradient id="hair" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#0e0b0d"/><stop offset=".48" stop-color="${c.hair}"/><stop offset="1" stop-color="#513020"/></linearGradient>
        <linearGradient id="skin" x1="0" x2=".8" y1="0" y2="1"><stop stop-color="#ffd7bd"/><stop offset=".48" stop-color="${c.skin}"/><stop offset="1" stop-color="#b96d52"/></linearGradient>
        <linearGradient id="cloth" x1="0" x2="1"><stop stop-color="#090c13"/><stop offset=".5" stop-color="${c.hood}"/><stop offset="1" stop-color="#252b38"/></linearGradient>
        <filter id="shadow"><feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#000" flood-opacity=".55"/></filter>
        <filter id="glow"><feGaussianBlur stdDeviation="12"/></filter>
      </defs>
      <rect width="320" height="320" rx="28" fill="url(#bg)"/>
      <circle cx="252" cy="60" r="65" fill="${c.accent}" opacity=".16" filter="url(#glow)"/>
      <g opacity=".8" fill="#fff"><circle cx="272" cy="44" r="2.2"/><circle cx="250" cy="78" r="1.4"/><circle cx="53" cy="72" r="1.6"/><path d="M275 101l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="${c.accent}"/></g>
      <path d="M55 320c8-65 46-101 104-101 59 0 97 35 106 101" fill="url(#cloth)" filter="url(#shadow)"/>
      ${hijab?hij:(girl?(bob?hairBob:hairLong):hairBoy)}${curls}${ears}${capSvg}
      <ellipse cx="160" cy="151" rx="61" ry="72" fill="url(#skin)" filter="url(#shadow)"/>
      ${hijab?`<path d="M104 131c8-40 34-62 62-62 33 0 55 22 61 62-17-20-39-29-63-29-22 0-41 8-60 29z" fill="#11131a"/>`:''}
      ${!hijab&&!cap?`<path d="M103 116c13-45 47-68 79-62 25 5 46 22 57 52-25-13-47-18-67-13-24 6-39 14-69 23z" fill="url(#hair)"/>`:''}
      <ellipse cx="136" cy="151" rx="12" ry="16" fill="#141018"/><ellipse cx="188" cy="151" rx="12" ry="16" fill="#141018"/>
      <ellipse cx="139" cy="147" rx="4.2" ry="6" fill="#8b5e3c"/><ellipse cx="191" cy="147" rx="4.2" ry="6" fill="#8b5e3c"/>
      <circle cx="142" cy="143" r="3.3" fill="#fff"/><circle cx="194" cy="143" r="3.3" fill="#fff"/>
      <path d="M120 129q16-10 31 0M174 129q16-10 31 0" fill="none" stroke="#3b211d" stroke-width="5" stroke-linecap="round"/>
      <path d="M153 176q7 5 14 0" fill="none" stroke="#a85f53" stroke-width="3" stroke-linecap="round"/>
      <path d="M142 192q18 12 36 0" fill="none" stroke="#7f3945" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="112" cy="177" rx="15" ry="7" fill="#f39b94" opacity=".18"/><ellipse cx="208" cy="177" rx="15" ry="7" fill="#f39b94" opacity=".18"/>
      ${glasses}${headphones}
      <path d="M115 229c18 14 72 14 91 0" fill="none" stroke="#31394a" stroke-width="9" stroke-linecap="round" opacity=".7"/>
      <circle cx="74" cy="257" r="38" fill="${c.accent}" opacity=".08"/>
    </svg>`;
  }
  const src=i=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(Number(i)||0));
  function paint(el,i){
    if(!el)return;
    i=Number(i)||0;
    const key='inline-v6-'+i;
    if(el.dataset.avatarRenderKey===key&&el.querySelector('img[data-ll-avatar-img]'))return;
    el.dataset.avatarRenderKey=key;
    el.innerHTML='';
    el.style.background='none';
    el.style.position='relative';
    el.style.overflow='hidden';
    const im=document.createElement('img');
    im.dataset.llAvatarImg='1';
    im.alt='LifeLingo avatar';
    im.draggable=false;
    im.src=src(i);
    im.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;image-rendering:auto;pointer-events:none;user-select:none';
    el.appendChild(im);
  }
  function apply(){document.querySelectorAll('[data-avatar-face]').forEach(el=>paint(el,el.dataset.avatarFace));}
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-avatar-face']});
  document.addEventListener('click',()=>setTimeout(apply,0));
  setInterval(apply,500);setTimeout(apply,0);
})();