'use strict';

(function(){
  window.APP_VERSION = 'v3.0.1';

  var refreshing = false;
  var waitingWorker = null;

  function injectStyles(){
    if(document.getElementById('audit5s-update-styles')) return;
    var style = document.createElement('style');
    style.id = 'audit5s-update-styles';
    style.textContent = `
      .audit5s-update-toast{
        position:fixed;
        left:12px;
        right:12px;
        bottom:calc(84px + env(safe-area-inset-bottom, 0px));
        z-index:100000;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:12px 14px;
        border:1px solid rgba(240,165,0,.55);
        border-radius:14px;
        background:rgba(15,17,23,.96);
        color:#ffffff;
        box-shadow:0 12px 32px rgba(0,0,0,.35);
        font-family:inherit;
      }
      .audit5s-update-toast strong{display:block;font-size:.92rem;margin-bottom:2px;}
      .audit5s-update-toast span{display:block;font-size:.78rem;color:#c8d4e8;line-height:1.25;}
      .audit5s-update-toast button{
        border:0;
        border-radius:10px;
        padding:9px 12px;
        background:#f0a500;
        color:#0f1117;
        font-weight:800;
        white-space:nowrap;
        cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function showUpdateToast(worker){
    waitingWorker = worker || waitingWorker;
    if(document.getElementById('audit5sUpdateToast')) return;

    injectStyles();

    var toast = document.createElement('div');
    toast.id = 'audit5sUpdateToast';
    toast.className = 'audit5s-update-toast';
    toast.innerHTML = `
      <div>
        <strong>Nova versão disponível</strong>
        <span>Toque em atualizar para carregar a versão mais recente do app.</span>
      </div>
      <button type="button" id="audit5sUpdateNow">Atualizar</button>
    `;
    document.body.appendChild(toast);

    var btn = document.getElementById('audit5sUpdateNow');
    if(btn){
      btn.addEventListener('click', function(){
        btn.disabled = true;
        btn.textContent = 'Atualizando...';
        if(waitingWorker){
          waitingWorker.postMessage({type:'SKIP_WAITING'});
        }else{
          window.location.reload();
        }
      });
    }
  }

  function watch(worker){
    if(!worker) return;
    worker.addEventListener('statechange', function(){
      if(worker.state === 'installed' && navigator.serviceWorker.controller){
        showUpdateToast(worker);
      }
    });
  }

  function register(){
    if(!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if(refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').then(function(reg){
        if(reg.waiting && navigator.serviceWorker.controller){
          showUpdateToast(reg.waiting);
        }
        if(reg.installing) watch(reg.installing);
        reg.addEventListener('updatefound', function(){ watch(reg.installing); });
        reg.update().catch(function(err){ console.warn('[Audit 5S] Verificação de atualização falhou:', err); });
      }).catch(function(err){
        console.warn('[Audit 5S] Service Worker falhou:', err);
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', register);
  }else{
    register();
  }
})();
