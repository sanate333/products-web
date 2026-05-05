(function(){
  function loadScript(src){
    var s=document.createElement('script');
    s.src=src; s.async=true;
    document.head.appendChild(s);
  }
  if(window.location.pathname.indexOf('/dashboard/whatsapp-bot')===0){
    loadScript('/whatsapp-oasis/chats/hotfix.js?v=22');
  }
})();
