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
  let probe;
  try{probe=await Promise.race([page.evaluate(()=>({alive:window.__alive,mission:!!document.querySelector('#speakMission'),premium:!!document.querySelector('.llPremiumStage'),premiumFlag:document.querySelector('#speakCinema')?.dataset.premium||null,hash:location.hash})),new Promise(r=>setTimeout(()=>r({protocol:'timeout'}),700))])}catch(e){probe={protocol:e.message}}
  console.log(name,'RESULT',JSON.stringify(result),JSON.stringify(probe));
  await browser.close().catch(()=>{});
}

const filterStageMutations = s => s.replace(
  "observer=new MutationObserver(()=>{if($('#speakMission')){build();sync()}else cleanup()});",
  "observer=new MutationObserver(records=>{const relevant=records.some(r=>{const t=r.target?.nodeType===1?r.target:r.target?.parentElement;return !t?.closest?.('.llPremiumStage')});if(!relevant)return;if($('#speakMission')){build();sync()}else cleanup()});"
);
const idempotentText = s => s
  .replace("if(badge)badge.textContent=stateLabel(next)", "if(badge&&badge.textContent!==stateLabel(next))badge.textContent=stateLabel(next)")
  .replace("if(txt)txt.textContent=isFa()?`نوبت ${n} از ${total}`:`Turn ${n} of ${total}`;", "if(txt){const nextText=isFa()?`نوبت ${n} از ${total}`:`Turn ${n} of ${total}`;if(txt.textContent!==nextText)txt.textContent=nextText;}");
const childOnlyWithFilter = s => filterStageMutations(s).replace(
  "observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});",
  "observer.observe(document.body,{subtree:true,childList:true});"
);

for(const [name,fn] of [
  ['BASE',null],
  ['FILTER_STAGE_MUTATIONS',filterStageMutations],
  ['IDEMPOTENT_TEXT',idempotentText],
  ['CHILD_ONLY_FILTER_STAGE',childOnlyWithFilter],
]){
  console.log('\n===',name,'===');
  try{await run(name,fn)}catch(e){console.log(name,'CASE_ERROR',e.message)}
}
