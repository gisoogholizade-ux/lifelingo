import { chromium, webkit } from 'playwright';

const TARGET=process.env.TARGET_URL||'https://gisoogholizade-ux.github.io/lifelingo/';
const failures=[];
const results=[];
const assert=(ok,msg,detail='')=>{if(!ok){const line=`FAIL ${msg}${detail?` :: ${detail}`:''}`;failures.push(line);console.error(line);throw new Error(line)}console.log(`PASS ${msg}${detail?` :: ${detail}`:''}`)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function installInstrumentation(page){
  return page.addInitScript(()=>{
    window.__LL_ACCEPT={hashchange:0,popstate:0,pushState:[],replaceState:[],clicks:[],missionAdds:0,timerTicks:0};
    const hp=history.pushState.bind(history),hr=history.replaceState.bind(history);
    history.pushState=function(...args){window.__LL_ACCEPT.pushState.push(String(args[2]||''));return hp(...args)};
    history.replaceState=function(...args){window.__LL_ACCEPT.replaceState.push(String(args[2]||''));return hr(...args)};
    window.addEventListener('hashchange',()=>window.__LL_ACCEPT.hashchange++);
    window.addEventListener('popstate',()=>window.__LL_ACCEPT.popstate++);
    document.addEventListener('click',e=>{
      const el=e.target?.closest?.('[data-nav],[data-header-nav],[data-fixed-nav],[data-canonical-scenario],[data-mission-exit],[data-speak-retry],[data-speak-back]');
      if(el)window.__LL_ACCEPT.clicks.push({tag:el.tagName,id:el.id||'',cls:String(el.className||''),nav:el.dataset.nav||el.dataset.headerNav||el.dataset.fixedNav||'',scenario:el.dataset.canonicalScenario||'',missionExit:el.hasAttribute('data-mission-exit')});
    },true);
    document.addEventListener('DOMContentLoaded',()=>{
      const mo=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes||[])if(n.nodeType===1&&(n.id==='speakMission'||n.querySelector?.('#speakMission')))window.__LL_ACCEPT.missionAdds++});
      mo.observe(document.body,{subtree:true,childList:true});
      setInterval(()=>window.__LL_ACCEPT.timerTicks++,20);
    },{once:true});
  });
}

async function prep(page){
  page.setDefaultTimeout(4000);
  await installInstrumentation(page);
  const consoleErrors=[];
  page.on('pageerror',e=>consoleErrors.push(`pageerror:${e.message}`));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(`console:${m.text()}`)});
  await page.goto(TARGET,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(900);
  await page.evaluate(()=>{
    document.querySelector('#authScreen')?.classList.add('hidden');
    document.querySelector('#appScreen')?.classList.remove('hidden');
    document.querySelector('#onboarding')?.classList.add('hidden');
    const sb=window.llSupabase;
    if(!sb)throw new Error('llSupabase missing');
    sb.auth.getSession=async()=>({data:{session:{access_token:'ACCEPTANCE_FREE'}},error:null});
  });
  return consoleErrors;
}

async function hit(page,selector){
  const el=page.locator(selector).filter({visible:true}).first();
  const box=await el.boundingBox();
  if(!box)return null;
  return page.evaluate(({x,y})=>{
    const summarize=e=>{if(!e)return null;const s=getComputedStyle(e);return{tagName:e.tagName,id:e.id||'',className:String(e.className||''),position:s.position,zIndex:s.zIndex,pointerEvents:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity}};
    return{point:{x,y},top:summarize(document.elementFromPoint(x,y)),stack:document.elementsFromPoint(x,y).slice(0,10).map(summarize)};
  },{x:box.x+box.width/2,y:box.y+box.height/2});
}

async function state(page){
  return page.evaluate(()=>({
    url:location.href,hash:location.hash,
    active:[...document.querySelectorAll('.view.on')].map(e=>e.id),
    missionCount:document.querySelectorAll('#speakMission').length,
    missionParent:document.querySelector('#speakMission')?.parentElement?.id||'',
    premiumStage:document.querySelectorAll('.llPremiumStage').length,
    inert:[...document.querySelectorAll('[inert]')].map(e=>e.id||e.className||e.tagName),
    bodyClass:document.body.className,bodyStyle:document.body.style.cssText,htmlClass:document.documentElement.className,htmlStyle:document.documentElement.style.cssText,
    bodyPointer:getComputedStyle(document.body).pointerEvents,htmlPointer:getComputedStyle(document.documentElement).pointerEvents,
    bodyOverflow:getComputedStyle(document.body).overflow,bodyTouchAction:getComputedStyle(document.body).touchAction,
    timerTicks:window.__LL_ACCEPT.timerTicks,
    hashchange:window.__LL_ACCEPT.hashchange,popstate:window.__LL_ACCEPT.popstate,
    pushState:[...window.__LL_ACCEPT.pushState],replaceState:[...window.__LL_ACCEPT.replaceState],missionAdds:window.__LL_ACCEPT.missionAdds
  }));
}

