import { chromium, webkit } from 'playwright';
const TARGET=process.env.TARGET_URL||'https://gisoogholizade-ux.github.io/lifelingo/';
const PHASE=process.env.PHASE||'landing';
const WIDTH=Number(process.env.WIDTH||390);
const ENGINE=process.env.ENGINE==='webkit'?webkit:chromium;
const log=(k,v='')=>console.log(`[PHASE:${PHASE}] ${k}${v!==''?' '+(typeof v==='string'?v:JSON.stringify(v)):''}`);
const fail=(m)=>{throw new Error(`[PHASE:${PHASE}] ${m}`)};
const ok=(c,m)=>{if(!c)fail(m);log('PASS',m)};
const browser=await ENGINE.launch({headless:true});
const page=await browser.newPage({viewport:{width:WIDTH,height:844},isMobile:true,hasTouch:true});
page.setDefaultTimeout(3500);
page.on('pageerror',e=>log('PAGEERROR',e.message));
page.on('console',m=>{if(m.type()==='error')log('CONSOLE_ERROR',m.text())});
await page.addInitScript(()=>{
 window.__P={ticks:0,adds:0,hash:0,pop:0};
 addEventListener('DOMContentLoaded',()=>{
   setInterval(()=>window.__P.ticks++,20);
   new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes||[])if(n.nodeType===1&&(n.id==='speakMission'||n.querySelector?.('#speakMission')))window.__P.adds++}).observe(document.body,{subtree:true,childList:true});
 },{once:true});
 addEventListener('hashchange',()=>window.__P.hash++);addEventListener('popstate',()=>window.__P.pop++);
});
await page.goto(TARGET,{waitUntil:'networkidle',timeout:45000});
await page.waitForTimeout(700);
await page.evaluate(()=>{
 document.querySelector('#authScreen')?.classList.add('hidden');document.querySelector('#appScreen')?.classList.remove('hidden');document.querySelector('#onboarding')?.classList.add('hidden');
 if(!window.llSupabase)throw new Error('llSupabase missing');
 window.llSupabase.auth.getSession=async()=>({data:{session:{access_token:'PHASE_TEST'}},error:null});
});
const snapshot=()=>page.evaluate(()=>({hash:location.hash,active:[...document.querySelectorAll('.view.on')].map(x=>x.id),mission:document.querySelectorAll('#speakMission').length,parent:document.querySelector('#speakMission')?.parentElement?.id||'',premium:document.querySelectorAll('.llPremiumStage').length,inert:[...document.querySelectorAll('[inert]')].map(x=>x.id||x.className||x.tagName),bodyPE:getComputedStyle(document.body).pointerEvents,htmlPE:getComputedStyle(document.documentElement).pointerEvents,ticks:window.__P.ticks,adds:window.__P.adds,bodyClass:document.body.className}));
async function alive(label){const a=await page.evaluate(()=>window.__P.ticks);await page.waitForTimeout(120);const b=await page.evaluate(()=>window.__P.ticks);ok(b-a>=3,`${label} main-thread alive ${a}->${b}`)}
async function nav(n){await page.locator(`[data-nav="${n}"]:visible`).first().click();await page.waitForTimeout(35);const s=await snapshot();ok(s.active.length===1&&s.active[0]===`view-${n}`,`nav ${n} active=${s.active.join(',')}`);return s}
async function openAirport(){const before=await page.evaluate(()=>window.__P.adds);await page.locator('[data-canonical-scenario="airport"]:visible').first().click();await page.waitForTimeout(80);const s=await snapshot();ok(s.hash==='#speak/scenario/airport',`airport hash ${s.hash}`);ok(s.mission===1,`airport mission count ${s.mission}`);ok(s.parent==='speakRoot',`airport parent ${s.parent}`);ok(s.premium===1,`premium stage count ${s.premium}`);ok(s.inert.length===0,'airport inert empty');ok(s.bodyPE!=='none'&&s.htmlPE!=='none',`airport pointer ${s.bodyPE}/${s.htmlPE}`);ok(s.adds-before===1,`airport mount delta ${s.adds-before}`);await alive('airport');return s}
async function back(){await page.locator('[data-mission-exit]:visible').first().click();await page.waitForTimeout(45);const s=await snapshot();ok(s.hash==='#speak'&&s.mission===0,`back clean hash=${s.hash} mission=${s.mission}`);ok(s.inert.length===0&&s.bodyPE!=='none','back input restored');await alive('back');return s}
async function hit(sel){const el=page.locator(sel).first(),b=await el.boundingBox();if(!b)return null;return page.evaluate(({x,y})=>{const sm=e=>{if(!e)return null;const s=getComputedStyle(e);return{tag:e.tagName,id:e.id||'',cls:String(e.className||''),position:s.position,zIndex:s.zIndex,pointerEvents:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity}};return{top:sm(document.elementFromPoint(x,y)),stack:document.elementsFromPoint(x,y).slice(0,10).map(sm)}},{x:b.x+b.width/2,y:b.y+b.height/2})}
try{
 log('START',{engine:process.env.ENGINE||'chromium',width:WIDTH});
 if(PHASE==='landing'){
   await nav('home');const before=await snapshot();await nav('speak');const after=await snapshot();ok(after.hash==='#speak','landing hash #speak');ok(after.mission===0,'landing mission absent');ok(after.inert.length===0,'landing inert empty');ok(after.bodyPE!=='none'&&after.htmlPE!=='none','landing pointer enabled');await alive('landing');log('HIT_HOME',await hit('[data-nav="home"]:visible'));log('HIT_LEARN',await hit('[data-nav="learn"]:visible'));log('HIT_PROFILE',await hit('[data-nav="profile"]:visible'));log('STATE',{before,after});
 } else if(PHASE==='airport'){
   await nav('speak');const m=await openAirport();log('MISSION',m);log('HIT_HOME',await hit('[data-nav="home"]:visible'));await back();await nav('home');
 } else if(PHASE==='tenx'){
   await nav('speak');const start=await page.evaluate(()=>window.__P.adds);for(let i=1;i<=10;i++){log('CYCLE_START',i);await openAirport();await back();log('CYCLE_DONE',i)}const end=await page.evaluate(()=>window.__P.adds);ok(end-start===10,`10x mount delta ${end-start}`);
 } else if(PHASE==='rapid'){
   await nav('speak');const start=await page.evaluate(()=>window.__P.adds);const button=page.locator('[data-canonical-scenario="airport"]:visible').first();await button.dispatchEvent('click');log('FIRST_DISPATCH_RETURN');try{await button.dispatchEvent('click',{},{timeout:1000});log('SECOND_DISPATCH_RETURN')}catch(e){log('SECOND_DISPATCH_ERROR',e.message.split('\n')[0])}await page.waitForTimeout(120);const s=await snapshot();const delta=s.adds-start;log('RAPID_STATE',{delta,...s});ok(s.mission===1,'rapid final mission one');ok(delta===1,`rapid mount delta ${delta}`);await alive('rapid');
 } else if(PHASE==='access'){
   await nav('speak');await page.evaluate(()=>{const sb=window.llSupabase,orig=sb.rpc.bind(sb);sb.rpc=async(n,a)=>n==='my_membership'?{data:null,error:new Error('SIMULATED_ACCESS_FAILURE')}:orig(n,a)});await page.locator('[data-canonical-scenario="transport"]:visible').first().click();await page.waitForTimeout(80);let s=await snapshot();ok(await page.locator('.speakError:visible').count()===1,'access error scoped');ok(s.mission===0&&s.inert.length===0,'access error no mission/inert');await alive('access-error');await page.locator('[data-speak-retry]:visible').first().click();await page.waitForTimeout(50);s=await snapshot();ok(s.active[0]==='view-speak'&&s.mission===0,'access retry interactive');await page.locator('[data-canonical-scenario="transport"]:visible').first().click();await page.waitForTimeout(60);await page.locator('[data-speak-back]:visible').first().click();await page.waitForTimeout(50);s=await snapshot();ok(s.hash==='#speak'&&s.mission===0,'access back interactive');
 } else if(PHASE==='mobile'){
   await nav('speak');await openAirport();await back();await nav('home');await nav('profile');const s=await snapshot();ok(s.inert.length===0&&s.bodyPE!=='none','mobile no input residue');
 } else fail(`unknown phase ${PHASE}`);
 log('DONE',await snapshot());
}catch(e){log('FATAL',e.stack||e.message);process.exitCode=1}finally{await browser.close().catch(()=>{})}
