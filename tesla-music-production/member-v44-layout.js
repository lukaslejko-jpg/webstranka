/* Music V44: admin dots beside, not inside, the mobile search field. */
(()=>{
'use strict';
if(window.musicLayoutV44)return;
const s=document.createElement('style');
s.id='musicV44Layout';
s.textContent=`
@media(max-width:700px){
  .top.m41-admin-top{
    display:grid!important;
    grid-template-columns:32px minmax(0,1fr) 54px!important;
    align-items:center!important;
    gap:8px!important;
    position:relative!important;
  }
  .top.m41-admin-top .m41dots{
    position:static!important;
    left:auto!important;
    top:auto!important;
    transform:none!important;
    grid-column:1!important;
    grid-row:1!important;
    width:32px!important;
    min-width:32px!important;
    height:48px!important;
    margin:0!important;
    padding:0!important;
    border-radius:12px!important;
  }
  .top.m41-admin-top .search{
    grid-column:2!important;
    grid-row:1!important;
    width:100%!important;
    min-width:0!important;
    padding-left:13px!important;
  }
  .top.m41-admin-top .btn{
    grid-column:3!important;
    grid-row:1!important;
  }
  .top.m41-admin-top .m41account{display:none!important}
}
`;
document.head.appendChild(s);
window.musicLayoutV44=Object.freeze({version:44});
})();
