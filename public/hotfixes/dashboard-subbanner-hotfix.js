/* dashboard-subbanner-hotfix.js v1 — adds "Banner Catálogo" button + fixes */
(function(){
  if(window.location.pathname!=='/dashboard/sub-banners')return;

  function injectCatalogBannerBtn(){
    // Look for the existing buttons/header area
    var container=document.querySelector('.NewContain')||document.querySelector('[class*="SubBanner"]');
    if(!container)return;
    if(document.getElementById('btn-banner-catalogo'))return;

    // Find the save button to place ours nearby
    var saveBtn=container.querySelector('.btnSave')||container.querySelector('button');
    if(!saveBtn)return;

    var btn=document.createElement('a');
    btn.id='btn-banner-catalogo';
    btn.href='/dashboard/banners';
    btn.innerHTML='🖼️ Banner Catálogo';
    btn.style.cssText='display:inline-flex;align-items:center;gap:6px;margin-left:12px;padding:10px 20px;background:linear-gradient(135deg,#e8c87a,#d4a853);color:#0a1628;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 2px 8px rgba(232,200,122,.3);transition:transform .15s';
    btn.addEventListener('mouseenter',function(){btn.style.transform='scale(1.05)';});
    btn.addEventListener('mouseleave',function(){btn.style.transform='scale(1)';});

    saveBtn.parentNode.insertBefore(btn,saveBtn.nextSibling);
  }

  setInterval(injectCatalogBannerBtn,800);
  setTimeout(injectCatalogBannerBtn,500);
})();
