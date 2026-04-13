/* mobile-scroll-fix.js v5 — nuclear: disable snap -> force card[0] -> re-enable */
(function(){'use strict';

function injectTitleCSS(){
  if(document.getElementById('msf-v5'))return;
  var s=document.createElement('style');
  s.id='msf-v5';
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

function forceCard0(){
  var track=document.querySelector('.so2-track');
  if(!track||window.innerWidth>840)return;
  /* Nuclear: disable snap, force scroll to 0, re-enable */
  track.style.scrollSnapType='none';
  track.scrollLeft=0;
  requestAnimationFrame(function(){
    track.scrollLeft=0;
    requestAnimationFrame(function(){
      track.scrollLeft=0;
      setTimeout(function(){
        track.style.scrollSnapType='x mandatory';
      },80);
    });
  });
}

function waitForTrack(){
  var track=document.querySelector('.so2-track');
  if(track){
    injectTitleCSS();
    forceCard0();
    /* Keep retrying for 8 seconds */
    var n=0;
    var iv=setInterval(function(){
      var t=document.querySelector('.so2-track');
      if(t&&window.innerWidth<=840){
        t.style.scrollSnapType='none';
        t.scrollLeft=0;
        requestAnimationFrame(function(){
          t.scrollLeft=0;
          setTimeout(function(){t.style.scrollSnapType='x mandatory';},80);
        });
      }
      if(++n>40)clearInterval(iv);
    },200);
  } else {
    var obs=new MutationObserver(function(){
      if(document.querySelector('.so2-track')){
        obs.disconnect();
        injectTitleCSS();
        setTimeout(forceCard0,50);
        /* Keep retrying for 8 seconds */
        var n=0;
        var iv=setInterval(function(){
          var t=document.querySelector('.so2-track');
          if(t&&window.innerWidth<=840){
            t.style.scrollSnapType='none';
            t.scrollLeft=0;
            requestAnimationFrame(function(){
              t.scrollLeft=0;
              setTimeout(function(){t.style.scrollSnapType='x mandatory';},80);
            });
          }
          if(++n>40)clearInterval(iv);
        },200);
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