async function timerAlive(page,label){
  const before=await page.evaluate(()=>window.__LL_ACCEPT.timerTicks);
  await page.waitForTimeout(140);
  const after=await page.evaluate(()=>window.__LL_ACCEPT.timerTicks);
  assert(after-before>=3,`${label}: main thread responsive`,`ticks ${before}->${after}`);
}

async function clickNav(page,name){
  const sel=`[data-nav="${name}"]:visible`;
  await page.locator(sel).first().click();
  await page.waitForTimeout(40);
  const s=await state(page);
  assert(s.active.length===1&&s.active[0]===`view-${name}`,`navigate ${name}`,JSON.stringify({hash:s.hash,active:s.active}));
  await timerAlive(page,`navigate ${name}`);
  return s;
}

async function fullChromium390(){
  console.log('\n=== CHROMIUM 390 FULL ===');
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const consoleErrors=await prep(page);
  await clickNav(page,'home');
  const before=await state(page);
  await clickNav(page,'speak');
  const landing=await state(page);
  assert(landing.hash==='#speak','Home -> Speak hash','#speak');
  assert(landing.missionCount===0,'Speak landing does not mount mission');
  assert(landing.inert.length===0,'Speak landing has no inert');
  assert(landing.bodyPointer!=='none'&&landing.htmlPointer!=='none','Speak landing pointer state',`${landing.bodyPointer}/${landing.htmlPointer}`);
  const homeHit=await hit(page,'[data-nav="home"]:visible');
  const learnHit=await hit(page,'[data-nav="learn"]:visible');
  const profileHit=await hit(page,'[data-nav="profile"]:visible');
  const center=await page.evaluate(()=>{const x=innerWidth/2,y=innerHeight/2;const summarize=e=>{if(!e)return null;const s=getComputedStyle(e);return{tagName:e.tagName,id:e.id||'',className:String(e.className||''),position:s.position,zIndex:s.zIndex,pointerEvents:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity}};return{top:summarize(document.elementFromPoint(x,y)),stack:document.elementsFromPoint(x,y).slice(0,10).map(summarize)}});
  console.log('LANDING_HIT_HOME',JSON.stringify(homeHit));
  console.log('LANDING_HIT_LEARN',JSON.stringify(learnHit));
  console.log('LANDING_HIT_PROFILE',JSON.stringify(profileHit));
  console.log('LANDING_HIT_CENTER',JSON.stringify(center));
  assert(homeHit?.stack?.some(e=>e.tagName==='BUTTON'&&String(e.className).includes('')),'Home hit stack contains button');

  for(const name of ['home','learn','partners','profile','speak'])await clickNav(page,name);

  const addsBefore=await page.evaluate(()=>window.__LL_ACCEPT.missionAdds);
  const airport=page.locator('[data-canonical-scenario="airport"]:visible').first();
  await airport.click({timeout:4000});
  await page.waitForTimeout(120);
  const mission=await state(page);
  console.log('MISSION_STATE',JSON.stringify(mission));
  assert(mission.hash==='#speak/scenario/airport','Airport route hash');
  assert(mission.missionCount===1,'Airport mounts exactly one mission DOM');
  assert(mission.missionParent==='speakRoot','Mission normalized inside speakRoot',mission.missionParent);
  assert(mission.premiumStage===1,'Premium stage present exactly once');
  assert(mission.inert.length===0,'Mission leaves global app non-inert');
  assert(mission.bodyPointer!=='none'&&mission.htmlPointer!=='none','Mission leaves global pointer events enabled',`${mission.bodyPointer}/${mission.htmlPointer}`);
  await timerAlive(page,'Airport mission');
  const homeMissionHit=await hit(page,'[data-nav="home"]:visible');
  console.log('MISSION_HIT_HOME',JSON.stringify(homeMissionHit));
  assert(homeMissionHit?.stack?.some(e=>e.tagName==='BUTTON'),'Mission: Home remains in hit stack');
  const addsAfter=await page.evaluate(()=>window.__LL_ACCEPT.missionAdds);
  assert(addsAfter-addsBefore===1,'Airport mission mount count is one',`${addsBefore}->${addsAfter}`);

  await page.locator('[data-mission-exit]:visible').first().click();
  await page.waitForTimeout(80);
  let exited=await state(page);
  assert(exited.hash==='#speak'&&exited.missionCount===0,'Airport -> Back returns to clean Speak',JSON.stringify({hash:exited.hash,mission:exited.missionCount}));
  await clickNav(page,'home');

  await clickNav(page,'speak');
  const cycleStartAdds=await page.evaluate(()=>window.__LL_ACCEPT.missionAdds);
  for(let i=1;i<=10;i++){
    await page.locator('[data-canonical-scenario="airport"]:visible').first().click({timeout:4000});
    await page.waitForTimeout(50);
    const ms=await state(page);
    assert(ms.missionCount===1&&ms.premiumStage===1,`cycle ${i}: mission opens once`);
    await timerAlive(page,`cycle ${i}: mission`);
    await page.locator('[data-mission-exit]:visible').first().click({timeout:4000});
    await page.waitForTimeout(50);
    const bs=await state(page);
    assert(bs.hash==='#speak'&&bs.missionCount===0,`cycle ${i}: back cleans mission`);
    assert(bs.inert.length===0&&bs.bodyPointer!=='none',`cycle ${i}: global input restored`);
  }
  const cycleAdds=await page.evaluate(()=>window.__LL_ACCEPT.missionAdds);
  assert(cycleAdds-cycleStartAdds===10,'10 cycles created exactly 10 missions',`${cycleStartAdds}->${cycleAdds}`);

  // Rapid double-click: count actual mission insertions, not just final DOM count.
  const rapidBefore=await page.evaluate(()=>window.__LL_ACCEPT.missionAdds);
  const rapid=page.locator('[data-canonical-scenario="airport"]:visible').first();
  await rapid.dispatchEvent('click');
  await rapid.dispatchEvent('click').catch(()=>{});
  await page.waitForTimeout(120);
  const rapidState=await state(page);
  const rapidAdded=rapidState.missionAdds-rapidBefore;
  console.log('RAPID_STATE',JSON.stringify({rapidAdded,...rapidState}));
  assert(rapidState.missionCount===1,'rapid Speak leaves one mission DOM');
  // Do not fail here on >1 yet; report precisely so product can be fixed if needed.
  results.push({rapidAdded});
  await page.locator('[data-mission-exit]:visible').first().click();
  await page.waitForTimeout(60);

  // Simulate immediate premium access failure without waiting for a timeout.
  await page.evaluate(()=>{
    const sb=window.llSupabase,orig=sb.rpc.bind(sb);
    window.__LL_ORIG_RPC=orig;
    sb.rpc=async(name,args)=>name==='my_membership'?{data:null,error:new Error('SIMULATED_ACCESS_FAILURE')} : orig(name,args);
  });
  const transport=page.locator('[data-canonical-scenario="transport"]:visible').first();
  await transport.click({timeout:4000});
  await page.waitForTimeout(100);
  let err=await state(page);
  assert(!!(await page.locator('.speakError:visible').count()),'simulated access failure renders scoped Speak error');
  assert(err.missionCount===0&&err.inert.length===0,'access failure leaves no mission/inert');
  await timerAlive(page,'access failure');
  await page.locator('[data-speak-retry]:visible').first().click({timeout:4000});
  await page.waitForTimeout(60);
  let retry=await state(page);
  assert(retry.active[0]==='view-speak'&&retry.missionCount===0,'failed access -> Try Again remains interactive');
  // Simulate failure again, then Back.
  await page.locator('[data-canonical-scenario="transport"]:visible').first().click({timeout:4000});
  await page.waitForTimeout(80);
  await page.locator('[data-speak-back]:visible').first().click({timeout:4000});
  await page.waitForTimeout(60);
  let back=await state(page);
  assert(back.hash==='#speak'&&back.missionCount===0,'failed access -> Back returns cleanly');
  await clickNav(page,'home');
  await clickNav(page,'profile');

  const final=await state(page);
  console.log('CHROMIUM_390_FINAL',JSON.stringify({before,landing,final,consoleErrors,clicks:await page.evaluate(()=>window.__LL_ACCEPT.clicks)}));
  results.push({engine:'chromium',width:390,landing,mission,homeHit,learnHit,profileHit,center,homeMissionHit,final,consoleErrors});
  await browser.close();
}

