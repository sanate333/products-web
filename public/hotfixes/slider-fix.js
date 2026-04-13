/* SANATE SLIDER FIX v4.4 - full-card clip-path + glow reveal */
(function(){
"use strict";

var CSS_TEXT = ""
+"#slider-fix-css,#slider-fix-css-v3{display:none!important}"
+".pain-before-after{"
+"  display:block!important;position:relative;"
+"  width:100%;height:auto!important;aspect-ratio:1/1;"
+"  overflow:hidden;border-radius:18px;"
+"  cursor:col-resize;background:#111;"
+"  grid-template-columns:none!important;"
+"}"
+".pain-before-after>img.pain-single-img{display:none!important}"
+".pain-before-after .pain-img-wrap{display:none!important}"
+".pain-before-after .pain-overlay{display:none!important}"
+".pain-before-after .pain-label{display:none!important}"
+".pain-before-after .pain-after-badge{display:none!important}"
+".pain-clip-antes{"
+"  position:absolute;top:0;left:0;width:100%;height:100%;"
+"  z-index:2;overflow:hidden;"
+"  background-size:200% 100%;background-position:0% center;background-repeat:no-repeat;"
+"  clip-path:inset(0 calc(100% - var(--spos,50%)) 0 0);"
+"}"
+".pain-clip-despues{"
+"  position:absolute;top:0;left:0;width:100%;height:100%;"
+"  z-index:1;overflow:hidden;"
+"  background-size:200% 100%;background-position:100% center;background-repeat:no-repeat;"
+"}"
+".pain-slider-line{"
+"  position:absolute;top:0;bottom:0;z-index:10;"
+"  left:var(--spos,50%);width:3px;"
+"  background:linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0.95),rgba(255,255,255,0.3));"
+"  pointer-events:none;"
+"  box-shadow:0 0 12px 4px rgba(255,255,255,0.5),0 0 25px 8px rgba(0,180,130,0.25);"
+"  transform:translateX(-50%);"
+"}"
+".pain-slider-line::after{"
+"  content:'\\25C0  \\25B6';"
+"  position:absolute;top:50%;left:50%;"
+"  transform:translate(-50%,-50%);"
+"  width:38px;height:38px;border-radius:50%;"
+"  background:#fff;color:#07194e;"
+"  display:flex;align-items:center;justify-content:center;"
+"  font-size:10px;box-shadow:0 2px 8px rgba(0,0,0,.35);"
+"  pointer-events:auto;cursor:col-resize;"
+"}"
+".pain-before-after .pain-lbl{"
+"  position:absolute;top:10px;padding:4px 12px;border-radius:6px;"
+"  font-size:11px;font-weight:700;letter-spacing:1px;color:#fff;z-index:12;pointer-events:none;"
+"}"
+".pain-before-after .pain-lbl-a{left:10px;background:rgba(7,25,46,.85)}"
+".pain-before-after .pain-lbl-d{right:10px;background:rgba(0,180,130,.9)}"
+".pain-before-after .pain-badge2{"
+"  position:absolute;bottom:10px;right:10px;"
+"  background:rgba(0,180,130,.92);color:#fff;"
+"  padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;z-index:12;pointer-events:none;"
+"}"
+".melena-gif-card{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:1/1;background:#07194e;border-radius:18px;overflow:hidden}"
+".melena-gif-card img{width:100%;height:100%;object-fit:cover}"
+".pain-clip-antes.animating{transition:clip-path 1.2s cubic-bezier(0.4,0,0.2,1)}"
+".pain-slider-line.animating{transition:left 1.2s cubic-bezier(0.4,0,0.2,1)}"
+".ba-compare{position:relative;overflow:hidden;border-radius:14px;cursor:col-resize;height:auto!important;aspect-ratio:1/1;background:#111}"
+".ba-compare>img.ba-single-img{display:none!important}"
+".ba-compare .ba-compare-before,.ba-compare .ba-compare-after,.ba-compare .ba-compare-handle{display:none!important}"
+".ba-clip-antes{"
+"  position:absolute;top:0;left:0;width:100%;height:100%;"
+"  z-index:2;overflow:hidden;"
+"  background-size:200% 100%;background-position:0% center;background-repeat:no-repeat;"
+"  clip-path:inset(0 calc(100% - var(--bpos,50%)) 0 0);"
+"}"
+".ba-clip-despues{"
+"  position:absolute;top:0;left:0;width:100%;height:100%;"
+"  z-index:1;overflow:hidden;"
+"  background-size:200% 100%;background-position:100% center;background-repeat:no-repeat;"
+"}"
+".ba-slider-line{"
+"  position:absolute;top:0;bottom:0;z-index:10;"
+"  left:var(--bpos,50%);width:3px;"
+"  background:linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0.95),rgba(255,255,255,0.3));"
+"  pointer-events:none;"
+"  box-shadow:0 0 12px 4px rgba(255,255,255,0.5),0 0 25px 8px rgba(0,180,130,0.25);"
+"  transform:translateX(-50%);"
+"}"
+".ba-slider-line::after{"
+"  content:'\\25C0  \\25B6';"
+"  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);"
+"  width:38px;height:38px;border-radius:50%;background:#fff;color:#07194e;"
+"  display:flex;align-items:center;justify-content:center;"
+"  font-size:10px;box-shadow:0 2px 8px rgba(0,0,0,.35);pointer-events:auto;cursor:col-resize;"
+"}"
+".ba-compare .ba-lbl{position:absolute;top:10px;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:1px;color:#fff;z-index:12;pointer-events:none}"
+".ba-compare .ba-lbl-a{left:10px;background:rgba(7,25,46,.85)}"
+".ba-compare .ba-lbl-d{right:10px;background:rgba(0,180,130,.9)}"
+".ba-clip-antes.animating{transition:clip-path 1.2s cubic-bezier(0.4,0,0.2,1)}"
+".ba-slider-line.animating{transition:left 1.2s cubic-bezier(0.4,0,0.2,1)}";

function injectCSS(){
  if(document.getElementById("slider-fix-v4")) return;
  var s=document.createElement("style");s.id="slider-fix-v4";s.textContent=CSS_TEXT;document.head.appendChild(s);
}

function cleanOld(){
  ["slider-fix-css","slider-fix-css-v3"].forEach(function(id){var el=document.getElementById(id);if(el)el.remove();});
}

function setupDrag(el, prop){
  var dragging=false;
  function pct(e){
    var r=el.getBoundingClientRect();
    var x=(e.touches&&e.touches.length)?e.touches[0].clientX:e.clientX;
    return Math.max(5,Math.min(95,((x-r.left)/r.width)*100));
  }
  function stopAnim(){
    el.querySelectorAll(".animating").forEach(function(a){a.classList.remove("animating");});
  }
  /* Only start drag if touch is near the slider handle (within 30px) */
  function isNearHandle(e){
    var x=(e.touches&&e.touches.length)?e.touches[0].clientX:e.clientX;
    var line=el.querySelector(".ba-slider-line")||el.querySelector(".pain-slider-line");
    if(!line)return false;
    var lr=line.getBoundingClientRect();
    var cx=lr.left+lr.width/2;
    return Math.abs(x-cx)<30;
  }
  el.addEventListener("mousedown",function(e){if(!isNearHandle(e))return;e.preventDefault();stopAnim();dragging=true;});
  document.addEventListener("mousemove",function(e){if(!dragging)return;e.preventDefault();el.style.setProperty(prop,pct(e)+"%");});
  document.addEventListener("mouseup",function(){dragging=false;});
  el.addEventListener("touchstart",function(e){if(!isNearHandle(e))return;stopAnim();dragging=true;},{passive:true});
  document.addEventListener("touchmove",function(e){if(!dragging)return;el.style.setProperty(prop,pct(e)+"%");},{passive:true});
  document.addEventListener("touchend",function(){dragging=false;});
}

var CARD_IMAGES=[
  "https://sanate.store/ai-images/WhatsApp%20Image%202026-03-15%20at%203.38.44%20AM%20(3).jpeg",
  "https://sanate.store/ai-images/WhatsApp%20Image%202026-03-15%20at%203.38.43%20AM.jpeg"
];
var BA_IMAGE="https://sanate.store/ai-images/WhatsApp%20Image%202026-03-15%20at%203.38.44%20AM.jpeg";
var BADGES=["3 semanas","21 d\u00edas"];

function safeUrl(url){ return 'url("'+url+'")'; }

function fixPainCards(){
  var cards=document.querySelectorAll(".pain-before-after");
  if(!cards.length) return false;
  var count=0;
  cards.forEach(function(card,i){
    if(i>=2) return;
    if(card.dataset.v4==="v44") return;
    card.dataset.v4="v44";
    card.style.setProperty("--spos","95%");
    var imgUrl=CARD_IMAGES[i]||CARD_IMAGES[0];

    var old=card.querySelectorAll(".pain-clip-antes,.pain-clip-despues,.pain-lbl,.pain-badge2,.pain-slider-line");
    old.forEach(function(el){el.remove();});

    var antes=document.createElement("div");
    antes.className="pain-clip-antes";
    antes.style.backgroundImage=safeUrl(imgUrl);
    card.appendChild(antes);

    var despues=document.createElement("div");
    despues.className="pain-clip-despues";
    despues.style.backgroundImage=safeUrl(imgUrl);
    card.appendChild(despues);

    var la=document.createElement("div");la.className="pain-lbl pain-lbl-a";la.textContent="ANTES";card.appendChild(la);
    var ld=document.createElement("div");ld.className="pain-lbl pain-lbl-d";ld.textContent="DESPU\u00c9S";card.appendChild(ld);
    var b=document.createElement("div");b.className="pain-badge2";b.textContent="\u2713 "+BADGES[i];card.appendChild(b);
    var line=document.createElement("div");line.className="pain-slider-line";card.appendChild(line);

    setupDrag(card,"--spos");

    /* Auto-animate: 95% -> 50% after 1.5s */
    setTimeout(function(){
      antes.classList.add("animating");
      line.classList.add("animating");
      card.style.setProperty("--spos","50%");
      setTimeout(function(){
        antes.classList.remove("animating");
        line.classList.remove("animating");
      },1300);
    },1500);

    count++;
  });
  return count>0;
}

function fixMelenaCard(){
  var painCards=document.querySelectorAll(".pain-card");
  if(painCards.length<3) return false;
  var third=painCards[2];
  var ba=third.querySelector(".pain-before-after");
  if(!ba) return true;
  if(ba.dataset.v4m==="done") return true;
  ba.dataset.v4m="done";
  var mel=document.createElement("div");mel.className="melena-gif-card";
  var gif=document.createElement("img");
  gif.src="https://sanate.store/ai-images/iMAGENES%20nEW/Melena%20de%20Leon.gif";
  gif.alt="Melena de Le\u00f3n";gif.loading="lazy";
  mel.appendChild(gif);ba.replaceWith(mel);return true;
}

function fixBaCompare(){
  var cmp=document.querySelector(".ba-compare");
  if(!cmp) return false;
  if(cmp.dataset.v4==="v44") return true;
  cmp.dataset.v4="v44";
  cmp.style.setProperty("--bpos","95%");

  var old=cmp.querySelectorAll(".ba-clip-antes,.ba-clip-despues,.ba-lbl,.ba-slider-line");
  old.forEach(function(el){el.remove();});

  var antes=document.createElement("div");antes.className="ba-clip-antes";
  antes.style.backgroundImage=safeUrl(BA_IMAGE);cmp.appendChild(antes);
  var despues=document.createElement("div");despues.className="ba-clip-despues";
  despues.style.backgroundImage=safeUrl(BA_IMAGE);cmp.appendChild(despues);
  var la=document.createElement("div");la.className="ba-lbl ba-lbl-a";la.textContent="ANTES";cmp.appendChild(la);
  var ld=document.createElement("div");ld.className="ba-lbl ba-lbl-d";ld.textContent="DESPU\u00c9S";cmp.appendChild(ld);
  var line=document.createElement("div");line.className="ba-slider-line";cmp.appendChild(line);
  setupDrag(cmp,"--bpos");

  setTimeout(function(){
    antes.classList.add("animating");line.classList.add("animating");
    cmp.style.setProperty("--bpos","50%");
    setTimeout(function(){antes.classList.remove("animating");line.classList.remove("animating");},1300);
  },1500);
  return true;
}

function init(){injectCSS();cleanOld();var a=fixPainCards();var b=fixMelenaCard();var c=fixBaCompare();return a||b||c;}
var tries=0;
var iv=setInterval(function(){if(init()||tries++>60) clearInterval(iv);},500);

})();
