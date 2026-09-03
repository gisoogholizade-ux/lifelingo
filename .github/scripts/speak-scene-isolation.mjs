import { chromium } from 'playwright';
const TARGET='https://gisoogholizade-ux.github.io/lifelingo/';

async function test(name,blocked=[]){
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 for(const token of blocked) await page.route(`**/${token}*`,r=>{console.log(name,'BLOCK',r.request().url());return r.abort()});
 page.on('pageerror',e=>console.log(name,'PAGEERROR',e.message));
 await page.goto(TARGET,{waitUntil:'networkidle',timeout:60000});
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{document.querySelector('#authScreen')?.classList.add('hidden');document.querySelector('#appScreen')?.classList.remove('hidden');document.querySelector('#onboarding')?.classList.add('hidden')});
 console.log(name,'LOADED',JSON.stringify(await page.evaluate(()=>[...document.scripts].map(s=>s.src).filter(Boolean).map(x=>x.split('/').pop()))));
 await page.locator('[data-nav="speak"]:visible').first().click({timeout:2500});await page.waitForTimeout(80);
 await page.evaluate(()=>{window.llSupabase.auth.getSession=async()=>({data:{session:{access_token:'DIAG'}},error:null});window.__alive=0;setInterval(()=>window.__alive++,20)});
 const ap=page.locator('[data-canonical-scenario="airport"]:visible').first();
 const p=ap.click({timeout:1800}).then(()=>({click:'returned'})).catch(e=>({click:'timeout',message:e.message.split('\n')[0]}));
 const result=await Promise.race([p,new Promise(r=>setTimeout(()=>r({click:'outer-timeout'}),2300))]);
 let state;try{state=await Promise.race([page.evaluate(()=>({alive:window.__alive,mission:!!document.querySelector('#speakMission'),parent:document.querySelector('#speakMission')?.parentElement?.id||null,hash:location.hash,bodyClass:document.body.className})),new Promise(r=>setTimeout(()=>r({protocol:'timeout'}),700))])}catch(e){state={protocol:e.message}}
 console.log(name,'RESULT',JSON.stringify(result),JSON.stringify(state));
 await browser.close().catch(()=>{});
}

const cases=[
 ['BASE',[]],
 ['NO_PREMIUM',['lifelingo-premium-speak.js']],
 ['NO_BRAND',['lifelingo-brand-polish.js']],
 ['NO_AVATAR_RECOVERY',['lifelingo-avatar-legacy-recovery.js']],
 ['NO_I18N',['lifelingo-i18n.js']],
 ['NO_FRONTEND_STABILIZE',['lifelingo-frontend-stabilize.js']],
 ['NO_MATCHING_FIX',['lifelingo-matching-state-fix.js']],
 ['NO_AUTH_SESSION',['lifelingo-auth-session-guard.js']],
 ['NO_PREMIUM_NO_GUARDS',['lifelingo-premium-speak.js','lifelingo-speak-interaction-guard.js']],
];
for(const [n,b] of cases){console.log('\n===',n,'===');try{await test(n,b)}catch(e){console.log(n,'CASE_ERROR',e.message)}}
