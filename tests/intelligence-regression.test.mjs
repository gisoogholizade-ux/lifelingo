import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const script=name=>readFile(new URL(`../${name}`,import.meta.url),'utf8');

async function knowledgeFiles(){
  const manifest=JSON.parse(await script('knowledge/manifest.json'));
  const files=new Map([['./knowledge/manifest.json',manifest]]);
  for(const item of manifest.files)files.set(`./knowledge/${item.path}`,JSON.parse(await script(`knowledge/${item.path}`)));
  files.set('./intelligence/skill-taxonomy.json',JSON.parse(await script('intelligence/skill-taxonomy.json')));
  return files;
}

async function createApp({providerFailure=false,helpLevel='FULL_SUPPORT'}={}){
  const dom=new JSDOM(`<!doctype html><html lang="en"><body><section id="view-speak" class="view on"><div id="speakRoot"><section class="speakHero"></section></div></section></body></html>`,{url:'https://gisoogholizade-ux.github.io/lifelingo/v66.html#speak',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  const files=await knowledgeFiles(),rpcCalls=[],requests=[],spoken=[];
  window.scrollTo=()=>{};
  window.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
  window.LIFELINGO_CONFIG={supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'public-test-key',aiFunction:'lifelingo-ai'};
  window.LifeLingoIntelligence={
    async load(){},
    get:()=>({estimatedLevel:'A1',levelConfidence:.42,learningGoals:['travel'],weakSkills:['grammar.articles'],reviewPriorities:['grammar.articles'],helpLevel,recentTopics:['Food']}),
    getEntitlements:()=>({isPro:true}),
    async record(event){rpcCalls.push({name:'record',args:event})},
    friendlySkill:value=>value,
  };
  window.llSupabase={
    auth:{async getSession(){return{data:{session:{access_token:'test-token'}},error:null}}},
    async rpc(name,args){rpcCalls.push({name,args});return{data:true,error:null}},
  };
  window.speechSynthesis={cancel(){},getVoices(){return[{name:'Daniel',lang:'en-US'}]},speak(utterance){spoken.push(utterance.text);queueMicrotask(()=>utterance.onend?.())}};
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
  window.fetch=async (url,options={})=>{
    if(files.has(String(url)))return{ok:true,async json(){return files.get(String(url))}};
    requests.push({url:String(url),options});
    if(providerFailure)return{ok:false,async json(){return{status:'PROVIDER_ERROR'}}};
    const body=JSON.parse(options.body),turn=Number(body.turnNumber||0),objectiveByScenario={airport:['provide_identification','explain_visit_purpose','explain_length_of_stay','explain_accommodation'],shopping:['find_item','clarify_quantity','choose_payment','request_receipt'],interview:['introduce_self','describe_project','explain_role','explain_motivation']};
    const objective=objectiveByScenario[body.scenarioId]?.[turn];
    return{ok:true,async json(){return{status:'SUCCESS',sessionId:'session-1',reply:`Role reply ${turn+1}`,completedObjectives:objective?[objective]:[],missionProgress:(turn+1)/4,mistakes:turn===2?[{severity:'IMPORTANT',learner:'I stay three month.',corrected:"I'll stay for three months.",skillId:'grammar.word_order'}]:[],hintAvailable:true,scenarioComplete:turn>=3,retrievedKnowledgeIds:[]}}};
  };
  window.eval(await script('lifelingo-knowledge.js'));
  window.eval(await script('lifelingo-ai-speak.js'));
  await delay(550);
  return{window,dom,rpcCalls,requests,spoken,close(){window.LifeLingoAISpeak.destroy();dom.window.close()}};
}

async function send(window,text){window.document.querySelector('#llAiInput').value=text;window.document.querySelector('#llAiSend').click();for(let i=0;i<80;i++){if(!['THINKING'].includes(window.LifeLingoAISpeak.getState().status))return;await delay(5)}throw new Error('AI turn did not terminate')}

test('knowledge retrieval is metadata-aware, bounded, A1-B2, and Persian-backed',async()=>{
  const app=await createApp();
  try{
    const stats=await app.window.LifeLingoKnowledge.stats();
    assert.equal(stats.itemCount,72);
    assert.equal(JSON.stringify(stats.levels),JSON.stringify({A1:18,A2:18,B1:18,B2:18}));
    assert.equal(stats.persianItems,72);
    const items=await app.window.LifeLingoKnowledge.retrieve({query:'passport purpose of visit',level:'A1',skills:['vocabulary.airport'],goals:['travel'],scenario:'airport',topK:4});
    assert.ok(items.length>0&&items.length<=4);
    assert.equal(items[0].quality,'LIFELINGO_VERIFIED');
    assert.ok(items.every(item=>item.persian&&item.retrieval.knowledgeVersion));
    assert.ok(items.some(item=>item.skill==='vocabulary.airport'));
  }finally{app.close()}
});

test('AI missions preserve the animated scene, objectives, correction report, and cancellation',async()=>{
  const app=await createApp();
  try{
    await app.window.LifeLingoAISpeak.openMission('airport');
    assert.ok(app.window.document.querySelector('#speakCinema'));
    assert.match(app.window.document.querySelector('.speakNpcLabel').textContent,/Immigration Officer/);
    for(const answer of ['Here is my passport.','I am here for travel.','I stay three month.','I am staying at a hotel.'])await send(app.window,answer);
    assert.equal(app.window.LifeLingoAISpeak.getState().status,'SUCCESS');
    assert.ok(app.window.document.querySelector('#llAiReport'));
    assert.match(app.window.document.querySelector('#llAiReport').textContent,/three months/);
    assert.equal(app.requests.length,4);
    const sentKnowledge=JSON.parse(app.requests[0].options.body).retrievedKnowledge;
    assert.ok(sentKnowledge.length>0&&sentKnowledge.length<=8);
    app.window.document.querySelector('[data-ai-exit]').click();
    assert.equal(app.window.document.querySelector('#speakMission'),null);
    assert.equal(app.window.document.body.dataset.aiSpeakActive,undefined);
    assert.ok(app.rpcCalls.some(call=>call.name==='finish_ai_session_v1'&&call.args.p_status==='COMPLETED'));
  }finally{app.close()}
});

test('Supermarket and Job Interview AI missions stay in role and complete their objectives',async()=>{
  for(const sample of [
    {scenario:'shopping',role:/Store Employee/,answers:['I am looking for apples.','I need two kilos.','Nothing else, thank you.','I will pay by card and need a receipt.']},
    {scenario:'interview',role:/Interviewer/,answers:['I am a frontend developer.','I built a travel project.','My role was developing the API.','I want to grow and contribute to this team.']}
  ]){
    const app=await createApp();
    try{
      await app.window.LifeLingoAISpeak.openMission(sample.scenario);
      assert.match(app.window.document.querySelector('.speakNpcLabel').textContent,sample.role);
      for(const answer of sample.answers)await send(app.window,answer);
      assert.equal(app.window.LifeLingoAISpeak.getState().status,'SUCCESS');
      assert.ok(app.window.document.querySelector('#llAiReport'));
      assert.equal(app.requests.length,4);
      assert.ok(app.rpcCalls.some(call=>call.name==='record'&&call.args.eventType==='MISSION_COMPLETED'));
    }finally{app.close()}
  }
});

test('Free Talk, Practice My Weaknesses, and Daily Talk all complete cleanly',async()=>{
  for(const mode of ['FREE_TALK','PRACTICE_WEAKNESSES','DAILY_TALK']){
    const app=await createApp();
    try{
      await app.window.LifeLingoAISpeak.open(mode);
      app.window.document.querySelector('[data-ai-begin]').click();
      for(const text of ['I would like to talk about my day.','I worked on a useful project.','It helped my team.','Tomorrow I will improve it.'])await send(app.window,text);
      assert.equal(app.window.LifeLingoAISpeak.getState().status,'SUCCESS');
      assert.equal(JSON.parse(app.requests[0].options.body).mode,mode);
      assert.ok(app.spoken.length>=1);
      assert.ok(app.rpcCalls.some(call=>call.name==='record'&&call.args.eventType==='AI_PARTNER_COMPLETED'));
      app.window.document.querySelector('[data-ai-exit]').click();
      assert.equal(app.window.document.querySelector('#speakMission'),null);
    }finally{app.close()}
  }
});

test('outage terminates, English-only hides Persian help, and repeated exits leave no stale UI',async()=>{
  const app=await createApp({providerFailure:true,helpLevel:'ENGLISH_ONLY'});
  try{
    for(const mode of ['FREE_TALK','DAILY_TALK','FREE_TALK']){
      await app.window.LifeLingoAISpeak.open(mode);
      app.window.document.querySelector('[data-ai-begin]').click();
      assert.equal(app.window.document.querySelector('[data-ai-translate]').classList.contains('hidden'),true);
      await send(app.window,'This is a test.');
      assert.equal(app.window.LifeLingoAISpeak.getState().status,'ERROR');
      assert.equal(app.window.document.querySelector('#llAiError').classList.contains('hidden'),false);
      app.window.document.querySelector('[data-ai-exit]').click();
      assert.equal(app.window.document.querySelector('#speakMission'),null);
      assert.equal(app.window.document.querySelectorAll('.llAiExperience').length,0);
    }
  }finally{app.close()}
});

test('learner intelligence renders personalized Home, Daily Surprise, My English, review, and onboarding support',async()=>{
  const dom=new JSDOM(`<!doctype html><html lang="fa" dir="rtl"><body><div id="homeRoot"><div class="homeGrid"><article class="dailyCard"><div class="actions"></div></article></div></div><div id="profileRoot"><article class="card"></article></div><div id="reviewRoot"></div><div id="onboardRoot"><div><div class="field"><select id="onLevel"><option>A1</option></select></div></div></div></body></html>`,{url:'https://example.test/v66.html#home',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom,calls=[];
  window.llSupabase={auth:{async getSession(){return{data:{session:{user:{id:'u1'}}}}}},async rpc(name,args){calls.push({name,args});if(name==='get_learner_intelligence_v1')return{data:{estimatedLevel:null,levelConfidence:.2,learningGoals:['travel'],helpLevel:'FULL_SUPPORT',weakSkills:['grammar.articles'],strongSkills:['vocabulary.airport'],reviewPriorities:['grammar.articles'],performanceTrend:.04,eventCount:7,recentTopics:[],consent:{allowAnonymizedLearningActivity:false}},error:null};if(name==='get_ai_entitlements_v1')return{data:{isPro:false},error:null};if(name==='set_ai_learning_preferences_v1')return{data:{helpLevel:'ENGLISH_ONLY',consent:{allowAnonymizedLearningActivity:true}},error:null};return{data:true,error:null}}};
  window.eval(await script('lifelingo-intelligence.js'));
  await delay(80);
  try{
    assert.match(window.document.querySelector('[data-intelligence-home]').textContent,/Articles/);
    assert.ok(window.document.querySelector('[data-daily-intelligence] [data-ai-mode="DAILY_TALK"]'));
    assert.match(window.document.querySelector('[data-my-english]').textContent,/هنوز در حال شناخت سطح/);
    assert.ok(window.document.querySelector('[data-review-intelligence]'));
    assert.equal(window.document.querySelector('#onHelp').value,'FULL_SUPPORT');
    window.document.querySelector('#llHelpLevel').value='ENGLISH_ONLY';
    window.document.querySelector('#llTrainingConsent').checked=true;
    window.document.querySelector('[data-save-intelligence]').click();
    await delay(20);
    assert.ok(calls.some(call=>call.name==='set_ai_learning_preferences_v1'&&call.args.p_help_level==='ENGLISH_ONLY'&&call.args.p_allow_anonymized===true));
  }finally{window.LifeLingoIntelligence.destroy();dom.window.close()}
});

test('current Admin gains an authorized AI/ML operations tab without a second admin app',async()=>{
  const dom=new JSDOM('<!doctype html><html><body><main id="app"><section class="card"><div class="tabs"><button class="tab on" data-tab="users">Users</button><button class="tab" data-tab="requests">Requests</button></div><div id="usersTab"></div><div id="requestsTab" class="hidden"></div></section></main></body></html>',{runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  window.confirm=()=>false;
  window.llSupabase={async rpc(name){assert.equal(name,'admin_ai_overview_v1');return{data:{learners:6,events:14,consentedLearners:2,aiRequestsToday:3,aiFailuresToday:0,datasets:1,models:1,productionModels:[],recentTrainingRuns:[]},error:null}}};
  window.eval(await script('lifelingo-admin-ai.js'));
  await delay(20);
  try{
    const tab=window.document.querySelector('[data-tab="ai"]');
    assert.ok(tab);
    tab.click();
    await delay(20);
    assert.equal(window.document.querySelector('#aiTab').classList.contains('hidden'),false);
    assert.match(window.document.querySelector('#aiTab').textContent,/Learner models6/);
    assert.equal(window.document.querySelectorAll('main#app').length,1);
  }finally{dom.window.close()}
});
