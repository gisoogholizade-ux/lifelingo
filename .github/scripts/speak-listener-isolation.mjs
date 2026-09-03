import { chromium } from 'playwright';

const TARGET=process.env.TARGET_URL||'https://gisoogholizade-ux.github.io/lifelingo/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
page.setDefaultTimeout(6000);
page.on('console',m=>console.log(`[BROWSER:${m.type()}] ${m.text()}`));
page.on('pageerror',e=>console.log(`[PAGEERROR] ${e.stack||e.message}`));

await page.addInitScript(()=>{
  const nativeAdd=EventTarget.prototype.addEventListener;
  let seq=0, moSeq=0;
  const short=fn=>{try{return String(fn).replace(/\s+/g,' ').slice(0,240)}catch{return''}};
  const targetName=t=>t===document?'document':t===window?'window':`${t?.tagName||t?.constructor?.name||'unknown'}#${t?.id||''}.${String(t?.className||'').replace(/\s+/g,'.')}`;
  window.__SPEAK_ISO={active:false,lastEnter:null,lastExit:null,listenerCount:0,moEnter:0,moExit:0};
  EventTarget.prototype.addEventListener=function(type,listener,options){
    if(type==='click'&&typeof listener==='function'){
      const id=++seq, source=short(listener), where=targetName(this), capture=!!(typeof options==='boolean'?options:options?.capture);
      window.__SPEAK_ISO.listenerCount=id;
      const wrapped=function(ev){
        const probe=window.__SPEAK_ISO.active && !!ev.target?.closest?.('[data-canonical-scenario="airport"]');
        if(probe){window.__SPEAK_ISO.lastEnter={id,where,capture,source};console.warn(`[SPEAK-ENTER] id=${id} target=${where} capture=${capture} src=${source}`)}
        let out;
        try{out=listener.call(this,ev)}finally{if(probe){window.__SPEAK_ISO.lastExit={id,where,capture,source};console.warn(`[SPEAK-EXIT] id=${id}`)}}
        return out;
      };
      return nativeAdd.call(this,type,wrapped,options);
    }
    return nativeAdd.call(this,type,listener,options);
  };
  const NativeMO=window.MutationObserver;
  window.MutationObserver=class extends NativeMO{
    constructor(cb){
      const id=++moSeq, source=short(cb);
      super((records,obs)=>{
        if(window.__SPEAK_ISO.active){window.__SPEAK_ISO.moEnter++;console.warn(`[MO-ENTER] id=${id} records=${records.length} src=${source}`)}
        let out;
        try{out=cb(records,obs)}finally{if(window.__SPEAK_ISO.active){window.__SPEAK_ISO.moExit++;console.warn(`[MO-EXIT] id=${id}`)}}
        return out;
      });
    }
  };
});

await page.goto(TARGET,{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(1800);
await page.evaluate(()=>{
  document.querySelector('#authScreen')?.classList.add('hidden');
  document.querySelector('#appScreen')?.classList.remove('hidden');
  document.querySelector('#onboarding')?.classList.add('hidden');
});
await page.locator('[data-nav="speak"]:visible').first().click({timeout:5000});
await page.waitForTimeout(250);
console.log('LANDING_STATE',JSON.stringify(await page.evaluate(()=>({hash:location.hash,active:[...document.querySelectorAll('.view.on')].map(x=>x.id),mission:!!document.querySelector('#speakMission'),bodyPointer:getComputedStyle(document.body).pointerEvents,inert:document.querySelectorAll('[inert]').length}))));

await page.evaluate(()=>{
  const sb=window.llSupabase;if(!sb)throw new Error('llSupabase unavailable');
  sb.auth.getSession=async()=>({data:{session:{access_token:'DIAGNOSTIC_FREE_MISSION'}},error:null});
  const ss=window.speechSynthesis;
  if(ss?.cancel){
    const nativeCancel=ss.cancel.bind(ss);
    try{ss.cancel=()=>{console.warn('[SPEECH-CANCEL-ENTER]');const r=nativeCancel();console.warn('[SPEECH-CANCEL-EXIT]');return r}}catch(e){console.warn('[SPEECH-CANCEL-WRAP-FAILED] '+e.message)}
  }
  window.__SPEAK_ISO.active=true;
});
const airport=page.locator('[data-canonical-scenario="airport"]:visible').first();
console.log('AIRPORT',JSON.stringify(await airport.evaluate(el=>({tag:el.tagName,id:el.id,className:el.className,html:el.outerHTML}))));
try{
  await airport.dispatchEvent('click',{},{timeout:6000});
  console.log('DISPATCH_RETURNED');
}catch(e){console.log('DISPATCH_TIMEOUT',e.message)}
try{console.log('ISO_STATE',JSON.stringify(await page.evaluate(()=>window.__SPEAK_ISO)))}catch(e){console.log('ISO_STATE_UNREADABLE',e.message)}
try{console.log('POST_STATE',JSON.stringify(await page.evaluate(()=>({hash:location.hash,mission:document.querySelector('#speakMission')?.outerHTML?.slice(0,200)||null,missionParent:document.querySelector('#speakMission')?.parentElement?.id||null,inert:[...document.querySelectorAll('[inert]')].map(x=>x.id||x.className||x.tagName),bodyClass:document.body.className,bodyPointer:getComputedStyle(document.body).pointerEvents,htmlPointer:getComputedStyle(document.documentElement).pointerEvents})))}catch(e){console.log('POST_STATE_UNREADABLE',e.message)}
await browser.close().catch(()=>{});
