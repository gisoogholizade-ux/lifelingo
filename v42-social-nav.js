(()=>{
const $=s=>document.querySelector(s);
const signed=()=>{try{return !!JSON.parse(localStorage.getItem('lifelingo_user')||'null')}catch{return false}};
function ensure(){
  const p=$('#profile');
  if(!p||!signed()||$('#ll42QuickNav'))return;
  const nav=document.createElement('div');
  nav.id='ll42QuickNav';
  nav.className='ll42QuickNav';
  nav.innerHTML='<button class="btn" data-social-go="avatar">Avatar</button><button class="btn" data-social-go="partners">Find partners</button>';
  const dash=$('#ll41DashboardBtn');
  if(dash)dash.after(nav); else p.insertBefore(nav,p.firstChild);
}
function go(tab){
  if(tab==='partners'){
    const target=$('#ll46');
    if(!target){setTimeout(()=>go(tab),350);return}
    target.scrollIntoView({behavior:'smooth',block:'start'});
    const first=target.querySelector('[data-chat]');
    if(first) first.focus({preventScroll:true});
    return;
  }
  const social=$('#ll42Social');
  if(!social){setTimeout(()=>go(tab),350);return}
  social.scrollIntoView({behavior:'smooth',block:'start'});
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-social-go]');if(b){e.preventDefault();go(b.dataset.socialGo)}});
setTimeout(ensure,600);
setInterval(ensure,2000);
})();