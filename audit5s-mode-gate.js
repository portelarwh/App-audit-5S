'use strict';

(function(){
  const KEY = 'audit5s_selected_mode';
  const MODES = {
    adm: {
      title: 'ADM / Office',
      tag: 'ADMINISTRATIVO',
      icon: '💼',
      desc: 'Auditoria 5S para escritórios, áreas administrativas, rotinas digitais, documentos, comunicação e organização de informações.',
      color: '#3a7bd5'
    },
    prod: {
      title: 'Produção',
      tag: 'OPERAÇÃO',
      icon: '🏭',
      desc: 'Auditoria 5S para áreas produtivas, linhas, postos de trabalho, ferramentas, materiais, fluxo, limpeza e disciplina operacional.',
      color: '#f0a500'
    }
  };

  function ensureStyles(){
    if(document.getElementById('audit5s-mode-gate-styles')) return;
    const style = document.createElement('style');
    style.id = 'audit5s-mode-gate-styles';
    style.textContent = `
      .audit5s-mode-gate{
        position:fixed;
        inset:0;
        z-index:200000;
        background:radial-gradient(circle at top, rgba(240,165,0,.12), transparent 38%), #0f1117;
        color:#e8ecf4;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:22px;
        font-family:'Barlow', Arial, sans-serif;
      }
      .audit5s-mode-box{
        width:min(920px, 100%);
        background:rgba(24,28,37,.96);
        border:1px solid #2a3045;
        border-radius:22px;
        box-shadow:0 24px 70px rgba(0,0,0,.45);
        padding:28px;
      }
      .audit5s-mode-head{text-align:center;margin-bottom:24px;}
      .audit5s-mode-head small{
        display:inline-block;
        color:#f0a500;
        font-family:'Barlow Condensed', Arial, sans-serif;
        font-size:13px;
        font-weight:800;
        letter-spacing:2px;
        text-transform:uppercase;
        margin-bottom:8px;
      }
      .audit5s-mode-head h1{
        margin:0;
        font-family:'Barlow Condensed', Arial, sans-serif;
        font-size:42px;
        line-height:1;
        letter-spacing:1px;
      }
      .audit5s-mode-head p{margin:8px auto 0;max-width:620px;color:#7a8599;font-size:14px;line-height:1.45;}
      .audit5s-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      .audit5s-mode-option{
        position:relative;
        overflow:hidden;
        border:2px solid #2a3045;
        background:#1e2330;
        border-radius:18px;
        padding:24px;
        min-height:230px;
        cursor:pointer;
        text-align:left;
        color:#e8ecf4;
        transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease;
      }
      .audit5s-mode-option::before{content:'';position:absolute;top:0;left:0;right:0;height:5px;background:var(--mode-color);}
      .audit5s-mode-option:hover{transform:translateY(-3px);border-color:var(--mode-color);box-shadow:0 18px 42px rgba(0,0,0,.35);}
      .audit5s-mode-tag{
        display:inline-block;
        padding:4px 10px;
        border-radius:999px;
        background:color-mix(in srgb, var(--mode-color) 22%, transparent);
        color:var(--mode-color);
        font-family:'Barlow Condensed', Arial, sans-serif;
        font-size:12px;
        font-weight:800;
        letter-spacing:1.4px;
        text-transform:uppercase;
        margin-bottom:14px;
      }
      .audit5s-mode-icon{font-size:34px;margin-bottom:10px;display:block;}
      .audit5s-mode-option h2{font-family:'Barlow Condensed', Arial, sans-serif;font-size:28px;margin:0 0 8px;font-weight:800;letter-spacing:1px;}
      .audit5s-mode-option p{margin:0;color:#b7c0cf;font-size:14px;line-height:1.5;}
      .audit5s-mode-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px;color:#7a8599;font-size:12px;}
      .audit5s-mode-skip{border:1px solid #2a3045;background:transparent;color:#7a8599;border-radius:10px;padding:8px 12px;cursor:pointer;font-family:'Barlow Condensed', Arial, sans-serif;font-weight:800;letter-spacing:1px;text-transform:uppercase;}
      .audit5s-mode-change{
        position:fixed;
        left:14px;
        bottom:calc(14px + env(safe-area-inset-bottom, 0px));
        z-index:9997;
        border:1px solid rgba(240,165,0,.42);
        background:rgba(15,17,23,.92);
        color:#f0a500;
        border-radius:999px;
        padding:8px 12px;
        font-family:'Barlow Condensed', Arial, sans-serif;
        font-weight:800;
        letter-spacing:1px;
        text-transform:uppercase;
        cursor:pointer;
        box-shadow:0 10px 28px rgba(0,0,0,.35);
      }
      @media(max-width:720px){
        .audit5s-mode-box{padding:20px;border-radius:18px;}
        .audit5s-mode-head h1{font-size:34px;}
        .audit5s-mode-grid{grid-template-columns:1fr;}
        .audit5s-mode-option{min-height:190px;padding:20px;}
        .audit5s-mode-foot{flex-direction:column;align-items:flex-start;}
      }
    `;
    document.head.appendChild(style);
  }

  function setMode(mode){
    if(!MODES[mode]) mode = 'adm';
    window.AUDIT5S_SELECTED_MODE = mode;
    try{ localStorage.setItem(KEY, mode); }catch(e){}
    document.documentElement.dataset.audit5sMode = mode;
    document.body.dataset.audit5sMode = mode;

    const pill = document.querySelector('.mode-pill');
    if(pill){
      pill.textContent = MODES[mode].title;
      pill.classList.remove('perc', 'audit');
      pill.classList.add(mode === 'prod' ? 'audit' : 'perc');
    }

    const title = document.querySelector('.hdr-title');
    if(title && !title.dataset.originalTitle){
      title.dataset.originalTitle = title.textContent || 'AUDITORIA 5S';
    }
    if(title){
      title.textContent = `${title.dataset.originalTitle.replace(/\s+\|\s+(ADM|Produção|ADM \/ Office).*$/i, '')} | ${MODES[mode].title}`;
    }

    if(window.AUDIT5S_UPGRADE && typeof window.AUDIT5S_UPGRADE.applyAll === 'function'){
      setTimeout(() => window.AUDIT5S_UPGRADE.applyAll(), 60);
    }
  }

  function getMode(){
    if(window.AUDIT5S_SELECTED_MODE) return window.AUDIT5S_SELECTED_MODE;
    try{
      const saved = localStorage.getItem(KEY);
      if(MODES[saved]) return saved;
    }catch(e){}
    return '';
  }

  function closeGate(){
    const gate = document.getElementById('audit5sModeGate');
    if(gate) gate.remove();
    ensureChangeButton();
  }

  function choose(mode){
    setMode(mode);
    closeGate();
  }

  function showGate(force){
    ensureStyles();
    if(document.getElementById('audit5sModeGate')) return;
    if(!force && getMode()){
      setMode(getMode());
      ensureChangeButton();
      return;
    }

    const gate = document.createElement('div');
    gate.id = 'audit5sModeGate';
    gate.className = 'audit5s-mode-gate';
    gate.innerHTML = `
      <div class="audit5s-mode-box" role="dialog" aria-modal="true" aria-label="Escolha o tipo de auditoria 5S">
        <div class="audit5s-mode-head">
          <small>Audit 5S · Operix</small>
          <h1>Escolha o tipo de auditoria</h1>
          <p>Selecione o ambiente antes de iniciar. As perguntas, pesos, leitura do resultado e recomendações serão ajustadas conforme o tipo escolhido.</p>
        </div>
        <div class="audit5s-mode-grid">
          <button type="button" class="audit5s-mode-option" data-mode="adm" style="--mode-color:${MODES.adm.color}">
            <span class="audit5s-mode-tag">${MODES.adm.tag}</span>
            <span class="audit5s-mode-icon">${MODES.adm.icon}</span>
            <h2>${MODES.adm.title}</h2>
            <p>${MODES.adm.desc}</p>
          </button>
          <button type="button" class="audit5s-mode-option" data-mode="prod" style="--mode-color:${MODES.prod.color}">
            <span class="audit5s-mode-tag">${MODES.prod.tag}</span>
            <span class="audit5s-mode-icon">${MODES.prod.icon}</span>
            <h2>${MODES.prod.title}</h2>
            <p>${MODES.prod.desc}</p>
          </button>
        </div>
        <div class="audit5s-mode-foot">
          <span>Você poderá trocar o tipo depois pelo botão “Trocar tipo”.</span>
          <button type="button" class="audit5s-mode-skip" id="audit5sDefaultAdm">Usar ADM / Office</button>
        </div>
      </div>
    `;

    document.body.appendChild(gate);
    gate.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => choose(btn.dataset.mode));
    });
    gate.querySelector('#audit5sDefaultAdm').addEventListener('click', () => choose('adm'));
  }

  function ensureChangeButton(){
    ensureStyles();
    if(document.getElementById('audit5sChangeMode')) return;
    const btn = document.createElement('button');
    btn.id = 'audit5sChangeMode';
    btn.type = 'button';
    btn.className = 'audit5s-mode-change';
    btn.textContent = 'Trocar tipo';
    btn.addEventListener('click', () => showGate(true));
    document.body.appendChild(btn);
  }

  function patchInferMode(){
    const applyPatch = () => {
      if(!window.AUDIT5S_UPGRADE || window.AUDIT5S_UPGRADE.__modeGatePatched) return;
      const originalFlatten = window.AUDIT5S_UPGRADE.flattenQuestions;
      window.AUDIT5S_UPGRADE.currentSelectedMode = getMode;
      window.AUDIT5S_UPGRADE.flattenCurrentQuestions = function(){
        return originalFlatten(getMode() || 'adm');
      };
      window.AUDIT5S_UPGRADE.__modeGatePatched = true;
      setMode(getMode() || 'adm');
    };
    applyPatch();
    setTimeout(applyPatch, 250);
    setTimeout(applyPatch, 1000);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      showGate(false);
      patchInferMode();
    });
  }else{
    showGate(false);
    patchInferMode();
  }

  window.addEventListener('load', () => {
    showGate(false);
    patchInferMode();
  });

  window.AUDIT5S_MODE_GATE = { showGate, setMode, getMode };
})();
