/* mobile-scroll-fix.js v4 — webkit-text-fill-color fix + card[0] scroll */
(function(){'use strict';

function injectTitleCSS(){
  if(document.getElementById('msf-v4'))return;
  var s=document.createElement('style');
  s.id='msf-v4';
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

function ensureCard1(){
  var track=document.querySelector('.so2-track');
  if(!track||window.innerWidth>840)return;
  var cards=track.querySelectorAll('.so2-card');
  if(cards.length>=1){
    track.scrollLeft=0;
    cards[0].scrollIntoView({behavior:'auto',block:'nearest',inline:'start'});
  }
}

function waitForTrack(){
  var track=document.querySelector('.so2-track');
  if(track){
    injectTitleCSS();
    ensureCard1();
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
