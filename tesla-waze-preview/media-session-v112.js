(()=>{
'use strict';
/* MEDIA_SESSION_WRAPPER_V164
   Preserve existing V158 core, passive forward prefetch V159, first-navigation
   transition helper V160, manual zoom warmup V161 and parent MediaSession V162.
   Voice V164 is loaded independently from raw GitHub so production never resolves
   it against the Vercel wrapper path. */
const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
load('./media-session-v112-core.js?v=158')
  .then(()=>load('./map-prefetch-v159.js?v=159'))
  .then(()=>load('./map-transition-v160.js?v=160'))
  .then(()=>load('./map-manual-zoom-v161.js?v=161'))
  .then(()=>load('./media-session-controls-v162.js?v=162'))
  .catch(e=>console.warn('Tesla helper load failed:',e?.message||e));
load('https://raw.githubusercontent.com/lukaslejko-jpg/webstranka/tesla-waze-preview-v1/tesla-waze-preview/voice-fix-v164.js?v=164')
  .catch(e=>console.warn('Tesla navigation voice load failed:',e?.message||e));
})();
