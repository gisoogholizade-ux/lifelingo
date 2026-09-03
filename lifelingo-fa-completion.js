(()=>{
'use strict';
const pairs={
'Type the word':'کلمه را تایپ کن',
'Type the missing word':'کلمهٔ جاافتاده را تایپ کن',
'Write here…':'اینجا بنویس…',
'Speak or type your answer first.':'اول پاسخت را بگو یا تایپ کن.',
'Almost. Keep the same meaning and try once more.':'نزدیک بود. همان معنی را نگه دار و یک بار دیگر امتحان کن.',
'Could not hear clearly. Try again or type.':'واضح نشنیدم. دوباره امتحان کن یا پاسخت را تایپ کن.',
'Enter email and password.':'ایمیل و رمز عبور را وارد کن.',
'Enter your name.':'نامت را وارد کن.',
'Enter a valid mobile number including country code.':'شمارهٔ موبایل معتبر را همراه با کد کشور وارد کن.',
'Use at least 8 characters for your password.':'رمز عبور باید حداقل ۸ کاراکتر باشد.',
'Account created. Check your email if confirmation is required, then log in.':'حسابت ساخته شد. اگر تأیید ایمیل لازم است، ایمیلت را بررسی کن و بعد وارد شو.'
};
const reverse=Object.fromEntries(Object.entries(pairs).map(([en,fa])=>[fa,en]));
const isFa=()=>document.documentElement.dataset.language==='fa'||document.documentElement.lang==='fa';
const learningTarget=el=>!!el?.closest?.('.dailyPhrase,[data-learning-target="true"],[data-speak],#speakQuestion,.speakQuestion');
function text(node){if(!node?.nodeValue||!node.parentElement||learningTarget(node.parentElement))return;const raw=node.nodeValue,trim=raw.trim();if(!trim)return;const next=isFa()?pairs[trim]:reverse[trim];if(next)node.nodeValue=raw.replace(trim,next)}
function attr(el,name){const raw=el.getAttribute?.(name);if(!raw)return;const next=isFa()?pairs[raw]:reverse[raw];if(next)el.setAttribute(name,next)}
function apply(root=document){const base=root===document?document.body:root;if(!base)return;if(base.nodeType===1){['placeholder','title','aria-label'].forEach(a=>attr(base,a))}const tw=document.createTreeWalker(base,NodeFilter.SHOW_TEXT);let n;while((n=tw.nextNode()))text(n);base.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>['placeholder','title','aria-label'].forEach(a=>attr(el,a)))}
let queued=false;function queue(root=document){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;apply(root)})}
const obs=new MutationObserver(rs=>{for(const r of rs){if(r.type==='characterData')text(r.target);for(const n of r.addedNodes)if(n.nodeType===1)apply(n);if(r.type==='attributes')attr(r.target,r.attributeName)}});
function boot(){apply();obs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});document.addEventListener('lifelingo:language-change',()=>queue(document))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();