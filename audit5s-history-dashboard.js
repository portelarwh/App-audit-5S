'use strict';

(function(){
  const STORAGE_KEY = 'audit5s_history_v1';
  const S_LABELS = {
    seiri: 'Seiri',
    seiton: 'Seiton',
    seiso: 'Seiso',
    seiketsu: 'Seiketsu',
    shitsuke: 'Shitsuke'
  };

  function clean(value){
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function $(selector){ return document.querySelector(selector); }
  function all(selector){ return Array.prototype.slice.call(document.querySelectorAll(selector)); }

  function getAuditHistory(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){
      console.warn('[Audit 5S] Histórico inválido:', e);
      return [];
    }
  }

  function setAuditHistory(history){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  function getClassification(score){
    if(window.AUDIT5S_UPGRADE && typeof window.AUDIT5S_UPGRADE.getClassification === 'function'){
      return window.AUDIT5S_UPGRADE.getClassification(score);
    }
    const n = Number(score) || 0;
    if(n <= 60) return 'Crítico';
    if(n <= 75) return 'Baixo';
    if(n <= 85) return 'Médio';
    if(n <= 95) return 'Bom';
    return 'Excelência';
  }

  function inferMode(){
    const body = clean(document.body.textContent).toLowerCase();
    const pill = clean(($('.mode-pill') || {}).textContent).toLowerCase();
    const value = pill || body;
    if(value.includes('produção') || value.includes('producao') || value.includes('operação') || value.includes('operacao')) return 'prod';
    return 'adm';
  }

  function modeName(mode){
    if(window.AUDIT5S_PRO_CONFIG && window.AUDIT5S_PRO_CONFIG[mode]) return window.AUDIT5S_PRO_CONFIG[mode].name;
    return mode === 'prod' ? 'Produção' : 'ADM / Office';
  }

  function findArea(){
    const candidates = [
      '#area', '#areaName', '#setor', '#department', '#local', '#auditArea',
      'input[name="area"]', 'input[name="setor"]', 'input[name="department"]'
    ];
    for(const selector of candidates){
      const el = $(selector);
      const value = clean(el && (el.value || el.textContent));
      if(value) return value;
    }

    const labels = all('.ri, .resp-info div, .form-group').map(el => clean(el.textContent));
    const hit = labels.find(text => /área|area|setor|local/i.test(text));
    if(hit){
      return clean(hit.replace(/área|area|setor|local|:/ig, '')) || 'Não informado';
    }
    return 'Não informado';
  }

  function findAuditor(){
    const candidates = ['#auditor', '#auditorName', '#responsavel', '#leader', 'input[name="auditor"]', 'input[name="responsavel"]'];
    for(const selector of candidates){
      const el = $(selector);
      const value = clean(el && (el.value || el.textContent));
      if(value) return value;
    }
    return 'Não informado';
  }

  function parsePercent(text){
    const match = clean(text).match(/(\d+(?:[,.]\d+)?)\s*%/);
    return match ? Number(match[1].replace(',', '.')) : null;
  }

  function findScore(){
    const selectors = ['.score-big', '#scoreBig', '#finalScore', '.score-hero', '.kpi-val', '.score'];
    for(const selector of selectors){
      const el = $(selector);
      const pct = parsePercent(el && el.textContent);
      if(Number.isFinite(pct)) return pct;
      const raw = clean(el && el.textContent).match(/\b(\d{1,3}(?:[,.]\d+)?)\b/);
      if(raw){
        const n = Number(raw[1].replace(',', '.'));
        if(n >= 0 && n <= 100) return n;
      }
    }
    return 0;
  }

  function collectScoresByS(){
    const scores = { seiri: 0, seiton: 0, seiso: 0, seiketsu: 0, shitsuke: 0 };
    const keys = Object.keys(scores);

    const rows = all('.s-row');
    if(rows.length){
      rows.slice(0, 5).forEach((row, index) => {
        const pct = parsePercent(row.textContent);
        if(Number.isFinite(pct)) scores[keys[index]] = pct;
      });
    }

    if(!Object.values(scores).some(Boolean)){
      all('.q-card').forEach(card => {
        const key = card.dataset.audit5sS;
        const selected = card.querySelector('.sel, .selected, .active');
        const v = Number(selected && selected.dataset && selected.dataset.v);
        if(key && scores.hasOwnProperty(key) && Number.isFinite(v)){
          if(!scores['__count_'+key]) scores['__count_'+key] = 0;
          scores[key] += v;
          scores['__count_'+key] += 1;
        }
      });
      keys.forEach(key => {
        const count = scores['__count_'+key] || 0;
        scores[key] = count ? (scores[key] / (count * 5) * 100) : 0;
        delete scores['__count_'+key];
      });
    }

    return scores;
  }

  function buildAuditSnapshot(){
    const score = findScore();
    const scoresByS = collectScoresByS();
    const mode = inferMode();
    return {
      id: Date.now(),
      date: new Date().toISOString(),
      area: findArea(),
      auditor: findAuditor(),
      mode,
      modeName: modeName(mode),
      score,
      classification: getClassification(score),
      scoresByS
    };
  }

  function saveAudit(snapshot){
    const item = snapshot || buildAuditSnapshot();
    if(!item.score && !Object.values(item.scoresByS || {}).some(Boolean)){
      alert('Ainda não encontrei resultado suficiente para salvar o histórico. Finalize a auditoria antes de salvar.');
      return null;
    }

    const history = getAuditHistory();
    const duplicateWindow = 3000;
    const recent = history[history.length - 1];
    if(recent && recent.area === item.area && recent.mode === item.mode && Math.abs(recent.score - item.score) < 0.01 && Date.now() - Number(recent.id || 0) < duplicateWindow){
      return recent;
    }

    history.push(item);
    setAuditHistory(history);
    renderDashboard();
    toast('Auditoria salva no histórico.');
    return item;
  }

  function clearHistory(){
    if(!confirm('Deseja apagar todo o histórico de auditorias 5S deste dispositivo?')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderDashboard();
    toast('Histórico apagado.');
  }

  function exportHistoryCsv(){
    const history = getAuditHistory();
    if(!history.length){
      alert('Não há histórico para exportar.');
      return;
    }
    const header = ['Data','Área','Auditor','Modo','Score','Classificação','Seiri','Seiton','Seiso','Seiketsu','Shitsuke'];
    const rows = history.map(item => [
      new Date(item.date).toLocaleString('pt-BR'),
      item.area,
      item.auditor,
      item.modeName || modeName(item.mode),
      Number(item.score || 0).toFixed(1).replace('.', ','),
      item.classification,
      ...Object.keys(S_LABELS).map(key => Number((item.scoresByS || {})[key] || 0).toFixed(1).replace('.', ','))
    ]);
    const csv = [header, ...rows].map(row => row.map(cell => '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"').join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico-audit-5s.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function average(values){
    const arr = values.filter(v => Number.isFinite(v));
    return arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0;
  }

  function getAverageScore(history){
    return average(history.map(item => Number(item.score)));
  }

  function getRankingByArea(history){
    const map = {};
    history.forEach(item => {
      const area = item.area || 'Não informado';
      if(!map[area]) map[area] = {area, total:0, count:0, modes:{}};
      map[area].total += Number(item.score) || 0;
      map[area].count += 1;
      map[area].modes[item.modeName || modeName(item.mode)] = true;
    });
    return Object.values(map).map(item => ({
      area: item.area,
      score: item.count ? item.total / item.count : 0,
      count: item.count,
      modes: Object.keys(item.modes).join(' / ')
    })).sort((a,b) => b.score - a.score);
  }

  function getWorstS(history){
    if(!history.length) return null;
    const keys = Object.keys(S_LABELS);
    const sums = {};
    const counts = {};
    keys.forEach(key => { sums[key] = 0; counts[key] = 0; });
    history.forEach(item => {
      keys.forEach(key => {
        const value = Number(item.scoresByS && item.scoresByS[key]);
        if(Number.isFinite(value) && value > 0){
          sums[key] += value;
          counts[key] += 1;
        }
      });
    });
    const list = keys.map(key => ({key, label:S_LABELS[key], score: counts[key] ? sums[key] / counts[key] : 0}));
    return list.sort((a,b) => a.score - b.score)[0];
  }

  function getLatestByArea(history){
    const sorted = [...history].sort((a,b) => new Date(b.date) - new Date(a.date));
    const seen = new Set();
    return sorted.filter(item => {
      const area = item.area || 'Não informado';
      if(seen.has(area)) return false;
      seen.add(area);
      return true;
    }).slice(0, 8);
  }

  function classificationClass(score){
    const n = Number(score) || 0;
    if(n <= 60) return 'critico';
    if(n <= 75) return 'baixo';
    if(n <= 85) return 'medio';
    if(n <= 95) return 'bom';
    return 'excelencia';
  }

  function ensureStyles(){
    if(document.getElementById('audit5s-history-styles')) return;
    const style = document.createElement('style');
    style.id = 'audit5s-history-styles';
    style.textContent = `
      .audit5s-dashboard{margin-top:18px;}
      .audit5s-dash-title{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;letter-spacing:1px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .audit5s-dash-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;}
      .audit5s-dash-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;}
      .audit5s-dash-val{font-family:'Barlow Condensed',sans-serif;font-size:30px;font-weight:800;line-height:1;}
      .audit5s-dash-lbl{font-size:10px;color:var(--muted);letter-spacing:1.2px;text-transform:uppercase;margin-top:4px;}
      .audit5s-history-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px;}
      .audit5s-mini-btn{border:1px solid var(--border);background:var(--card);color:var(--text);border-radius:8px;padding:8px 12px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;}
      .audit5s-mini-btn.primary{background:var(--accent);color:#0f1117;border-color:var(--accent);}
      .audit5s-mini-btn.danger{border-color:rgba(224,82,82,.5);color:var(--red);}
      .audit5s-rank-table{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-top:10px;}
      .audit5s-rank-row{display:grid;grid-template-columns:32px 1fr 74px 66px;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border);font-size:12px;}
      .audit5s-rank-row:last-child{border-bottom:0;}
      .audit5s-rank-head{background:var(--surface);color:var(--muted);font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;}
      .audit5s-score-pill{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;text-align:right;}
      .audit5s-score-pill.critico{color:var(--red);}.audit5s-score-pill.baixo{color:#f97316;}.audit5s-score-pill.medio{color:var(--accent);}.audit5s-score-pill.bom{color:var(--blue);}.audit5s-score-pill.excelencia{color:var(--green);}
      .audit5s-evolution{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;}
      .audit5s-panel{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;}
      .audit5s-panel h4{font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
      .audit5s-latest-item{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid var(--border);padding:8px 0;font-size:12px;}
      .audit5s-latest-item:last-child{border-bottom:0;}
      .audit5s-small{color:var(--muted);font-size:11px;}
      @media(max-width:720px){.audit5s-dash-grid{grid-template-columns:repeat(2,1fr)}.audit5s-evolution{grid-template-columns:1fr}.audit5s-rank-row{grid-template-columns:28px 1fr 62px 50px}}
    `;
    document.head.appendChild(style);
  }

  function ensureDashboard(){
    ensureStyles();
    let dash = document.getElementById('audit5sDashboard');
    if(dash) return dash;

    const container = document.querySelector('#screen-dashboard .container') || document.querySelector('#screen-results .container') || document.querySelector('.container') || document.body;
    dash = document.createElement('section');
    dash.id = 'audit5sDashboard';
    dash.className = 'audit5s-dashboard';
    dash.innerHTML = `
      <div class="audit5s-dash-title">
        <span>Dashboard Gerencial 5S</span>
      </div>
      <div class="audit5s-history-actions">
        <button type="button" class="audit5s-mini-btn primary" id="audit5sSaveHistory">Salvar auditoria</button>
        <button type="button" class="audit5s-mini-btn" id="audit5sExportHistory">Exportar CSV</button>
        <button type="button" class="audit5s-mini-btn danger" id="audit5sClearHistory">Limpar histórico</button>
      </div>
      <div class="audit5s-dash-grid">
        <div class="audit5s-dash-card"><div class="audit5s-dash-val" id="audit5sAvgScore">0%</div><div class="audit5s-dash-lbl">Média geral</div></div>
        <div class="audit5s-dash-card"><div class="audit5s-dash-val" id="audit5sTotalAudits">0</div><div class="audit5s-dash-lbl">Auditorias</div></div>
        <div class="audit5s-dash-card"><div class="audit5s-dash-val" id="audit5sWorstS">—</div><div class="audit5s-dash-lbl">Pior S</div></div>
        <div class="audit5s-dash-card"><div class="audit5s-dash-val" id="audit5sAreasCount">0</div><div class="audit5s-dash-lbl">Áreas avaliadas</div></div>
      </div>
      <div class="audit5s-evolution">
        <div class="audit5s-panel">
          <h4>Ranking por área</h4>
          <div class="audit5s-rank-table" id="audit5sRanking"></div>
        </div>
        <div class="audit5s-panel">
          <h4>Últimas auditorias por área</h4>
          <div id="audit5sLatest"></div>
        </div>
      </div>
    `;
    container.appendChild(dash);

    dash.querySelector('#audit5sSaveHistory').addEventListener('click', () => saveAudit());
    dash.querySelector('#audit5sExportHistory').addEventListener('click', exportHistoryCsv);
    dash.querySelector('#audit5sClearHistory').addEventListener('click', clearHistory);
    return dash;
  }

  function renderDashboard(){
    const dash = ensureDashboard();
    const history = getAuditHistory();
    const avg = getAverageScore(history);
    const worst = getWorstS(history);
    const areas = new Set(history.map(item => item.area || 'Não informado'));

    dash.querySelector('#audit5sAvgScore').textContent = avg.toFixed(1).replace('.', ',') + '%';
    dash.querySelector('#audit5sTotalAudits').textContent = String(history.length);
    dash.querySelector('#audit5sAreasCount').textContent = String(history.length ? areas.size : 0);
    dash.querySelector('#audit5sWorstS').textContent = worst ? `${worst.label} ${worst.score.toFixed(0)}%` : '—';

    const ranking = getRankingByArea(history);
    const rankingEl = dash.querySelector('#audit5sRanking');
    if(!ranking.length){
      rankingEl.innerHTML = '<div class="empty-state">Nenhuma auditoria salva ainda.</div>';
    }else{
      rankingEl.innerHTML = '<div class="audit5s-rank-row audit5s-rank-head"><div>#</div><div>Área</div><div>Score</div><div>Qtd.</div></div>' +
        ranking.map((item, index) => `
          <div class="audit5s-rank-row">
            <div>${index + 1}</div>
            <div><strong>${escapeHtml(item.area)}</strong><div class="audit5s-small">${escapeHtml(item.modes || '')}</div></div>
            <div class="audit5s-score-pill ${classificationClass(item.score)}">${item.score.toFixed(1).replace('.', ',')}%</div>
            <div>${item.count}</div>
          </div>
        `).join('');
    }

    const latest = getLatestByArea(history);
    const latestEl = dash.querySelector('#audit5sLatest');
    if(!latest.length){
      latestEl.innerHTML = '<div class="empty-state">As últimas auditorias aparecerão aqui.</div>';
    }else{
      latestEl.innerHTML = latest.map(item => `
        <div class="audit5s-latest-item">
          <div><strong>${escapeHtml(item.area || 'Não informado')}</strong><div class="audit5s-small">${escapeHtml(item.modeName || modeName(item.mode))} · ${new Date(item.date).toLocaleDateString('pt-BR')}</div></div>
          <div class="audit5s-score-pill ${classificationClass(item.score)}">${Number(item.score || 0).toFixed(1).replace('.', ',')}%</div>
        </div>
      `).join('');
    }
  }

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>\"]/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]; });
  }

  function toast(message){
    let el = document.querySelector('.toast');
    if(!el){
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  function addResultSaveButton(){
    const resultContainer = document.querySelector('#screen-results .container') || document.querySelector('.score-hero')?.parentElement;
    if(!resultContainer || document.getElementById('audit5sQuickSaveResult')) return;
    const btn = document.createElement('button');
    btn.id = 'audit5sQuickSaveResult';
    btn.type = 'button';
    btn.className = 'btn btn-primary';
    btn.style.marginTop = '12px';
    btn.textContent = 'Salvar no histórico';
    btn.addEventListener('click', () => saveAudit());
    resultContainer.appendChild(btn);
  }

  function bindAutoSaveOnFinish(){
    all('button, .btn').forEach(btn => {
      const txt = clean(btn.textContent).toLowerCase();
      if(btn.dataset.audit5sFinishBound === 'true') return;
      if(txt.includes('finalizar') || txt.includes('resultado') || txt.includes('concluir')){
        btn.dataset.audit5sFinishBound = 'true';
        btn.addEventListener('click', () => setTimeout(() => {
          addResultSaveButton();
          renderDashboard();
        }, 500));
      }
    });
  }

  function apply(){
    ensureDashboard();
    addResultSaveButton();
    bindAutoSaveOnFinish();
    renderDashboard();
  }

  function observe(){
    let timer = null;
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(apply, 150);
    });
    obs.observe(document.documentElement, {childList:true, subtree:true});
  }

  window.AUDIT5S_HISTORY = {
    STORAGE_KEY,
    getAuditHistory,
    saveAudit,
    clearHistory,
    exportHistoryCsv,
    getAverageScore: () => getAverageScore(getAuditHistory()),
    getRankingByArea: () => getRankingByArea(getAuditHistory()),
    getWorstS: () => getWorstS(getAuditHistory()),
    renderDashboard
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { apply(); observe(); });
  }else{
    apply(); observe();
  }

  window.addEventListener('load', apply);
})();
