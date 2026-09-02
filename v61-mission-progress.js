(()=>{
let busy=false;
const clone=v=>JSON.parse(JSON.stringify(v));
async function complete(path,index,score){
  if(busy||!window.llSupabase)return null;
  busy=true;
  try{
    const {data,error}=await llSupabase.rpc('complete_mission',{p_path:path,p_mission:Number(index),p_score:Number(score||100)});
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(row){
      const p={xp:row.xp||0,goal:row.goal||'migration',paths:row.paths||{},activity:row.activity||[],days:row.days||[]};
      window.LL_STATE?.setProgress?.(clone(p),{persist:false});
      try{progress=clone(p)}catch{}
      try{renderProfile()}catch{}
      try{if(path&&typeof openPath==='function')openPath(path)}catch{}
    }
    return row;
  }catch(e){console.error('complete_mission',e);return null}finally{busy=false}
}
function patch(){
  try{
    if(typeof finishMission!=='function'||finishMission.__ll61)return;
    const original=finishMission;
    const wrapped=function(){
      const missionPath=typeof path!=='undefined'?path:null;
      const missionIndex=typeof mi!=='undefined'?mi:0;
      const arr=typeof scores!=='undefined'?scores:[];
      const avg=arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):100;
      original.apply(this,arguments);
      complete(missionPath,missionIndex,avg);
    };
    wrapped.__ll61=true;finishMission=wrapped;
  }catch(e){console.error('patch finishMission',e)}
}
function patchContinue(){
  const b=document.getElementById('nextMission');if(!b||b.dataset.ll61)return;b.dataset.ll61='1';
  b.addEventListener('click',e=>{
    try{
      const p=window.LL_STATE?.getProgress?.();const k=typeof path!=='undefined'?path:null;const i=typeof mi!=='undefined'?mi:0;
      if(k&&p?.paths?.[k]?.[i]?.completed){const next=i+1;const total=typeof data!=='undefined'?data[k]?.missions?.length:0;if(next<total){e.preventDefault();e.stopImmediatePropagation();document.getElementById('game')?.classList.remove('show');openPath(k);setTimeout(()=>startMission(next),60)}}
    }catch{}
  },true)
}
patch();patchContinue();setInterval(()=>{patch();patchContinue()},500);
window.LL_MISSION_PROGRESS={complete};
})();