async function mobileSmoke(engine,name,width){
  const browser=await engine.launch({headless:true});
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=await prep(page);
  await clickNav(page,'speak');
  await page.locator('[data-canonical-scenario="airport"]:visible').first().click({timeout:4000});
  await page.waitForTimeout(80);
  const m=await state(page);
  assert(m.missionCount===1&&m.premiumStage===1,`${name} ${width}: Airport opens`);
  await timerAlive(page,`${name} ${width}: Airport`);
  await page.locator('[data-mission-exit]:visible').first().click({timeout:4000});
  await page.waitForTimeout(60);
  await clickNav(page,'home');
  await clickNav(page,'profile');
  const s=await state(page);
  assert(s.inert.length===0&&s.bodyPointer!=='none',`${name} ${width}: no touch interception residue`);
  results.push({engine:name,width,state:s,errors});
  await browser.close();
}

try{
  await fullChromium390();
  for(const w of [375,430])await mobileSmoke(chromium,'chromium',w);
  await mobileSmoke(webkit,'webkit',390);
  const rapid=results.find(x=>Object.prototype.hasOwnProperty.call(x,'rapidAdded'))?.rapidAdded;
  console.log('ACCEPTANCE_SUMMARY',JSON.stringify({failures,rapidMissionAdds:rapid,results},null,2));
  if(rapid!==1){console.error(`FAIL rapid double click mounted mission ${rapid} times; duplicate initialization remains`);process.exitCode=2}
}catch(e){
  console.error('ACCEPTANCE_FATAL',e.stack||e.message);
  console.log('ACCEPTANCE_PARTIAL',JSON.stringify({failures,results},null,2));
  process.exitCode=1;
}
