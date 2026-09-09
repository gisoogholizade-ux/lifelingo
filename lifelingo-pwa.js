(()=>{
  'use strict';
  let deferredPrompt=null,installButton=null;
  const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isFarsi=()=>document.documentElement.lang==='fa'||document.documentElement.dir==='rtl';
  const copy=()=>isFarsi()?{title:'نصب LifeLingo',body:'دسترسی سریع از صفحهٔ اصلی گوشی'}:{title:'Install LifeLingo',body:'Quick access from your home screen'};
  function removeButton(){installButton?.remove();installButton=null;}
  function render(){if(!deferredPrompt||standalone())return removeButton();const text=copy();if(!installButton){installButton=document.createElement('button');installButton.type='button';installButton.className='lifelingoInstallButton';installButton.setAttribute('data-lifelingo-install','true');document.body.appendChild(installButton);installButton.addEventListener('click',install)}installButton.innerHTML=`<span aria-hidden="true">⇩</span><span><b>${text.title}</b><small>${text.body}</small></span>`;}
  async function install(){if(!deferredPrompt)return;const prompt=deferredPrompt;deferredPrompt=null;removeButton();await prompt.prompt();try{await prompt.userChoice}catch(_){}}
  function register(){if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(error=>console.warn('[LifeLingo PWA] service worker registration failed',error));}
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;render();});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;removeButton();});
  document.addEventListener('lifelingo:language-change',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',register,{once:true});else register();
})();
