// ─── LANDING CONTROLS ───
function openSim(e) {
  if (e) e.preventDefault();
  document.getElementById('simulator-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  eveCalc();
}

function closeSim() {
  document.getElementById('simulator-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSim(); });

function bindEvents() {
  document.querySelectorAll('.js-open-sim').forEach(el => {
    el.addEventListener('click', openSim);
  });

  document.querySelector('.btn-close')?.addEventListener('click', closeSim);

  document.querySelectorAll('.eve-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => eveTab(tab.dataset.tab));
  });

  document.querySelectorAll('.eve-input, .eve-range').forEach(input => {
    input.addEventListener('input', () => eveCalc());
  });

  document.querySelector('[data-action="save"]')?.addEventListener('click', saveScenario);
  document.querySelector('[data-action="export"]')?.addEventListener('click', exportCsv);
  document.querySelector('[data-action="pdf"]')?.addEventListener('click', exportPdfReport);
  document.querySelector('[data-action="clear"]')?.addEventListener('click', clearHistory);
}

// ─── SIMULATOR LOGIC ───
let eveChartC = null, eveChartB = null, eveChartO = null, eveChartE = null, eveChartBs = null;
let lastResult = null;

function n(id) { return parseFloat(document.getElementById(id).value) || 0; }
function fmt(v) { return 'R$\u00a0' + v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
function fmtp(v) { return v.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + '%'; }
function fmtNumber(v, digits = 4) { return Number(v).toLocaleString('pt-BR', {minimumFractionDigits: digits, maximumFractionDigits: digits}); }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function updateTrack(el) {
  const pct = ((+el.value - +el.min) / (+el.max - +el.min) * 100).toFixed(1) + '%';
  el.style.setProperty('--pct', pct);
}

function eveTab(t) {
  const tabs = ['pricing','cenarios','break','otimizacao','economics','blackscholes'];
  document.querySelectorAll('.eve-tab').forEach((b, i) => {
    b.classList.toggle('active', tabs[i] === t);
  });
  document.querySelectorAll('.eve-panel-block').forEach(p => p.classList.remove('active'));
  document.getElementById('epanel-' + t).classList.add('active');
  eveCalc();
}

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#081428',
      borderColor: 'rgba(0,180,255,0.3)',
      borderWidth: 1,
      titleColor: '#00b4ff',
      bodyColor: '#e8f4ff',
      padding: 10,
      callbacks: { label: ctx => ' ' + ctx.dataset.label + ': R$' + ctx.parsed.y.toLocaleString('pt-BR') }
    }
  },
  scales: {
    x: { grid: { color: 'rgba(0,180,255,0.04)' }, ticks: { color: '#6a8aaa', font: { size: 11, family: 'DM Mono' } } },
    y: { grid: { color: 'rgba(0,180,255,0.04)' }, ticks: { color: '#6a8aaa', font: { size: 11, family: 'DM Mono' }, callback: v => 'R$' + v.toLocaleString('pt-BR') } }
  }
};

