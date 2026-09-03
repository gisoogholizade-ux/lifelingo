(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
let signupPending=false,logoutPending=false;
const fa=()=>document.documentElement.lang==='fa'||document.documentElement.dataset.language==='fa'||localStorage.getItem('lifelingo_language')==='fa';
const copy={
 signup:{creating:['Creating account…','در حال ساخت حساب…'],confirm:['Account created. Check your email to continue, then log in.','حساب ساخته شد. ایمیلت را برای ادامه تأیید کن، سپس وارد شو.'],created:['Account created. Signing you in…','حساب ساخته شد. در حال ورود…'],name:['Enter your name.','نامت را وارد کن.'],email:['Enter a valid email.','یک ایمیل معتبر وارد کن.'],emailRejected:['This email address cannot receive a LifeLingo confirmation. Use a real email you can open.','این ایمیل نمی‌تواند پیام تأیید LifeLingo را دریافت کند. از یک ایمیل واقعی که به آن دسترسی داری استفاده کن.'],rateLimit:['Too many confirmation emails were requested. Please wait and try again later.','درخواست ایمیل تأیید بیش از حد بوده است. کمی بعد دوباره امتحان کن.'],emailDelivery:['Confirmation email delivery is not available for this address yet.','ارسال ایمیل تأیید هنوز برای این آدرس در دسترس نیست.'],phone:['Enter a valid mobile number including country code.','شماره موبایل معتبر همراه با کد کشور وارد کن.'],password:['Use at least 8 characters for your password.','رمز عبور باید حداقل ۸ کاراکتر باشد.'],network:['Could not reach the secure signup service. Check your connection and try again.','اتصال به سرویس امن ثبت‌نام برقرار نشد. اینترنت را بررسی و دوباره امتحان کن.'],generic:['Could not create your account. Please try again.','ساخت حساب انجام نشد. دوباره امتحان کن.']},
 logout:{busy:['Logging out…','در حال خروج…'],error:['Could not complete logout. Please try again.','خروج کامل نشد. دوباره امتحان کن.']}
};
const tr=(group,key)=>copy[group][key][fa()?1:0];
const waitForClient=()=>new Promise((resolve,reject)=>{if(window.llSupabase)return resolve(window.llSupabase);let done=false;const finish=(fn,v)=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('lifelingo:supabase-ready',ready);window.removeEventListener('lifelingo:supabase-error',bad);fn(v)};const ready=()=>finish(resolve,window.llSupabase);const bad=()=>finish(reject,new Error('client unavailable'));const timer=setTimeout(()=>finish(reject,new Error('client timeout')),13000);window.addEventListener('lifelingo:supabase-ready',ready,{once:true});window.addEventListener('lifelingo:supabase-error',bad,{once:true})});
function ensureSpeakInteractionGuard(){if(document.querySelector('script[data-lifelingo-speak-interaction-guard]'))return;const s=document.createElement('script');s.src='./lifelingo-speak-interaction-guard.js?v=1';s.async=false;s.dataset.lifelingoSpeakInteractionGuard='1';s.onerror=()=>console.error('[LifeLingo Speak interaction] guard failed to load');document.head.appendChild(s)}
function authMessage(text,kind=''){const el=$('#authMsg');if(!el)return;el.textContent=text||'';el.className='feedback'+(kind?' '+kind:'')}
function setBusy(btn,on,text){if(!btn)return;if(on){btn.dataset.guardOld=btn.textContent;btn.disabled=true;if(text)btn.textContent=text}else{btn.disabled=false;btn.textContent=btn.dataset.guardOld||btn.textContent;delete btn.dataset.guardOld}}
function friendlySignupError(e){const m=String(e?.message||''),code=String(e?.code||''),status=Number(e?.status||0);if(e instanceof TypeError||/load failed|failed to fetch|network/i.test(m))return tr('signup','network');if(/already registered|already exists|user_already_exists/i.test(`${code} ${m}`))return fa()?'این ایمیل قبلاً ثبت شده است. وارد حساب شو.':'This email is already registered. Log in instead.';if(code==='over_email_send_rate_limit'||status===429||/email rate limit|too many requests/i.test(m))return tr('signup','rateLimit');if(code==='email_address_not_authorized'||/email address not authorized/i.test(m))return tr('signup','emailDelivery');if(code==='email_address_invalid'||/email address .*invalid|invalid email/i.test(m))return tr('signup','emailRejected');return tr('signup','generic')}
function confirmationRedirect(){const configured=String(window.LIFELINGO_CONFIG?.publicUrl||'').trim();try{return new URL(configured||'./',location.href).href}catch{return new URL('./',location.href).href}}
async function signup(){if(signupPending)return;const btn=$('#registerBtn'),name=$('#regName')?.value.trim()||'',email=$('#regEmail')?.value.trim().toLowerCase()||'',phone=$('#regPhone')?.value.trim()||'',password=$('#regPassword')?.value||'';
 if(name.length<2)return authMessage(tr('signup','name'),'bad');if(!/^\S+@\S+\.\S+$/.test(email))return authMessage(tr('signup','email'),'bad');if(!/^\+?[0-9]{8,15}$/.test(phone))return authMessage(tr('signup','phone'),'bad');if(password.length<8)return authMessage(tr('signup','password'),'bad');
 signupPending=true;setBusy(btn,true,tr('signup','creating'));authMessage('');
 try{const sb=await waitForClient();const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:confirmationRedirect(),data:{display_name:name,phone,contact_consent:!!$('#regConsent')?.checked}}});console.info('[LifeLingo signup]',{hasUser:!!data?.user,hasSession:!!data?.session,error:!!error,errorCode:error?.code||null,status:error?.status||null});if(error)throw error;if(!data?.user)throw new Error('Signup returned no user');if(Array.isArray(data.user.identities)&&data.user.identities.length===0)throw Object.assign(new Error('User already registered'),{code:'user_already_exists'});
   if(!data.session){authMessage(tr('signup','confirm'),'good');return}
   // No profile RPC is called here. The auth.users trigger bootstraps the profile.
   authMessage(tr('signup','created'),'good');location.reload();
 }catch(e){console.error('[LifeLingo signup failed]',e);authMessage(friendlySignupError(e),'bad')}finally{signupPending=false;setBusy(btn,false)}
}
function clearUserUi(){
  try{window.speechSynthesis?.cancel?.()}catch{}
  document.querySelectorAll('#editProfileModal,#partnerPrefsModal,#lessonModal').forEach(x=>x.classList.remove('show'));
  $('#onboarding')?.classList.add('hidden');$('#chatOverlay')?.classList.add('hidden');$('#speakMission')?.remove();
  document.body.classList.remove('speakMissionActive');delete document.documentElement.dataset.authenticated;
  const app=$('#appScreen');if(app)app.classList.add('hidden');const auth=$('#authScreen');if(auth)auth.classList.remove('hidden');
  ['homeRoot','learnRoot','speakRoot','partnersRoot','reviewRoot','profileRoot','proRoot','chatMessages','partnerPrefsRoot','editProfileRoot','onboardRoot'].forEach(id=>{const el=document.getElementById(id);if(el)el.replaceChildren()});
  try{Object.keys(sessionStorage).filter(k=>/^lifelingo_(avatar_identity|social_|chat_|partner_|profile_|user_)/i.test(k)).forEach(k=>sessionStorage.removeItem(k))}catch{}
}
function showLogoutError(){const toast=$('#toast');if(toast){toast.textContent=tr('logout','error');toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2600)}else authMessage(tr('logout','error'),'bad')}
async function logout(trigger){if(logoutPending)return;logoutPending=true;const buttons=[trigger,$('#logoutBtn'),$('[data-header-logout]'),$('#logout')].filter(Boolean);buttons.forEach(b=>setBusy(b,true,tr('logout','busy')));
 try{const sb=await waitForClient();try{await sb.removeAllChannels?.()}catch(e){console.warn('[LifeLingo logout] realtime cleanup',e)}const {error}=await sb.auth.signOut({scope:'global'});if(error){const current=(await sb.auth.getSession()).data?.session;if(current)throw error}
   clearUserUi();try{history.replaceState(null,'',location.pathname+location.search)}catch{}location.replace(location.pathname+location.search);
 }catch(e){console.error('[LifeLingo logout failed]',e);showLogoutError();buttons.forEach(b=>setBusy(b,false));logoutPending=false}
}
function protectedGuard(){const app=$('#appScreen');if(!app||app.classList.contains('hidden'))return;waitForClient().then(sb=>sb.auth.getSession()).then(({data})=>{if(!data?.session){clearUserUi();try{history.replaceState(null,'',location.pathname+location.search)}catch{}}else document.documentElement.dataset.authenticated='true'}).catch(()=>{})}
function install(){
 ensureSpeakInteractionGuard();
 document.addEventListener('click',e=>{const reg=e.target.closest?.('#registerBtn');if(reg){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();signup();return}const out=e.target.closest?.('#logoutBtn,[data-header-logout],#logout,[data-logout],[data-signout]');if(out){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();logout(out)}},true);
 window.addEventListener('pageshow',protectedGuard);window.addEventListener('popstate',protectedGuard);window.addEventListener('hashchange',protectedGuard);
 protectedGuard();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
