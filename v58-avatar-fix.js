(()=>{
const $=s=>document.querySelector(s);
const avatars=[
{id:0,cat:'girls',src:'./assets/4C99D87A-32DC-4B66-B834-F15257487B07.png'},
{id:1,cat:'girls',src:'./assets/8C662C59-60C5-4AB8-A6D9-728B598D3EAE.png'},
{id:2,cat:'girls',src:'./assets/98B0EBC3-1F87-413C-AB08-C6AB17ACE492.png'},
{id:3,cat:'girls',src:'./assets/DA3E874A-7DD6-46E9-828B-3688B43FC385.png'},
{id:4,cat:'girls',src:'./assets/F131F764-76F2-4E70-8F9A-270F2F64804E.png'},
{id:10,cat:'boys',src:'./assets/1DCA1D8B-E146-4CFF-9803-F2FEDB77F21B.png'},
{id:11,cat:'boys',src:'./assets/496DCF3B-187B-4F7A-A5BA-F3DFE6D3DD48.png'},
{id:12,cat:'boys',src:'./assets/9BA0896E-6704-42C2-8BEF-1589C15C47A7.png'},
{id:13,cat:'boys',src:'./assets/B71F29C4-CA8E-4590-968A-20A8A1D079B9.png'},
{id:14,cat:'boys',src:'./assets/D474CA0C-5506-46D8-9718-CF9DB25E2C73.png'}];
const byId=id=>avatars.find(a=>a.id===Number(id))||null;
let uid=null,profile=null,loading=false;
async function sessionUser(){if(!window.llSupabase)return null;const {data}=await llSupabase.auth.getUser();return data?.user||null}
async function load(){if(loading)return;loading=true;try{const u=await sessionUser();if(!u){uid=null;profile=null;render();return}uid=u.id;const {data,error}=await llSupabase.from('profiles').select('display_name,avatar_id,avatar_gender,avatar_url').eq('id',uid).maybeSingle();if(error)throw error;profile=data||null;render()}catch(e){console.error('avatar load',e)}finally{loading=false}}
function avatar(){return byId(profile?.avatar_id)}
function syncTop(){const b=$('#profileBtn');if(!b)return;if(!uid){b.style.display='none';b.innerHTML='';return}b.style.display='inline-grid';b.setAttribute('aria-label','Profile');b.style.cssText+=';width:52px;height:52px;padding:3px;border-radius:50%;overflow:hidden;place-items:center;font-size:0;color:transparent';const a=avatar();b.innerHTML=a?`<img src="${a.src}?v=acct-${uid}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">`:'<span style="font-size:23px;line-height:1;color:#8b5cf6">?</span>'}
function render(){document.querySelector('#ll42Social')?.remove();const p=$('#profile');if(!p){syncTop();return}let box=$('#ll58avatar');if(!uid){box?.remove();syncTop();return}if(!box){box=document.createElement('section');box.id='ll58avatar';box.className='card';box.style.marginTop='16px';p.appendChild(box)}const a=avatar();if(a){box.innerHTML=`<div class="tag">YOUR AVATAR</div><h3 style="margin:8px 0">Your LifeLingo avatar</h3><img src="${a.src}?v=acct-${uid}" alt="avatar" style="width:110px;height:110px;object-fit:cover;border-radius:28px;display:block;margin:14px 0"><p class="muted">Saved to this account.</p>`}else{box.innerHTML=`<div class="tag">YOUR AVATAR</div><h3 style="margin:8px 0">Your LifeLingo avatar</h3><p class="muted">Choose once. Your avatar is picked randomly and saved to this account.</p><button class="btn primary" id="ll58start">✨ Surprise me</button><div id="ll58pick" style="display:none;margin-top:12px;gap:8px"><button class="btn" data-ll58gender="girls">Girl</button><button class="btn" data-ll58gender="boys">Boy</button></div><div id="ll58msg" class="muted" style="margin-top:10px"></div>`}syncTop()}
async function claim(g){const u=await sessionUser(),m=$('#ll58msg');if(!u){if(m)m.textContent='Please log in again.';return}if(m)m.textContent='Picking your avatar…';const {data,error}=await llSupabase.rpc('claim_random_avatar',{p_gender:g});if(error){if(m)m.textContent=error.message;return}await load();window.dispatchEvent(new CustomEvent('lifelingo:profile-updated'))}
document.addEventListener('click',e=>{if(e.target.closest('#ll58start')){e.preventDefault();const p=$('#ll58pick');if(p)p.style.display='flex';return}const g=e.target.closest('[data-ll58gender]');if(g){e.preventDefault();claim(g.dataset.ll58gender)}},true);
window.addEventListener('lifelingo:user-changed',()=>{uid=null;profile=null;render();setTimeout(load,80)});
window.addEventListener('lifelingo:supabase-ready',()=>setTimeout(load,80));
setTimeout(load,700);
window.LL_AVATAR={reload:load};
})();