function eveCalc() {
  const cmv = n('cmv'), fixo = n('fixo');
  const impostos = n('impostos') / 100;
  const margem = n('margem') / 100;
  const descPct = n('desconto') / 100;
  const comissao = n('comissao') / 100;
  const takeRate = impostos + comissao;

  document.getElementById('v-impostos').textContent = fmtp(n('impostos'));
  document.getElementById('v-margem').textContent = fmtp(n('margem'));
  document.getElementById('v-desconto').textContent = fmtp(n('desconto'));
  document.getElementById('v-comissao').textContent = fmtp(n('comissao'));
  const elasticidadeEl = document.getElementById('v-elasticidade');
  if (elasticidadeEl) elasticidadeEl.textContent = n('elasticidade').toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + 'x';
  const churnEl = document.getElementById('v-churn');
  if (churnEl) churnEl.textContent = fmtp(n('churn'));
  const bsRateEl = document.getElementById('v-bs-rate');
  if (bsRateEl) bsRateEl.textContent = fmtp(n('bs-rate'));
  const bsVolEl = document.getElementById('v-bs-vol');
  if (bsVolEl) bsVolEl.textContent = fmtp(n('bs-vol'));
  const bsDividendEl = document.getElementById('v-bs-dividend');
  if (bsDividendEl) bsDividendEl.textContent = fmtp(n('bs-dividend'));

  document.querySelectorAll('input.eve-range').forEach(updateTrack);

  const custoTotal = cmv + fixo;
  const divisor = 1 - margem - impostos - comissao;
  const preco = divisor > 0 ? custoTotal / divisor : 0;
  const precoDesc = preco * (1 - descPct);
  const precoMinLucroZero = takeRate < 1 ? custoTotal / (1 - takeRate) : 0;
  const lucro = preco - custoTotal - preco * impostos - preco * comissao;
  const lucroDesc = precoDesc - custoTotal - precoDesc * impostos - precoDesc * comissao;
  const margemReal = preco > 0 ? (lucroDesc / precoDesc * 100) : 0;
  const markup = custoTotal > 0 ? ((preco / custoTotal) - 1) * 100 : 0;
  const descLimite = preco > 0 && precoMinLucroZero > 0 ? clamp((1 - (precoMinLucroZero / preco)) * 100, 0, 100) : 0;

  document.getElementById('m-preco').textContent = fmt(preco);
  document.getElementById('m-desc').textContent = fmt(precoDesc);
  document.getElementById('m-desc-sub').textContent = fmtp(n('desconto')) + ' off';
  document.getElementById('m-margem-real').textContent = fmtp(margemReal);
  document.getElementById('m-lucro').textContent = fmt(lucroDesc);
  document.getElementById('m-markup').textContent = fmtp(markup);
  document.getElementById('m-take-rate').textContent = fmtp(takeRate * 100);
  document.getElementById('m-preco-min').textContent = fmt(precoMinLucroZero);
  document.getElementById('m-desc-limite').textContent = fmtp(descLimite);

  const pill = document.getElementById('m-margem-pill');
  if (margemReal >= n('margem')) {
    pill.innerHTML = '<span class="eve-pill green">meta atingida</span>';
  } else if (margemReal > 0) {
    pill.innerHTML = '<span class="eve-pill amber">abaixo da meta</span>';
  } else {
    pill.innerHTML = '<span class="eve-pill red">prejuízo</span>';
  }

  const barColors = ['#00b4ff', '#354a62', '#ff4d6a', '#ffb340', '#00e5a0'];
  const items = [
    { label: 'CMV', val: cmv, color: barColors[0], pct: preco > 0 ? cmv/preco*100 : 0 },
    { label: 'Fixo', val: fixo, color: barColors[1], pct: preco > 0 ? fixo/preco*100 : 0 },
    { label: 'Impostos', val: preco*impostos, color: barColors[2], pct: impostos*100 },
    { label: 'Comissão', val: preco*comissao, color: barColors[3], pct: comissao*100 },
    { label: 'Lucro', val: lucro, color: barColors[4], pct: preco > 0 ? lucro/preco*100 : 0 },
  ];
  document.getElementById('eve-bars').innerHTML = items.map(it => `
    <div class="eve-bar-row">
      <span class="bl">${it.label}</span>
      <div class="eve-bar-track"><div class="eve-bar-fill" style="width:${Math.max(0,it.pct).toFixed(1)}%;background:${it.color}"></div></div>
      <span class="bv">${fmt(it.val)}</span>
      <span class="bp">${fmtp(it.pct)}</span>
    </div>`).join('');

  const volume = n('volume') || 200;
  const cenarios = [0, 5, 10, 15, 20, 25].map(d => {
    const p = preco * (1 - d/100);
    const luc = p - custoTotal - p*impostos - p*comissao;
    const mg = p > 0 ? luc/p*100 : 0;
    return { desc: d, preco: p, margem: mg, lucro: luc, receita: p*volume, lucroTotal: luc*volume };
  });

  const tbody = document.getElementById('eve-tbody-cenarios');
  if (tbody) {
    tbody.innerHTML = cenarios.map((c, i) => `
      <tr style="${i===0 ? 'background: rgba(0,180,255,0.04);' : ''}">
        <td style="${i===0 ? 'color:var(--cyan);font-weight:500' : ''}">${i===0 ? 'Sem desconto' : c.desc+'% off'}</td>
        <td class="num">${fmt(c.preco)}</td>
        <td class="num" style="color:var(--muted)">${c.desc > 0 ? fmtp(c.desc) : '—'}</td>
        <td class="num" style="color:${c.margem >= n('margem') ? 'var(--green)' : c.margem > 0 ? 'var(--amber)' : 'var(--red)'}">${fmtp(c.margem)}</td>
        <td class="num">${fmt(c.receita)}</td>
        <td class="num">${fmt(c.lucroTotal)}</td>
      </tr>`).join('');
  }

  const ctx1 = document.getElementById('eve-chart-cenarios');
  if (ctx1 && window.Chart && document.getElementById('epanel-cenarios').classList.contains('active')) {
    if (eveChartC) eveChartC.destroy();
    eveChartC = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: cenarios.map(c => c.desc === 0 ? 'Sem desc.' : c.desc + '%'),
        datasets: [
          { label: 'Receita', data: cenarios.map(c => Math.round(c.receita)), backgroundColor: 'rgba(0,180,255,0.2)', borderColor: '#00b4ff', borderWidth: 1 },
          { label: 'Lucro', data: cenarios.map(c => Math.round(c.lucroTotal)), backgroundColor: 'rgba(0,229,160,0.2)', borderColor: '#00e5a0', borderWidth: 1 }
        ]
      },
      options: chartDefaults
    });
  }

  const cfTotal = n('cf-total');
  const mc = preco - cmv - preco*impostos - preco*comissao;
  const beUnits = mc > 0 ? Math.ceil(cfTotal / mc) : 0;
  const beReceita = beUnits * preco;
  const breakPts = [...new Set(Array.from({length: 11}, (_, i) => Math.round(beUnits * i / 5)))];
  const breakReceita = breakPts.map(q => Math.round(q * preco));
  const breakCustos = breakPts.map(q => Math.round(cfTotal + q * (cmv + preco*impostos + preco*comissao)));

  const beEl = document.getElementById('be-units');
  if (beEl) beEl.textContent = beUnits.toLocaleString('pt-BR');
  const brEl = document.getElementById('be-receita');
  if (brEl) brEl.textContent = fmt(beReceita);
  const bmEl = document.getElementById('be-mc');
  if (bmEl) bmEl.textContent = fmt(mc);

  const ctx2 = document.getElementById('eve-chart-break');
  if (ctx2 && window.Chart && document.getElementById('epanel-break').classList.contains('active')) {
    if (eveChartB) eveChartB.destroy();
    eveChartB = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: breakPts,
        datasets: [
          { label: 'Receita', data: breakReceita, borderColor: '#00b4ff', backgroundColor: 'rgba(0,180,255,0.06)', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#00b4ff' },
          { label: 'Custos totais', data: breakCustos, borderColor: '#ff4d6a', backgroundColor: 'rgba(255,77,106,0.06)', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#ff4d6a' }
        ]
      },
      options: { ...chartDefaults, scales: { ...chartDefaults.scales, x: { ...chartDefaults.scales.x, title: { display: true, text: 'unidades', color: '#6a8aaa', font: { size: 11 } } } } }
    });
  }

  const opt = calcOptimization({ preco, cmv, fixo, impostos, comissao, margem });
  renderOptimization(opt, margem);
  const economics = calcEconomics({ preco, cmv, impostos, comissao, mc });
  renderEconomics(economics, { margemReal, lucroDesc, beUnits, preco, mc, descLimite, opt });
  const blackScholes = calcBlackScholes();
  renderBlackScholes(blackScholes);
  lastResult = {
    preco, precoDesc, margemReal, lucroDesc, beUnits, beReceita, mc,
    cenarios,
    breakEven: { cfTotal, pts: breakPts, receita: breakReceita, custos: breakCustos },
    opt,
    economics,
    blackScholes
  };
}

