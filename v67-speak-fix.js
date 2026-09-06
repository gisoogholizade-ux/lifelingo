(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s||'').toLowerCase().replace(/[.!?,]/g,' ').replace(/\s+/g,' ').trim();
class SpeakFlowError extends Error{constructor(code,message,cause){super(message);this.name='SpeakFlowError';this.code=code;this.cause=cause}}
const withTimeout=(promise,ms=9000,label='Request timed out',code='UNKNOWN_ERROR')=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new SpeakFlowError(code,label)),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)})});
const SPEAK_STATES=Object.freeze({IDLE:'IDLE',ENTERING:'ENTERING',AUTH_CHECK:'AUTH_CHECK',ACCESS_CHECK:'ACCESS_CHECK',SCENARIO_LOADING:'SCENARIO_LOADING',MISSION_LOADING:'MISSION_LOADING',ASSET_LOADING:'ASSET_LOADING',READY:'READY',LISTENING:'LISTENING',PROCESSING:'PROCESSING',FEEDBACK:'FEEDBACK',COMPLETED:'COMPLETED',ERROR:'ERROR'});
const T=(q,intents,en,keys,ex)=>({q,intents,en,keys,ex});
const S=(key,path,mission,icon,title,npc,place,type,free,turns)=>({key,path,mission,icon,title,npc,place,type,free,turns});
const scenarios={
 airport:S('airport','migration',0,'🛂','Passport Control','Immigration Officer','Airport','passport',true,[
  T("What's the purpose of your visit?",['work','study','visit','business'],'Say why you entered the country.','work · study · visit',"I'm here for work."),
  T('How long will you stay?',['day','week','month','year'],'Give a length of stay.','weeks · months',"I'll stay for six months."),
  T('Where will you be staying?',['hotel','apartment','friend','address'],'Say where you will stay.','hotel · apartment',"I'll be staying in an apartment."),
  T('Do you have a return ticket?',['yes','no','ticket','return'],'Answer clearly about your ticket.','return ticket','Yes, I have a return ticket.')
 ]),
 sim:S('sim','migration',1,'📱','Get a SIM Card','Store Assistant','Mobile Store','sim',true,[
  T('What kind of plan do you need?',['sim','data','prepaid','monthly'],'Say what plan you want.','prepaid · data',"I'd like a prepaid SIM with data."),
  T('How much data do you need?',['gb','data','unlimited'],'Give an amount.','GB · unlimited','About 20 GB is enough.'),
  T('Do you need international calls?',['yes','no','calls'],'Answer politely.','calls · yes · no','No thanks, data is enough.'),
  T('Should I activate it now?',['yes','activate','now'],'Ask them to activate it.','activate · now','Yes please, activate it now.')
 ]),
 transport:S('transport','migration',2,'🚕','Taxi & Transport','Taxi Driver','Airport Taxi','taxi',false,[
  T('Where would you like to go?',['apartment','address','hotel','home'],'Tell the driver your destination.','address · apartment','Could you take me to this address, please?'),
  T('Do you prefer the highway or city route?',['highway','city','faster','route'],'Choose a route.','highway · city','Whichever is faster is fine.'),
  T('Would you like help with your luggage?',['yes','no','luggage','help'],'Answer politely.','luggage · help','Yes please, I have two bags.')
 ]),
 shopping:S('shopping','migration',3,'🛒','Supermarket Mission','Cashier','Supermarket','supermarket',false,[
  T('Did you find everything you needed?',['yes','no','everything'],'Answer clearly.','everything · yes','Yes, I found everything.'),
  T('Would you like a bag?',['yes','no','bag'],'Choose whether you need a bag.','bag · yes · no','Yes please, one bag.'),
  T('How would you like to pay?',['card','cash','phone'],'Choose a payment method.','card · cash','I will pay by card.'),
  T('Would you like the receipt?',['yes','no','receipt'],'Say if you want a receipt.','receipt · yes','Yes please, I would like the receipt.')
 ]),
 bank:S('bank','migration',4,'🏦','Open a Bank Account','Bank Clerk','Bank','bank',false,[
  T('How can I help you today?',['account','open','bank'],'Say you want to open an account.','open · account',"I'd like to open a bank account."),
  T('Checking or savings?',['checking','savings','account'],'Choose an account type.','checking · savings',"I'd like a checking account."),
  T('Do you have proof of address?',['yes','proof','address','document'],'Confirm your document.','proof · address','Yes, I have proof of address.'),
  T('Would you like a debit card?',['yes','no','debit','card'],'Answer about the card.','debit · card','Yes please, I would like a debit card.')
 ]),
 doctor:S('doctor','migration',5,'🩺','Doctor & Pharmacy','Receptionist','Clinic','doctor',false,[
  T('What brings you in today?',['appointment','doctor','pain','sick'],'Explain why you came.','appointment · pain','I have an appointment and I do not feel well.'),
  T('How long have you felt this way?',['day','week','since'],'Say how long.','days · weeks','For about three days.'),
  T('Are you taking any medication?',['yes','no','medicine','medication'],'Answer about medication.','medication · yes · no','No, I am not taking medication.'),
  T('Do you have any allergies?',['yes','no','allergy','allergies'],'Answer about allergies.','allergies · yes · no','No, I do not have any known allergies.')
 ]),
 apartment:S('apartment','course',0,'🏠','Apartment Viewing','Rental Agent','Apartment','home',false,[
  T('What kind of place are you looking for?',['apartment','studio','bedroom','place'],'Describe the home you need.','apartment · bedroom',"I'm looking for a one-bedroom apartment."),
  T('When would you like to move in?',['move','month','week','date'],'Say when you want to move.','move in · month',"I'd like to move in next month."),
  T('Do you have any questions about the rent?',['rent','included','utilities','deposit'],'Ask a practical rent question.','rent · utilities · deposit','Are utilities included in the rent?'),
  T('Would you like to see the bedroom?',['yes','see','bedroom'],'Answer and continue the viewing.','yes · bedroom','Yes please, I would like to see it.')
 ]),
 workplace:S('workplace','career',0,'🧑‍💻','Workplace Stand-up','Team Lead','Remote Stand-up','career',false,[
  T('What did you work on yesterday?',['worked','fixed','finished','implemented'],'Report yesterday’s work.','yesterday · fixed','Yesterday I fixed a login bug.'),
  T('What are you working on today?',['today','working','test','implement'],'Say today’s task.','today · working','Today I am testing the payment flow.'),
  T('Any blockers?',['blocked','waiting','issue','no'],'Say if anything blocks you.','blocked · waiting','I am waiting for server access.')
 ]),
 interview:S('interview','career',3,'💼','Job Interview','Interviewer','Interview Room','career',false,[
  T('Tell me about yourself.',['developer','experience','work','student'],'Introduce yourself professionally.','developer · experience','I am a backend developer with web experience.'),
  T('Tell me about a project you are proud of.',['project','built','developed'],'Describe a project.','project · built','I built a marketplace backend.'),
  T('What was your role?',['role','backend','frontend','api'],'Explain your responsibility.','role · backend','I was responsible for backend APIs.'),
  T('Why do you want this role?',['role','team','grow','company'],'Explain your motivation.','role · grow','I want this role because I can contribute and grow.')
 ]),
 hotel:S('hotel','travel',0,'🏨','Hotel Check-in','Receptionist','Hotel Lobby','hotel',false,[
  T('Do you have a reservation?',['yes','reservation','booking'],'Confirm your booking.','reservation · booking','Yes, I have a reservation.'),
  T('What name is it under?',['name','under'],'Give the booking name.','under the name','It is under the name Taylor.'),
  T('How many nights are you staying?',['night','nights','days'],'Give the number of nights.','nights · staying','I am staying for three nights.'),
  T('Would you like breakfast included?',['yes','no','breakfast'],'Answer politely.','breakfast · yes · no','Yes please, include breakfast.')
 ]),
 restaurant:S('restaurant','travel',1,'🍝','Restaurant','Server','Restaurant','restaurant',false,[
  T('Are you ready to order?',['yes','order','ready'],'Say you are ready.','ready · order','Yes, I am ready to order.'),
  T('What would you like?',['like','have','order'],'Order politely.','like · have','I would like the chicken pasta, please.'),
  T('Anything to drink?',['water','juice','drink','coffee'],'Choose a drink.','water · drink','Water, please.')
 ]),
 directions:S('directions','travel',2,'🗺️','Directions','Local','City Street','directions',false,[
  T('Hi! Do you need some help?',['yes','station','help','direction'],'Ask for directions.','station · help','Yes. Could you tell me how to get to the station?'),
  T('Do you mean the central station?',['yes','central','station'],'Confirm the place.','central · station','Yes, the central station.'),
  T('It is two blocks ahead and then left. Got it?',['yes','left','blocks','thanks'],'Repeat or confirm the direction.','left · blocks','Yes, two blocks ahead and then left. Thank you.')
 ])
};
const COURSE_SCENARIO_MAP=Object.freeze({'c1-conversation':'airport','c2-conversation':'sim','c3-conversation':'apartment','c4-conversation':'bank','c5-conversation':'doctor'});
const SCENARIO_GENDERS=Object.freeze({airport:'male',sim:'female',transport:'male',shopping:'female',bank:'female',doctor:'female',apartment:'female',workplace:'male',interview:'male',hotel:'female',restaurant:'male',directions:'female'});
const VOICE_NAME_HINTS=Object.freeze({
 male:['daniel','alex','aaron','fred','tom','arthur','oliver','ryan','david','mark','guy','male'],
 female:['samantha','karen','victoria','moira','tessa','ava','susan','zira','aria','jenny','emma','female']
});
let sb=null,membership={is_pro:false},runSequence=0;
const freshState=(extra={})=>({status:SPEAK_STATES.IDLE,scenario:null,turn:0,scores:[],courseUnit:'',hintUsed:false,recognizer:null,recognitionTimer:null,nextTurnTimer:null,runId:runSequence,lastError:null,...extra});
let state=freshState();
function transition(status,event='',extra={}){state={...state,...extra,status};document.body.dataset.speakState=status;if(event)console.info(`[SPEAK] ${event}`,{state:status,scenario:state.scenario?.key||null});return state}
function assertCurrent(runId){if(runId!==runSequence)throw new SpeakFlowError('CANCELLED','Speaking request was cancelled.')}
function classifyError(error){if(error instanceof SpeakFlowError)return error;const message=String(error?.message||'Speaking is unavailable right now.');if(/jwt|session|not authenticated|log in/i.test(message))return new SpeakFlowError('AUTH_REQUIRED','Please log in again.',error);if(/permission|forbidden|not allowed/i.test(message))return new SpeakFlowError('ACCESS_DENIED','This speaking mission is not available for this account.',error);return new SpeakFlowError('UNKNOWN_ERROR',message,error)}
function getScenarioByLegacy(path,mission){return Object.values(scenarios).find(s=>s.path===path&&s.mission===Number(mission))||null}
function setHash(hash,replace=false){const u=location.pathname+location.search+hash;(replace?history.replaceState:history.pushState).call(history,{ll:true},'',u)}
function currentRoute(){const raw=location.hash.replace(/^#/,'');if(!raw)return{view:'home'};const [p,q='']=raw.split('?');const seg=p.split('/').filter(Boolean);return{view:seg[0]||'home',kind:seg[1]||'',id:seg[2]||'',params:new URLSearchParams(q)}}
function activateView(name){$$('.view').forEach(v=>v.classList.toggle('on',v.id===`view-${name}`));$$('[data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav===name));$$('[data-header-nav]').forEach(b=>b.classList.toggle('on',b.dataset.headerNav===name));window.scrollTo({top:0,behavior:'instant'});}
function routeSpeak(replace=false){cleanupMission();transition(SPEAK_STATES.IDLE,'LANDING');activateView('speak');setHash('#speak',replace);renderSpeakLanding();}
function routeGeneral(name){cleanupMission();transition(SPEAK_STATES.IDLE,'EXIT');activateView(name);setHash('#'+name);}
function waitForClient(){return withTimeout(new Promise((resolve,reject)=>{if(window.llSupabase)return resolve(window.llSupabase);const ready=()=>finish(resolve,window.llSupabase),bad=()=>finish(reject,new SpeakFlowError('AUTH_UNRESOLVED','LifeLingo connection is unavailable.'));let done=false;const finish=(fn,value)=>{if(done)return;done=true;window.removeEventListener('lifelingo:supabase-ready',ready);window.removeEventListener('lifelingo:supabase-error',bad);fn(value)};window.addEventListener('lifelingo:supabase-ready',ready,{once:true});window.addEventListener('lifelingo:supabase-error',bad,{once:true})}),13000,'Secure session initialization timed out.','AUTH_UNRESOLVED')}
async function waitForSession(runId){transition(SPEAK_STATES.AUTH_CHECK,'AUTH_CHECK');sb=await waitForClient();assertCurrent(runId);let current;try{current=await withTimeout(sb.auth.getSession(),7000,'Session check timed out.','AUTH_UNRESOLVED')}catch(error){if(error instanceof SpeakFlowError)throw error;throw new SpeakFlowError('AUTH_UNRESOLVED','Could not restore your session.',error)}assertCurrent(runId);if(current.error)throw new SpeakFlowError('AUTH_UNRESOLVED','Could not restore your session.',current.error);if(!current.data?.session)throw new SpeakFlowError('AUTH_REQUIRED','Please log in again.');console.info('[SPEAK] AUTH_READY');return current.data.session}
async function ensureData(requirePremium=false,runId=runSequence){const activeSession=await waitForSession(runId);if(!activeSession?.access_token)throw new SpeakFlowError('AUTH_REQUIRED','Please log in again.');transition(SPEAK_STATES.ACCESS_CHECK,'ACCESS_START');membership={is_pro:false};if(!requirePremium){console.info('[SPEAK] ACCESS_GRANTED',{tier:'core'});return{session:activeSession,membership}}let result;try{result=await withTimeout(sb.rpc('my_membership'),5000,'Premium access check timed out.','ACCESS_TIMEOUT')}catch(error){if(error instanceof SpeakFlowError)throw error;throw new SpeakFlowError('ENTITLEMENT_ERROR','Could not verify premium speaking access.',error)}assertCurrent(runId);if(result.error)throw new SpeakFlowError('ENTITLEMENT_ERROR','Could not verify premium speaking access.',result.error);const row=Array.isArray(result.data)?result.data[0]:result.data;membership=row||{is_pro:false};console.info('[SPEAK] ACCESS_GRANTED',{tier:membership.is_pro?'pro':'free'});return{session:activeSession,membership}}
function renderSpeakLanding(){const root=$('#speakRoot');if(!root)return;const pro=!!membership.is_pro;const cards=Object.values(scenarios).map(s=>`<button class="speakScenarioCard ${!s.free&&!pro?'locked':''}" data-canonical-scenario="${s.key}"><span class="speakSceneIcon">${s.icon}</span><span class="speakSceneMeta"><b>${esc(s.title)}</b><small>${esc(s.place)} · ${s.turns.length} turns</small></span><span class="speakAccess">${s.free?'FREE':pro?'OPEN':'PRO'}</span></button>`).join('');root.innerHTML=`<section class="speakHero card"><div class="speakHeroCopy"><div class="eyebrow">SPEAK · REAL LIFE</div><h1>Practice real conversations for real life.</h1><p class="muted">One current speaking system: scenario → conversation → feedback → saved mission progress.</p><div class="actions"><button class="primary" data-canonical-scenario="airport">🎙 Quick Speak</button><button class="ghost" data-canonical-scenario="sim">Start a free second scenario</button></div><div class="speakStateLegend"><span>READY</span><span>LISTENING</span><span>FEEDBACK</span><span>COMPLETED</span></div></div><div class="speakHeroScene" aria-hidden="true"><div class="speakNpc"><i></i></div><div class="speakDesk"></div><div class="speakBubble">“What’s the purpose of your visit?”</div></div></section><div class="speakSectionTitle"><div><div class="eyebrow">REAL-LIFE SCENARIOS</div><h2>Choose a situation.</h2></div><span class="chip">${pro?'PRO ACTIVE':'2 FREE STARTERS'}</span></div><div class="speakScenarioGrid">${cards}</div><div class="speakLowerGrid"><article class="card"><div class="eyebrow">DAILY SPEAKING CHALLENGE</div><h2>Use today’s phrase aloud.</h2><p class="muted">Daily speaking stays available on Free. Open Daily Surprise from Home for today’s prompt.</p><button class="ghost" data-fixed-nav="home">Open Daily Surpris