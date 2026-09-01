(()=>{
function fixAuth(){const auth=document.querySelector('#auth,.auth');if(!auth)return;auth.querySelectorAll('input').forEach(input=>{input.style.pointerEvents='auto';input.style.webkitUserSelect='text';input.style.userSelect='text';if(!input.dataset.v34){input.dataset.v34='1';const focus=e=>{e.stopPropagation();try{input.focus({preventScroll:true})}catch{input.focus()}setTimeout(()=>{try{input.focus();const n=input.value.length;input.setSelectionRange(n,n)}catch{}},40)};input.addEventListener('touchend',focus,{passive:false});}})}
document.addEventListener('click',e=>{if(e.target.matches?.('.auth input')){try{e.target.focus()}catch{}}},true);
new MutationObserver(fixAuth).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
fixAuth();
})();