function calcOptimization(base) {
  const minInput = n('preco-minimo');
  const maxInput = n('preco-maximo');
  const precoMin = Math.max(0, Math.min(minInput, maxInput));
  const precoMax = Math.max(precoMin + 1, Math.max(minInput, maxInput));
  const demandaBase = Math.max(1, n('demanda-base') || n('volume') || 1);
  const elasticidade = Math.max(0.1, n('elasticidade') || 1);
  const concorrente = n('preco-concorrente') || base.preco || 1;
  const capacidade = Math.max(1, n('capacidade') || demandaBase);
  const custoTotal = base.cmv + base.fixo;
  const steps = 16;
  const rows = Array.from({ length: steps + 1 }, (_, i) => {
    const p = precoMin + ((precoMax - precoMin) * i / steps);
    const demandaTeorica = demandaBase * Math.pow((base.preco || concorrente || p) / Math.max(1, p), elasticidade);
    const competitividade = concorrente > 0 ? clamp(1 + ((concorrente - p) / concorrente) * 0.35, 0.65, 1.35) : 1;
    const demanda = Math.round(clamp(demandaTeorica * competitividade, 0, capacidade));
    const lucroUn = p - custoTotal - p * base.impostos - p * base.comissao;
    const receita = p * demanda;
    const lucroTotal = lucroUn * demanda;
    const margem = p > 0 ? (lucroUn / p) * 100 : 0;
    return { preco: p, demanda, receita, lucroTotal, margem };
  });
  const best = rows.reduce((acc, row) => row.lucroTotal > acc.lucroTotal ? row : acc, rows[0]);
  return { rows, best, concorrente };
}

function renderOptimization(opt, margemAlvo) {
  const best = opt.best || { preco: 0, demanda: 0, lucroTotal: 0 };
  const elPreco = document.getElementById('opt-preco');
  if (!elPreco) return;
  elPreco.textContent = fmt(best.preco);
  document.getElementById('opt-lucro').textContent = fmt(best.lucroTotal);
  document.getElementById('opt-demanda').textContent = best.demanda.toLocaleString('pt-BR');
  const tbody = document.getElementById('eve-tbody-otimizacao');
  if (tbody) {
    tbody.innerHTML = opt.rows.map(row => `
      <tr style="${row.preco === best.preco ? 'background: rgba(0,180,255,0.04);' : ''}">
        <td style="${row.preco === best.preco ? 'color:var(--cyan);font-weight:500' : ''}">${fmt(row.preco)}</td>
        <td class="num">${row.demanda.toLocaleString('pt-BR')}</td>
        <td class="num">${fmt(row.receita)}</td>
        <td class="num" style="color:${row.lucroTotal >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(row.lucroTotal)}</td>
        <td class="num" style="color:${row.margem >= margemAlvo * 100 ? 'var(--green)' : row.margem > 0 ? 'var(--amber)' : 'var(--red)'}">${fmtp(row.margem)}</td>
      </tr>`).join('');
  }
  const ctx = document.getElementById('eve-chart-otimizacao');
  if (ctx && window.Chart && document.getElementById('epanel-otimizacao').classList.contains('active')) {
    if (eveChartO) eveChartO.destroy();
    eveChartO = new Chart(ctx, {
      type: 'line',
      data: {
        labels: opt.rows.map(r => 'R$ ' + Math.round(r.preco)),
        datasets: [
          { label: 'Receita', data: opt.rows.map(r => Math.round(r.receita)), borderColor: '#00b4ff', backgroundColor: 'rgba(0,180,255,0.06)', fill: true, tension: 0.28, pointRadius: 2 },
          { label: 'Lucro', data: opt.rows.map(r => Math.round(r.lucroTotal)), borderColor: '#00e5a0', backgroundColor: 'rgba(0,229,160,0.06)', fill: true, tension: 0.28, pointRadius: 2 }
        ]
      },
      options: chartDefaults
    });
  }
}

