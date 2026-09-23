/* Music V50 retired as a post-render DOM reorder layer.
 * Ranking now happens before render in the discovery modules.
 */
(()=>{'use strict';
if(window.musicForYouV50)return;
window.musicForYouV50=Object.freeze({version:50,reorder:()=>{},scope:'retired-post-render-reorder'});
})();
