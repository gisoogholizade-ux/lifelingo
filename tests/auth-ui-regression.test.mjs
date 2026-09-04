import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function createAuthView(width){
  const dom=new JSDOM(`<!doctype html><html><body>
    <section id="authScreen"><main class="authWrap"><article class="authCard">
      <div class="authTabs" role="tablist">
        <button data-authmode="login">Log in</button>
        <button class="ghost" data-authmode="register">Create account</button>
      </div>
      <div id="loginForm"><input id="loginEmail"><input id="loginPassword"><button id="loginBtn">Log in</button></div>
      <div id="registerForm" class="hidden">
        <input id="regName" aria-label="Name"><input id="regEmail" aria-label="Email">
        <input id="regPhone" aria-label="Mobile"><input id="regPassword" aria-label="Password">
        <button id="registerBtn">Create account</button>
      </div>
      <p id="authMsg"></p>
    </article></main></section>
    <section id="appScreen" class="hidden"></section>
    <form id="chatComposer"><input id="chatInput"></form>
    <div id="toast"></div>
  </body></html>`,{url:'https://gisoogholizade-ux.github.io/lifelingo/v66.html',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  const logs=[];
  Object.defineProperty(window,'innerWidth',{value:width,configurable:true});
  window.scrollTo=()=>{};
  window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  window.LIFELINGO_CONFIG={publicUrl:'https://gisoogholizade-ux.github.io/lifelingo/'};
  window.console.info=(...args)=>logs.push(args);
  window.llSupabase={auth:{async getSession(){return{data:{session:null},error:null}},onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}}}};
  const source=await readFile(new URL('../v66-app.js',import.meta.url),'utf8');
  window.eval(source);
  await delay(10);
  return{window,logs,close:()=>dom.window.close()};
}

test('Create account opens the complete registration view at supported widths',async()=>{
  for(const width of [375,390,430,768,1024,1440]){
    const app=await createAuthView(width);
    try{
      const {window,logs}=app;
      const create=window.document.querySelector('[data-authmode="register"]');
      assert.equal(create.tagName,'BUTTON');
      assert.equal(create.getAttribute('href'),null);
      create.click();
      await delay(20);
      const register=window.document.querySelector('#registerForm');
      assert.equal(register.classList.contains('hidden'),false,`${width}px registration form should be visible`);
      assert.equal(register.getAttribute('aria-hidden'),'false');
      assert.equal(window.document.querySelector('#loginForm').classList.contains('hidden'),true);
      assert.equal(window.document.documentElement.dataset.authView,'register');
      for(const selector of ['#regName','#regEmail','#regPhone','#regPassword','#registerBtn'])assert.ok(register.querySelector(selector),`${selector} must remain available`);
      assert.equal(logs.filter(([message])=>message==='[AUTH] CREATE_ACCOUNT_CLICK').length,1);
      window.document.querySelector('[data-authmode="login"]').click();
      assert.equal(register.classList.contains('hidden'),true);
      assert.equal(window.document.querySelector('#loginForm').classList.contains('hidden'),false);
    }finally{app.close()}
  }
});

test('canonical signup sends once and does not call a profile RPC without a session',async()=>{
  const app=await createAuthView(390);
  try{
    const {window}=app;
    let signups=0;
    let rpcCalls=0;
    window.llSupabase.auth.signUp=async payload=>{
      signups++;
      assert.equal(payload.email,'new.user@example.test');
      assert.equal(payload.options.data.display_name,'New User');
      assert.equal(payload.options.data.phone,'+989121234567');
      assert.equal(payload.options.emailRedirectTo,'https://gisoogholizade-ux.github.io/lifelingo/');
      return{data:{user:{id:'new-user'},session:null},error:null};
    };
    window.llSupabase.rpc=async()=>{rpcCalls++;return{data:null,error:null}};
    const guard=await readFile(new URL('../lifelingo-auth-session-guard.js',import.meta.url),'utf8');
    window.eval(guard);
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    window.document.querySelector('#regName').value='New User';
    window.document.querySelector('#regEmail').value='new.user@example.test';
    window.document.querySelector('#regPhone').value='+989121234567';
    window.document.querySelector('#regPassword').value='safe-password';
    window.document.querySelector('#registerBtn').click();
    window.document.querySelector('#registerBtn').click();
    await delay(30);
    assert.equal(signups,1,'double click must not create two signup requests');
    assert.equal(rpcCalls,0,'profile RPC must wait for a real authenticated session');
    assert.match(window.document.querySelector('#authMsg').textContent,/Account created\. Check your email/);
    assert.equal(window.document.querySelector('#registerBtn').disabled,false);
  }finally{app.close()}
});

