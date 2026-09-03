(()=>{
'use strict';
const $=s=>document.querySelector(s);
let profileCache=null,loading=null;
const fa=()=>document.documentElement.lang==='fa'||document.documentElement.dataset.language==='fa';
async function profile(){
  if(profileCache)return profileCache;
  if(loading)return loading;
  loading=(async()=>{
    if(!window.llSupabase)return null;
    const {data:{session}}=await window.llSupabase.auth.getSession();
    if(!session)return null;
    const {data,error}=await window.llSupabase.rpc('get_unified_profile');
    if(error)throw error;
    profileCache=data?.profile||null;
    return profileCache;
  })().catch(e=>{console.warn('[LifeLingo Partner] profile age unavailable',e);return null}).finally(()=>{loading=null});
  return loading;
}
function ageLabel(v){
  if(v==='13-15')return fa()?'۱۳ تا ۱۵ سال':'13–15';
  if(v==='16-17')return fa()?'۱۶ تا ۱۷ سال':'16–17';
  if(v==='18+')return fa()?'۱۸ سال به بالا':'18+';
  return fa()?'تعیین نشده':'Not set';
}
async function patchPrefs(){
  const root=$('#partnerPrefsRoot');
  if(!root||root.querySelector('[data-ll-age-range]'))return;
  const p=await profile();
  if(!root||root.querySelector('[data-ll-age-range]'))return;
  const field=document.createElement('div');
  field.className='field';
  field.dataset.llAgeRange='true';
  field.innerHTML=`<label>${fa()?'بازه سنی برای هم‌تمرینی':'Age range for matching'}</label><div class="softCard" style="padding:12px 14px"><b>${ageLabel(p?.age_group)}</b><p class="muted" style="margin:5px 0 0">${fa()?'برای ایمنی، فقط افرادی از همین بازه سنی در نتایج Partner نمایش داده می‌شوند. بازه سنی از پروفایل شما گرفته می‌شود.':'For safety, Partner discovery only returns people in your own age range. This range comes from your profile.'}</p></div>`;
  const goal=$('#ppGoal')?.closest('.field');
  if(goal)goal.after(field);else root.querySelector('#savePartnerPrefs')?.before(field);
}
function patchDiscoveryCopy(){
  const root=$('#partnersRoot');if(!root)return;
  root.querySelectorAll('.sectionHead h2').forEach(h=>{
    if(h.dataset.llAgeCopy)return;
    if(/People matched safely|افراد/i.test(h.textContent||'')){
      h.dataset.llAgeCopy='1';
      const note=document.createElement('div');
      note.className='muted';note.style.fontSize='12px';note.style.marginTop='4px';
      profile().then(p=>{note.textContent=fa()?`تطبیق سنی فعال: ${ageLabel(p?.age_group)}`:`Age-safe matching: ${ageLabel(p?.age_group)}`});
      h.after(note);
    }
  });
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-partner-prefs],#editPartnerPrefs'))setTimeout(patchPrefs,0);
},true);
document.addEventListener('lifelingo:language-change',()=>{profileCache=null;setTimeout(()=>{const old=$('[data-ll-age-range]');old?.remove();patchPrefs();patchDiscoveryCopy()},0)});
window.addEventListener('lifelingo:profile-updated',()=>{profileCache=null});
const obs=new MutationObserver(()=>{patchPrefs();patchDiscoveryCopy()});
function boot(){obs.observe(document.body,{subtree:true,childList:true});patchPrefs();patchDiscoveryCopy()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
