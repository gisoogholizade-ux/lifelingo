(()=>{
'use strict';
const COURSE_ONLY=new Set(['apartment']);
function parse(){const raw=location.hash.replace(/^#/,'');const [path,q='']=raw.split('?');const seg=path.split('/').filter(Boolean);return{view:seg[0]||'',kind:seg[1]||'',id:seg[2]||'',params:new URLSearchParams(q)}}
function guard(){const r=parse();if(r.view==='speak'&&r.kind==='scenario'&&COURSE_ONLY.has(r.id)&&!r.params.get('course_unit')){history.replaceState(history.state,'',location.pathname+location.search+'#speak');window.dispatchEvent(new CustomEvent('lifelingo:course-only-route-blocked',{detail:{scenario:r.id}}));return true}return false}
document.addEventListener('click',e=>{const b=e.target.closest('[data-canonical-scenario]');if(!b||!COURSE_ONLY.has(b.dataset.canonicalScenario))return;const mission=e.target.closest('#speakMission');if(mission)return;e.preventDefault();e.stopImmediatePropagation();window.dispatchEvent(new CustomEvent('lifelingo:course-only-route-blocked',{detail:{scenario:b.dataset.canonicalScenario}}))},true);
guard();window.addEventListener('hashchange',guard);window.addEventListener('popstate',guard);
})();