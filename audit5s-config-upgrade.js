'use strict';

(function(){
  const MODE_CONFIG = {
    adm: {
      key: 'adm',
      name: 'ADM / Office',
      shortName: 'ADM/Office',
      description: 'Avaliação 5S para áreas administrativas, escritórios, salas e rotinas digitais.',
      weights: { seiri: 15, seiton: 25, seiso: 15, seiketsu: 25, shitsuke: 20 },
      color: '#3a7bd5'
    },
    prod: {
      key: 'prod',
      name: 'Produção',
      shortName: 'Produção',
      description: 'Avaliação 5S para áreas produtivas, linhas, postos de trabalho e operação.',
      weights: { seiri: 20, seiton: 20, seiso: 20, seiketsu: 20, shitsuke: 20 },
      color: '#f0a500'
    }
  };

  const SCALE = [
    { value: 1, label: 'Muito ruim', description: 'Não atende ao padrão esperado.' },
    { value: 2, label: 'Ruim', description: 'Atende pouco, com muitas falhas.' },
    { value: 3, label: 'Regular', description: 'Atende parcialmente, ainda instável.' },
    { value: 4, label: 'Bom', description: 'Atende bem, com pequenos desvios.' },
    { value: 5, label: 'Excelente', description: 'Padrão consolidado e sustentado.' }
  ];

  const S_LABELS = {
    seiri: 'Seiri — Utilização',
    seiton: 'Seiton — Organização',
    seiso: 'Seiso — Limpeza',
    seiketsu: 'Seiketsu — Padronização',
    shitsuke: 'Shitsuke — Disciplina'
  };

  const QUESTIONS = {
    adm: {
      seiri: [
        'Existem documentos físicos desnecessários acumulados no ambiente?',
        'Há arquivos digitais duplicados, obsoletos ou sem utilização?',
        'Sistemas, planilhas ou controles possuem dados antigos sem revisão?',
        'Materiais de escritório sem uso ocupam espaço nas mesas, gavetas ou armários?',
        'Existe uma rotina definida para revisar e descartar o que não é útil?'
      ],
      seiton: [
        'Pastas físicas, documentos e materiais estão identificados e organizados?',
        'A estrutura de pastas digitais segue um padrão claro e conhecido?',
        'Arquivos possuem nomenclatura padronizada e fácil de entender?',
        'As informações necessárias são encontradas rapidamente pela equipe?',
        'Existe uma lógica de organização acessível e compreendida por todos?'
      ],
      seiso: [
        'O ambiente de trabalho está limpo, agradável e sem acúmulo de itens?',
        'As mesas permanecem organizadas e livres de excesso de materiais?',
        'O desktop do computador e áreas digitais de trabalho estão organizados?',
        'A caixa de e-mails, mensagens ou pendências digitais está sob controle?',
        'Existe rotina para limpeza, organização e revisão do ambiente físico e digital?'
      ],
      seiketsu: [
        'Existe padrão definido para organização de arquivos físicos e digitais?',
        'Existe padrão de comunicação para e-mails, relatórios e documentos?',
        'Os processos e rotinas administrativas estão documentados?',
        'Há checklists, rotinas ou controles visuais para manter o padrão?',
        'Os padrões são conhecidos e aplicados por todos os envolvidos?'
      ],
      shitsuke: [
        'Os padrões definidos são seguidos no dia a dia da área?',
        'Existe acompanhamento periódico para manter os padrões estabelecidos?',
        'A equipe mantém a organização sem necessidade constante de cobrança?',
        'Há busca por melhoria contínua na organização e nos fluxos de trabalho?',
        'Existe cultura de disciplina, organização e cuidado com o ambiente?'
      ]
    },
    prod: {
      seiri: [
        'Existem materiais desnecessários ou sem uso na área produtiva?',
        'Há ferramentas, dispositivos ou acessórios sem utilização no posto de trabalho?',
        'O estoque na área está adequado, sem excesso ou materiais fora do necessário?',
        'Há itens obsoletos, sucata, refugos ou materiais aguardando destinação?',
        'Existe rotina clara para descarte, segregação ou retirada do que não é útil?'
      ],
      seiton: [
        'Ferramentas, dispositivos e materiais possuem local definido e identificado?',
        'O layout da área favorece o fluxo de trabalho e reduz deslocamentos desnecessários?',
        'Materiais estão organizados conforme frequência de uso e necessidade operacional?',
        'Existe identificação visual clara por etiquetas, cores, sombras, marcações ou placas?',
        'Qualquer pessoa consegue encontrar rapidamente o que precisa na área?'
      ],
      seiso: [
        'Máquinas, equipamentos e bancadas estão limpos e em boas condições visuais?',
        'A área está livre de óleo, pó, resíduos, embalagens ou sujeiras acumuladas?',
        'Existem vazamentos, sujeiras recorrentes ou fontes de contaminação não tratadas?',
        'A limpeza é realizada regularmente e faz parte da rotina da área?',
        'A limpeza permite identificar anomalias, desgastes ou condições inseguras facilmente?'
      ],
      seiketsu: [
        'Existem padrões visuais como marcações de piso, sinalizações e identificação de locais?',
        'Procedimentos, instruções ou padrões de trabalho estão disponíveis no posto?',
        'Há padronização para ferramentas, materiais, embalagens e dispositivos usados na operação?',
        'O posto de trabalho segue um padrão definido de organização e apresentação?',
        'Existe controle visual que permita perceber rapidamente se a área está dentro do padrão?'
      ],
      shitsuke: [
        'Os operadores seguem os padrões definidos para organização, limpeza e segurança?',
        'Os EPIs são utilizados corretamente e de forma consistente?',
        'Há reação rápida quando desvios, riscos ou desorganizações são identificados?',
        'A equipe mantém o padrão da área mesmo sem cobrança constante da liderança?',
        'Existe cultura de disciplina, cuidado com o posto e melhoria contínua na operação?'
      ]
    }
  };

  function flattenQuestions(mode){
    const cfg = QUESTIONS[mode] || QUESTIONS.adm;
    return Object.keys(S_LABELS).flatMap(sKey => cfg[sKey].map((text, index) => ({
      mode,
      sKey,
      sLabel: S_LABELS[sKey],
      index: index + 1,
      text
    })));
  }

  function normalizeScore(value){
    const n = Number(value);
    if(!Number.isFinite(n)) return 0;
    return Math.max(1, Math.min(5, n));
  }

  function calcSScore(values){
    const arr = Array.isArray(values) ? values.map(normalizeScore).filter(Boolean) : [];
    if(!arr.length) return 0;
    const max = arr.length * 5;
    const total = arr.reduce((sum, item) => sum + item, 0);
    return total / max * 100;
  }

  function calcAllScores(groupedResponses){
    const scores = {};
    Object.keys(S_LABELS).forEach(sKey => {
      scores[sKey] = calcSScore(groupedResponses && groupedResponses[sKey]);
    });
    return scores;
  }

  function calcFinalScore(scores, mode){
    const config = MODE_CONFIG[mode] || MODE_CONFIG.adm;
    const weights = config.weights;
    return Object.keys(S_LABELS).reduce((sum, sKey) => {
      return sum + ((Number(scores && scores[sKey]) || 0) * (weights[sKey] || 0));
    }, 0) / 100;
  }

  function getClassification(score){
    const n = Number(score) || 0;
    if(n <= 60) return 'Crítico';
    if(n <= 75) return 'Baixo';
    if(n <= 85) return 'Médio';
    if(n <= 95) return 'Bom';
    return 'Excelência';
  }

  function getRecommendations(scores, mode){
    const actions = [];
    const m = MODE_CONFIG[mode] || MODE_CONFIG.adm;

    if((scores.seiri || 0) < 70){
      actions.push(m.key === 'prod'
        ? 'Realizar campanha de descarte, retirada de materiais sem uso, sucata e itens obsoletos da área produtiva.'
        : 'Realizar campanha de descarte físico e digital, eliminando documentos, arquivos e materiais sem uso.');
    }
    if((scores.seiton || 0) < 70){
      actions.push(m.key === 'prod'
        ? 'Reorganizar ferramentas, materiais e layout com identificação visual, local definido e lógica por frequência de uso.'
        : 'Padronizar pastas, nomenclatura de arquivos, organização de documentos e lógica de acesso às informações.');
    }
    if((scores.seiso || 0) < 70){
      actions.push(m.key === 'prod'
        ? 'Implantar rotina de limpeza e inspeção para identificar vazamentos, sujeiras recorrentes e anomalias nos equipamentos.'
        : 'Implantar rotina de limpeza e organização do ambiente físico e digital, incluindo mesas, desktops e caixas de e-mail.');
    }
    if((scores.seiketsu || 0) < 70){
      actions.push(m.key === 'prod'
        ? 'Criar ou reforçar padrões visuais, marcações, instruções de trabalho e controle visual do posto.'
        : 'Criar padrões administrativos para arquivos, comunicação, relatórios, checklists e rotinas de manutenção do 5S.');
    }
    if((scores.shitsuke || 0) < 70){
      actions.push(m.key === 'prod'
        ? 'Reforçar disciplina operacional, uso de EPIs, reação a desvios e acompanhamento frequente da liderança.'
        : 'Reforçar disciplina, acompanhamento periódico e cultura de organização sem dependência de cobrança constante.');
    }

    if(!actions.length){
      actions.push('Manter rotina de auditoria, acompanhamento dos padrões e melhoria contínua para sustentar o nível atual.');
    }

    return actions;
  }

  function text(el, value){
    if(el && value != null) el.textContent = value;
  }

  function setModeCard(card, mode){
    if(!card) return;
    const config = MODE_CONFIG[mode];
    card.dataset.audit5sMode = mode;
    card.dataset.mode = mode;
    card.style.setProperty('--mode-color', config.color);

    const tag = card.querySelector('.mode-tag');
    const title = card.querySelector('h3, .mode-title, .ab-text h4');
    const paragraph = card.querySelector('p, .mode-desc, .ab-text p');

    text(tag, mode === 'adm' ? 'ADMINISTRATIVO' : 'OPERAÇÃO');
    text(title, config.name);
    text(paragraph, config.description);
  }

  function patchModeCards(){
    const cards = Array.from(document.querySelectorAll('.mode-card'));
    if(cards.length >= 2){
      setModeCard(cards[0], 'adm');
      setModeCard(cards[1], 'prod');
    }

    Array.from(document.querySelectorAll('.mode-pill')).forEach(pill => {
      const raw = (pill.textContent || '').toLowerCase();
      if(raw.includes('adm') || raw.includes('office') || raw.includes('administr')) text(pill, MODE_CONFIG.adm.shortName);
      if(raw.includes('prod') || raw.includes('opera')) text(pill, MODE_CONFIG.prod.shortName);
    });

    Array.from(document.querySelectorAll('button, .btn, .action-btn')).forEach(el => {
      const raw = (el.textContent || '').trim().toLowerCase();
      if(raw === 'adm' || raw.includes('administrativo')) el.textContent = 'ADM / Office';
      if(raw === 'produção' || raw === 'producao' || raw.includes('produção') || raw.includes('producao')) el.textContent = 'Produção';
    });
  }

  function inferMode(){
    const selected = document.querySelector('.mode-card.sel, .mode-card.selected, .mode-card.active, [data-audit5s-mode].active, .mode-pill');
    const textValue = ((selected && selected.textContent) || document.body.textContent || '').toLowerCase();
    if(textValue.includes('produção') || textValue.includes('producao') || textValue.includes('operação') || textValue.includes('operacao')) return 'prod';
    return 'adm';
  }

  function currentQuestionSet(){
    return flattenQuestions(inferMode());
  }

  function patchScaleButtons(){
    const auditGrids = Array.from(document.querySelectorAll('.audit-grid'));
    auditGrids.forEach(grid => {
      const buttons = Array.from(grid.querySelectorAll('.a-btn, button'));
      if(buttons.length === 6){
        const zero = buttons.find(btn => btn.dataset.v === '0' || (btn.textContent || '').trim().startsWith('0'));
        if(zero) zero.remove();
      }
      Array.from(grid.querySelectorAll('.a-btn, button')).slice(0, 5).forEach((btn, index) => {
        const item = SCALE[index];
        btn.dataset.v = String(item.value);
        btn.title = item.description;
        const label = btn.querySelector('.al');
        if(label){
          btn.childNodes.forEach(node => {
            if(node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.textContent = String(item.value);
          });
          label.textContent = item.label;
        }else{
          btn.innerHTML = `${item.value}<span class="al">${item.label}</span>`;
        }
      });
    });

    const ratingGrids = Array.from(document.querySelectorAll('.rating-grid'));
    ratingGrids.forEach(grid => {
      let buttons = Array.from(grid.querySelectorAll('.r-btn, button'));
      if(buttons.length < 5 && buttons.length > 0){
        const base = buttons[buttons.length - 1];
        while(buttons.length < 5){
          const clone = base.cloneNode(true);
          clone.classList.remove('sel', 'selected', 'active');
          grid.appendChild(clone);
          buttons.push(clone);
        }
      }
      buttons.slice(0, 5).forEach((btn, index) => {
        const item = SCALE[index];
        btn.dataset.v = String(item.value);
        btn.title = item.description;
        const score = btn.querySelector('.rs');
        const label = btn.querySelector('.rl');
        if(score) score.textContent = String(item.value);
        if(label) label.textContent = item.label;
        if(!score && !label) btn.innerHTML = `<span class="rs">${item.value}</span><span class="rl">${item.label}</span>`;
      });
    });
  }

  function patchQuestionTexts(){
    const questions = currentQuestionSet();
    const cards = Array.from(document.querySelectorAll('.q-card'));
    if(!cards.length) return;

    cards.forEach((card, idx) => {
      const q = questions[idx];
      if(!q) return;
      card.dataset.audit5sS = q.sKey;
      card.dataset.audit5sQuestion = String(q.index);
      const qText = card.querySelector('.q-text');
      const qNum = card.querySelector('.q-num');
      if(qNum) qNum.textContent = `${q.sLabel} · Pergunta ${q.index}/5`;
      if(qText) qText.textContent = q.text;
    });

    const sectionTitle = document.querySelector('.s-hdr-text h2');
    const first = questions[0];
    if(sectionTitle && first && cards.length <= 5) sectionTitle.textContent = first.sLabel;
  }

  function addRecommendationPanel(){
    const resultScreen = document.querySelector('#screen-results, .screen.results, .screen.active');
    if(!resultScreen || document.getElementById('audit5sRecommendationsPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'audit5sRecommendationsPanel';
    panel.className = 'section-card';
    panel.innerHTML = '<h3>Ações recomendadas</h3><div id="audit5sRecommendationsList" class="audit5s-recommendations-list"></div>';

    const container = resultScreen.querySelector('.container') || resultScreen;
    container.appendChild(panel);
  }

  function collectScoresFromDom(){
    const scores = {};
    Object.keys(S_LABELS).forEach(sKey => scores[sKey] = 0);

    const rows = Array.from(document.querySelectorAll('.s-row'));
    rows.forEach((row, index) => {
      const key = Object.keys(S_LABELS)[index];
      const pctText = row.textContent.match(/(\d+(?:[,.]\d+)?)\s*%/);
      if(key && pctText) scores[key] = Number(pctText[1].replace(',', '.')) || 0;
    });

    return scores;
  }

  function patchRecommendations(){
    addRecommendationPanel();
    const list = document.getElementById('audit5sRecommendationsList');
    if(!list) return;
    const scores = collectScoresFromDom();
    const actions = getRecommendations(scores, inferMode());
    list.innerHTML = actions.map(action => `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;line-height:1.45;">• ${action}</div>`).join('');
  }

  function applyAll(){
    patchModeCards();
    patchScaleButtons();
    patchQuestionTexts();
    patchRecommendations();
  }

  function observe(){
    let timer = null;
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(applyAll, 80);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.AUDIT5S_PRO_CONFIG = MODE_CONFIG;
  window.AUDIT5S_PRO_SCALE = SCALE;
  window.AUDIT5S_PRO_QUESTIONS = QUESTIONS;
  window.AUDIT5S_PRO_LABELS = S_LABELS;
  window.AUDIT5S_UPGRADE = {
    MODE_CONFIG,
    SCALE,
    QUESTIONS,
    S_LABELS,
    flattenQuestions,
    calcSScore,
    calcAllScores,
    calcFinalScore,
    getClassification,
    getRecommendations,
    applyAll
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      applyAll();
      observe();
    });
  }else{
    applyAll();
    observe();
  }

  window.addEventListener('load', applyAll);
})();
