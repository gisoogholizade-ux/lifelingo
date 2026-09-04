(()=>{
const bySrc={
'./assets/4C99D87A-32DC-4B66-B834-F15257487B07.png':0,
'./assets/8C662C59-60C5-4AB8-A6D9-728B598D3EAE.png':1,
'./assets/98B0EBC3-1F87-413C-AB08-C6AB17ACE492.png':2,
'./assets/DA3E874A-7DD6-46E9-828B-3688B43FC385.png':3,
'./assets/F131F764-76F2-4E70-8F9A-270F2F64804E.png':4,
'./assets/1DCA1D8B-E146-4CFF-9803-F2FEDB77F21B.png':10,
'./assets/496DCF3B-187B-4F7A-A5BA-F3DFE6D3DD48.png':11,
'./assets/9BA0896E-6704-42C2-8BEF-1589C15C47A7.png':12,
'./assets/B71F29C4-CA8E-4590-968A-20A8A1D079B9.png':13,
'./assets/D474CA0C-5506-46D8-9718-CF9DB25E2C73.png':14
};
const valid=new Set(Object.values(bySrc));
function legacyId(){try{const u=JSON.parse(localStorage.getItem('lifelingo_user')||'null');const id=Number(u?.avatarId);if(Number.isInteger(id)&&valid.has(id))return id;const src=String(u?.avatarUrl||'').split('?')[0];return bySrc[src]??null}catch{return null}}
async function run(){if(!window.llSupabase){window.addEventListener('lifelingo:supabase-ready',run,{once:true});return}try{const session=(await llSupabase.auth.getSession()).data.session;if(!session)return;const current=await llSupabase.rpc('get_avatar_identity');if(current.error)throw current.error;if(current.data?.avatar_id!=null)return;const id=legacyId();if(id==null)return;const r=await llSupabase.rpc('recover_legacy_avatar',{p_avatar:id});if(r.error)throw r.error;await window.LL_AVATAR?.reload?.();window.dispatchEvent(new CustomEvent('lifelingo:profile-updated'))}catch(e){console.warn('LifeLingo legacy avatar recovery skipped',e?.message||e)}}
window.addEventListener('lifelingo:user-changed',()=>setTimeout(run,80));
setTimeout(run,700);
})();