test('signup exposes invalid-email and rate-limit failures instead of a generic error',async()=>{
  for(const sample of [
    {error:Object.assign(new Error('Email address is invalid'),{code:'email_address_invalid',status:400}),expected:/cannot receive a LifeLingo confirmation/},
    {error:Object.assign(new Error('email rate limit exceeded'),{code:'over_email_send_rate_limit',status:429}),expected:/Too many confirmation emails/}
  ]){
    const app=await createAuthView(390);
    try{
      const {window}=app;
      window.llSupabase.auth.signUp=async()=>({data:{user:null,session:null},error:sample.error});
      const guard=await readFile(new URL('../lifelingo-auth-session-guard.js',import.meta.url),'utf8');
      window.eval(guard);
      window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
      window.document.querySelector('#regName').value='New User';
      window.document.querySelector('#regEmail').value='new.user@example.test';
      window.document.querySelector('#regPhone').value='+989121234567';
      window.document.querySelector('#regPassword').value='safe-password';
      window.document.querySelector('#registerBtn').click();
      await delay(30);
      assert.match(window.document.querySelector('#authMsg').textContent,sample.expected);
    }finally{app.close()}
  }
});

test('onboarding goal selection advances reliably on a direct mobile tap',async()=>{
  const html=await readFile(new URL('../v66.html',import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:'https://gisoogholizade-ux.github.io/lifelingo/v66.html',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;
  try{
    Object.defineProperty(window,'innerWidth',{value:390,configurable:true});
    window.scrollTo=()=>{};
    window.HTMLElement.prototype.scrollIntoView=()=>{};
    window.HTMLElement.prototype.scrollTo=()=>{};
    window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
    const session={user:{id:'onboarding-user'}};
    const rpc=async name=>{
      if(name==='get_learning_home')return{data:{courses:[],membership:{is_pro:false}},error:null};
      if(name==='get_unified_profile')return{data:{profile:{display_name:'Tester',learning_goals:[],scenario_preferences:[],onboarding_completed:false,theme_preference:'dark'},partner:{},daily:{study:{dates:[],dailyDone:{}},retention:{}}},error:null};
      if(name==='list_avatar_choices')return{data:[],error:null};
      return{data:null,error:null};
    };
    const upgradeQuery={select(){return this},in(){return this},order(){return this},async limit(){return{data:[],error:null}}};
    window.llSupabase={
      rpc,
      from:()=>upgradeQuery,
      auth:{
        async getSession(){return{data:{session},error:null}},
        onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}}}
      }
    };
    const source=await readFile(new URL('../v66-app.js',import.meta.url),'utf8');
    window.eval(source);
    await delay(40);
    assert.equal(window.document.querySelector('#onboarding').classList.contains('hidden'),false);
    const everyday=window.document.querySelector('[data-on-goal="everyday"]');
    everyday.click();
    assert.equal(window.document.querySelector('[data-on-goal="everyday"]').classList.contains('on'),true);
    window.document.querySelector('[data-on-next]').click();
    assert.match(window.document.querySelector('#onboardRoot h1').textContent,/Where are you starting/);
  }finally{dom.window.close()}
});
