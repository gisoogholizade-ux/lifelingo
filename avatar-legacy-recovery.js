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