(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let sb=null,data=null,gender=null,claiming=false,refreshing=false,lastAvatarSig='',lastSpeakSig='';
const META={airport:{paid:false},sim:{paid:false,prev:['migration',0]},transport:{paid:true,prev:['migration',1]},shopping:{paid:true,prev:['migration',2]},bank:{paid:true,prev:['migration',3]},doctor:{paid:true,prev:['migration',4]},apartment:{paid:true},workplace:{paid:true},interview:{paid:true,prev:['career',0]},hotel:{paid:true},restaurant:{paid:true,prev:['travel',0]},directions:{paid:true,prev:['travel',1]}};
const profile=()=>data?.profile||{};
const hasAvatar=()=>profile().avatar_id!==null&&profile().avatar_id!==undefined&&profile().avatar_id!=='';
const pro=()=>!!data?.membership?.is_pro;
const done=(p,i)=>!!data?.progress?.paths?.[p]?.[String(i)]?.completed;
function state(key){const m=META[key]||{};if(m.paid&&!pro())return{ok:false,why:'pro'};if(m.prev&&!done(m.prev[0],m.prev[1]))return{ok:false,why:'progress'};return{ok:true,why:''}}
async function refresh(){if(refreshing)return;refreshing=true;try{sb=window.llSupabase||sb;if(!sb)return;const s=await sb.auth.getSession();if(!s.data?.session){data=null;return}const r=await sb.rpc('get_unified_profile');if(!r.error)data=r.data}catch(e){console.warn('LifeLingo entitlement refresh',e)}finally{refreshing=false;patch(true)}}
function avatarMarkup(){if(hasAvatar()){const src=profile().avatar_url||'';return `<div class="eyebrow">AVATAR SURPRISE</div><h3>Your avatar is already revealed ✨</h3>${src?`<img src="${src.replace(/"/g,'&quot;')}" alt="LifeLingo avatar" style="display:block;width:132px;height:132px;object-fit:contain;margin:14px auto;border-radius:28px">`:''}<p class="muted">Your one-time avatar is saved to this account.</p>`}return `<div class="eyebrow">AVATAR SURPRISE</div><h3>Who should LifeLingo surprise you with?</h3><p class="muted">Choose Female or Male first.</p><div class="ll68Gender"><button type="button" data-llsafe-gender="girls" class="${gender==='girls'?'on':''}">♀ Female</button><button type="button" data-llsafe-gender="boys" class="${gender==='boys'?'on':''}">♂ Male</button></div><button type="button" class="primary" style="width:100%;margin-top:12px" data-llsafe-claim ${gender&&!claiming?'':'disabled'}>${claiming?'Saving…':'✨ Surprise Me'}</button><div id="llsafeAvatarMsg" class="feedback"></div>`}
function patchAvatar(force=false){const root=$('#onboardRoot'),grid=root?.querySelector('.avatarGrid');if(!root||!grid)return;grid.style.display='none';const legacy=$('#ll69Onboard');if(legacy)legacy.style.display='none';let box=$('#llsafeAvatar');if(!box){box=document.createElement('div');box.id='llsafeAvatar';box.className='ll68Onboard';grid.parentElement.insertBefore(box,grid);force=true}const sig=[profile().avatar_id,profile().avatar_url,gender,claiming].join('|');if(force||sig!==lastAvatarSig){lastAvatarSig=sig;box.innerHTML=avatarMarkup()}}
function patchSpeak(force=false){const root=$('#speakRoot');if(!root)return;const cards=$('[data-canonical-scenario]',root);if(!cards)return;const sig=[pro(),...Object.keys(META).map(k=>`${k}:${state(k).ok}:${state(k).why}`)].join('|');if(!force&&sig===lastSpeakSig)return;lastSpeakSig=sig;$$('[data-canonical-scenario]',root).forEach(btn=>{const key=btn.dataset.canonicalScenario,s=state(key),access=btn.querySelector('.speakAccess');if(pro())btn.classList.remove('locked');btn.classList.toggle('llProgressLock',!s.ok&&s.why==='progress');if(!s.ok)btn.setAttribute('aria-disabled','true');else btn.removeAttribute('aria-disabled');if(access){const text=s.ok?'OPEN':s.why==='progress'?'COMPLETE PREVIOUS':'PRO';if(access.textContent!==text)access.textContent=text}});const chip=root.querySelector('.speakSectionTitle .chip');if(chip&&pro()&&chip.textContent!=='PRO ACTIVE · STEP BY STEP')chip.textContent='PRO ACTIVE · STEP BY STEP'}
function patch(force=false){patchAvatar(force);patchSpeak(force)}
async function claim(){if(claiming||!gender||hasAvatar())return;claiming=true;patch(true);try{sb=window.llSupabase||sb;if(!sb)throw new Error('Connection unavailable');const r=await sb.rpc('claim_random_avatar',{p_gender:gender});if(r.error)throw r.error;gender=null;await refresh();window.dispatchEvent(new CustomEvent('lifelingo:profile-updated'))}catch(e){const m=$('#llsafeAvatarMsg');if(m){m.textContent=e?.message||'Could not reveal avatar.';m.className='feedback bad'}}finally{claiming=false;patch(true)}}
document.addEventListener('click',e=>{const g=e.target.closest?.('[data-llsafe-gender]');if(g){e.preventDefault();e.stopImmediatePropagation();gender=g.dataset.llsafeGender;patch(true);return}if(e.target.closest?.('[data-llsafe-claim]')){e.preventDefault();e.stopImmediatePropagation();claim();return}const next=e.target.closest?.('[data-on-next]');if(next&&$('#onboardRoot .avatarGrid')&&!hasAvatar()){e.preventDefault();e.stopImmediatePropagation();const m=$('#llsafeAvatarMsg');if(m){m.textContent='Choose Female or Male and reveal your avatar first.';m.className='feedback bad'}return}const sc=e.target.closest?.('[data-canonical-scenario]');if(sc){const s=state(sc.dataset.canonicalScenario);if(!s.ok){e.preventDefault();e.stopImmediatePropagation();const t=$('#toast');if(t){t.textContent=s.why==='pro'?'This scenario is available with Pro.':'Complete the previous speaking mission first.';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}return}}},true);
const style=document.createElement('style');style.textContent='.speakScenarioCard.llProgressLock{opacity:.58;cursor:not-allowed}.speakScenarioCard.llProgressLock .speakAccess{font-size:10px;text-align:center}.ll68Gender button.on{outline:2px solid currentColor}';document.head.appendChild(style);
window.addEventListener('lifelingo:profile-updated',refresh);window.addEventListener('lifelingo:mission-saved',refresh);window.addEventListener('hashchange',()=>setTimeout(()=>{lastSpeakSig='';refresh()},60));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
setInterval(()=>patch(false),900);
})();
