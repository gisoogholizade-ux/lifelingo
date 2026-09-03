import { chromium } from 'playwright';

const TARGET = process.env.TARGET_URL || 'https://gisoogholizade-ux.github.io/lifelingo/';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
page.on('console', m => console.log(`[BROWSER:${m.type()}] ${m.text()}`));
page.on('pageerror', e => console.log(`[PAGEERROR] ${e.stack || e.message}`));

await page.addInitScript(() => {
  const D = window.__SPEAK_PROOF = {regs:[],fires:[],hashchanges:0,popstates:0,pushStates:0,replaceStates:0,mutationCallbacks:0,mutationRecords:0,missionMounts:0,missionRemoves:0};
  const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
  const wrappers = new WeakMap();
  const src = fn => { try { return String(fn).replace(/\s+/g,' ').slice(0,350); } catch { return ''; } };
  const name = target => target===document?'document':target===window?'window':`${target?.tagName||target?.constructor?.name||'unknown'}#${target?.id||''}.${String(target?.className||'').replace(/\s+/g,'.')}`;
  EventTarget.prototype.addEventListener=function(type,listener,options){
    if(['click','pointerdown','pointerup','touchstart','touchend'].includes(type)&&typeof listener==='function'){
      const meta={type,target:name(this),source:src(listener),capture:!!(typeof options==='boolean'?options:options?.capture)};D.regs.push(meta);
      const wrapped=function(ev){const before={defaultPrevented:ev.defaultPrevented,cancelBubble:ev.cancelBubble};let out;try{out=listener.call(this,ev)}finally{D.fires.push({...meta,eventTarget:name(ev.target),before,after:{defaultPrevented:ev.defaultPrevented,cancelBubble:ev.cancelBubble},hash:location.hash})}return out};
      let per=wrappers.get(listener);if(!per){per=new WeakMap();wrappers.set(listener,per)}per.set(this,wrapped);return add.call(this,type,wrapped,options);
    }return add.call(this,type,listener,options);
  };
  EventTarget.prototype.removeEventListener=function(type,listener,options){const wrapped=typeof listener==='function'?wrappers.get(listener)?.get(this):null;return remove.call(this,type,wrapped||listener,options)};
  add.call(window,'hashchange',()=>D.hashchanges++);add.call(window,'popstate',()=>D.popstates++);
  const push=history.pushState.bind(history),replace=history.replaceState.bind(history);history.pushState=(...a)=>{D.pushStates++;return push(...a)};history.replaceState=(...a)=>{D.replaceStates++;return replace(...a)};
  const NativeMO=window.MutationObserver;window.MutationObserver=class extends NativeMO{constructor(cb){super((records,obs)=>{D.mutationCallbacks++;D.mutationRecords+=records.length;for(const r of records){for(const n of r.addedNodes||[]){if(n?.nodeType===1&&(n.id==='speakMission'||n.querySelector?.('#speakMission')))D.missionMounts++}for(const n of r.removedNodes||[]){if(n?.nodeType===1&&(n.id==='speakMission'||n.querySelector?.('#speakMission')))D.missionRemoves++}}return cb(records,obs)})}};
});

await page.goto(TARGET,{waitUntil:'networkidle',timeout:60000});
await page.waitForTimeout(1800);
await page.evaluate(()=>{document.querySelector('#authScreen')?.classList.add('hidden');document.querySelector('#appScreen')?.classList.remove('hidden');document.querySelector('#onboarding')?.classList.add('hidden')});
await page.waitForTimeout(300);

