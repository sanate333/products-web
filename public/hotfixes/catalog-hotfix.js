/* catalog-hotfix.js v1 — adds add-to-cart buttons to /catalogo grid */
(function(){
  if(window.location.pathname!=='/catalogo')return;

  var CART_KEY='sanate_cart_v2';
  function getCart(){try{return JSON.parse(localStorage.getItem(CART_KEY)||'[]')}catch(e){return[]}}
  function saveCart(c){localStorage.setItem(CART_KEY,JSON.stringify(c));if(window._cart)window._cart=c;}
  function fmt(n){return new Intl.NumberFormat('es-CO',{minimumFractionDigits:0}).format(Math.round(n))}

  function addToCart(name,price,img,id){
    var cart=getCart();
    var found=false;
    cart.forEach(function(item){
      if(item.name===name||item.id===id){item.qty=(item.qty||1)+1;found=true;}
    });
    if(!found){
      cart.push({id:id||('cat-'+Date.now()),name:name,price:price,qty:1,img:img});
    }
    saveCart(cart);
    showToast(name);
  }

  function showToast(name){
    var t=document.createElement('div');
    t.textContent='✅ '+name.substring(0,30)+' añadido al carrito';
    t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a7a3a;color:#fff;padding:12px 22px;border-radius:12px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.3);animation:fadeInUp .3s ease';
    document.body.appendChild(t);
    setTimeout(function(){t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(function(){t.remove()},300)},2500);
  }

  function injectButtons(){
    var cards=document.querySelectorAll('.catalogoGridCard');
    if(!cards.length)return;
    cards.forEach(function(card){
      if(card.querySelector('.cat-add-btn'))return;
      var textDiv=card.querySelector('.catalogoGridText');
      if(!textDiv)return;

      var h4=textDiv.querySelector('h4');
      var h5=textDiv.querySelector('h5');
      var imgEl=card.querySelector('img');
      var name=h4?h4.textContent:'Producto';
      var priceText=h5?h5.textContent.replace(/[^\d]/g,''):'0';
      var price=parseInt(priceText)||0;
      var img=imgEl?imgEl.src:'';

      var btn=document.createElement('button');
      btn.className='cat-add-btn';
      btn.innerHTML='🛒 Añadir al carrito';
      btn.style.cssText='display:block;width:calc(100% - 16px);margin:8px auto 4px;padding:9px 0;background:linear-gradient(135deg,#1a7a3a,#25a050);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.3px;box-shadow:0 2px 8px rgba(26,122,58,.3);transition:transform .15s,box-shadow .15s';
      
      btn.addEventListener('mouseenter',function(){btn.style.transform='scale(1.03)';btn.style.boxShadow='0 4px 14px rgba(26,122,58,.4)';});
      btn.addEventListener('mouseleave',function(){btn.style.transform='scale(1)';btn.style.boxShadow='0 2px 8px rgba(26,122,58,.3)';});
      
      btn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        addToCart(name,price,img,'catprod-'+name.replace(/\s/g,'_').substring(0,20));
        btn.innerHTML='✅ Añadido';
        btn.style.background='#1a5c2e';
        setTimeout(function(){btn.innerHTML='🛒 Añadir al carrito';btn.style.background='linear-gradient(135deg,#1a7a3a,#25a050)';},1800);
      });

      textDiv.appendChild(btn);
    });

    // Also add to showcaseCard cards and other product cards
    var otherCards=document.querySelectorAll('.cardProdcut, .cardProdcutmasVendido, .catalogoHeroCard');
    otherCards.forEach(function(card){
      if(card.querySelector('.cat-add-btn'))return;
      var textDiv=card.querySelector('.cardText')||card.querySelector('.catalogoGridText')||card;
      var h4=card.querySelector('h4');
      var h5=card.querySelector('h5:not(.precioTachado)');
      var imgEl=card.querySelector('img');
      if(!h4)return;

      var name=h4.textContent;
      var priceText=h5?h5.textContent.replace(/[^\d]/g,''):'0';
      var price=parseInt(priceText)||0;
      var img=imgEl?imgEl.src:'';

      var btn=document.createElement('button');
      btn.className='cat-add-btn';
      btn.innerHTML='🛒 Añadir';
      btn.style.cssText='display:inline-block;margin:6px auto 2px;padding:6px 14px;background:linear-gradient(135deg,#1a7a3a,#25a050);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:.3px;box-shadow:0 2px 6px rgba(26,122,58,.3);transition:transform .15s';
      
      btn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        addToCart(name,price,img,'catprod-'+name.replace(/\s/g,'_').substring(0,20));
        btn.innerHTML='✅';
        setTimeout(function(){btn.innerHTML='🛒 Añadir';},1500);
      });

      textDiv.appendChild(btn);
    });
  }

  // Inject CSS animation
  var style=document.createElement('style');
  style.textContent='@keyframes fadeInUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}} .catalogoGridCard{position:relative;overflow:visible!important}';
  document.head.appendChild(style);

  // Run periodically (React re-renders)
  setInterval(injectButtons,1000);
  setTimeout(injectButtons,500);
})();
