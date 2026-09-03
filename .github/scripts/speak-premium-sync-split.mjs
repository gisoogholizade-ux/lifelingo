import { chromium } from 'playwright';
const TARGET='https://gisoogholizade-ux.github.io/lifelingo/';

async function run(name, transform){
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  if(transform){
    await page.route('**/lifelingo-premium-speak.js*', async route=>{
      const response=await route.fetch();
      const body=await response.text();
      const changed=transform(body);
      console.log(name,'TRANSFORM_CHANGED',changed!==body);
      await route.fulfill({response,body:changed,headers:{...response.headers(),'content-type':'application/javascript; charset=utf-8'}});
    });
  }
  page.on('pageerror',e=>console.log(name,'PAGEERROR',e.message));
  await page.goto(TARGET,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(900);
  await page.evaluate(()=>{document.querySelector('#authScreen')?.classList.add('hidden');document.querySelector('#appScreen')?.classList.remove('hidden');document.querySelector('#onboarding')?.classList.add('hidden')});
  await page.locator('[data-nav="speak"]:visible').first().click({timeout:2500});
  await page.waitForTimeout(60);
  await page.evaluate(()=>{window.llSupabase.auth.getSession=async()=>({data:{session:{access_token:'DIAG'}},error:null});window.__alive=0;setInterval(()=>window.__alive++,20)});
  const airport=page.locator('[data-canonical-scenario="airport"]:visible').first();
  const click=airport.click({timeout:1800}).then(()=>({click:'returned'})).catch(e=>({click:'timeout',message:e.message.split('\n')[0]}));
  const result=await Promise.race([click,new Promise(r=>setTimeout(()=>r({click:'outer-timeout'}),2300))]);
  let probe;try{probe=await Promise.race([page.evaluate(()=>({alive:window.__alive,mission:!!document.querySelector('#speakMission'),premium:!!document.querySelector('.llPremiumStage'),premiumFlag:document.querySelector('#speakCinema')?.dataset.premium||null,hash:location.hash})),new Promise(r=>setTimeout(()=>r({protocol:'timeout'}),700))])}catch(e){probe={protocol:e.message}}
  console.log(name,'RESULT',JSON.stringify(result),JSON.stringify(probe));
  await browser.close().catch(()=>{});
}

const replaceSync = body => fn => body.replace("function sync(){if(!stage)return;updateProgress();feedbackState()}",fn);
const cases=[
  ['BASE',null],
  ['PROGRESS_ONLY', body=>replaceSync(body)("function sync(){if(!stage)return;updateProgress()}" )],
  ['FEEDBACK_ONLY', body=>replaceSync(body)("function sync(){if(!stage)return;feedbackState()}" )],
  ['PROGRESS_NO_SETSTATE', body=>body.replace("function sync(){if(!stage)return;updateProgress();feedbackState()}","function sync(){if(!stage)return;updateProgress()}").replace(/if\(n!==lastTurn\)\{lastTurn=n;setState\('MOVING'\);clearTimeout\(reactTimer\);reactTimer=setTimeout\(\(\)=>setState\('IDLE'\),[^}]+\)\}/,"if(n!==lastTurn){lastTurn=n}")],
  ['FEEDBACK_NO_SETSTATE', body=>body.replace("function sync(){if(!stage)return;updateProgress();feedbackState()}","function sync(){if(!stage)return;feedbackState()}").replace(/function setState\(next\)\{[^}]+\}/,"function setState(next){state=next}")],
];
for(const [name,fn] of cases){console.log('\n===',name,'===');try{await run(name,fn)}catch(e){console.log(name,'CASE_ERROR',e.message)}}