const state=async label=>page.evaluate(label=>{const css=el=>{const s=getComputedStyle(el);return{position:s.position,zIndex:s.zIndex,pointerEvents:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity,overflow:s.overflow,touchAction:s.touchAction,userSelect:s.userSelect}};const box=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};const brief=el=>el?{tagName:el.tagName,id:el.id,className:String(el.className||''),rect:box(el),css:css(el),inert:el.hasAttribute('inert'),ariaHidden:el.getAttribute('aria-hidden'),ariaModal:el.getAttribute('aria-modal')}:null;const active=[...document.querySelectorAll('.view.on')].map(brief);const candidates=[...document.querySelectorAll('#speakMission,.speakMission,.speakMissionShell,.speakCinema,dialog,.modal,.backdrop,[class*="overlay" i],[class*="scene" i],canvas')].map(brief);return{label,url:location.href,hash:location.hash,activeViewCount:active.length,active,mission:brief(document.querySelector('#speakMission')),missionParent:document.querySelector('#speakMission')?.parentElement?.id||document.querySelector('#speakMission')?.parentElement?.className||null,candidates,inert:[...document.querySelectorAll('[inert]')].map(brief),body:{className:document.body.className,style:document.body.style.cssText,css:css(document.body)},html:{className:document.documentElement.className,style:document.documentElement.style.cssText,css:css(document.documentElement)},counters:{...window.__SPEAK_PROOF}}},label);
const hitAt=async(label,selector)=>page.evaluate(({label,selector})=>{const all=[...document.querySelectorAll(selector)].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});const target=all[0];if(!target)return{label,selector,error:'no visible target'};const r=target.getBoundingClientRect(),x=Math.max(0,Math.min(innerWidth-1,r.left+r.width/2)),y=Math.max(0,Math.min(innerHeight-1,r.top+r.height/2));const brief=el=>{if(!el)return null;const s=getComputedStyle(el),q=el.getBoundingClientRect();return{tagName:el.tagName,id:el.id,className:String(el.className||''),rect:{x:q.x,y:q.y,width:q.width,height:q.height},position:s.position,zIndex:s.zIndex,pointerEvents:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity}};return{label,selector,point:{x,y},target:brief(target),elementFromPoint:brief(document.elementFromPoint(x,y)),elementsFromPoint:document.elementsFromPoint(x,y).slice(0,10).map(brief)}},{label,selector});
const timer=async label=>console.log(label,await page.evaluate(()=>new Promise(resolve=>{const a=performance.now();setTimeout(()=>resolve(performance.now()-a),100)})));

console.log('PROOF_BEFORE',JSON.stringify(await state('before')));
const home=page.locator('[data-nav="home"]:visible, [data-header-nav="home"]:visible, [data-fixed-nav="home"]:visible').first();if(await home.count()){try{await home.click({timeout:3000});await page.waitForTimeout(100)}catch{}}
const urlBefore=page.url(),activeBefore=await page.evaluate(()=>[...document.querySelectorAll('.view.on')].map(x=>x.id));
const speak=page.locator('[data-nav="speak"]:visible, [data-header-nav="speak"]:visible, [data-fixed-nav="speak"]:visible').first();if(!await speak.count())throw new Error('No visible Speak navigation control');
console.log('EXACT_CLICK_ELEMENT',JSON.stringify(await speak.evaluate(el=>({tagName:el.tagName,id:el.id,className:String(el.className||''),outerHTML:el.outerHTML}))));console.log('URL_BEFORE_CLICK',urlBefore);console.log('ACTIVE_BEFORE_CLICK',JSON.stringify(activeBefore));
const fireStart=await page.evaluate(()=>window.__SPEAK_PROOF.fires.length);await speak.click({timeout:5000});await page.waitForTimeout(250);const fireEnd=await page.evaluate(()=>window.__SPEAK_PROOF.fires.length);
console.log('PROOF_AFTER_250MS',JSON.stringify(await state('after250')));console.log('HIT_HOME',JSON.stringify(await hitAt('home','[data-nav="home"], [data-header-nav="home"], [data-fixed-nav="home"]')));console.log('HIT_LEARN',JSON.stringify(await hitAt('learn','[data-nav="learn"], [data-header-nav="learn"], [data-fixed-nav="learn"]')));console.log('HIT_PROFILE',JSON.stringify(await hitAt('profile','[data-nav="profile"], [data-header-nav="profile"], [data-fixed-nav="profile"], #topAvatar')));await timer('MAIN_THREAD_100MS_TIMER');
console.log('SPEAK_CLICK_HANDLERS',JSON.stringify(await page.evaluate(({a,b})=>window.__SPEAK_PROOF.fires.slice(a,b),{a:fireStart,b:fireEnd})));