function calcEconomics(base) {
  const cac = n('cac');
  const ticket = n('ticket-mensal') || base.preco;
  const churn = Math.max(0.001, n('churn') / 100);
  const novosClientes = Math.max(0, n('novos-clientes'));
  const meses = clamp(Math.round(n('meses-proj') || 12), 3, 36);
  const margemContribPct = ticket > 0 ? clamp(base.mc / base.preco, -1, 1) : 0;
  const contribuicaoMensal = ticket * margemContribPct;
  const ltv = contribuicaoMensal / churn;
  const ltvCac = cac > 0 ? ltv / cac : 0;
  const payback = contribuicaoMensal > 0 ? cac / contribuicaoMensal : 0;
  let clientesAtivos = 0;
  let acumulado = -cac * novosClientes;
  const projection = Array.from({ length: meses }, (_, i) => {
    clientesAtivos = clientesAtivos * (1 - churn) + novosClientes;
    const contribuicao = clientesAtivos * contribuicaoMensal;
    acumulado += contribuicao - (cac * novosClientes);
    return { mes: i + 1, clientesAtivos, contribuicao, acumulado };
  });
  return { cac, ticket, churn, contribuicaoMensal, ltv, ltvCac, payback, projection };
}

function renderEconomics(economics, context) {
  const ltvEl = document.getElementById('ue-ltv');
  if (!ltvEl) return;
  ltvEl.textContent = fmt(economics.ltv);
  document.getElementById('ue-ltv-cac').textContent = economics.cac > 0 ? economics.ltvCac.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + 'x' : '—';
  document.getElementById('ue-payback').textContent = economics.payback > 0 ? economics.payback.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) : '—';

  const risks = [
    {
      title: 'Margem',
      text: context.margemReal < 0 ? 'Preço com desconto gera prejuízo unitário.' : context.margemReal < n('margem') ? 'Preço com desconto fica abaixo da margem alvo.' : 'Margem operacional dentro da meta.'
    },
    {
      title: 'Comercial',
      text: economics.ltvCac < 1 ? 'LTV/CAC inviável: aquisição destrói valor.' : economics.ltvCac < 3 ? 'LTV/CAC aceitável, mas com pouca folga.' : 'LTV/CAC saudável para escala comercial.'
    },
    {
      title: 'Capacidade',
      text: context.opt.best.demanda >= n('capacidade') ? 'Preço ótimo bate na capacidade. Considere subir preço ou expandir oferta.' : 'Demanda ótima abaixo da capacidade configurada.'
    },
    {
      title: 'Desconto',
      text: context.descLimite < n('desconto') ? 'Desconto atual supera a folga econômica calculada.' : 'Desconto atual preserva lucro positivo.'
    }
  ];
  document.getElementById('risk-list').innerHTML = risks.map(r => `<div class="risk-item"><strong>${r.title}</strong>${r.text}</div>`).join('');
  renderHistory();

  const ctx = document.getElementById('eve-chart-economics');
  if (ctx && window.Chart && document.getElementById('epanel-economics').classList.contains('active')) {
    if (eveChartE) eveChartE.destroy();
    eveChartE = new Chart(ctx, {
      type: 'line',
      data: {
        labels: economics.projection.map(p => 'M' + p.mes),
        datasets: [
          { label: 'Contribuição', data: economics.projection.map(p => Math.round(p.contribuicao)), borderColor: '#00b4ff', backgroundColor: 'rgba(0,180,255,0.06)', fill: true, tension: 0.3, pointRadius: 2 },
          { label: 'Acumulado', data: economics.projection.map(p => Math.round(p.acumulado)), borderColor: '#ffb340', backgroundColor: 'rgba(255,179,64,0.06)', fill: true, tension: 0.3, pointRadius: 2 }
        ]
      },
      options: chartDefaults
    });
  }
}

function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function normalCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * z);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * erf);
}

