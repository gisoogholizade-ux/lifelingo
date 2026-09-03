import { chromium } from 'playwright';

const TARGET = process.env.TARGET_URL || 'https://gisoogholizade-ux.github.io/lifelingo/';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});

page.on('console', m => console.log(`[BROWSER:${m.type()}] ${m.text()}`));
page.on('pageerror', e => console.log(`[PAGEERROR] ${e.stack || e.message}`));

await page.addInitScript(() => {
  const D = window.__SPEAK_PROOF = {
    regs: [], fires: [], hashchanges: 0, popstates: 0, pushStates: 0, replaceStates: 0,
    mutationCallbacks: 0, mutationRecords: 0
  };
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  const wrappers = new WeakMap();
  const src = fn => { try { return String(fn).replace(/\s+/g,' ').slice(0,350); } catch { return ''; } };
  const name = target => target === document ? 'document' : target === window ? 'window' : `${target?.tagName || target?.constructor?.name || 'unknown'}#${target?.id || ''}.${String(target?.className || '').replace(/\s+/g,'.')}`;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if ((type === 'click' || type === 'pointerdown' || type === 'pointerup' || type === 'touchstart' || type === 'touchend') && typeof listener === 'function') {
      const meta = {type, target:name(this), source:src(listener), capture:!!(typeof options === 'boolean' ? options : options?.capture)};
      D.regs.push(meta);
      const wrapped = function(ev) {
        const before = {defaultPrevented:ev.defaultPrevented, cancelBubble:ev.cancelBubble};
        let out;
        try { out = listener.call(this, ev); }
        finally {
          D.fires.push({...meta, eventTarget:name(ev.target), before, after:{defaultPrevented:ev.defaultPrevented, cancelBubble:ev.cancelBubble}, hash:location.hash});
        }
        return out;
      };
      let perListener = wrappers.get(listener); if (!perListener) { perListener = new WeakMap(); wrappers.set(listener, perListener); }
      perListener.set(this, wrapped);
      return add.call(this, type, wrapped, options);
    }
    return add.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function(type, listener, options) {
    const wrapped = typeof listener === 'function' ? wrappers.get(listener)?.get(this) : null;
    return remove.call(this, type, wrapped || listener, options);
  };
  add.call(window,'hashchange',()=>D.hashchanges++);
  add.call(window,'popstate',()=>D.popstates++);
  const push=history.pushState.bind(history), replace=history.replaceState.bind(history);
  history.pushState=(...a)=>{D.pushStates++; return push(...a)};
  history.replaceState=(...a)=>{D.replaceStates++; return replace(...a)};
  const NativeMO = window.MutationObserver;
  window.MutationObserver = class extends NativeMO {
    constructor(cb){ super((records, obs)=>{D.mutationCallbacks++;D.mutationRecords+=records.length;return cb(records,obs)}); }
  };
});

await page.goto(TARGET, {waitUntil:'networkidle', timeout:60000});
await page.waitForTimeout(1800);

// No fake auth or mission launch: only expose the already-loaded unified shell so routing/hit-testing can be exercised.
await page.evaluate(() => {
  document.querySelector('#authScreen')?.classList.add('hidden');
  document.querySelector('#appScreen')?.classList.remove('hidden');
  document.querySelector('#onboarding')?.classList.add('hidden');
});
await page.waitForTimeout(300);

const state = async label => page.evaluate(label => {
  const css = el => { const s=getComputedStyle(el); return {position:s.position,zIndex:s.zIndex,pointerEvents:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity,overflow:s.overflow,touchAction:s.touchAction,userSelect:s.userSelect}; };
  const box = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; };
  const brief = el => el ? {tagName:el.tagName,id:el.id,className:String(el.className || ''),rect:box(el),css:css(el),inert:el.hasAttribute('inert'),ariaHidden:el.getAttribute('aria-hidden'),ariaModal:el.getAttribute('aria-modal')} : null;
  const active=[...document.querySelectorAll('.view.on')].map(brief);
  const candidates=[...document.querySelectorAll('#speakMission,.speakMission,.speakMissionShell,.speakCinema,dialog,.modal,.backdrop,[class*="overlay" i],[class*="scene" i],canvas')].map(brief);
  return {label,url:location.href,hash:location.hash,activeViewCount:active.length,active,mission:brief(document.querySelector('#speakMission')),candidates,inert:[...document.querySelectorAll('[inert]')].map(brief),body:{className:document.body.className,style:document.body.style.cssText,css:css(document.body)},html:{className:document.documentElement.className,style:document.documentElement.style.cssText,css:css(document.documentElement)}};
}, label);

