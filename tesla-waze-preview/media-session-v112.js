(()=>{
'use strict';
/* MEDIA_SESSION_WRAPPER_V160
   Preserve existing V158 core, passive forward prefetch V159, then install the
   bounded first-navigation camera transition helper V160. */
const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
load('./media-session-v112-core.js?v=158')
  .then(()=>load('./map-prefetch-v159.js?v=159'))
  .then(()=>load('./map-transition-v160.js?v=160'))
  .catch(e=>console.warn('Tesla helper load failed:',e?.message||e));
})();