// Diagnostic isolation: make only the free Airport scenario's session gate resolve so we can observe the real production mission DOM/CSS lifecycle. No product success state or server RPC is faked.
await page.evaluate(()=>{const sb=window.llSupabase;if(!sb)throw new Error('llSupabase unavailable');window.__ORIG_GET_SESSION=sb.auth.getSession.bind(sb.auth);sb.auth.getSession=async()=>({data:{session:{access_token:'DIAGNOSTIC_FREE_MISSION'}},error:null})});
const airport=page.locator('[data-canonical-scenario="airport"]:visible').first();
console.log('AIRPORT_CLICK_ELEMENT',JSON.stringify(await airport.evaluate(el=>({tagName:el.tagName,id:el.id,className:String(el.className||''),outerHTML:el.outerHTML.slice(0,500)}))));
await airport.click({timeout:5000});
await page.waitForTimeout(30);
console.log('MISSION_30MS',JSON.stringify(await state('mission30')));
console.log('MISSION_HIT_HOME_30MS',JSON.stringify(await hitAt('mission-home-30','[data-nav="home"], [data-header-nav="home"], [data-fixed-nav="home"]')));
console.log('MISSION_HIT_PROFILE_30MS',JSON.stringify(await hitAt('mission-profile-30','[data-nav="profile"], [data-header-nav="profile"], [data-fixed-nav="profile"], #topAvatar')));
await timer('MISSION_MAIN_THREAD_TIMER');
await page.waitForTimeout(300);
console.log('MISSION_330MS',JSON.stringify(await state('mission330')));
console.log('MISSION_HIT_HOME_330MS',JSON.stringify(await hitAt('mission-home-330','[data-nav="home"], [data-header-nav="home"], [data-fixed-nav="home"]')));

// Global navigation must remove mission and remain clickable.
try{await page.locator('[data-nav="home"]:visible, [data-header-nav="home"]:visible, [data-fixed-nav="home"]:visible').first().click({timeout:2500});await page.waitForTimeout(150);console.log('MISSION_TO_HOME_RESULT',JSON.stringify(await state('mission-to-home')))}catch(e){console.log('MISSION_TO_HOME_FAIL',e.message)}

// Simulated access failure: reject session immediately, then verify error state and navigation remain interactive.
await page.locator('[data-nav="speak"]:visible, [data-header-nav="speak"]:visible, [data-fixed-nav="speak"]:visible').first().click({timeout:3000});await page.waitForTimeout(100);
await page.evaluate(()=>{window.llSupabase.auth.getSession=async()=>{throw new Error('DIAGNOSTIC_ACCESS_FAILURE')}});
await page.locator('[data-canonical-scenario="airport"]:visible').first().click({timeout:3000});await page.waitForTimeout(150);
console.log('ACCESS_FAILURE_STATE',JSON.stringify(await state('access-failure')));
console.log('ACCESS_FAILURE_HIT_HOME',JSON.stringify(await hitAt('access-failure-home','[data-nav="home"], [data-header-nav="home"], [data-fixed-nav="home"]')));
console.log('ACCESS_FAILURE_HIT_BACK',JSON.stringify(await hitAt('access-failure-back','[data-speak-back]')));
console.log('ACCESS_FAILURE_HIT_RETRY',JSON.stringify(await hitAt('access-failure-retry','[data-speak-retry]')));
try{await page.locator('[data-speak-back]:visible').click({timeout:2500});await page.waitForTimeout(100);console.log('ACCESS_FAILURE_BACK_RESULT',JSON.stringify(await state('access-failure-back-result')))}catch(e){console.log('ACCESS_FAILURE_BACK_FAIL',e.message)}

// Restore normal auth API before repeat navigation test.
await page.evaluate(()=>{if(window.__ORIG_GET_SESSION)window.llSupabase.auth.getSession=window.__ORIG_GET_SESSION});
let repeat=[];
for(let i=1;i<=10;i++){
  try{await page.locator('[data-nav="speak"]:visible, [data-header-nav="speak"]:visible, [data-fixed-nav="speak"]:visible').first().click({timeout:2000});await page.waitForTimeout(35);const a=await page.evaluate(()=>({hash:location.hash,active:[...document.querySelectorAll('.view.on')].map(x=>x.id),mission:!!document.querySelector('#speakMission'),inert:document.querySelectorAll('[inert]').length}));await page.locator('[data-nav="home"]:visible, [data-header-nav="home"]:visible, [data-fixed-nav="home"]:visible').first().click({timeout:2000});await page.waitForTimeout(35);const b=await page.evaluate(()=>({hash:location.hash,active:[...document.querySelectorAll('.view.on')].map(x=>x.id),mission:!!document.querySelector('#speakMission'),inert:document.querySelectorAll('[inert]').length}));repeat.push({i,speak:a,home:b,ok:true})}catch(e){repeat.push({i,ok:false,error:e.message});break}
}
console.log('REPEAT_10X_RESULT',JSON.stringify(repeat));
console.log('FINAL_COUNTERS',JSON.stringify(await page.evaluate(()=>window.__SPEAK_PROOF)));
await browser.close();
