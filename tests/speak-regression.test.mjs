import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function createApp({hash='',language='en',theme='light',width=1024}={}){
  const dom=new JSDOM(`<!doctype html><html><body>
    <section id="appScreen"><main class="shell"><header class="topbar"></header>
      <section id="view-home" class="view on"><div id="homeRoot"></div></section>
      <section id="view-learn" class="view"><div id="learnRoot"></div></section>
      <section id="view-speak" class="view"><div id="speakRoot"></div></section>
      <section id="view-partners" class="view"></section><section id="view-review" class="view"></section>
      <section id="view-profile" class="view"></section><section id="view-pro" class="view"></section>
    </main><nav class="bottomNav"><button data-nav="home">Home</button><button data-nav="speak">Speak</button></nav></section>
  </body></html>`,{url:`https://example.test/v66.html${hash}`,runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  let sessionMode='ok';
  let isPro=false;
  const calls=[];
  const utterances=[];
  const voices=[{name:'Daniel',lang:'en-GB',default:false},{name:'Samantha',lang:'en-US',default:true}];
  window.scrollTo=()=>{};
  Object.defineProperty(window,'innerWidth',{value:width,configurable:true});
  window.document.documentElement.lang=language;
  window.document.documentElement.dir=language==='fa'?'rtl':'ltr';
  window.document.documentElement.dataset.theme=theme;
  window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  window.speechSynthesis={cancel(){},getVoices(){return voices},speak(utterance){utterances.push(utterance);queueMicrotask(()=>utterance.onend?.())}};
  window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
  window.llSupabase={
    auth:{
      async getSession(){return sessionMode==='ok'?{data:{session:{access_token:'test-token',user:{id:'user-a'}}},error:null}:{data:{session:null},error:new Error('session unavailable')}},
      onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}}
    },
    async rpc(name,args){calls.push({name,args});if(name==='my_membership')return{data:{is_pro:isPro},error:null};if(name==='complete_mission'||name==='complete_course_unit')return{data:{ok:true},error:null};return{data:null,error:null}}
  };
  const source=await readFile(new URL('../v67-speak-fix.js',import.meta.url),'utf8');
  window.eval(source);
  const premiumSource=await readFile(new URL('../lifelingo-premium-speak.js',import.meta.url),'utf8');
  window.eval(premiumSource);
  await delay(400);
  return{window,calls,utterances,setSession:value=>{sessionMode=value},setPro:value=>{isPro=value},close:()=>{window.LifeLingoPremiumSpeak.destroy();window.LifeLingoSpeak.destroy();dom.window.close()}};
}

async function waitForState(window,status,timeout=1200){
  const started=Date.now();
  while(Date.now()-started<timeout){if(window.LifeLingoSpeak.getState().status===status)return;await delay(10)}
  assert.equal(window.LifeLingoSpeak.getState().status,status);
}

async function completeScenario(window,key,answers){
  await window.LifeLingoSpeak.open(key);
  await waitForState(window,'READY');
  assert.equal(window.LifeLingoSpeak.getState().scenario,key);
  assert.ok(window.document.querySelector('#speakCinema'));
  await delay(20);
  const stage=window.document.querySelector('.llPremiumStage');
  const stageSnapshot=stage?{
    gender:stage.dataset.gender,
    voiceGender:stage.dataset.voiceGender,
    walkableBounds:stage.dataset.walkableBounds,
    entryX:stage.style.getPropertyValue('--ll-entry-x'),
    actorX:stage.style.getPropertyValue('--ll-actor-x'),
    actionX:stage.style.getPropertyValue('--ll-action-x')
  }:null;
  for(const answer of answers){
    window.document.querySelector('#speakAnswer').value=answer;
    window.document.querySelector('#speakCheck').click();
    if(window.LifeLingoSpeak.getState().status!=='COMPLETED')await delay(480);
  }
  await waitForState(window,'COMPLETED');
  return stageSnapshot;
}

