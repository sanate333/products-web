/* PATCH v9 -- super-ofertas + IG feed + combo dedup + scroll reveal + fixAfter + slideshow + fixProductImages */
(function(){
"use strict";

/* 1. Create super-ofertas section container */
if(!document.getElementById('super-ofertas')){
  var sec=document.createElement('section');
  sec.id='super-ofertas';
  sec.className='sec';
  var urg=document.querySelector('.urg');
  if(urg&&urg.parentNode){
    urg.parentNode.insertBefore(sec,urg.nextSibling);
  } else {
    var res=document.getElementById('resultados');
    if(res&&res.parentNode) res.parentNode.insertBefore(sec,res);
  }
  var guard=document.getElementById('super-ofertas-fix');
  if(guard) guard.remove();
  var s=document.createElement('script');
  s.src='/hotfixes/super-ofertas-fix.js?v=41&reload='+Date.now();
  document.body.appendChild(s);
}

/* 2. Fix duplicate combo grids */
var combos=document.getElementById('combos');
if(combos){
  var cgs=combos.querySelectorAll('.cg');
  if(cgs.length>1){
    for(var i=1;i<cgs.length;i++) cgs[i].remove();
  }
}

/* 3. Fix Instagram feed */
function fixInstagram(){
  var feedId='jgkaj29KiSHGOSbnLaqO';
  var apiUrl='https://feeds.behold.so/'+feedId;
  var containers=document.querySelectorAll('.ig-feed-container,[class*="instagram-feed"],[class*="instafeed"]');
  if(!containers.length) return;
  fetch(apiUrl).then(function(r){return r.json();}).then(function(data){
    var posts=Array.isArray(data)?data:(data.posts||[]);
    if(!posts.length) return;
    containers.forEach(function(container){
      var html='';
      posts.slice(0,6).forEach(function(post){
        var thumb=post.thumbnailUrl||post.mediaUrl||post.image||post.media||'';
        var link=post.permalink||post.link||'https://www.instagram.com/sanate.col/';
        html+='<a href="'+link+'" target="_blank" rel="noopener" style="display:block;text-decoration:none">';
        html+='<img src="'+thumb+'" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px;background:#f0f0f0" alt="Instagram" loading="eager">';
        html+='</a>';
      });
      container.innerHTML='<div style="display:contents">'+html+'</div>';
    });
  }).catch(function(){});
}
fixInstagram();

/* 4. Fix Reels/video cards */
function fixReelsSection(){
  var vcards=document.querySelectorAll(".vcard");
  if(!vcards.length) return;
  var reels=[
    {url:"https://www.instagram.com/p/DMbqs6FtZZZ/",embed:"https://www.instagram.com/p/DMbqs6FtZZZ/embed/",thumb:"/imagenes_productos/reel_thumb_1.jpg"},
    {url:"https://www.instagram.com/reel/DS1Q3RkDQ6l/",embed:"https://www.instagram.com/reel/DS1Q3RkDQ6l/embed/",thumb:"/imagenes_productos/reel_thumb_2.jpg"},
    {url:"https://www.instagram.com/reel/DVsEUosDUKZ/",embed:"https://www.instagram.com/reel/DVsEUosDUKZ/embed/",thumb:"/imagenes_productos/reel_thumb_3.jpg"}
  ];
  vcards.forEach(function(vcard,i){
    var r=reels[i%reels.length];
    var img=vcard.querySelector('img');
    if(img) img.src=r.thumb;
    vcard.style.cursor='pointer';
    vcard.addEventListener('click',function(){
      var existing=document.querySelector('.reel-embed-overlay');
      if(existing){existing.remove();return;}
      var ov=document.createElement('div');
      ov.className='reel-embed-overlay';
      ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:10000;display:flex;align-items:center;justify-content:center;';
      ov.innerHTML='<div style="position:relative;width:90%;max-width:400px;aspect-ratio:9/16"><iframe src="'+r.embed+'" style="width:100%;height:100%;border:none;border-radius:12px" frameborder="0" allowfullscreen></iframe><button onclick="this.closest(\'.reel-embed-overlay\').remove()" style="position:absolute;top:-12px;right:-12px;background:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer;line-height:1">\u00d7</button></div>';
      document.body.appendChild(ov);
    });
  });
}
fixReelsSection();

/* 5. fixScrollObserver -- reveal .fx/.fu elements on scroll */
function fixScrollObserver(){
  var _pinned=new WeakSet();
  function reveal(){
    var vh=window.innerHeight;
    document.querySelectorAll('.fx,.fu').forEach(function(el){
      if(!el.dataset.fxReady){
        el.dataset.fxReady='1';
        el.classList.remove('fu');
        el.classList.add('fx');
      }
      if(el.getAnimations){
        el.getAnimations().forEach(function(a){
          if(!_pinned.has(a)){
            try{a.cancel();}catch(e){}
          }
        });
      }
      var r=el.getBoundingClientRect();
      if(r.top<vh+80&&r.bottom>-80&&!el.classList.contains('vis')){
        el.classList.add('vis');
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('transform','none','important');
        if(window._origAnimate){
          var pin=window._origAnimate.call(el,[{opacity:'1',transform:'none'}],{duration:1,fill:'forwards'});
          _pinned.add(pin);
        }
      }
    });
    document.querySelectorAll('.fx.vis').forEach(function(el){
      if(el.getAnimations){
        el.getAnimations().forEach(function(a){
          if(!_pinned.has(a)){
            try{a.cancel();}catch(e){}
          }
        });
      }
    });
  }
  window.addEventListener('scroll',reveal,{passive:true});
  setInterval(reveal,400);
  reveal();
}
fixScrollObserver();

/* 6. fixAfter -- remap old combo image URLs */
function fixAfter(){
  var imgMap={
    'combo3_piel.png':'sebo%20de%20res%20y%20avena%20y%20arroz.webp',
    'combo_doble_sebo.png':'x2%20Sebos%20Grandes%20-%20LadingPage%20%20Medico.webp',
    'X50Caps_opt.jpg':'Sebo%20Grande%20y%20Jabon%20-%20Curcuma.webp',
    'POLEN5_opt.jpg':'sebo%20de%20res%20y%20avena%20y%20arroz.webp',
    'combo1_jabones.png':'ecom/pack_jabones.png',
    'combo_secreto.png':'sebo%20de%20res%20y%20avena%20y%20arroz.webp',
    'combo6_jabones6.png':'Jabon%20Curcuma%20Antes%20y%20despues.webp'
  };
  document.querySelectorAll('.so-card img,.cc-img img').forEach(function(img){
    var fn=img.src.split('/').pop();
    if(imgMap[fn])img.src='/ai-images/'+imgMap[fn];
  });
}
fixAfter();

/* 7. setupComboSlideshow -- CSS bg-image + ::before kill (bypasses combo-fix.js) */
var _comboImgs=[
  ['/ai-images/sebo%20de%20res%20y%20avena%20y%20arroz.webp','/ai-images/ecom/combo1_jabones.png'],
  ['/ai-images/x2%20Sebos%20Grandes%20-%20LadingPage%20%20Medico.webp','/ai-images/ecom/combo_secreto.png'],
  ['/ai-images/Sebo%20Grande%20y%20Jabon%20-%20Curcuma.webp','/ai-images/Jabon%20Curcuma%20Antes%20y%20despues.webp'],
  ['/ai-images/sebo%20de%20res%20y%20avena%20y%20arroz.webp','/ai-images/ecom/combo3_piel.png'],
  ['/ai-images/ecom/combo5_doble.png','/ai-images/ecom/combo4_secreto.png'],
  ['/ai-images/ecom/combo6_jabones6.png','/ai-images/ecom/pack_jabones.png']
];
/* Preload all images */
_comboImgs.forEach(function(pair){pair.forEach(function(u){var p=new Image();p.src=u;});});
function setupComboSlideshow(){
  /* v3: Replace img elements inside .cc-img with fresh ones we control.
     combo-fix.js traps existing img.src via defineProperty/setAttribute,
     so we remove the old img and create a new one it can't intercept. */
  var old=document.getElementById('combo-slide-override');
  if(old) old.remove();
  var st=document.createElement('style');
  st.id='combo-slide-override';
  st.textContent='#combos .cc-img::before{display:none!important;content:none!important;opacity:0!important;width:0!important;height:0!important}#combos .cc-img{position:relative!important;min-height:180px!important;overflow:hidden!important}#combos .cc-img img.combo-rot{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;position:relative!important;z-index:2!important}';
  document.head.appendChild(st);
  var ccImgs=document.querySelectorAll('#combos .cc-img');
  ccImgs.forEach(function(card,ci){
    if(card.dataset.comboSlide==='done')return;
    card.dataset.comboSlide='done';
    var pair=_comboImgs[ci%_comboImgs.length];
    /* Remove all existing children (old imgs trapped by combo-fix.js) */
    while(card.firstChild) card.removeChild(card.firstChild);
    /* Create fresh img element */
    var ni=document.createElement('img');
    ni.className='combo-rot';
    ni.src=pair[0];
    ni.alt='Combo '+(ci+1);
    ni.loading='eager';
    card.appendChild(ni);
    var showing=0;
    setInterval(function(){
      showing=1-showing;
      ni.src=pair[showing];
    },4000);
  });
}
setupComboSlideshow();
setTimeout(setupComboSlideshow,2000);
setTimeout(setupComboSlideshow,5000);

/* 8. fixUniqueProductImages v2 -- unique image per card, prov-catalog + main grid */
function fixUniqueProductImages(){
  /*
   * ORDER MATTERS -- specific keys first, generic last.
   * Every card (15 total) gets its own unique primary image.
   * prov-catalog cards use .pc-name, main grid uses h3/h4/.pname
   */
  var productImgMap=[
    /* -- prov-catalog specific matches -- */
    {k:'Avena',imgs:['/ai-images/ecom/pack_jabones.png']},
    {k:'Frasco grande',imgs:['/ai-images/ecom/sebo_hero1.png','/ai-images/ecom/sebo_promo1.png']},
    {k:'250mg x60',imgs:['/ai-images/ecom/melena_hero2.png','/ai-images/ecom/melena_oferta1.png']},
    {k:'500mg x50',imgs:['/ai-images/ecom/Polen2.png','/ai-images/ecom/polen%203.png']},
    {k:'Shampoo Natural 450',imgs:['/ai-images/ecom/8shampoo%20(1).png']},
    /* -- main grid specific matches -- */
    {k:'2 Cajas',imgs:['/imagenes_productos/Melena_de_Le_n_x2_Cajas.png','/ai-images/section-84912-optimized.webp']},
    {k:'Pack x3',imgs:['/imagenes_productos/Tripack_Jabones_Artesanales.png']},
    {k:'Polen Multifloral Huila',imgs:['/imagenes_productos/Polen_Multifloral_x90.png','/ai-images/ecom/POLEN5.png']},
    {k:'Melena de Le\u00f3n x60',imgs:['/ai-images/ecom/melena_hero1.png','/ai-images/ecom/melena_leon.png']},
    /* -- shared / generic matches (order: specific before generic) -- */
    {k:'C\u00farcuma',imgs:['/ai-images/iMAGENES%20nEW/Curcuma%20Jabon1.webp']},
    {k:'Sebo de Res',imgs:['/imagenes_productos/Sebo_Premium_x2.png','/ai-images/ecom/sebo_lifestyle1.png']},
    {k:'Cal\u00e9ndula',imgs:['/ai-images/ecom/calendula_hero2.png','/ai-images/ecom/calendula_hero1.png']},
    {k:'Shampoo',imgs:['/ai-images/iMAGENES%20nEW/Shampo%20500ml.jpg']},
    {k:'N\u00e9ctar Capilar',imgs:['/imagenes_productos/nectar_capilar.jpg','/ai-images/iMAGENES%20nEW/Nectar%20Capilar%20200gr.jpg']},
    {k:'Polen Premium',imgs:['/ai-images/ecom/X50Caps.png','/imagenes_productos/Energ_a___Memoria.png']},
    {k:'Melena de Le\u00f3n',imgs:['/ai-images/section-84912-optimized.webp','/ai-images/ecom/melena_beneficios1.png']}
  ];

  /* Remap old broken numeric IDs */
  var numericMap={
    '1000744990.jpg':'/imagenes_productos/Tripack_Jabones_Artesanales.png',
    '1000745738.jpg':'/imagenes_productos/Sebo_Premium_x2.png',
    '1000044536.jpg':'/ai-images/ecom/melena_hero1.png',
    '1000750133.jpg':'/imagenes_productos/Polen_Multifloral_x90.png',
    '1000747650.jpg':'/ai-images/ecom/calendula_hero2.png',
    '1000748981.jpg':'/imagenes_productos/nectar_capilar.jpg',
    '1000750135.jpg':'/ai-images/ecom/X50Caps.png',
    '1000736990.jpg':'/imagenes_productos/Secreto_Japon_s.png'
  };

  /* Fix numeric broken images first */
  document.querySelectorAll('img').forEach(function(img){
    if(!img.src) return;
    var file=img.src.split('/').pop().split('?')[0];
    if(numericMap[file]) img.src=numericMap[file];
  });

  /* Fix product cards by title match -- includes .pc-name for prov-catalog */
  var allCards=document.querySelectorAll('.pg .pc, .prov-catalog .pc-item');
  allCards.forEach(function(card){
    var titleEl=card.querySelector('h3,h4,.pname,.pc-name');
    if(!titleEl) return;
    var title=titleEl.textContent;
    var match=null;
    for(var i=0;i<productImgMap.length;i++){
      if(title.indexOf(productImgMap[i].k)!==-1){match=productImgMap[i];break;}
    }
    if(!match) return;
    var img=card.querySelector('img');
    if(!img) return;

    /* Set primary image */
    img.src=match.imgs[0];

    /* Fix addItem onclick to use primary image */
    var btn=card.querySelector('[onclick*="addItem"]');
    if(btn){
      var oc=btn.getAttribute('onclick');
      if(oc){
        oc=oc.replace(/img:'[^']*'/,"img:'"+match.imgs[0]+"'");
        btn.setAttribute('onclick',oc);
      }
    }

    /* Product cards: fixed image, no slideshow */
  });

  /* Also fix onclick handlers that still have numeric IDs */
  document.querySelectorAll('[onclick*="addItem"]').forEach(function(btn){
    var oc=btn.getAttribute('onclick');
    if(!oc) return;
    var changed=false;
    Object.keys(numericMap).forEach(function(old){
      if(oc.indexOf(old)!==-1){
        oc=oc.split(old).join(numericMap[old]);
        changed=true;
      }
    });
    if(changed) btn.setAttribute('onclick',oc);
  });
}
fixUniqueProductImages();
setTimeout(fixUniqueProductImages,3000);
setTimeout(fixUniqueProductImages,6000);

/* 9. Fix Nequi number -- update to correct number */
function fixNequiNumber(){
  var els=document.querySelectorAll('#payAcctNumber,.pay-number');
  els.forEach(function(el){
    if(el.textContent.indexOf('323')!==-1){
      el.textContent='322 746 1878';
    }
  });
  /* Also fix inline Nequi sections */
  document.querySelectorAll('*').forEach(function(el){
    if(el.children.length===0 && el.textContent.trim()==='323 454 9614'){
      el.textContent='322 746 1878';
    }
  });
}
fixNequiNumber();
setTimeout(fixNequiNumber,2000);
setTimeout(fixNequiNumber,5000);

/* 10. Remove payment popup -- info already shows inline */
function killPayPopup(){
  var st=document.getElementById('kill-pay-popup');
  if(!st){
    st=document.createElement('style');
    st.id='kill-pay-popup';
    st.textContent='.pay-popup-ov,.pay-popup{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}';
    document.head.appendChild(st);
  }
  /* Also override the function that opens it */
  if(typeof window.showPayPopup==='function'){
    window.showPayPopup=function(){};
  }
  if(typeof window.openPayPopup==='function'){
    window.openPayPopup=function(){};
  }
}
killPayPopup();
setTimeout(killPayPopup,2000);

})();