function calcBlackScholes() {
  const s = Math.max(0.01, n('bs-spot'));
  const k = Math.max(0.01, n('bs-strike'));
  const t = Math.max(0.001, n('bs-time'));
  const r = n('bs-rate') / 100;
  const sigma = Math.max(0.0001, n('bs-vol') / 100);
  const q = n('bs-dividend') / 100;
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(s / k) + (r - q + 0.5 * sigma * sigma) * t) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const discountQ = Math.exp(-q * t);
  const discountR = Math.exp(-r * t);
  const nd1 = normalCdf(d1);
  const nd2 = normalCdf(d2);
  const call = s * discountQ * nd1 - k * discountR * nd2;
  const put = k * discountR * normalCdf(-d2) - s * discountQ * normalCdf(-d1);
  const gamma = discountQ * normalPdf(d1) / (s * sigma * sqrtT);
  const vega = s * discountQ * normalPdf(d1) * sqrtT / 100;
  const thetaCall = (
    -(s * discountQ * normalPdf(d1) * sigma) / (2 * sqrtT)
    - r * k * discountR * nd2
    + q * s * discountQ * nd1
  ) / 365;
  const thetaPut = (
    -(s * discountQ * normalPdf(d1) * sigma) / (2 * sqrtT)
    + r * k * discountR * normalCdf(-d2)
    - q * s * discountQ * normalCdf(-d1)
  ) / 365;
  const rhoCall = k * t * discountR * nd2 / 100;
  const rhoPut = -k * t * discountR * normalCdf(-d2) / 100;
  const deltaCall = discountQ * nd1;
  const deltaPut = discountQ * (nd1 - 1);
  const intrinsicCall = Math.max(0, s - k);
  const intrinsicPut = Math.max(0, k - s);
  const moneyness = s / k;
  const status = moneyness > 1.03 ? 'ITM call' : moneyness < 0.97 ? 'OTM call' : 'ATM';
  const payoffRows = Array.from({ length: 17 }, (_, i) => {
    const spot = k * (0.5 + i * 0.0625);
    return {
      spot,
      call: Math.max(0, spot - k) - call,
      put: Math.max(0, k - spot) - put
    };
  });
  return {
    s, k, t, r, sigma, q, d1, d2, call, put, gamma, vega,
    thetaCall, thetaPut, rhoCall, rhoPut, deltaCall, deltaPut,
    intrinsicCall, intrinsicPut, moneyness, status, payoffRows
  };
}

function renderBlackScholes(bs) {
  const callEl = document.getElementById('bs-call');
  if (!callEl) return;
  callEl.textContent = fmt(bs.call);
  document.getElementById('bs-put').textContent = fmt(bs.put);
  document.getElementById('bs-moneyness').textContent = fmtNumber(bs.moneyness, 3) + 'x';
  document.getElementById('bs-moneyness-sub').textContent = bs.status;
  document.getElementById('bs-delta').textContent = `${fmtNumber(bs.deltaCall, 3)} / ${fmtNumber(bs.deltaPut, 3)}`;
  document.getElementById('bs-gamma').textContent = fmtNumber(bs.gamma, 5);
  document.getElementById('bs-vega').textContent = fmt(bs.vega);
  document.getElementById('bs-theta').textContent = `${fmt(bs.thetaCall)} / ${fmt(bs.thetaPut)}`;
  document.getElementById('bs-rho').textContent = `${fmt(bs.rhoCall)} / ${fmt(bs.rhoPut)}`;
  document.getElementById('bs-intrinsic').textContent = `${fmt(bs.intrinsicCall)} / ${fmt(bs.intrinsicPut)}`;

  const ctx = document.getElementById('eve-chart-bs');
  if (ctx && window.Chart && document.getElementById('epanel-blackscholes').classList.contains('active')) {
    if (eveChartBs) eveChartBs.destroy();
    eveChartBs = new Chart(ctx, {
      type: 'line',
      data: {
        labels: bs.payoffRows.map(r => 'R$ ' + Math.round(r.spot)),
        datasets: [
          { label: 'Call payoff líquido', data: bs.payoffRows.map(r => r.call), borderColor: '#00e5a0', backgroundColor: 'rgba(0,229,160,0.06)', fill: true, tension: 0.15, pointRadius: 2 },
          { label: 'Put payoff líquido', data: bs.payoffRows.map(r => r.put), borderColor: '#ffb340', backgroundColor: 'rgba(255,179,64,0.06)', fill: true, tension: 0.15, pointRadius: 2 }
        ]
      },
      options: chartDefaults
    });
  }
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem('priceops-history') || '[]'); }
  catch (_) { return []; }
}

function saveScenario() {
  eveCalc();
  if (!lastResult) return;
  const row = {
    at: new Date().toLocaleString('pt-BR'),
    preco: lastResult.preco,
    margem: lastResult.margemReal,
    lucro: lastResult.lucroDesc,
    be: lastResult.beUnits
  };
  localStorage.setItem('priceops-history', JSON.stringify([row, ...getHistory()].slice(0, 10)));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem('priceops-history');
  renderHistory();
}

