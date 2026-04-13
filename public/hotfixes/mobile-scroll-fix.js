/* mobile-scroll-fix.js v3 — minimal, no conflicts */
(function(){'use strict';

function injectTitleCSS(){
  if(document.getElementById('msf-v3'))return;
  var s=document.createElement('style');
  s.id='msf-v3';
  /* Titles: dark, large, readable — override white-on-white */
  s.textContent=
    '@media(max-width:840px){'+
    '.so2-card h3{font-size:18px!important;font-weight:900!important;'+
    'color:#071926!important;background:rgba(255,255,255,.93)!important;'+
    'padding:10px 14px 8px!important;margin:0!important;'+
    'line-height:1.25!important;text-shadow:none!important;'+
    'display:block!important;white-space:normal!important;}'+
    '}';
  document.head.appendChild(s);
}

function ensureCard1(){
  var track=document.querySelector('.so2-track');
  if(!track||window.innerWidth>840)return;
  if(track.scrollLeft!==0)track.scrollLeft=0;
}

function waitForTrack(){
  var track=document.querySelector('.so2-track');
  if(track){
    injectTitleCSS();
    track.scrollLeft=0;
    /* keep resetting until lock releases */
    var n=0;
    var iv=setInterval(function(){
      ensureCard1();
      if(++n>30)clearInterval(iv);
    },150);
  } else {
    var obs=new MutationObserver(function(){
      if(document.querySelector('.so2-track')){
        obs.disconnect();
        injectTitleCSS();
        setTimeout(function(){
          ensureCard1();
          var n=0;
          var iv=setInterval(function(){
            ensureCard1();
            if(++n>30)clearInterval(iv);
          },150);
        },10);
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
window.addEventListener('resize',function(){
  if(window.innerWidth<=840){injectTitleCSS();ensureCard1();}
});
})();
