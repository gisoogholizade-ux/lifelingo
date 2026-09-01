(()=>{
const $=s=>document.querySelector(s);
const user=()=>{try{return JSON.parse(localStorage.getItem('lifelingo_user')||'null')}catch{return null}};
const key=()=>`lifelingo_social_${String(user()?.email||'guest').toLowerCase()}`;
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
{id:14,cat:'boys',src:'./assets/D474CA0C-5506-46D8-9718-CF9DB25E2C73.png'}
];
const VERSION=13;
const save=s=>localStorage.setItem(key(),JSON.stringify(s));
const load=()=>{try{const raw=JSON.parse(localStorage.getItem(key())||'{}');const s=Object.assign({avatar:0,surpriseUsed:false,surpriseGender:null,surpriseVersion:VERSION},raw);if(raw.surpriseVersion!==VERSION){s.surpriseUsed=false;s.surpriseGender=null;s.surpriseVersion=VERSION;save(s)}return s}catch{return{avatar:0,surpriseUsed:false,surpriseGender:null,surpriseVersion:VERSION}}};
const displayName=()=>{const u=user()||{};return u.name||u.displayName||u.fullName||(u.email?String(u.email).split('@')[0]:'You')};
const byId=id=>avatars.find(a=>a.id===Number(id))||avatars[0];
const faceStyle=i=>{const a=typeof i==='object'?i:byId(i);return `background-image:url('${a.src}?v=70b39584');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:#0b1120`};
const face=(i,cls='')=>`<span class="ll43Face ${cls}" role="img" aria-label="LifeLingo avatar" style="display:block;overflow:hidden;${faceStyle(i)}"></span>`;
function syncProfileButton(){const b=$('#profileBtn');if(!b||!user())return;const s=load();b.style.width='52px';b.style.height='52px';b.style.padding='3px';b.style.borderRadius='50%';b.style.overflow='hidden';b.style.verticalAlign='middle';b.style.display='inline-grid';b.style.placeItems='center';if(s.surpriseUsed){b.innerHTML=`<span style="display:block;width:100%;height:100%;border-radius:50%;${faceStyle(s.avatar)}"></span>`;b.setAttribute('aria-label','Open profile')}else{b.innerHTML='<span style="font-size:23px;font-weight:900;color:#c9a7ff">?</span>';b.setAttribute('aria-label','Open profile')}}
function host(){const p=$('#profile');if(!p||!user())return null;let h=$('#ll42Social');if(!h){h=document.createElement('section');h.id='ll42Social';h.className='ll42Social';const a=$('#ll41Retention')||$('#ll41DailyProfile')||p.querySelector('.hub');a?.after(h)}return h}
function render(){const h=host();if(!h)return;const s=load();h.innerHTML=`<div class="ll42SocialTop"><div><div class="ll41Eyebrow">YOUR IDENTITY</div><h3>Your LifeLingo avatar</h3><p>${s.surpriseUsed?'Your one-time avatar has been revealed ✨':'One tap. One chance. One avatar made for you.'}</p></div></div><div data-panel></div>`;avatarPanel(h);syncProfileButton()}
function avatarPanel(h){const s=load();if(!s.surpriseUsed){h.querySelector('[data-panel]').innerHTML=`<div class="llSurpriseIntro"><div class="llSurpriseOrb">✨</div><h3>Ready for your surprise?</h3><p>You can reveal your LifeLingo avatar only once. Choose Girl or Boy, then we pick one completely at random.</p><button class="ll42Share llOnlySurprise" data-surprise>✨ Surprise me</button></div>`;return}const picked=byId(s.avatar);h.querySelector('[data-panel]').innerHTML=`<div class="llSurpriseResult"><div class="llRevealGlow"></div>${face(picked.id,'ll43PreviewFace llSurpriseFace')}<div class="llRevealCopy"><small>✨ YOUR LIFELINGO AVATAR ✨</small><h3>${displayName()}, meet your avatar</h3><p>This was your one-time random reveal.</p><button class="ll42Share" data-share>Share to your story</button><button class="llStorySave" data-copy>Copy invite link</button></div></div>`}
function askGender(h){h.querySelector('[data-panel]').innerHTML=`<div class="llGenderPick"><div class="llSurpriseOrb">?</div><h3>Pick your avatar group</h3><p>Your avatar will be randomly selected only from the group you choose.</p><div class="llGenderBtns"><button data-gender="girls">Girl</button><button data-gender="boys">Boy</button></div></div>`}
function reveal(gender,h){const s=load();if(s.surpriseUsed)return avatarPanel(h);const pool=avatars.filter(a=>a.cat===gender);if(!pool.length)return;const picked=pool[Math.floor(Math.random()*pool.length)];s.avatar=picked.id;s.surpriseUsed=true;s.surpriseGender=gender;s.surpriseVersion=VERSION;save(s);avatarPanel(h);syncProfileButton()}
const inviteUrl=()=>location.origin+location.pathname;
async function share(){const text=`✨ LifeLingo picked my one-time avatar!\nMeet yours: ${inviteUrl()}\n#LifeLingo`;try{if(navigator.share)await navigator.share({title:'My LifeLingo avatar ✨',text,url:inviteUrl()});else{await navigator.clipboard.writeText(text);alert('Invite copied ✨')}}catch(e){}}
async function copyInvite(){try{await navigator.clipboard.writeText(inviteUrl());alert('Invite link copied ✨')}catch(e){}}
function click(e){const h=e.target.closest('#ll42Social');if(!h)return;const b=e.target.closest('button');if(!b)return;if(b.dataset.surprise!==undefined)return askGender(h);if(b.dataset.gender)return reveal(b.dataset.gender,h);if(b.dataset.share!==undefined)return share();if(b.dataset.copy!==undefined)return copyInvite()}
document.addEventListener('click',click);setTimeout(()=>{render();syncProfileButton()},700);setInterval(()=>{if(user()&&!$('#ll42Social'))render();syncProfileButton()},2500);
})();