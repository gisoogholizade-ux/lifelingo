(()=>{
'use strict';
const $=s=>document.querySelector(s);
let opening=false,lastOpened='';
function route(){const raw=location.hash.replace(/^#/,'');const [path]=raw.split('?');const seg=path.split('/').filter(Boolean);return{view:seg[0]||'',kind:seg[1]||'',id:decodeURIComponent(seg[2]||'')}}
function setLearn(){if(location.hash!=='#learn')history.replaceState(history.state,'',location.pathname+location.search+'#learn')}
function tryOpen(){const r=route();if(r.view!=='learn'||r.kind!=='unit'||!r.id||opening||lastOpened===r.id)return;const b=document.querySelector(`[data-unit="${CSS.escape(r.id)}"]`);if(!b)return;opening=true;lastOpened=r.id;queueMicrotask(()=>{try{b.click()}finally{opening=false}})}
document.addEventListener('click',e=>{const unit=e.target.closest('[data-unit]');if(unit&&!opening){const id=unit.dataset.unit;if(id&&!location.hash.startsWith('#speak/'))history.replaceState({ll:true},'',location.pathname+location.search+'#learn/unit/'+encodeURIComponent(id))}if(e.target.closest('#closeLesson,[data-close-and-learn]'))setTimeout(setLearn,0)},true);
window.addEventListener('hashchange',()=>{lastOpened='';setTimeout(tryOpen,0)});window.addEventListener('popstate',()=>{lastOpened='';setTimeout(tryOpen,0)});
const mo=new MutationObserver(()=>tryOpen());function boot(){mo.observe(document.body,{subtree:true,childList:true});tryOpen()}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();