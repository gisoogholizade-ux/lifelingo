(()=>{
let selectedPath=null,selectedIndex=null,saving=null,saved=null,lastComplete=false;
const $=s=>document.querySelector(s);
const clone=v=>JSON.parse(JSON.stringify(v));
function inferPath(){
  if(selectedPath)return selectedPath;
  const tag=($('#worldTag')?.textContent||'').trim().toLowerCase();
  if(['migration','career','travel'].includes(tag))return tag;
  try{if(typeof path!=='undefined'&&['migration','career','travel'].includes(path))return path}catch{}
  return null;
}
function inferIndex(){
  if(Number.isInteger(selectedIndex))return selectedIndex;
  try{if(typeof mi!=='undefined'&&Number.isInteger(mi))return mi}catch{}
  return 0;
}
function scoreNow(){
  try{if(typeof scores!=='undefined'&&Array.isArray(scores)&&scores.length)return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)}catch{}
  return 100;
}
async function saveMission(){
  if(saving)return saving;
  const p=inferPath(),i=inferIndex(),score=scoreNow();
  if(!p||!window.llSupabase)return null;
  const btn=$('#nextMission');
  if(btn){btn.disabled=true;btn.textContent='Saving…'}
  saving=(async()=>{
    try{
      const {data,error}=await llSupabase.rpc('complete_mission',{p_path:p,p_mission:i,p_score:score});
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      if(!row)throw new Error('Mission was not saved.');
      saved=row;
      const progress={xp:Number(row.xp||0),goal:row.goal||'migration',paths:row.paths||{},activity:row.activity||[],days:row.days||[]};
      window.LL_STATE?.setProgress?.(clone(progress),{persist:false});
      const text=$('#completeText');if(text&&!/Saved to your account/.test(text.textContent||''))text.textContent=(text.textContent||'')+' Saved to your account ✓';
      if(btn){btn.disabled=false;btn.textContent='Next mission →'}
      try{if(typeof renderProfile==='function')renderProfile()}catch{}
      return row;
    }catch(e){
      console.error('mission server save',e);
      const text=$('#completeText');if(text)text.textContent='Could not save this mission. Tap Retry save.';
      if(btn){btn.disabled=false;btn.textContent='Retry save'}
      return null;
    }finally{saving=null}
  })();
  return saving;
}
function onCompleteShown(){
  selectedPath=inferPath();selectedIndex=inferIndex();saved=null;
  saveMission();
}
document.addEventListener('click',e=>{
  const pathBtn=e.target.closest('[data-path]');if(pathBtn?.dataset.path){selectedPath=pathBtn.dataset.path;selectedIndex=null;saved=null}
  const mission=e.target.closest('.mission[data-i]');if(mission){selectedPath=inferPath();selectedIndex=Number(mission.dataset.i);saved=null}
  if(e.target.closest('#continueBtn'))setTimeout(()=>{selectedPath=inferPath();selectedIndex=inferIndex();saved=null},120);
  const next=e.target.closest('#nextMission');
  if(next){
    e.preventDefault();e.stopImmediatePropagation();
    (async()=>{
      const row=saved||await saveMission();if(!row)return;
      const p=inferPath(),i=inferIndex(),total=$$('#missions .mission').length;
      $('#game')?.classList.remove('show');
      try{if(typeof openPath==='function')openPath(p)}catch{}
      if(i+1<total){setTimeout(()=>{try{startMission(i+1);selectedIndex=i+1;saved=null}catch{}},80)}
      else{try{renderProfile();showView('profile')}catch{}}
    })();
  }
},true);
function $$(s){return [...document.querySelectorAll(s)]}
const obs=new MutationObserver(()=>{
  const now=!!$('#complete')?.classList.contains('show');
  if(now&&!lastComplete)onCompleteShown();
  if(!now&&lastComplete){saved=null}
  lastComplete=now;
});
const startObs=()=>{const c=$('#complete');if(c)obs.observe(c,{attributes:true,attributeFilter:['class']});else setTimeout(startObs,200)};
startObs();
setInterval(()=>{
  const now=!!$('#complete')?.classList.contains('show');
  if(now&&!lastComplete){lastComplete=true;onCompleteShown()}
  if(!now)lastComplete=false;
},250);
window.LL_MISSION_PROGRESS={save:saveMission};
})();