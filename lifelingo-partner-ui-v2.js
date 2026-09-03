(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let profileCache=null,pending=null,saving=false;
const isFa=()=>document.documentElement.lang==='fa'||document.documentElement.dataset.language==='fa';
async function getProfile(){
  if(profileCache)return profileCache;
  if(pending)return pending;
  pending=(async()=>{
    const sb=window.llSupabase;
    if(!sb)return null;
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return null;
    const {data,error}=await sb.rpc('get_unified_profile');
    if(error)throw error;
    profileCache=data?.profile||null;
    return profileCache;
  })().catch(e=>{console.warn('[LifeLingo Partner UI] profile unavailable',e);return null}).finally(()=>{pending=null});
  return pending;
}
function options(cur){
  const fa=isFa();
  const rows=[['13-15',fa?'۱۳ تا ۱۵ سال':'13–15'],['16-17',fa?'۱۶ تا ۱۷ سال':'16–17'],['18+',fa?'۱۸ سال به بالا':'18+']];
  if(!cur)return `<option value="">${fa?'ابتدا بازه سنی را در پروفایل تعیین کنید':'Set your age range in Profile first'}</option>`;
  return rows.filter(([v])=>v===cur).map(([v,l])=>`<option value="${v}" selected>${l}</option>`).join('');
}
async function inject(){
  const root=$('#partnerPrefsRoot');
  if(!root||root.querySelector('[data-ll-partner-age-v2]'))return;
  const p=await getProfile();
  if(!root||root.querySelector('[data-ll-partner-age-v2]'))return;
  const fa=isFa();
  const field=document.createElement('div');
  field.className='field';
  field.dataset.llPartnerAgeV2='true';
  field.innerHTML=`<label>${fa?'بازه سنی هم‌تمرینی':'Partner age range'}</label><select id="ppAgeRange" disabled>${options(p?.age_group)}</select><p class="muted" style="margin:6px 0 0">${fa?'این فاکتور از پروفایل شما می‌آید و برای ایمنی فقط افراد همان بازه سنی نمایش داده می‌شوند.':'This matching factor comes from your Profile. For safety, discovery only shows people in the same age range.'}</p><button type="button" class="ghost" data-edit-profile style="margin-top:8px">${fa?'تغییر بازه سنی در پروفایل':'Change age range in Profile'}</button>`;
  const goal=$('#ppGoal')?.closest('.field');
  if(goal)goal.after(field);else root.querySelector('#savePartnerPrefs')?.before(field);
}
function message(text,bad=false){const el=$('#ppMsg');if(!el)return;el.textContent=text;el.className='feedback '+(bad?'bad':'good')}
async function save(){
  if(saving)return;
  const sb=window.llSupabase,btn=$('#savePartnerPrefs');
  if(!sb){message(isFa()?'اتصال آماده نیست. دوباره تلاش کنید.':'Connection is not ready. Please try again.',true);return}
  saving=true;if(btn){btn.disabled=true;btn.dataset.old=btn.textContent;btn.textContent=isFa()?'در حال ذخیره…':'Saving…'}
  try{
    const p=await getProfile();
    if(!p?.age_group)throw new Error(isFa()?'ابتدا بازه سنی را در پروفایل تعیین کنید.':'Set your age range in Profile first.');
    const payload={
      target_language:$('#ppLang')?.value||'en',preferred_level:$('#ppLevel')?.value||'',conversation_goal:$('#ppGoal')?.value||'general',
      preferred_age_group:p.age_group,text_enabled:!!$('#ppText')?.checked,voice_enabled:!!$('#ppVoice')?.checked,matching_enabled:!!$('#ppMatching')?.checked,
      topics:($('#ppTopics')?.value||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,12),
      interests:($('#ppInterests')?.value||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,12),
      availability:$$('#ppAvailability .tagChoice.on').map(x=>x.dataset.tag)
    };
    const {error}=await sb.rpc('update_partner_preferences_v2',{p_payload:payload});
    if(error)throw error;
    message(isFa()?'ذخیره شد ✓':'Saved ✓');
    setTimeout(()=>{document.querySelector('#partnerPrefsModal')?.classList.remove('show');document.querySelector('[data-nav="partners"]')?.click()},350);
  }catch(e){
    console.error('[LifeLingo Partner] save failed',e);
    const raw=String(e?.message||'');
    const network=/Load failed|Failed to fetch|NetworkError/i.test(raw);
    message(network?(isFa()?'ارتباط با سرور قطع شد. اینترنت را بررسی کن و دوباره ذخیره کن.':'Could not reach the server. Check your connection and try again.'):(raw|| (isFa()?'ذخیره تنظیمات انجام نشد.':'Could not save matching preferences.')),true);
  }finally{saving=false;if(btn){btn.disabled=false;btn.textContent=btn.dataset.old|| (isFa()?'ذخیره تنظیمات':'Save matching preferences')}}
}
function reset(){profileCache=null;document.querySelector('[data-ll-partner-age-v2]')?.remove();setTimeout(inject,0)}
document.addEventListener('click',e=>{
  if(e.target.closest('#savePartnerPrefs')){e.preventDefault();e.stopImmediatePropagation();save();return}
  if(e.target.closest('[data-partner-prefs],#editPartnerPrefs'))setTimeout(inject,0);
},true);
document.addEventListener('lifelingo:language-change',reset);
window.addEventListener('lifelingo:profile-updated',reset);
const obs=new MutationObserver(()=>inject());
function boot(){obs.observe(document.body,{subtree:true,childList:true});inject()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
