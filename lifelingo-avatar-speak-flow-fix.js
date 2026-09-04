(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let sb=null,profileData=null,homeData=null,gender=null,claiming=false,loading=false;
const scenarioMeta={
 airport:{paid:false,path:'migration',mission:0,prev:null},
 sim:{paid:false,path:'migration',mission:1,prev:['migration',0]},
 transport:{paid:true,path:'migration',mission:2,prev:['migration',1]},
 shopping:{paid:true,path:'migration',mission:3,prev:['migration',2]},
 bank:{paid:true,path:'migration',mission:4,prev:['migration',3]},
 doctor:{paid:true,path:'migration',mission:5,prev:['migration',4]},
 apartment:{paid:true,unit:'c3-conversation'},
 workplace:{paid:true,path:'career',mission:0,prev:null},
 interview:{paid:true,path:'career',mission:3,prev:['career',0]},
 hotel:{paid:true,path:'travel',mission:0,prev:null},
 restaurant:{paid:true,path:'travel',mission:1,prev:['travel',0]},
 directions:{paid:true,path:'travel',mission:2,prev:['travel',1]}
};
const hasAvatar=p=>p?.avatar_id!==null&&p?.avatar_id!==undefined&&p?.avatar_id!=='';
const currentProfile=()=>profileData?.profile||{};
const isPro=()=>!!(profileData?.membership?.is_pro||homeData?.membership?.is_pro);
const progress=()=>profileData?.progress?.paths||{};
const completed=(path,mission)=>!!progress()?.[path]?.[String(mission)]?.completed;
function unitState(id){for(const c of homeData?.courses||[])for(const ch of c.chapters||[])for(const u of ch.units||[])if(String(u.id)===String(id))return u;return null}
function scenarioState(key){const m=scenarioMeta[key];if(!m)return{allowed:true,done:false,reason:''};const pro=isPro();const done=m.path!=null?completed(m.path,m.mission):!!unitState(m.unit)?.completed;if(m.paid&&!pro)return{allowed:false,done,reason:'pro'};if(m.prev&&!completed(m.prev[0],m.prev[1]))return{allowed:false,done,reason:'progress'};if(m.unit){const u=unitState(m.unit);if(u&&!u.unlocked)return{allowed:false,done,reason:'progress'}}return{allowed:true,done,reason:''}}
function toast(msg){const t=$('#toast');if(t){t.textContent=msg;t.classList.add('show');clearTimeout(t._llFlowTimer);t._llFlowTimer=setTimeout(()=>t.classList.remove('show'),2600)}else console.info(msg)}
async function client(){if(window.llSupabase)return window.llSupabase;return await new Promise(resolve=>window.addEventListener('lifelingo:supabase-ready',()=>resolve(window.llSupabase),{once:true}))}
async function refresh(force=false){if(loading&&!force)return;loading=true;try{sb=await client();const ses=await sb.auth.getSession();if(!ses.data?.session){profileData=homeData=null;return}const [u,h]=await Promise.all([sb.rpc('get_unified_profile'),sb.rpc('get_learning_home')]);if(!u.error)profileData=u.data;if(!h.error)homeData=h.data}catch(e){console.warn('LifeLingo flow refresh failed',e)}finally{loading=false;patchAll()}}
function avatarImg(p){return p.avatar_url?`<img src="${String(p.avatar_url).replace(/"/g,'&quot;')}" alt="LifeLingo avatar" style="width:132px;height:132px;object-fit:contain;border-radius:28px">`:'✨'}
function avatarChooser(inner=false){const p=currentProfile();if(hasAvatar(p))return `<div class="llFlowAvatarDone"><div class="eyebrow">AVATAR SURPRISE</div><h3>Your avatar is revealed ✨</h3><div style="display:flex;justify-content:center;margin:14px 0">${avatarImg(p)}</div><p class="muted">This avatar is saved to your account and cannot be rerolled.</p>${inner?'<button class="primary" data-llfix-close>Continue</button>':''}</div>`;return `<div class="eyebrow">AVATAR SURPRISE</div><h3>Who should LifeLingo surprise you with?</h3><p class="muted">Choose Female or Male first. Then reveal your one-time avatar.</p><div class="ll68Gender"><button type="button" data-llfix-gender="girls" class="${gender==='girls'?'on':''}">♀ Female</button><button type="button" data-llfix-gender="boys" class="${gender==='boys'?'on':''}">♂ Male</button></div><button type="button" class="primary" style="width:100%;margin-top:12px" data-llfix-claim ${gender?'':'disabled'}>${claiming?'Saving…':'✨ Surprise Me'}</button><div id="llfixAvatarMsg" class="feedback"></div>`}
function patchAvatarOnboarding(){const root=$('#onboardRoot'),grid=root?.querySelector('.avatarGrid');if(!root||!grid)return;grid.style.display='none';const old=$('#ll69Onboard');if(old)old.style.display='none';let box=$('#llfixAvatarOnboard');if(!box){box=document.createElement('div');box.id='llfixAvatarOnboard';box.className='ll68Onboard';grid.parentElement.insertBefore(box,grid)}const sig=[currentProfile().avatar_id,currentProfile().avatar_url,gender,claiming].join('|');if(box.dataset.sig!==sig){box.dataset.sig=sig;box.innerHTML=avatarChooser(false)}}
function openFixedAvatar(){document.querySelector('.llfixAvatarModal')?.remove();const o=document.createElement('div');o.className='ll68AvatarModal llfixAvatarModal';o.innerHTML=`<div class="ll68AvatarShell"><div class="row" style="justify-content:space-between"><div class="brand">Life<span>Lingo</span></div><button class="ghost" data-llfix-close>×</button></div><div style="text-align:center;padding-top:12px">${avatarChooser(true)}</div></div>`;document.body.appendChild(o)}
async function claimAvatar(){if(claiming||!gender||hasAvatar(currentProfile()))return;claiming=true;patchAll();try{sb=await client();const r=await sb.rpc('claim_random_avatar',{p_gender:gender});if(r.error)throw r.error;await refresh(true);gender=null;window.dispatchEvent(new CustomEvent('lifelingo:profile-updated'));patchAll();if($('.llfixAvatarModal'))openFixedAvatar();toast('Your LifeLingo avatar is saved ✓')}catch(e){const m=$('#llfixAvatarMsg');if(m){m.textContent=e?.message||'Could not reveal avatar.';m.className='feedback bad'}else toast(e?.message||'Could not reveal avatar.')}finally{claiming=false;patchAll()}}
function avatarStepActive(){return !!$('#onboardRoot .avatarGrid')}
function patchSpeak(){const root=$('#speakRoot');if(!root||!root.querySelector('[data-canonical-scenario]'))return;const pro=isPro();$$('[data-canonical-scenario]',root).forEach(btn=>{const key=btn.dataset.canonicalScenario,s=scenarioState(key),access=btn.querySelector('.speakAccess');btn.classList.remove('llStepLocked');if(pro)btn.classList.remove('locked');if(access){if(s.done)access.textContent='DONE';else if(s.allowed)access.textContent='OPEN';else if(s.reason==='progress')access.textContent='COMPLETE PREVIOUS';else access.textContent='PRO'}if(!s.allowed&&s.reason==='progress'){btn.classList.add('llStepLocked');btn.setAttribute('aria-disabled','true')}else btn.removeAttribute('aria-disabled')});const chip=root.querySelector('.speakSectionTitle .chip');if(chip&&pro)chip.textContent='PRO ACTIVE · STEP BY STEP'}
function guardDirectRoute(){const m=location.hash.match(/^#speak\/scenario\/([^?]+)/);if(!m)return;const key=decodeURIComponent(m[1]),s=scenarioState(key);if(!s.allowed){history.replaceState({ll:true},'',location.pathname+location.search+'#speak');setTimeout(()=>window.dispatchEvent(new HashChangeEvent('hashchange')),0);toast(s.reason==='pro'?'This scenario is available with Pro.':'Complete the previous speaking mission first.')}}
function patchAll(){patchAvatarOnboarding();patchSpeak();guardDirectRoute()}
window.addEventListener('click',e=>{const target=e.target;
 const g=target.closest?.('[data-llfix-gender]');if(g){e.preventDefault();e.stopImmediatePropagation();gender=g.dataset.llfixGender;patchAll();if($('.llfixAvatarModal'))openFixedAvatar();return}
 if(target.closest?.('[data-llfix-claim]')){e.preventDefault();e.stopImmediatePropagation();claimAvatar();return}
 if(target.closest?.('[data-llfix-close]')){e.preventDefault();e.stopImmediatePropagation();target.closest('.llfixAvatarModal')?.remove();return}
 const legacyAvatar=target.closest?.('[data-ll69-avatar]');if(legacyAvatar&&!hasAvatar(currentProfile())){e.preventDefault();e.stopImmediatePropagation();gender=null;openFixedAvatar();return}
 const next=target.closest?.('[data-on-next]');if(next&&avatarStepActive()&&!hasAvatar(currentProfile())){e.preventDefault();e.stopImmediatePropagation();const m=$('#llfixAvatarMsg');if(m){m.textContent='Choose Female or Male and reveal your avatar first.';m.className='feedback bad'}return}
 const sc=target.closest?.('[data-canonical-scenario]');if(sc){const key=sc.dataset.canonicalScenario,s=scenarioState(key);if(!profileData||!homeData){e.preventDefault();e.stopImmediatePropagation();refresh(true).then(()=>{const now=scenarioState(key);if(now.allowed)window.LifeLingoSpeak?.open?.(key);else toast(now.reason==='pro'?'This scenario is available with Pro.':'Complete the previous speaking mission first.')});return}if(!s.allowed){e.preventDefault();e.stopImmediatePropagation();toast(s.reason==='pro'?'This scenario is available with Pro.':'Complete the previous speaking mission first.');return}}
},true);
const style=document.createElement('style');style.textContent='.speakScenarioCard.llStepLocked{opacity:.58;cursor:not-allowed}.speakScenarioCard.llStepLocked .speakAccess{font-size:10px;max-width:92px;text-align:center}.llFlowAvatarDone{text-align:center}.llfixAvatarModal .ll68Gender{margin:20px 0}';document.head.appendChild(style);
const mo=new MutationObserver(()=>patchAll());mo.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('hashchange',()=>{refresh(true);setTimeout(patchAll,80)});
window.addEventListener('lifelingo:profile-updated',()=>refresh(true));
window.addEventListener('lifelingo:mission-saved',()=>refresh(true));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(true));else refresh(true);
setInterval(patchAll,700);
})();