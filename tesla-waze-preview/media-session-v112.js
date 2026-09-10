(()=>{
'use strict';
/* MEDIA_SESSION_WRAPPER_V159
   Preserve the existing V158 logic byte-for-byte in media-session-v112-core.js,
   then load the passive forward map prefetch helper. */
const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
load('./media-session-v112-core.js?v=158').then(()=>load('./map-prefetch-v159.js?v=159')).catch(e=>console.warn('Tesla helper load failed:',e?.message||e));
})();
