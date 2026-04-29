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

  function getHistory(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    }catch(e){
      console.warn('[Audit 5S] Erro ao ler histórico para evolução:', e);
      return [];
    }
  }

  function escapeHtml(value){
    return String(value == null ? '' : value).replace(/[&<>\"]/g, function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m];
    });
  }

  function ensureStyles(){
    if(document.getElementById('audit5s-evolution-styles')) return;
    const style = document.createElement('style');
    style.id = 'audit5s-evolution-styles';
    style.textContent = `
      .audit5s-area-evolution{margin-top:14px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;}
      .audit5s-area-evolution h4{font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
      .audit5s-evo-controls{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-bottom:12px;}
      .audit5s-evo-controls select{background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:9px 10px;font-family:inherit;font-size:13px;}
      .audit5s-evo-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 12px;}
      .audit5s-evo-kpi{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;}
      .audit5s-evo-kpi strong{display:block;font-family:'Barlow Condensed',sans-serif;font-size:24px;line-height:1;}
      .audit5s-evo-kpi span{display:block;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px;}
      .audit5s-line-chart{width:100%;height:190px;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.01));border:1px solid var(--border);border-radius:12px;overflow:hidden;}
      .audit5s-evo-table{margin-top:12px;border:1px solid var(--border);border-radius:10px;overflow:hidden;}
      .audit5s-evo-row{display:grid;grid-template-columns:86px 1fr 64px 64px;gap:8px;align-items:center;padding:9px 10px;border-bottom:1px solid var(--border);font-size:12px;}
      .audit5s-evo-row:last-child{border-bottom:0;}
      .audit5s-evo-head{background:var(--surface);color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;}
      .audit5s-trend-up{color:var(--green);font-weight:800;}.audit5s-trend-down{color:var(--red);font-weight:800;}.audit5s-trend-flat{color:var(--muted);font-weight:800;}
      .audit5s-s-bars{display:grid;gap:7px;margin-top:12px;}
      .audit5s-s-bar-row{display:grid;grid-template-columns:72px 1fr 46px;gap:8px;align-items:center;font-size:11px;}
      .audit5s-s-track{height:8px;background:var(--bg);border-radius:10px;overflow:hidden;border:1px solid var(--border);}
      .audit5s-s-fill{height:100%;border-radius:10px;background:var(--accent);transition:width .3s ease;}
      .audit5s-empty-evo{color:var(--muted);font-size:12px;text-align:center;padding:22px;}
      @media(max-width:720px){.audit5s-evo-controls{grid-template-columns:1fr}.audit5s-evo-summary{grid-template-columns:1fr 1fr}.audit5s-evo-row{grid-template-columns:72px 1fr 52px 52px;font-size:11px}.audit5s-line-chart{height:170px}}
    `;
    document.head.appendChild(style);
  }

  function getAreas(history){
    return Array.from(new Set(history.map(item => item.area || 'Não informado'))).sort((a,b) => a.localeCompare(b, 'pt-BR'));
  }

  function trendClass(delta){
    if(delta > 0.2) return 'audit5s-trend-up';
    if(delta < -0.2) return 'audit5s-trend-down';
    return 'audit5s-trend-flat';
  }

  function trendLabel(delta){
    if(delta > 0.2) return '+' + delta.toFixed(1).replace('.', ',') + ' pts';
    if(delta < -0.2) return delta.toFixed(1).replace('.', ',') + ' pts';
    return 'estável';
  }

  function average(values){
    const arr = values.filter(v => Number.isFinite(v));
    return arr.length ? arr.reduce((a,b) => a + b, 0) / arr.length : 0;
  }

  function classification(score){
    const n = Number(score) || 0;
    if(n <= 60) return 'Crítico';
    if(n <= 75) return 'Baixo';
    if(n <= 85) return 'Médio';
    if(n <= 95) return 'Bom';
    return 'Excelência';
  }

  function colorForScore(score){
    const n = Number(score) || 0;
    if(n <= 60) return '#e05252';
    if(n <= 75) return '#f97316';
    if(n <= 85) return '#f0a500';
    if(n <= 95) return '#3a7bd5';
    return '#3ecf72';
  }

  function buildLineChart(items){
    if(items.length < 2){
      return '<div class="audit5s-empty-evo">É necessário ter pelo menos 2 auditorias salvas nesta área para visualizar a evolução.</div>';
    }

    const width = 640;
    const height = 190;
    const pad = {top:20,right:22,bottom:34,left:38};
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const scores = items.map(item => Number(item.score) || 0);
    const minY = Math.max(0, Math.floor((Math.min.apply(null, scores) - 8) / 10) * 10);
    const maxY = Math.min(100, Math.ceil((Math.max.apply(null, scores) + 8) / 10) * 10 || 100);
    const range = Math.max(1, maxY - minY);

    function x(i){ return pad.left + (items.length === 1 ? plotW / 2 : i * (plotW / (items.length - 1))); }
    function y(score){ return pad.top + (maxY - score) / range * plotH; }

    const points = items.map((item, i) => ({x:x(i), y:y(Number(item.score)||0), score:Number(item.score)||0, date:new Date(item.date)}));
    const poly = points.map(p => `${p.x},${p.y}`).join(' ');
    const area = `${pad.left},${pad.top + plotH} ${poly} ${pad.left + plotW},${pad.top + plotH}`;
    const grid = [0,25,50,75,100].filter(v => v >= minY && v <= maxY).map(v => {
      const gy = y(v);
      return `<line x1="${pad.left}" y1="${gy}" x2="${pad.left + plotW}" y2="${gy}" stroke="rgba(255,255,255,.12)" stroke-dasharray="4 4"/><text x="${pad.left - 8}" y="${gy + 4}" text-anchor="end" fill="currentColor" opacity=".65" font-size="10">${v}%</text>`;
    }).join('');
    const circles = points.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${colorForScore(p.score)}"><title>${p.date.toLocaleDateString('pt-BR')} — ${p.score.toFixed(1)}%</title></circle>`).join('');
    const labels = points.map((p, i) => {
      if(i !== 0 && i !== points.length - 1 && items.length > 5) return '';
      return `<text x="${p.x}" y="${height - 12}" text-anchor="middle" fill="currentColor" opacity=".7" font-size="9">${p.date.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</text>`;
    }).join('');

    return `
      <svg class="audit5s-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução da pontuação 5S por área">
        <rect x="0" y="0" width="${width}" height="${height}" fill="transparent"/>
        <g color="var(--muted)">${grid}</g>
        <polygon points="${area}" fill="rgba(240,165,0,.12)"/>
        <polyline points="${poly}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${circles}
        <g>${labels}</g>
      </svg>
    `;
  }

  function buildSBars(items){
    if(!items.length) return '';
    const latest = items[items.length - 1];
    const previous = items.length > 1 ? items[items.length - 2] : null;
    const keys = Object.keys(S_LABELS);

    return `
      <div class="audit5s-s-bars">
        ${keys.map(key => {
          const current = Number(latest.scoresByS && latest.scoresByS[key]) || 0;
          const prev = previous ? Number(previous.scoresByS && previous.scoresByS[key]) || 0 : current;
          const delta = current - prev;
          return `
            <div class="audit5s-s-bar-row">
              <div>${S_LABELS[key]}</div>
              <div class="audit5s-s-track"><div class="audit5s-s-fill" style="width:${Math.max(0, Math.min(100, current))}%;background:${colorForScore(current)}"></div></div>
              <div class="${trendClass(delta)}">${current.toFixed(0)}%</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function ensureEvolutionPanel(){
    ensureStyles();
    let panel = document.getElementById('audit5sAreaEvolution');
    if(panel) return panel;

    const dashboard = document.getElementById('audit5sDashboard');
    const host = dashboard || document.querySelector('#screen-dashboard .container') || document.querySelector('#screen-results .container') || document.querySelector('.container') || document.body;

    panel = document.createElement('section');
    panel.id = 'audit5sAreaEvolution';
    panel.className = 'audit5s-area-evolution';
    panel.innerHTML = `
      <h4>Evolução por área</h4>
      <div class="audit5s-evo-controls">
        <select id="audit5sAreaSelect" aria-label="Selecionar área para evolução"></select>
        <button type="button" class="audit5s-mini-btn" id="audit5sRefreshEvolution">Atualizar</button>
      </div>
      <div id="audit5sAreaEvolutionContent"></div>
    `;

    if(dashboard){
      dashboard.appendChild(panel);
    }else{
      host.appendChild(panel);
    }

    panel.querySelector('#audit5sAreaSelect').addEventListener('change', renderEvolution);
    panel.querySelector('#audit5sRefreshEvolution').addEventListener('click', renderEvolution);
    return panel;
  }

  function renderEvolution(){
    const panel = ensureEvolutionPanel();
    const select = panel.querySelector('#audit5sAreaSelect');
    const content = panel.querySelector('#audit5sAreaEvolutionContent');
    const history = getHistory().sort((a,b) => new Date(a.date) - new Date(b.date));
    const areas = getAreas(history);
    const current = select.value;

    if(!areas.length){
      select.innerHTML = '<option value="">Nenhuma área salva</option>';
      content.innerHTML = '<div class="audit5s-empty-evo">Salve auditorias no histórico para acompanhar a evolução por área.</div>';
      return;
    }

    select.innerHTML = areas.map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`).join('');
    if(current && areas.includes(current)) select.value = current;

    const area = select.value || areas[0];
    const items = history.filter(item => (item.area || 'Não informado') === area);
    const first = items[0];
    const latest = items[items.length - 1];
    const previous = items.length > 1 ? items[items.length - 2] : null;
    const deltaStart = latest && first ? (Number(latest.score)||0) - (Number(first.score)||0) : 0;
    const deltaPrev = latest && previous ? (Number(latest.score)||0) - (Number(previous.score)||0) : 0;
    const avg = average(items.map(item => Number(item.score)));

    content.innerHTML = `
      <div class="audit5s-evo-summary">
        <div class="audit5s-evo-kpi"><strong>${(latest ? Number(latest.score||0) : 0).toFixed(1).replace('.', ',')}%</strong><span>Última nota</span></div>
        <div class="audit5s-evo-kpi"><strong class="${trendClass(deltaPrev)}">${trendLabel(deltaPrev)}</strong><span>Vs. anterior</span></div>
        <div class="audit5s-evo-kpi"><strong>${avg.toFixed(1).replace('.', ',')}%</strong><span>Média da área</span></div>
      </div>
      ${buildLineChart(items)}
      ${buildSBars(items)}
      <div class="audit5s-evo-table">
        <div class="audit5s-evo-row audit5s-evo-head"><div>Data</div><div>Modo</div><div>Score</div><div>Status</div></div>
        ${items.slice().reverse().map(item => `
          <div class="audit5s-evo-row">
            <div>${new Date(item.date).toLocaleDateString('pt-BR')}</div>
            <div>${escapeHtml(item.modeName || (item.mode === 'prod' ? 'Produção' : 'ADM / Office'))}</div>
            <div class="${trendClass(Number(item.score || 0) - avg)}">${Number(item.score || 0).toFixed(1).replace('.', ',')}%</div>
            <div>${classification(item.score)}</div>
          </div>
        `).join('')}
      </div>
      <div class="audit5s-small" style="margin-top:8px;">Evolução desde a primeira auditoria: <strong class="${trendClass(deltaStart)}">${trendLabel(deltaStart)}</strong></div>
    `;
  }

  function patchHistoryRender(){
    if(window.AUDIT5S_HISTORY && typeof window.AUDIT5S_HISTORY.renderDashboard === 'function' && !window.AUDIT5S_HISTORY.__evolutionPatched){
      const original = window.AUDIT5S_HISTORY.renderDashboard;
      window.AUDIT5S_HISTORY.renderDashboard = function(){
        const result = original.apply(this, arguments);
        setTimeout(renderEvolution, 80);
        return result;
      };
      window.AUDIT5S_HISTORY.__evolutionPatched = true;
    }
  }

  function apply(){
    patchHistoryRender();
    renderEvolution();
  }

  function observe(){
    let timer = null;
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(apply, 250);
    });
    obs.observe(document.documentElement, {childList:true, subtree:true});
  }

  window.AUDIT5S_EVOLUTION = { renderEvolution, getHistory };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { apply(); observe(); });
  }else{
    apply(); observe();
  }

  window.addEventListener('load', apply);
})();
