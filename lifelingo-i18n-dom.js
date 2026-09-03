(()=>{
'use strict';
function api(){return window.LifeLingoI18n}
function reverseMap(){const x=api();if(!x?.messages)return new Map();return new Map(Object.entries(x.messages.fa).map(([k,v])=>[String(v),k]))}
function restoreEnglish(root=document.body){const x=api();if(!x||x.getLanguage()!=='en'||!root)return;const rev=reverseMap();const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName))continue;const raw=n.nodeValue,trimmed=raw.trim();if(!trimmed)continue;const key=rev.get(trimmed);if(key&&x.messages.en[key]){n.nodeValue=raw.replace(trimmed,x.messages.en[key]);continue}let m=trimmed.match(/^هنوز نه — پاسخ: (.+)$/);if(m)n.nodeValue=raw.replace(trimmed,`Not quite — answer: ${m[1]}`);m=trimmed.match(/^مرور رایگان: حداکثر (\d+) مورد آماده\.$/);if(m)n.nodeValue=raw.replace(trimmed,`Free review: up to ${m[1]} due items.`);m=trimmed.match(/^سطح پاسپورت (\d+) · با تسلط بر موقعیت‌های واقعی پیشرفت کن\.$/);if(m)n.nodeValue=raw.replace(trimmed,`Passport Level ${m[1]} · Progress through situations you can handle in real life.`)}
 const attrs=['placeholder','title','aria-label'];root.querySelectorAll?.('*').forEach(el=>attrs.forEach(attr=>{const value=el.getAttribute(attr),key=value&&rev.get(value);if(key&&x.messages.en[key])el.setAttribute(attr,x.messages.en[key])}))}
function sync(){queueMicrotask(()=>restoreEnglish(document.body))}
const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&r.attributeName==='data-language'))sync()});
function boot(){observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-language']});document.addEventListener('lifelingo:language-change',sync);sync()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();