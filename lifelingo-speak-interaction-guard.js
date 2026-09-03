(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
let normalizedMission=null;
const STYLE_ID='lifelingo-speak-interaction-safety';
function installStyles(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent=`
 /* Interaction safety: scenario content belongs to the Speak route, not a global viewport blocker. */
 #view-speak #speakMission.speakMission{position:relative!important;inset:auto!important;z-index:auto!important;overflow:visible!important;background:transparent!important;min-height:0!important;isolation:auto!important}
 #view-speak #speakMission .speakMissionShell{min-height:0!important;padding-bottom:20px!important}
 #view-speak #speakMission .speakAnswerDock{position:sticky!important;left:auto!important;right:auto!important;bottom:0!important;z-index:30!important;margin-top:12px!important}
 body.speakMissionActive .bottomNav{display:flex!important}
 `;
 document.head.appendChild(style);
}
function releaseGlobalLock(){
 document.body.classList.remove('speakMissionActive');
 // Only undo accidental interaction locks on the global containers; do not touch scoped controls.
 for(const el of [document.documentElement,document.body,$('#appScreen'),$('.shell')]){
   if(!el)continue;
   if(el.hasAttribute('inert'))el.removeAttribute('inert');
   if(el.style?.pointerEvents==='none')el.style.pointerEvents='';
 }
}
function cleanupMission(reason='route-change'){
 const mission=$('#speakMission');
 if(!mission){releaseGlobalLock();normalizedMission=null;return}
 try{window.speechSynthesis?.cancel?.()}catch{}
 mission.remove();
 normalizedMission=null;
 releaseGlobalLock();
 console.info('[LifeLingo Speak interaction] mission cleaned',reason);
}
function normalizeMission(){
 const mission=$('#speakMission');
 if(!mission){releaseGlobalLock();normalizedMission=null;return}
 const root=$('#speakRoot');
 const speakView=$('#view-speak');
 if(!root||!speakView)return;
 // If Speak already rendered an error, a stale mission must never cover/replace that fallback.
 if(root.querySelector('.speakError')){cleanupMission('speak-init-error');return}
 if(mission.parentElement!==root){
   root.replaceChildren(mission);
 }
 mission.removeAttribute('aria-modal');
 mission.setAttribute('role','region');
 mission.setAttribute('aria-label','LifeLingo speaking mission');
 normalizedMission=mission;
 releaseGlobalLock();
}
function isSpeakRoute(){return location.hash.replace(/^#/,'').split(/[/?]/)[0]==='speak'}
function routeGuard(){
 if(!isSpeakRoute())cleanupMission('left-speak-route');
 else normalizeMission();
}
function install(){
 installStyles();
 const observer=new MutationObserver(()=>{
   const mission=$('#speakMission');
   if(mission&&mission!==normalizedMission)normalizeMission();
   else if(!mission)releaseGlobalLock();
 });
 observer.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('hashchange',routeGuard);
 window.addEventListener('popstate',routeGuard);
 window.addEventListener('pageshow',routeGuard);
 document.addEventListener('click',e=>{
   if(!$('#speakMission'))return;
   const nav=e.target.closest?.('[data-header-nav],[data-fixed-nav],[data-nav]');
   if(!nav)return;
   const destination=nav.dataset.headerNav||nav.dataset.fixedNav||nav.dataset.nav||'';
   if(destination&&destination!=='speak')cleanupMission('global-navigation');
 },true);
 routeGuard();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