function renderHistory() {
  const tbody = document.getElementById('eve-history');
  if (!tbody) return;
  const rows = getHistory();
  tbody.innerHTML = rows.length ? rows.map(row => `
    <tr>
      <td>${row.at}</td>
      <td class="num">${fmt(row.preco)}</td>
      <td class="num">${fmtp(row.margem)}</td>
      <td class="num">${fmt(row.lucro)}</td>
      <td class="num">${Number(row.be).toLocaleString('pt-BR')}</td>
    </tr>`).join('') : '<tr><td colspan="5" style="color:var(--muted);">Nenhum cenário salvo.</td></tr>';
}

function exportCsv() {
  eveCalc();
  if (!lastResult) return;
  const rows = [
    ['metrica','valor'],
    ['preco_cheio', lastResult.preco.toFixed(2)],
    ['preco_com_desconto', lastResult.precoDesc.toFixed(2)],
    ['margem_real_pct', lastResult.margemReal.toFixed(2)],
    ['lucro_unitario', lastResult.lucroDesc.toFixed(2)],
    ['break_even_unidades', lastResult.beUnits],
    ['preco_otimo', lastResult.opt.best.preco.toFixed(2)],
    ['demanda_otima', lastResult.opt.best.demanda],
    ['lucro_maximo', lastResult.opt.best.lucroTotal.toFixed(2)],
    ['ltv', lastResult.economics.ltv.toFixed(2)],
    ['ltv_cac', lastResult.economics.ltvCac.toFixed(2)],
    ['payback_meses', lastResult.economics.payback.toFixed(2)],
    ['bs_call', lastResult.blackScholes.call.toFixed(4)],
    ['bs_put', lastResult.blackScholes.put.toFixed(4)],
    ['bs_delta_call', lastResult.blackScholes.deltaCall.toFixed(6)],
    ['bs_delta_put', lastResult.blackScholes.deltaPut.toFixed(6)],
    ['bs_gamma', lastResult.blackScholes.gamma.toFixed(6)],
    ['bs_vega', lastResult.blackScholes.vega.toFixed(6)],
    ['bs_theta_call_dia', lastResult.blackScholes.thetaCall.toFixed(6)],
    ['bs_theta_put_dia', lastResult.blackScholes.thetaPut.toFixed(6)]
  ];
  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'priceops-simulacao.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function reportRow(label, value) {
  return `<tr><th>${label}</th><td>${value}</td></tr>`;
}

function reportMetric(label, value, sub = '', primary = false) {
  return `
    <div class="eve-metric${primary ? ' primary' : ''}">
      <p class="mlabel">${label}</p>
      <p class="mvalue">${value}</p>
      <p class="msub">${sub}</p>
    </div>`;
}

function svgDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function chartSvg({ labels, datasets, type = 'line', width = 920, height = 300 }) {
  const pad = { left: 72, right: 24, top: 28, bottom: 48 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const allValues = datasets.flatMap(ds => ds.data);
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(1, ...allValues);
  const span = maxValue - minValue || 1;
  const y = value => pad.top + chartH - ((value - minValue) / span) * chartH;
  const x = index => labels.length <= 1 ? pad.left : pad.left + (index / (labels.length - 1)) * chartW;
  const barGroup = chartW / labels.length;
  const grid = Array.from({ length: 5 }, (_, i) => {
    const gy = pad.top + chartH * i / 4;
    const val = maxValue - span * i / 4;
    return `<line x1="${pad.left}" y1="${gy}" x2="${width - pad.right}" y2="${gy}" stroke="rgba(0,180,255,0.10)"/><text x="8" y="${gy + 4}" fill="#6a8aaa" font-size="11">R$ ${Math.round(val).toLocaleString('pt-BR')}</text>`;
  }).join('');
  const xLabels = labels.map((label, i) => `<text x="${x(i)}" y="${height - 16}" fill="#6a8aaa" font-size="11" text-anchor="middle">${label}</text>`).join('');
  const legend = datasets.map((ds, i) => `<circle cx="${pad.left + i * 150}" cy="14" r="4" fill="${ds.color}"/><text x="${pad.left + 10 + i * 150}" y="18" fill="#e8f4ff" font-size="12">${ds.label}</text>`).join('');
  const body = datasets.map((ds, dsIndex) => {
    if (type === 'bar') {
      const barW = Math.max(8, (barGroup - 12) / datasets.length);
      return ds.data.map((value, i) => {
        const bx = pad.left + i * barGroup + 6 + dsIndex * barW;
        const by = y(Math.max(0, value));
        const bh = Math.abs(y(value) - y(0));
        return `<rect x="${bx}" y="${by}" width="${barW - 2}" height="${Math.max(1, bh)}" rx="3" fill="${ds.fill || ds.color}" stroke="${ds.color}" stroke-width="1"/>`;
      }).join('');
    }
    const points = ds.data.map((value, i) => `${x(i)},${y(value)}`).join(' ');
    const area = `${pad.left},${y(0)} ${points} ${x(ds.data.length - 1)},${y(0)}`;
    return `<polygon points="${area}" fill="${ds.fill || 'transparent'}"/><polyline points="${points}" fill="none" stroke="${ds.color}" stroke-width="2.5"/>${ds.data.map((value, i) => `<circle cx="${x(i)}" cy="${y(value)}" r="3" fill="${ds.color}"/>`).join('')}`;
  }).join('');
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" rx="8" fill="#0a1830"/>
    ${grid}
    <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="rgba(0,180,255,0.20)"/>
    <line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="rgba(0,180,255,0.20)"/>
    ${body}
    ${xLabels}
    ${legend}
  </svg>`);
}

function chartImg(src, alt) {
  return `<div class="chart-wrap report-chart"><img src="${src}" alt="${alt}"></div>`;
}

function reportPanel(title, content) {
  return `<section class="eve-panel-block report-panel"><p class="eve-section-label">${title}</p>${content}</section>`;
}

function exportPdfReport() {
  eveCalc();
  if (!lastResult) return;
  const bs = lastResult.blackScholes;
  const generatedAt = new Date().toLocaleString('pt-BR');
  const cssHref = new URL('assets/css/styles.css', window.location.href).href;
  const scenarioChart = chartSvg({
    type: 'bar',
    labels: lastResult.cenarios.map(c => c.desc === 0 ? 'Sem desc.' : `${c.desc}%`),
    datasets: [
      { label: 'Receita', data: lastResult.cenarios.map(c => Math.round(c.receita)), color: '#00b4ff', fill: 'rgba(0,180,255,0.35)' },
      { label: 'Lucro', data: lastResult.cenarios.map(c => Math.round(c.lucroTotal)), color: '#00e5a0', fill: 'rgba(0,229,160,0.35)' }
    ]
  });
  const breakChart = chartSvg({
    labels: lastResult.breakEven.pts,
    datasets: [
      { label: 'Receita', data: lastResult.breakEven.receita, color: '#00b4ff', fill: 'rgba(0,180,255,0.10)' },
      { label: 'Custos totais', data: lastResult.breakEven.custos, color: '#ff4d6a', fill: 'rgba(255,77,106,0.10)' }
    ]
  });
  const optChart = chartSvg({
    labels: lastResult.opt.rows.map(r => `R$ ${Math.round(r.preco)}`),
    datasets: [
      { label: 'Receita', data: lastResult.opt.rows.map(r => Math.round(r.receita)), color: '#00b4ff', fill: 'rgba(0,180,255,0.10)' },
      { label: 'Lucro', data: lastResult.opt.rows.map(r => Math.round(r.lucroTotal)), color: '#00e5a0', fill: 'rgba(0,229,160,0.10)' }
    ]
  });
  const economicsChart = chartSvg({
    labels: lastResult.economics.projection.map(p => `M${p.mes}`),
    datasets: [
      { label: 'Contribuição', data: lastResult.economics.projection.map(p => Math.round(p.contribuicao)), color: '#00b4ff', fill: 'rgba(0,180,255,0.10)' },
      { label: 'Acumulado', data: lastResult.economics.projection.map(p => Math.round(p.acumulado)), color: '#ffb340', fill: 'rgba(255,179,64,0.10)' }
    ]
  });
  const bsChart = chartSvg({
    labels: bs.payoffRows.map(r => `R$ ${Math.round(r.spot)}`),
    datasets: [
      { label: 'Call payoff líquido', data: bs.payoffRows.map(r => r.call), color: '#00e5a0', fill: 'rgba(0,229,160,0.10)' },
      { label: 'Put payoff líquido', data: bs.payoffRows.map(r => r.put), color: '#ffb340', fill: 'rgba(255,179,64,0.10)' }
    ]
  });
  const scenarioRows = lastResult.cenarios.map((c, i) => `
    <tr>
      <td>${i === 0 ? 'Sem desconto' : `${c.desc}% off`}</td>
      <td class="num">${fmt(c.preco)}</td>
      <td class="num">${c.desc > 0 ? fmtp(c.desc) : '—'}</td>
      <td class="num">${fmtp(c.margem)}</td>
      <td class="num">${fmt(c.receita)}</td>
      <td class="num">${fmt(c.lucroTotal)}</td>
    </tr>`).join('');
  const optRows = lastResult.opt.rows.map(row => `
    <tr>
      <td>${fmt(row.preco)}</td>
      <td class="num">${row.demanda.toLocaleString('pt-BR')}</td>
      <td class="num">${fmt(row.receita)}</td>
      <td class="num">${fmt(row.lucroTotal)}</td>
      <td class="num">${fmtp(row.margem)}</td>
    </tr>`).join('');
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>PriceOps - Relatorio de Pricing</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${cssHref}">
<style>
  body { padding: 32px; overflow: visible; }
  .print-action { position: sticky; top: 16px; z-index: 10; margin-bottom: 16px; }
  @media print { body { padding: 0; } .print-action { display: none !important; } }
</style>
</head>
<body>
  <button class="eve-action print-action no-print" onclick="window.print()">Imprimir / salvar PDF</button>
  <div class="eve-wrap report-wrap">
    <div class="eve-header">
      <div class="eve-logo-dot"></div>
      <span class="eve-header-title">PriceOps — Relatório de Pricing</span>
      <span class="eve-header-sub">${generatedAt}</span>
    </div>
    <p class="report-meta">Relatório gerado localmente. Painéis de controle removidos; apenas valores e gráficos consolidados.</p>

    ${reportPanel('Pricing', `
      <div class="eve-metrics">
        ${reportMetric('Preço cheio', fmt(lastResult.preco), 'sem desconto', true)}
        ${reportMetric('Preço c/ desconto', fmt(lastResult.precoDesc), 'preço efetivo')}
        ${reportMetric('Margem real', fmtp(lastResult.margemReal), 'após desconto')}
        ${reportMetric('Lucro unitário', fmt(lastResult.lucroDesc), 'por unidade')}
        ${reportMetric('Margem contribuição', fmt(lastResult.mc), 'por unidade')}
        ${reportMetric('Break-even', lastResult.beUnits.toLocaleString('pt-BR'), 'unidades/mês')}
      </div>
    `)}

    ${reportPanel('Cenários', `
      <div class="table-scroll">
        <table class="eve-table">
          <thead><tr><th>Cenário</th><th class="num">Preço</th><th class="num">Desconto</th><th class="num">Margem</th><th class="num">Receita</th><th class="num">Lucro total</th></tr></thead>
          <tbody>${scenarioRows}</tbody>
        </table>
      </div>
      ${chartImg(scenarioChart, 'Gráfico de cenários')}
    `)}

    ${reportPanel('Break-even', `
      <div class="eve-metrics">
        ${reportMetric('Break-even (un.)', lastResult.beUnits.toLocaleString('pt-BR'), 'unidades/mês', true)}
        ${reportMetric('Break-even receita', fmt(lastResult.beReceita), 'faturamento mínimo')}
        ${reportMetric('Custo fixo mensal', fmt(lastResult.breakEven.cfTotal), 'base informada')}
      </div>
      ${chartImg(breakChart, 'Gráfico de break-even')}
    `)}

    ${reportPanel('Otimização', `
      <div class="eve-metrics">
        ${reportMetric('Preço ótimo', fmt(lastResult.opt.best.preco), 'maior lucro total', true)}
        ${reportMetric('Lucro máximo', fmt(lastResult.opt.best.lucroTotal), 'na demanda estimada')}
        ${reportMetric('Demanda ótima', lastResult.opt.best.demanda.toLocaleString('pt-BR'), 'unidades/mês')}
      </div>
      ${chartImg(optChart, 'Curva de receita e lucro por preço')}
      <div class="table-scroll">
        <table class="eve-table">
          <thead><tr><th>Preço</th><th class="num">Demanda</th><th class="num">Receita</th><th class="num">Lucro total</th><th class="num">Margem</th></tr></thead>
          <tbody>${optRows}</tbody>
        </table>
      </div>
    `)}

    ${reportPanel('Unit Economics', `
      <div class="eve-metrics">
        ${reportMetric('LTV', fmt(lastResult.economics.ltv), 'contribuição esperada', true)}
        ${reportMetric('LTV/CAC', `${fmtNumber(lastResult.economics.ltvCac, 2)}x`, 'saúde comercial')}
        ${reportMetric('Payback CAC', `${fmtNumber(lastResult.economics.payback, 2)} meses`, 'retorno de aquisição')}
        ${reportMetric('Contribuição mensal', fmt(lastResult.economics.contribuicaoMensal), 'por cliente')}
      </div>
      ${chartImg(economicsChart, 'Projeção de contribuição acumulada')}
      <div class="risk-list">${document.getElementById('risk-list')?.innerHTML || ''}</div>
    `)}

    ${reportPanel('Black-Scholes', `
      <div class="eve-metrics">
        ${reportMetric('Call teórica', fmt(bs.call), 'Black-Scholes-Merton', true)}
        ${reportMetric('Put teórica', fmt(bs.put), 'paridade call-put', true)}
        ${reportMetric('Moneyness', `${fmtNumber(bs.moneyness, 3)}x`, bs.status)}
        ${reportMetric('Delta call / put', `${fmtNumber(bs.deltaCall, 3)} / ${fmtNumber(bs.deltaPut, 3)}`, 'sensibilidade ao ativo')}
        ${reportMetric('Gamma', fmtNumber(bs.gamma, 5), 'convexidade')}
        ${reportMetric('Vega', fmt(bs.vega), 'por 1 p.p. de vol')}
        ${reportMetric('Theta call / put', `${fmt(bs.thetaCall)} / ${fmt(bs.thetaPut)}`, 'por dia')}
        ${reportMetric('Rho call / put', `${fmt(bs.rhoCall)} / ${fmt(bs.rhoPut)}`, 'por 1 p.p. de taxa')}
      </div>
      ${chartImg(bsChart, 'Payoff líquido de call e put')}
      <p class="report-note">Black-Scholes assume mercado contínuo, volatilidade constante, taxa livre de risco constante e exercício europeu.</p>
    `)}
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));<\/script>
</body>
</html>`;
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    alert('Popup bloqueado. Permita popups para salvar o relatorio em PDF.');
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

bindEvents();
eveCalc();