test('canonical Speak flow reaches READY, progresses, retries, exits, and re-enters',async()=>{
  const app=await createApp();
  const {window,calls,utterances}=app;
  try{
    assert.ok(window.document.querySelector('[data-canonical-scenario="airport"]'));
    assert.equal(window.LifeLingoSpeak.getScenarios().length,12);

    const maleStage=await completeScenario(window,'airport',["I'm here for work.","I'll stay for six months.","I'll be staying in an apartment.",'Yes, I have a return ticket.']);
    assert.equal(utterances[0].voice.name,'Daniel');
    assert.equal(utterances[0].pitch,.9);
    assert.equal(maleStage?.gender,'male');
    assert.equal(maleStage?.voiceGender,'male');
    assert.ok(calls.some(call=>call.name==='complete_mission'&&call.args.p_path==='migration'&&call.args.p_mission===0));
    window.document.querySelector('[data-mission-exit]').click();
    assert.equal(window.LifeLingoSpeak.getState().status,'IDLE');

    app.setPro(true);
    const femaleStage=await completeScenario(window,'shopping',['Yes, I found everything.','Yes please, one bag.','I will pay by card.','Yes please, I would like the receipt.']);
    const femaleUtterance=utterances.find(utterance=>utterance.text==='Did you find everything you needed?');
    assert.equal(femaleUtterance?.voice.name,'Samantha');
    assert.equal(femaleUtterance?.pitch,1.08);
    assert.equal(femaleStage?.gender,'female');
    assert.equal(femaleStage?.voiceGender,'female');
    const [left,right]=femaleStage.walkableBounds.split(':').map(Number);
    for(const [property,value] of [['--ll-entry-x',femaleStage.entryX],['--ll-actor-x',femaleStage.actorX],['--ll-action-x',femaleStage.actionX]]){
      const position=Number(value.replace('%',''));
      assert.ok(position>=left&&position<=right,`${property} must remain inside the walkable scene`);
    }
    window.document.querySelector('[data-mission-exit]').click();
    await completeScenario(window,'interview',['I am a developer with professional experience.','I built and developed a project.','My role was backend API development.','I want this role to grow with the team.']);
    window.document.querySelector('[data-mission-exit]').click();

    await window.LifeLingoSpeak.open('airport');
    await waitForState(window,'READY');
    window.document.querySelector('#speakMic').click();
    assert.equal(window.LifeLingoSpeak.getState().status,'READY','unsupported microphone must preserve typed input');
    assert.equal(window.document.querySelector('#speakCheck').disabled,false);
    window.document.querySelector('[data-mission-exit]').click();

    app.setSession('error');
    await window.LifeLingoSpeak.open('airport');
    await waitForState(window,'ERROR');
    assert.equal(window.LifeLingoSpeak.getState().errorCode,'AUTH_UNRESOLVED');
    app.setSession('ok');
    window.document.querySelector('[data-speak-retry]').click();
    await waitForState(window,'READY');
    window.document.querySelector('[data-mission-exit]').click();

    for(let index=0;index<5;index++){
      await window.LifeLingoSpeak.open(index%2?'sim':'airport');
      await waitForState(window,'READY');
      window.document.querySelector('[data-mission-exit]').click();
      assert.equal(window.LifeLingoSpeak.getState().status,'IDLE');
      assert.equal(window.document.querySelector('#speakMission'),null);
    }
  }finally{app.close()}
});

test('direct mission route restores in EN/FA, Light/Dark, and supported widths',async()=>{
  for(const [language,theme,width] of [['en','light',375],['fa','dark',390],['en','dark',430],['fa','light',768],['en','light',1024],['fa','dark',1440]]){
    const app=await createApp({hash:'#speak/scenario/airport',language,theme,width});
    try{
      await waitForState(app.window,'READY');
      assert.equal(app.window.location.hash,'#speak/scenario/airport');
      assert.equal(app.window.document.documentElement.dir,language==='fa'?'rtl':'ltr');
      assert.equal(app.window.document.documentElement.dataset.theme,theme);
      assert.ok(app.window.document.querySelector('#speakCheck'));
      app.window.document.querySelector('[data-mission-exit]').click();
      assert.equal(app.window.LifeLingoSpeak.getState().status,'IDLE');
    }finally{app.close()}
  }
});

test('every scenario keeps character gender and spoken voice gender aligned',async()=>{
  const expected={airport:'male',sim:'female',transport:'male',shopping:'female',bank:'female',doctor:'female',apartment:'female',workplace:'male',interview:'male',hotel:'female',restaurant:'male',directions:'female'};
  const app=await createApp({width:390});
  app.setPro(true);
  try{
    for(const [key,gender] of Object.entries(expected)){
      await app.window.LifeLingoSpeak.open(key);
      await waitForState(app.window,'READY');
      await delay(20);
      const stage=app.window.document.querySelector('.llPremiumStage');
      const utterance=app.utterances.at(-1);
      assert.equal(stage?.dataset.gender,gender,`${key} character gender`);
      assert.equal(stage?.dataset.voiceGender,gender,`${key} voice metadata`);
      assert.equal(utterance?.voice?.name,gender==='male'?'Daniel':'Samantha',`${key} browser voice`);
      assert.equal(utterance?.pitch,gender==='male'?.9:1.08,`${key} fallback pitch`);
      app.window.document.querySelector('[data-mission-exit]').click();
    }
  }finally{app.close()}
});