const hitAt = async (label, selector) => page.evaluate(({label,selector}) => {
  const all=[...document.querySelectorAll(selector)].filter(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});
  const target=all[0]; if(!target) return {label,selector,error:'no visible target'};
  const r=target.getBoundingClientRect(), x=Math.max(0,Math.min(innerWidth-1,r.left+r.width/2)), y=Math.max(0,Math.min(innerHeight-1,r.top+r.height/2));
  const brief=el=>{if(!el)return null;const s=getComputedStyle(el),q=el.getBoundingClientRect();return{tagName:el.tagName,id:el.id,className:String(el.className||''),rect:{x:q.x,y:q.y,width:q.width,height:q.height},position:s.position,zIndex:s.zIndex,pointerEvents:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity}};
  return {label,selector,point:{x,y},target:brief(target),elementFromPoint:brief(document.elementFromPoint(x,y)),elementsFromPoint:document.elementsFromPoint(x,y).slice(0,10).map(brief)};
},{label,selector});

console.log('PROOF_BEFORE', JSON.stringify(await state('before')));

const home = page.locator('[data-nav="home"]:visible, [data-header-nav="home"]:visible').first();
if (await home.count()) { try { await home.click({timeout:3000}); await page.waitForTimeout(100); } catch {} }
const urlBefore = page.url();
const activeBefore = await page.evaluate(()=>[...document.querySelectorAll('.view.on')].map(x=>x.id));
const speak = page.locator('[data-nav="speak"]:visible, [data-header-nav="speak"]:visible, [data-fixed-nav="speak"]:visible').first();
if (!await speak.count()) throw new Error('No visible Speak navigation control');
console.log('EXACT_CLICK_ELEMENT', JSON.stringify(await speak.evaluate(el=>({tagName:el.tagName,id:el.id,className:String(el.className||''),outerHTML:el.outerHTML}))));
console.log('URL_BEFORE_CLICK', urlBefore);
console.log('ACTIVE_BEFORE_CLICK', JSON.stringify(activeBefore));

const fireStart = await page.evaluate(()=>window.__SPEAK_PROOF.fires.length);
await speak.click({timeout:5000});
await page.waitForTimeout(250);
const fireEnd = await page.evaluate(()=>window.__SPEAK_PROOF.fires.length);

console.log('PROOF_AFTER_250MS', JSON.stringify(await state('after250')));
console.log('HIT_HOME', JSON.stringify(await hitAt('home','[data-nav="home"], [data-header-nav="home"], [data-fixed-nav="home"]')));
console.log('HIT_LEARN', JSON.stringify(await hitAt('learn','[data-nav="learn"], [data-header-nav="learn"], [data-fixed-nav="learn"]')));
console.log('HIT_PROFILE', JSON.stringify(await hitAt('profile','[data-nav="profile"], [data-header-nav="profile"], [data-fixed-nav="profile"], #topAvatar')));
console.log('HIT_CENTER', JSON.stringify(await page.evaluate(()=>{const x=innerWidth/2,y=innerHeight/2;const b=el=>{if(!el)return null;const s=getComputedStyle(el),r=el.getBoundingClientRect();return{tagName:el.tagName,id:el.id,className:String(el.className||''),rect:{x:r.x,y:r.y,width:r.width,height:r.height},position:s.position,zIndex:s.zIndex,pointerEvents:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity}};return{point:{x,y},elementFromPoint:b(document.elementFromPoint(x,y)),elementsFromPoint:document.elementsFromPoint(x,y).slice(0,10).map(b)}})));

const timer = await page.evaluate(()=>new Promise(resolve=>{const a=performance.now();setTimeout(()=>resolve(performance.now()-a),100)}));
console.log('MAIN_THREAD_100MS_TIMER', timer);
const debug = await page.evaluate(({a,b})=>({...window.__SPEAK_PROOF, firesForSpeakClick:window.__SPEAK_PROOF.fires.slice(a,b)}),{a:fireStart,b:fireEnd});
console.log('RUNTIME_COUNTERS_AND_HANDLERS', JSON.stringify(debug));

for (const [name, selector] of [['Home','[data-nav="home"]:visible, [data-header-nav="home"]:visible, [data-fixed-nav="home"]:visible'],['Learn','[data-nav="learn"]:visible, [data-header-nav="learn"]:visible, [data-fixed-nav="learn"]:visible'],['Partners','[data-nav="partners"]:visible, [data-header-nav="partners"]:visible, [data-fixed-nav="partners"]:visible'],['Profile','[data-nav="profile"]:visible, [data-header-nav="profile"]:visible, [data-fixed-nav="profile"]:visible, #topAvatar:visible']]) {
  try { const el=page.locator(selector).first(); await el.click({timeout:2500}); await page.waitForTimeout(100); console.log(`POST_SPEAK_${name}_CLICK_OK`, JSON.stringify({url:page.url(),active:await page.evaluate(()=>[...document.querySelectorAll('.view.on')].map(x=>x.id))})); }
  catch(e) { console.log(`POST_SPEAK_${name}_CLICK_FAIL`, e.message); }
}

await browser.close();
