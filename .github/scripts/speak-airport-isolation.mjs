import { chromium } from 'playwright';

const TARGET='https://gisoogholizade-ux.github.io/lifelingo/';

async function runCase(name,{blockGuardV1=false,blockGuardV2=false,disableSpeech=false}={}){
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  if(blockGuardV1||blockGuardV2){
    await page.route('**/lifelingo-speak-interaction-guard.js*',async route=>{
      const url=route.request().url();
      if((blockGuardV1&&url.includes('?v=1'))||(blockGuardV2&&url.includes('?v=2'))){console.log(name,'BLOCKED',url);return route.abort();}
      return route.continue();
    });
  }
  page.on('console',m=>{if(/LifeLingo Speak|SPEAK|DIAG/i.test(m.text()))console.log(name,'BROWSER',m.type(),m.text())});
  page.on('pageerror',e=>console.log(name,'PAGEERROR',e.message));
  await page.goto(TARGET,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(1200);
  await page.evaluate(()=>{document.querySelector('#authScreen')?.classList.add('hidden');document.querySelector('#appScreen')?.classList.remove('hidden');document.querySelector('#onboarding')?.classList.add('hidden')});
  await page.waitForTimeout(100);
  console.log(name,'SCRIPTS',JSON.stringify(await page.evaluate(()=>[...document.scripts].map(s=>({src:s.src,dataGuard:s.dataset.lifelingoSpeakInteractionGuard||null})).filter(x=>/speak-interaction|auth-session/i.test(x.src)))));
  await page.locator('[data-nav="speak"]:visible').first().click({timeout:3000});
  await page.waitForTimeout(100);
  await page.evaluate(disableSpeech=>{
    const sb=window.llSupabase;if(!sb)throw new Error('llSupabase missing');
    sb.auth.getSession=async()=>({data:{session:{access_token:'DIAG'}},error:null});
    if(disableSpeech&&window.speechSynthesis){try{window.speechSynthesis.cancel=()=>{};window.speechSynthesis.speak=()=>{}}catch{}}
    window.__diagAlive=0;setInterval(()=>window.__diagAlive++,25);
  },disableSpeech);
  const airport=page.locator('[data-canonical-scenario="airport"]:visible').first();
  const box=await airport.boundingBox();
  const clickPromise=airport.click({timeout:2500}).then(()=>({ok:true})).catch(e=>({ok:false,error:e.message.split('\n')[0]}));
  const result=await Promise.race([clickPromise,new Promise(r=>setTimeout(()=>r({ok:false,outerTimeout:true}),3000))]);
  let probe=null;
  try{probe=await Promise.race([page.evaluate(()=>({alive:window.__diagAlive,mission:!!document.querySelector('#speakMission'),missionParent:document.querySelector('#speakMission')?.parentElement?.id||null,bodyClass:document.body.className,inert:[...document.querySelectorAll('[inert]')].map(x=>x.id||x.className),hash:location.hash,speech:!!window.speechSynthesis,scripts:[...document.scripts].filter(s=>/speak-interaction-guard/.test(s.src)).map(s=>s.src)})),new Promise(r=>setTimeout(()=>r({protocolTimeout:true}),1000))])}catch(e){probe={protocolError:e.message}}
  console.log(name,'AIRPORT_RESULT',JSON.stringify(result),'BOX',JSON.stringify(box),'PROBE',JSON.stringify(probe));
  await browser.close().catch(()=>{});
}

for(const [name,opts] of [
  ['BASELINE',{}],
  ['NO_SPEECH',{disableSpeech:true}],
  ['NO_GUARD_V1',{blockGuardV1:true}],
  ['NO_GUARD_V2',{blockGuardV2:true}],
  ['NO_GUARDS',{blockGuardV1:true,blockGuardV2:true}],
]){
  console.log('\n===',name,'===');
  try{await runCase(name,opts)}catch(e){console.log(name,'CASE_ERROR',e.message)}
}
