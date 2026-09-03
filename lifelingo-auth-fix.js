(()=>{
'use strict';
const $=s=>document.querySelector(s);
const AUTH_ORIGIN='https://wmbjkddcrqnkqputpwcs.supabase.co';
const AUTH_TOKEN_URL=`${AUTH_ORIGIN}/auth/v1/token?grant_type=password`;
const waitForClient=()=>new Promise((resolve,reject)=>{
  if(window.llSupabase)return resolve(window.llSupabase);
  let done=false;
  const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('lifelingo:supabase-ready',onReady);window.removeEventListener('lifelingo:supabase-error',onError);fn(value)};
  const onReady=()=>finish(resolve,window.llSupabase);
  const onError=e=>finish(reject,Object.assign(new Error(e?.detail?.message||'Could not connect to LifeLingo.'),{code:'CLIENT_LOAD_FAILED'}));
  const timer=setTimeout(()=>finish(reject,Object.assign(new Error('Secure login is taking too long. Please try again.'),{code:'TIMEOUT'})),13000);
  window.addEventListener('lifelingo:supabase-ready',onReady,{once:true});
  window.addEventListener('lifelingo:supabase-error',onError,{once:true});
});
const setMessage=msg=>{const el=$('#authMsg');if(el)el.textContent=msg||''};
const setBusy=(btn,on,label)=>{if(!btn)return;if(on){btn.dataset.authOld=btn.textContent;btn.textContent=label;btn.disabled=true}else{btn.textContent=btn.dataset.authOld||btn.textContent;btn.disabled=false}};
const isNetworkError=e=>e instanceof TypeError||/load failed|failed to fetch|networkerror|network request failed/i.test(String(e?.message||''));
function classify(e){
  const message=String(e?.message||'');
  if(e?.code==='TIMEOUT')return{code:'TIMEOUT',user:'Secure login timed out. Please try again.'};
  if(e?.code==='CLIENT_LOAD_FAILED')return{code:'NETWORK_UNREACHABLE',user:'Could not load the secure login service. Check your connection and try again.'};
  if(isNetworkError(e))return{code:'NETWORK_UNREACHABLE',user:'Could not reach the secure login service. Check your connection and try again.'};
  if(e?.status===400||/invalid login credentials|invalid credentials/i.test(message))return{code:'AUTH_INVALID_CREDENTIALS',user:'Email or password is incorrect.'};
  if(e?.status>=500)return{code:'SERVER_ERROR',user:'The login service is temporarily unavailable. Please try again.'};
  return{code:'SESSION_ERROR',user:message||'Could not log in. Please try again.'};
}
function reportFailure(stage,e){const c=classify(e);console.error('[LifeLingo auth]',{code:c.code,stage,request:{url:AUTH_TOKEN_URL,method:'POST'},hasHttpStatus:Number.isFinite(e?.status),status:e?.status??null,name:e?.name||null,message:e?.message||String(e),online:navigator.onLine});return c}
async function login(){
  const btn=$('#loginBtn'),email=$('#loginEmail')?.value.trim().toLowerCase(),password=$('#loginPassword')?.value||'';
  if(!email||!password){setMessage('Enter email and password.');return}
  setBusy(btn,true,'Logging in…');setMessage('');
  try{
    const client=await waitForClient();
    // Important for WebKit/Safari: let the dynamically loaded Supabase client finish
    // its current load/event turn before dispatching the first cross-origin Auth fetch.
    await new Promise(resolve=>setTimeout(resolve,0));
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error)throw error;
    if(!data?.session)throw Object.assign(new Error('Login succeeded but no session was returned. Please try again.'),{code:'SESSION_ERROR'});
    location.reload();
  }catch(e){const c=reportFailure('signInWithPassword',e);setMessage(c.user);setBusy(btn,false)}
}
async function register(){
  const btn=$('#registerBtn'),name=$('#regName')?.value.trim()||'',email=$('#regEmail')?.value.trim().toLowerCase()||'',phone=$('#regPhone')?.value.trim()||'',password=$('#regPassword')?.value||'';
  if(name.length<2)return setMessage('Enter your name.');
  if(!/^\+?[0-9]{8,15}$/.test(phone))return setMessage('Enter a valid mobile number including country code.');
  if(password.length<8)return setMessage('Use at least 8 characters for your password.');
  setBusy(btn,true,'Creating account…');setMessage('');
  try{const client=await waitForClient();await new Promise(resolve=>setTimeout(resolve,0));const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:name,phone,contact_consent:!!$('#regConsent')?.checked}}});if(error)throw error;if(data?.session){location.reload();return}setMessage('Account created. Check your email if confirmation is required, then log in.')}catch(e){const c=reportFailure('signUp',e);setMessage(c.user)}finally{setBusy(btn,false)}
}
function install(){const loginBtn=$('#loginBtn');if(loginBtn)loginBtn.onclick=login;if(!window.llSupabase){if(loginBtn)loginBtn.dataset.authWaiting='true';window.addEventListener('lifelingo:supabase-ready',()=>{if(loginBtn)delete loginBtn.dataset.authWaiting},{once:true})}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
