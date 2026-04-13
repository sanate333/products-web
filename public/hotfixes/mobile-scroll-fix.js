/* mobile-scroll-fix.js v6 — title CSS only, no scroll loop (justify-content handles position) */
(function(){'use strict';

function injectTitleCSS(){
  if(document.getElementById('msf-v6'))return;
  var s=document.createElement('style');
  s.id='msf-v6';
  s.textContent=
    '@media(max-width:840px){'+
    '.so2-card h3{font-size:18px!important;font-weight:900!important;'+
    'color:#071926!important;-webkit-text-fill-color:#071926!important;'+
    'background:rgba(255,255,255,.93)!important;'+
    '-webkit-background-clip:unset!important;background-clip:unset!important;'+
    'padding:10px 14px 8px!important;margin:0!important;'+
    'line-height:1.25!important;text-shadow:none!important;'+
    'display:block!important;white-space:normal!important;}'+
    '.so2-body h3{-webkit-text-fill-color:#071926!important;color:#071926!important;}'+
    '}';
  document.head.appendChild(s);
}

/* One-time scroll to card 0 after build completes */
function scrollOnce(){
  var track=document.querySelector('.so2-track');
  if(!track||window.innerWidth>840)return;
  track.scrollLeft=0;
}

function waitForTrack(){
  var track=document.querySelector('.so2-track');
  if(track){
    injectTitleCSS();
    scrollOnce();
  } else {
    var obs=new MutationObserver(function(){
      if(document.querySelector('.so2-track')){
        obs.disconnect();
        injectTitleCSS();
        setTimeout(scrollOnce,100);
      }
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',waitForTrack);
} else {
  waitForTrack();
}
})();
