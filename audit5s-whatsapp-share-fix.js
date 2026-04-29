'use strict';

(function(){
  function clean(value){
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function $(selector){
    return document.querySelector(selector);
  }

  function all(selector){
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function loadHtml2Canvas(){
    if(typeof window.html2canvas === 'function') return Promise.resolve();

    return new Promise(function(resolve, reject){
      var existing = document.querySelector('script[data-audit5s-html2canvas]');
      if(existing){
        existing.addEventListener('load', resolve, {once:true});
        existing.addEventListener('error', function(){ reject(new Error('Falha ao carregar html2canvas.')); }, {once:true});
        return;
      }

      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.async = true;
      script.defer = true;
      script.dataset.audit5sHtml2canvas = 'true';
      script.onload = resolve;
      script.onerror = function(){ reject(new Error('Falha ao carregar html2canvas.')); };
      document.head.appendChild(script);
    });
  }

  function stamp(){
    var d = new Date();
    var p = function(n){ return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }

  function downloadBlob(blob, name){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  function canvasToBlob(canvas){
    return new Promise(function(resolve, reject){
      canvas.toBlob(function(blob){
        blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem.'));
      }, 'image/png', 0.95);
    });
  }

  function visibleText(selectors){
    for(var i = 0; i < selectors.length; i++){
      var el = $(selectors[i]);
      var text = clean(el && (el.textContent || el.value));
      if(text) return text;
    }
    return '';
  }

  function findScore(){
    return visibleText(['.score-big', '#scoreBig', '#finalScore', '.kpi-val', '.score']);
  }

  function findGrade(){
    return visibleText(['.score-grade', '#scoreGrade', '.maturity-grade', '.grade']);
  }

  function getSectionScores(){
    var rows = all('.s-row, .disp-row, .comp-row').slice(0, 8);
    return rows.map(function(row){ return clean(row.textContent); }).filter(Boolean).slice(0, 5);
  }

  function buildSummaryText(){
    var mode = visibleText(['.mode-pill', '.ident-badge .tag']) || 'Avaliação 5S';
    var area = visibleText(['#area', '#areaName', 'input[name="area"]', '#setor', '#department']);
    var auditor = visibleText(['#auditor', '#auditorName', 'input[name="auditor"]', '#responsavel']);
    var score = findScore();
    var grade = findGrade();
    var sections = getSectionScores();

    var lines = [];
    lines.push('Resumo Executivo — Auditoria 5S');
    lines.push('');
    lines.push('Modo: ' + (mode || '-'));
    lines.push('Área/Setor: ' + (area || '-'));
    lines.push('Responsável/Auditor: ' + (auditor || '-'));
    lines.push('Data: ' + new Date().toLocaleString('pt-BR'));
    lines.push('Nota geral: ' + (score || '-'));
    lines.push('Maturidade/Classificação: ' + (grade || '-'));

    if(sections.length){
      lines.push('');
      lines.push('Resumo por S:');
      sections.forEach(function(item){ lines.push('- ' + item); });
    }

    lines.push('');
    lines.push('Imagem do relatório em anexo.');
    return lines.join('\n');
  }

  function targetForImage(){
    return $('.screen.active') || $('.container') || document.body;
  }

  async function buildPNGBlob(){
    await loadHtml2Canvas();
    var target = targetForImage();

    var canvas = await window.html2canvas(target, {
      scale: 2,
      backgroundColor: getComputedStyle(document.body).backgroundColor || '#0f1117',
      logging: false,
      useCORS: true,
      onclone: function(doc){
        allIn(doc, '.toast, .audit5s-share-btn, .audit5s-update-toast, #float-back').forEach(function(el){
          el.style.display = 'none';
        });
      }
    });

    return canvasToBlob(canvas);
  }

  function allIn(doc, selector){
    return Array.prototype.slice.call(doc.querySelectorAll(selector));
  }

  async function shareWhatsApp(){
    var btn = document.getElementById('audit5sShareBtn');
    var oldText = btn ? btn.textContent : '';

    if(btn){
      btn.disabled = true;
      btn.textContent = '⏳ Gerando...';
    }

    try{
      var text = buildSummaryText();
      var blob = await buildPNGBlob();
      var name = 'audit-5s_' + stamp() + '.png';
      var file = new File([blob], name, {type:'image/png'});

      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({files:[file], title:'Auditoria 5S', text:text});
      }else{
        downloadBlob(blob, name);
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
      }
    }catch(e){
      if(e && e.name === 'AbortError') return;
      console.error('[Audit 5S] Erro WhatsApp:', e);
      alert((e && e.message) || 'Erro ao gerar compartilhamento para WhatsApp.');
    }finally{
      if(btn){
        btn.textContent = oldText;
        btn.disabled = false;
      }
    }
  }

  function ensureButton(){
    var existing = document.getElementById('audit5sShareBtn');
    if(existing) return existing;

    var host = document.querySelector('.hdr-right') || document.querySelector('header') || document.body;
    var btn = document.createElement('button');
    btn.id = 'audit5sShareBtn';
    btn.type = 'button';
    btn.className = 'btn btn-success audit5s-share-btn';
    btn.textContent = 'WhatsApp';
    btn.title = 'Compartilhar resumo e imagem pelo WhatsApp';

    if(host === document.body){
      btn.style.position = 'fixed';
      btn.style.right = '18px';
      btn.style.bottom = '86px';
      btn.style.zIndex = '9998';
      btn.style.boxShadow = '0 8px 22px rgba(0,0,0,.35)';
    }

    host.appendChild(btn);
    return btn;
  }

  function bind(){
    var btn = ensureButton();
    if(!btn || btn.dataset.audit5sBound === 'true') return;
    btn.dataset.audit5sBound = 'true';
    btn.addEventListener('click', function(event){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      shareWhatsApp();
    }, true);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bind);
  }else{
    bind();
  }

  window.addEventListener('load', bind);
  window.buildAudit5SPNGBlob = buildPNGBlob;
})();
