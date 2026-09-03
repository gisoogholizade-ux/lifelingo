(()=>{
'use strict';
const $=s=>document.querySelector(s);
let profileCache=null,pending=null;
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
function reset(){profileCache=null;document.querySelector('[data-ll-partner-age-v2]')?.remove();setTimeout(inject,0)}
document.addEventListener('click',e=>{if(e.target.closest('[data-partner-prefs],#editPartnerPrefs'))setTimeout(inject,0)},true);
document.addEventListener('lifelingo:language-change',reset);
window.addEventListener('lifelingo:profile-updated',reset);
const obs=new MutationObserver(()=>inject());
function boot(){obs.observe(document.body,{subtree:true,childList:true});inject()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
