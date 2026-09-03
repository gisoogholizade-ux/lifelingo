import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const TARGET='https://gisoogholizade-ux.github.io/lifelingo/';
const CURRENT=await readFile('lifelingo-premium-speak.js','utf8');

const oldWatch = body => body.replace(
  "function watch(){observer?.disconnect();observer=new MutationObserver(records=>{if(records.length&&records.every(isOwnStageMutation))return;if($('#speakMission'))build();else cleanup()});observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('llPageHidden',document.hidden));document.addEventListener('lifelingo:language-change',localizeHud)}",
  "function watch(){observer?.disconnect();observer=new MutationObserver(()=>{if($('#speakMission')){build();sync()}else cleanup()});observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style']});document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('llPageHidden',document.hidden));document.addEventListener('lifelingo:language-change',localizeHud)}"
);

async function run(name, transform){
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.route('**/lifelingo-premium-speak.js*', async route=>{
    let body=oldWatch(CURRENT);
    if(transform) body=transform(body);
    await route.fulfill({status:200,body,contentType:'application/javascript; charset=utf-8'});
  });
  page.on('pageerror',e=>console.log(name,'PAGEERROR',e.message));
  await page.goto(TARGET,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(800);
  await page.evaluate(()=>{document.querySelector('#authScreen')?.classList.add('hidden');document.querySelector('#appScreen')?.classList.remove('hidden');document.querySelector('#onboarding')?.classList.add('hidden')});
  await page.locator('[data-nav="speak"]:visible').first().click({timeout:2500}); await page.waitForTimeout(60);
  await page.evaluate(()=>{window.llSupabase.auth.getSession=async()=>({data:{session:{access_token:'DIAG'}},error:null});window.__alive=0;setInterval(()=>window.__alive++,20)});
  const airport=page.locator('[data-canonical-scenario="airport"]:visible').first();
  const click=airport.click({timeout:1800}).then(()=>({click:'returned'})).catch(e=>({click:'timeout',message:e.message.split('\n')[0]}));
  const result=await Promise.race([click,new Promise(r=>setTimeout(()=>r({click:'outer-timeout'}),2300))]);
  let probe; try{probe=await Promise.race([page.evaluate(()=>({alive:window.__alive,mission:!!document.querySelector('#speakMission'),premium:!!document.querySelector('.llPremiumStage')})),new Promise(r=>setTimeout(()=>r({protocol:'timeout'}),700))])}catch(e){probe={protocol:e.message}}
  console.log(name,'RESULT',JSON.stringify(result),JSON.stringify(probe));
  await browser.close().catch(()=>{});
}
const syncProgressOnly = b=>b.replace("function sync(){if(!stage)return;updateProgress();feedbackState()}","function sync(){if(!stage)return;updateProgress()}");
const syncFeedbackOnly = b=>b.replace("function sync(){if(!stage)return;updateProgress();feedbackState()}","function sync(){if(!stage)return;feedbackState()}");
const progressNoText = b=>syncProgressOnly(b).replace("setText($('.llMissionStep',stage),isFa()?`نوبت ${n} از ${total}`:`Turn ${n} of ${total}`);","");
const progressNoDots = b=>syncProgressOnly(b).replace("dots.forEach((d,i)=>{d.classList.toggle('done',i<n-1);d.classList.toggle('active',i===n-1)});","");
const feedbackStateNoWrite = b=>syncFeedbackOnly(b).replace(/function setState\(next\)\{[^\n]+?\}/,"function setState(next){state=next}");
for(const [name,fn] of [
 ['OLD_BASE',null],
 ['OLD_PROGRESS_ONLY',syncProgressOnly],
 ['OLD_FEEDBACK_ONLY',syncFeedbackOnly],
 ['OLD_PROGRESS_NO_TEXT',progressNoText],
 ['OLD_PROGRESS_NO_DOTS',progressNoDots],
 ['OLD_FEEDBACK_NO_STATE_WRITE',feedbackStateNoWrite],
]){console.log('\n===',name,'===');try{await run(name,fn)}catch(e){console.log(name,'CASE_ERROR',e.message)}}
