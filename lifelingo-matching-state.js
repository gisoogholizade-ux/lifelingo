(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let inFlight=null,last=null;
async function load(){if(inFlight)return inFlight;inFlight=(async()=>{const sb=window.llSupabase;if(!sb)return null;const ses=await sb.auth.getSession();if(!ses.data?.session)return null;const r=await sb.rpc('get_unified_profile');if(r.error)throw r.error;last=r.data||null;return last})().catch(e=>{console.warn('[LifeLingo matching] hydrate failed',e);return null}).finally(()=>inFlight=null);return inFlight}
function setValue(id,v){const el=$(id);if(el&&v!=null)el.value=v}
function apply(data){const root=$('#partnerPrefsRoot');if(!root||!data)return;const p=data.partner||{},profile=data.profile||{};setValue('#ppLang',p.target_language||profile.learning_language||'en');setValue('#ppLevel',p.preferred_level||'');setValue('#ppGoal',p.conversation_goal||'general');setValue('#ppTopics',(p.topics||[]).join(', '));setValue('#ppInterests',(p.interests||[]).join(', '));setValue('#ppNative',p.preferred_native_language||'');setValue('#ppTimezone',p.preferred_timezone||profile.timezone||'');if($('#ppText'))$('#ppText').checked=p.text_enabled!==false;if($('#ppVoice'))$('#ppVoice').checked=p.voice_enabled!==false;if($('#ppMatching'))$('#ppMatching').checked=p.matching_enabled!==false;$$('#ppAvailability .tagChoice').forEach(x=>x.classList.toggle('on',(p.availability||[]).includes(x.dataset.tag)));const age=$('#ppAge');if(age){age.innerHTML=`<option>${String(profile.age_group||'Not set')}</option>`;age.disabled=true}}
async function hydrate(force=false){if(force)last=null;const d=last||await load();apply(d)}
document.addEventListener('click',e=>{if(e.target.closest('[data-partner-prefs],#editPartnerPrefs'))setTimeout(()=>hydrate(true),0)},true);
window.addEventListener('lifelingo:profile-updated',()=>{last=null;setTimeout(()=>hydrate(true),0)});
document.addEventListener('lifelingo:language-change',()=>setTimeout(()=>hydrate(false),0));
const mo=new MutationObserver(()=>{if($('#partnerPrefsRoot')?.children.length)setTimeout(()=>hydrate(false),0)});function boot(){mo.observe(document.body,{subtree:true,childList:true})}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();