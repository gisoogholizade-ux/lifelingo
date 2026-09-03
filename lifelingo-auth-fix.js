(()=>{
'use strict';
const $=s=>document.querySelector(s);
const waitForClient=()=>new Promise((resolve,reject)=>{
  if(window.llSupabase)return resolve(window.llSupabase);
  let done=false;
  const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('lifelingo:supabase-ready',onReady);window.removeEventListener('lifelingo:supabase-error',onError);fn(value)};
  const onReady=()=>finish(resolve,window.llSupabase);
  const onError=e=>finish(reject,new Error(e?.detail?.message||'Could not connect to LifeLingo.'));
  const timer=setTimeout(()=>finish(reject,new Error('Secure login is taking too long. Please try again.')),13000);
  window.addEventListener('lifelingo:supabase-ready',onReady,{once:true});
  window.addEventListener('lifelingo:supabase-error',onError,{once:true});
});
const setMessage=msg=>{const el=$('#authMsg');if(el)el.textContent=msg||''};
const setBusy=(btn,on,label)=>{if(!btn)return;if(on){btn.dataset.authOld=btn.textContent;btn.textContent=label;btn.disabled=true}else{btn.textContent=btn.dataset.authOld||btn.textContent;btn.disabled=false}};
async function login(){
  const btn=$('#loginBtn'),email=$('#loginEmail')?.value.trim().toLowerCase(),password=$('#loginPassword')?.value||'';
  if(!email||!password){setMessage('Enter email and password.');return}
  setBusy(btn,true,'Logging in…');setMessage('');
  try{
    const client=await waitForClient();
    await new Promise(r=>setTimeout(r,0));
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error)throw error;
    if(!data?.session)throw new Error('Login succeeded but no session was returned. Please try again.');
    location.reload();
  }catch(e){
    console.error('[LifeLingo auth] login failed',e);
    setMessage(e?.message||'Could not log in. Please try again.');
    setBusy(btn,false);
  }
}
async function register(){
  const btn=$('#registerBtn'),name=$('#regName')?.value.trim()||'',email=$('#regEmail')?.value.trim().toLowerCase()||'',phone=$('#regPhone')?.value.trim()||'',password=$('#regPassword')?.value||'';
  if(name.length<2)return setMessage('Enter your name.');
  if(!/^\+?[0-9]{8,15}$/.test(phone))return setMessage('Enter a valid mobile number including country code.');
  if(password.length<8)return setMessage('Use at least 8 characters for your password.');
  setBusy(btn,true,'Creating account…');setMessage('');
  try{
    const client=await waitForClient();
    const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:name,phone,contact_consent:!!$('#regConsent')?.checked}}});
    if(error)throw error;
    if(data?.session){location.reload();return}
    setMessage('Account created. Check your email if confirmation is required, then log in.');
  }catch(e){
    console.error('[LifeLingo auth] registration failed',e);
    setMessage(e?.message||'Could not create account. Please try again.');
  }finally{setBusy(btn,false)}
}
function loadPartnerPatch(){
  if(document.querySelector('script[data-lifelingo-partner-fix]'))return;
  const s=document.createElement('script');
  s.src='./lifelingo-partner-fix.js?v=1';
  s.dataset.lifelingoPartnerFix='true';
  s.defer=true;
  document.body.appendChild(s);
}
function install(){
  const loginBtn=$('#loginBtn'),registerBtn=$('#registerBtn');
  if(loginBtn)loginBtn.onclick=login;
  if(registerBtn)registerBtn.onclick=register;
  if(!window.llSupabase){
    [loginBtn,registerBtn].forEach(b=>{if(b)b.dataset.authWaiting='true'});
    window.addEventListener('lifelingo:supabase-ready',()=>[loginBtn,registerBtn].forEach(b=>{if(b)delete b.dataset.authWaiting}),{once:true});
  }
  loadPartnerPatch();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
