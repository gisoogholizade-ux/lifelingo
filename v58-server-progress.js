(()=>{
const blank=()=>({xp:0,paths:{},activity:[],days:[],goal:'migration'});
let cache=blank(),ready=false,currentId=null,saving=null;
const readUser=()=>{try{return JSON.parse(localStorage.getItem('lifelingo_user')||'null')}catch{return null}};
const clone=v=>JSON.parse(JSON.stringify(v));
function installOverrides(){
  window.loadP=()=>clone(cache);
  window.saveP=p=>{cache=clone(p||blank());persist();return cache};
}
async function persist(){const u=readUser();if(!u?.id||!window.llSupabase)return;const payload={user_id:u.id,xp:Number(cache.xp||0),goal:cache.goal||'migration',paths:cache.paths||{},activity:cache.activity||[],days:cache.days||[],updated_at:new Date().toISOString()};saving=window.llSupabase.from('user_progress').upsert(payload,{onConflict:'user_id'});try{await saving}catch{}finally{saving=null}}
async function loadServer(){const u=readUser();installOverrides();if(!u?.id||!window.llSupabase){cache=blank();ready=false;try{window.hintLang='en'}catch{}return}
 currentId=u.id;ready=false;
 const [{data:p,error:pe},{data:pr,error:pre}]=await Promise.all([
  window.llSupabase.from('user_progress').select('xp,goal,paths,activity,days').eq('user_id',u.id).maybeSingle(),
  window.llSupabase.from('profiles').select('hint_language').eq('id',u.id).maybeSingle()
 ]);
 if(!pe&&p)cache={xp:p.xp||0,goal:p.goal||'migration',paths:p.paths||{},activity:p.activity||[],days:p.days||[]};else{cache=blank();await persist()}
 try{window.hintLang=!pre&&pr?.hint_language?pr.hint_language:'en'}catch{}
 ready=true;
 try{renderProfile();if(window.path)openPath(window.path)}catch{}
 window.dispatchEvent(new CustomEvent('lifelingo:progress-loaded',{detail:{userId:u.id}}));
}
async function saveHint(lang){const u=readUser();if(!u?.id||!window.llSupabase)return;await window.llSupabase.from('profiles').update({hint_language:lang}).eq('id',u.id)}
function purgeLegacy(){try{Object.keys(localStorage).filter(k=>k.startsWith('lifelingo_progress_')||k==='lifelingo_hint').forEach(k=>localStorage.removeItem(k))}catch{}}
function interceptHint(){document.addEventListener('click',e=>{const b=e.target.closest?.('.hintPref,.langBtn');if(!b?.dataset?.lang)return;const lang=b.dataset.lang==='fa'?'fa':'en';try{window.hintLang=lang}catch{}saveHint(lang)},true)}
window.addEventListener('lifelingo:user-changed',()=>{cache=blank();ready=false;purgeLegacy();setTimeout(loadServer,60)});
window.addEventListener('lifelingo:supabase-ready',()=>setTimeout(loadServer,80));
installOverrides();purgeLegacy();interceptHint();setTimeout(loadServer,500);
window.LL_PROGRESS={reload:loadServer,get:()=>clone(cache),isReady:()=>ready,userId:()=>currentId};
})();