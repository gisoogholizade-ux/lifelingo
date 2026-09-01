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
{id:14,cat:'boys',src:'./assets/D474CA0C-5506-46D8-9718-CF9DB25E2C73.png'}];
const load=()=>{try{return Object.assign({avatar:0,surpriseUsed:false,surpriseGender:null},JSON.parse(localStorage.getItem(key())||'{}'))}catch{return{avatar:0,surpriseUsed:false,surpriseGender:null}}};
const save=s=>localStorage.setItem(key(),JSON.stringify(s));
const byId=id=>avatars.find(a=>a.id===Number(id))||avatars[0];
const displayName=()=>{const u=user()||{};return u.name||u.displayName||u.fullName||(u.email?String(u.email).split('@')[0]:'You')};
const faceStyle=i=>{const a=typeof i==='object'?i:byId(i);return `background-image:url('${a.src}?v=randomfix1');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:#0b1120`};
const face=(i,cls='')=>`<span class="ll43Face ${cls}" role="img" aria-label="LifeLingo avatar" style="display:block;overflow:hidden;${faceStyle(i)}"></span>`;
function randomIndex(max){if(globalThis.crypto?.getRandomValues){const range=0x100000000-(0x100000000%max),buf=new Uint32Array(1);do{crypto.getRandomValues(buf)}while(buf[0]>=range);return buf[0]%max}return Math.floor(Math.random()*max)}
function syncProfileButton(){const b=$('#profileBtn');if(!b||!user())return;const s=load();b.style.cssText+=';width:52px;height:52px;padding:3px;border-radius:50%;overflow:hidden;vertical-align:middle;display:inline-grid;place-items:center';b.innerHTML=s.surpriseUsed?`<span style="display:block;width:100%;height:100%;border-radius:50%;${faceStyle(s.avatar)}"></span>`:'<span style="font-size:23px;font-weight:900;color:#c9a7ff">?</span>'}
function host(){const p=$('#profile');if(!p||!user())return null;let h=$('#ll42Social');if(!h){h=document.createElement('section');h.id='ll42Social';h.className='ll42Social';const a=$('#ll41Retention')||$('#ll41DailyProfile')||p.querySelector('.hub');a?.after(h)}return h}
function panel(h){const s=load();if(!s.surpriseUsed){h.querySelector('[data-panel]').innerHTML=`<div class="llSurpriseIntro"><div class="llSurpriseOrb">✨</div><h3>Ready for your surprise?</h3><p>You can reveal your LifeLingo avatar only once. Choose Girl or Boy, then we pick one completely at random.</p><button class="ll42Share" data-surprise>✨ Surprise me</button></div>`;return}const a=byId(s.avatar);h.querySelector('[data-panel]').innerHTML=`<div class="llSurpriseResult"><div class="llRevealGlow"></div>${face(a.id,'ll43PreviewFace llSurpriseFace')}<div class="llRevealCopy"><small>✨ YOUR LIFELINGO AVATAR ✨</small><h3>${displayName()}, meet your avatar</h3><p>Your one-time LifeLingo avatar is ready.</p><button class="ll42Share" data-share>Get my confession ✨</button></div></div>`}
function render(){const h=host();if(!h)return;const s=load();h.innerHTML=`<div class="ll42SocialTop"><div><div class="ll41Eyebrow">YOUR AVATAR</div><h3>Your LifeLingo avatar</h3><p>${s.surpriseUsed?'Your one-time avatar has been revealed ✨':'One tap. One chance. One avatar made for you.'}</p></div></div><div data-panel></div>`;panel(h);syncProfileButton()}
function askGender(h){h.querySelector('[data-panel]').innerHTML=`<div class="llGenderPick"><div class="llSurpriseOrb">?</div><h3>Pick your avatar group</h3><p>Your avatar will be randomly selected only from the group you choose.</p><div class="llGenderBtns"><button data-gender="girls">Girl</button><button data-gender="boys">Boy</button></div></div>`}
function reveal(g,h){const s=load();if(s.surpriseUsed)return panel(h);const pool=avatars.filter(a=>a.cat===g);if(!pool.length)return;const a=pool[randomIndex(pool.length)];s.avatar=a.id;s.surpriseUsed=true;s.surpriseGender=g;save(s);panel(h);syncProfileButton()}
document.addEventListener('click',e=>{const h=e.target.closest('#ll42Social');if(!h)return;const b=e.target.closest('button');if(!b)return;if(b.dataset.surprise!==undefined){e.preventDefault();askGender(h);return}if(b.dataset.gender){e.preventDefault();reveal(b.dataset.gender,h)}});
setTimeout(()=>{render();syncProfileButton()},700);setInterval(()=>{if(user()&&!$('#ll42Social'))render();syncProfileButton()},2500);
})();