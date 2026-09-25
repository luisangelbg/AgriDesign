/* AgriDesign — Block 6: result graphics gallery, style presets, batch export, multi-panel composer. */

(function () {
const SPLIT = new Set(['split_rcbd', 'split_crd', 'strip_rcbd', 'splitsplit_rcbd']);
let figs = [];          /* [{id, title, spec, api, host}] */
let builtFor = null;

/* The name of each preset is a getter, so the buttons speak the language in use. */
const PRESETS = {
  colour:  { get label() { return T('Colour (screen)', 'Color (pantalla)'); }, style: { theme: 'light', font: 'sans', grid: true, gridDash: false, axisBold: false, fontScale: 1, fsTitle: 1, fsAxis: 1, fsLabel: 1, palette: 'agri' } },   /* restores colour after "Greyscale print" */
  journal: { get label() { return T('Journal (black axes, no grid, Arial)', 'Revista (ejes negros, sin rejilla, Arial)'); }, style: { theme: 'journal', font: 'arial', grid: false, gridDash: false, axisBold: false, fontScale: 1.1, fsTitle: 1, fsAxis: 1, fsLabel: 1 } },
  serif:   { get label() { return T('Journal serif (Times)', 'Revista con serifas (Times)'); }, style: { theme: 'journal', font: 'times', grid: false, gridDash: false, axisBold: false, fontScale: 1.1, fsTitle: 1, fsAxis: 1, fsLabel: 1 } },
  grey:    { get label() { return T('Greyscale print', 'Impresión en escala de grises'); }, style: { theme: 'journal', font: 'arial', grid: false, gridDash: false, axisBold: false, fontScale: 1.1, fsTitle: 1, fsAxis: 1, fsLabel: 1, palette: 'greys' } },
  slides:  { get label() { return T('Presentation (large fonts)', 'Presentación (letras grandes)'); }, style: { theme: 'light', font: 'segoe', grid: true, gridDash: true, axisBold: true, fontScale: 1.5, fsTitle: 1.1, fsAxis: 1, fsLabel: 1 } },
  dark:    { get label() { return T('Dark background', 'Fondo oscuro'); }, style: { theme: 'dark', font: 'segoe', grid: true, gridDash: true, axisBold: false, fontScale: 1.2, fsTitle: 1, fsAxis: 1, fsLabel: 1 } },
};

function mount6(id, title, spec, group) {
  const wrap = mk('div', { class: 'fig6-wrap' });
  const host = mk('div', { id: 'fig6_' + id });
  const bar = mk('label', { class: 'checkbox-label fig6-pick' });
  const cb = mk('input', { type: 'checkbox', 'data-fig': id });
  bar.appendChild(cb); bar.appendChild(document.createTextNode(T('Add to multi-panel figure', 'Agregar a la figura de varios paneles')));
  wrap.appendChild(host); wrap.appendChild(bar);
  group.appendChild(wrap);
  const api = Fig.mount(host, spec);
  figs.push({ id, title, spec, api, host, cb });
}
function groupCard(container, title, hint) { const c = mk('div', { class: 'card' }); c.appendChild(mk('h2', null, title)); if (hint) c.appendChild(mk('p', { class: 'hint' }, hint)); container.appendChild(c); return c; }

function build() {
  const R = state.anova; if (!R) return;
  const host = el('gfxFigs'); host.innerHTML = ''; figs = [];
  Fig.registry && Object.keys(Fig.registry).filter(k => k.startsWith('fig6_')).forEach(k => delete Fig.registry[k]);
  const d = R.d, resp = R.resp, testName = PH.methods[R.method].name + ', α = ' + R.alpha;
  const ylab = resp + (R.transform ? ' (' + T(R.transform.label) + ')' : '');
  const respLabel = el('gfxYlab').value.trim() || ylab;

  /* --- treatment factors --- */
  d.factors.forEach(f => {
    const fc = DS.factorComparison(R, f);
    const c = groupCard(host, T(`Means of ${f}`, `Medias de ${f}`), T(`Letters from ${testName}; error: ${fc.err.label}. Four presentations of the same result — pick the one that suits the journal.`, `Letras de ${testName}; error: ${fc.err.label}. Cuatro maneras de presentar el mismo resultado: elige la que le convenga a la revista.`));
    const items = fc.means.map((m, i) => ({ label: m.label, mean: m.mean, se: m.se, letters: fc.cmp.letters[i], tq: S.qt(0.975, fc.err.df) }));
    mount6('bars_' + slug(f), T(`Means of ${f} (bars)`, `Medias de ${f} (barras)`), P5.meansLetters(items, { title: T(`${resp} by ${f}`, `${resp} por ${f}`), xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_bars', testName: PH.methods[R.method].name }), c);
    mount6('points_' + slug(f), T(`Means of ${f} (points)`, `Medias de ${f} (puntos)`), P5.meansLetters(items, { title: T(`${resp} by ${f}`, `${resp} por ${f}`), xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_points', testName: PH.methods[R.method].name, defaults: { style: 'points', includeZero: false, errorType: 'ci' } }), c);
    const groups = fc.means.map((m, i) => ({ label: m.label, values: fc.raw[i], letters: fc.cmp.letters[i] }));
    mount6('box_' + slug(f), T(`Box plot of ${f} with letters`, `Cajas de ${f} con letras`), P6.boxLetters(groups, { title: T(`${resp} by ${f} — distribution and groups`, `${resp} por ${f} — distribución y grupos`), xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_box', testName: PH.methods[R.method].name }), c);
    mount6('strip_' + slug(f), T(`Observations of ${f} with letters`, `Observaciones de ${f} con letras`), P6.stripLetters(groups, { title: T(`${resp} by ${f} — all plots`, `${resp} por ${f} — todas las parcelas`), xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_strip' }), c);
    /* differences with CI */
    const pairs = fc.cmp.pairs.map(p => { const half = p.crit != null ? p.crit : S.qt(0.975, fc.err.df) * p.se; return { label: `${fc.means[p.i].label} − ${fc.means[p.j].label}`, diff: p.diff, lo: p.diff - half, hi: p.diff + half, sig: !!p.sig }; });
    if (pairs.length) mount6('diff_' + slug(f), T(`Differences between ${f} means`, `Diferencias entre las medias de ${f}`), P6.diffCI(pairs, { title: T(`Pairwise differences of ${resp} between ${f} levels`, `Diferencias por pares de ${resp} entre los niveles de ${f}`), xlab: T('Difference (', 'Diferencia (') + respLabel + ')', fileName: slug(resp) + '_' + slug(f) + '_differences', note: T(`${PH.methods[R.method].name}: interval = difference ± critical value; intervals crossing 0 are not significant`, `${PH.methods[R.method].name}: el intervalo es la diferencia ± el valor crítico; los intervalos que cruzan el 0 no son significativos`) }), c);
    /* trend */
    const lv = R.levelsMap[f];
    if (lv.length >= 3 && lv.every(l => /^[+-]?\d+(\.\d+)?$/.test(l))) {
      const x = lv.map(Number), xs = R.recs.map(r => +r.f[f]), ys = R.recs.map(r => r.y);
      const pc = PH.polyContrasts(fc.means.map(m => ({ label: m.label, mean: m.mean, n: m.n })), x, fc.err.ms, fc.err.df, Math.min(3, x.length - 1));
      let deg = 0; pc.forEach((r, i) => { if (r.pF < R.alpha) deg = i + 1; });
      const pf = PH.polyFit(xs, ys, Math.max(1, deg));
      if (pf) {
        const b = pf.coef;
        const eq = `ŷ = ${b.map((v, i) => (i ? (v < 0 ? ' − ' : ' + ') : (v < 0 ? '−' : '')) + Math.abs(v).toPrecision(4) + (i ? (i === 1 ? '·x' : '·x' + '²³⁴'[i - 2]) : '')).join('')}   R² = ${pf.r2.toFixed(3)}`;
        let optimum = null; if (Math.max(1, deg) === 2 && b[2] !== 0) { const xo = -b[1] / (2 * b[2]); optimum = { x: xo, y: pf.fn(xo), kind: b[2] < 0 ? T('maximum', 'máxima') : T('minimum', 'mínima') }; }
        mount6('trend_' + slug(f), T(`Response curve of ${f}`, `Curva de respuesta de ${f}`), P5.trend(x, fc.means.map((m, i) => ({ mean: m.mean, se: m.se, letters: fc.cmp.letters[i] })), pf.fn, { title: T(`Response of ${resp} to ${f}`, `Respuesta de ${resp} a ${f}`), xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_curve', equation: eq, optimum }), c);
      }
    }
  });

  /* --- two-factor interactions --- */
  for (let i = 0; i < d.factors.length; i++) for (let j = i + 1; j < d.factors.length; j++) {
    const A = d.factors[i], B = d.factors[j];
    if (!R.terms.some(t => t.factors && t.factors.length === 2 && t.factors.includes(A) && t.factors.includes(B))) continue;
    const la = R.levelsMap[A], lb = R.levelsMap[B];
    const sl = DS.sliceLetters(R, A, B);
    const c = groupCard(host, T(`Interaction ${A} × ${B}`, `Interacción ${A} × ${B}`), T(`Letters in the line plot compare the levels of ${B} within each level of ${A} (residual / sub-plot error). ${SPLIT.has(R.design.id) ? 'Comparisons across main-plot levels need the pooled error shown in Block 5.' : 'The heat map and grouped bars compare all combinations together.'}`, `Las letras de la gráfica de líneas comparan los niveles de ${B} dentro de cada nivel de ${A} (error residual o de subparcela). ${SPLIT.has(R.design.id) ? 'Comparar entre niveles de la parcela grande pide el error combinado que muestra el Bloque 5.' : 'El mapa de calor y las barras agrupadas comparan todas las combinaciones juntas.'}`));
    const series = lb.map(b => ({ label: `${B} ${b}`, values: la.map(a => sl.byLevel[a + '|' + b].mean), se: la.map(a => sl.byLevel[a + '|' + b].se), letters: la.map(a => sl.byLevel[a + '|' + b].letters) }));
    mount6('int_' + slug(A) + '_' + slug(B), T(`Interaction plot ${A} × ${B}`, `Gráfica de interacción ${A} × ${B}`), P6.interactionLetters(la, series, { title: `${resp}: ${A} × ${B}`, xlab: A, ylab: respLabel, fileName: slug(resp) + '_' + slug(A) + '_' + slug(B) + '_interaction', note: T(`letters: ${B} within ${A}, ${PH.methods[R.method].name}`, `letras: ${B} dentro de ${A}, ${PH.methods[R.method].name}`) }), c);
    const series2 = la.map(a => ({ label: `${A} ${a}`, values: lb.map(b => sl.byLevel[a + '|' + b].mean), se: lb.map(b => sl.byLevel[a + '|' + b].se), letters: lb.map(b => sl.byLevel[a + '|' + b].letters) }));
    mount6('int2_' + slug(A) + '_' + slug(B), T(`Interaction plot ${B} × ${A}`, `Gráfica de interacción ${B} × ${A}`), P6.interactionLetters(lb, series2, { title: `${resp}: ${B} × ${A}`, xlab: B, ylab: respLabel, fileName: slug(resp) + '_' + slug(B) + '_' + slug(A) + '_interaction', note: T(`letters: ${B} within ${A}`, `letras: ${B} dentro de ${A}`) }), c);
    let cellLetters = null;
    if (!SPLIT.has(R.design.id)) { const cc = DS.cellComparison(R, A, B); cellLetters = {}; cc.cells.forEach((m, k) => cellLetters[m.levels[A] + '|' + m.levels[B]] = cc.cmp.letters[k]); }
    const cells = sl.cells.map(m => ({ a: m.levels[A], b: m.levels[B], mean: m.mean, se: m.se, letters: cellLetters ? cellLetters[m.levels[A] + '|' + m.levels[B]] : sl.byLevel[m.levels[A] + '|' + m.levels[B]].letters }));
    mount6('grp_' + slug(A) + '_' + slug(B), T(`Grouped bars ${A} × ${B}`, `Barras agrupadas ${A} × ${B}`), P5.groupedMeans(cells, la, lb, { title: `${resp}: ${A} × ${B}`, xlab: A, ylab: respLabel, bName: B, fileName: slug(resp) + '_' + slug(A) + '_' + slug(B) + '_grouped' }), c);
    mount6('heat_' + slug(A) + '_' + slug(B), T(`Heat map ${A} × ${B}`, `Mapa de calor ${A} × ${B}`), P6.cellHeat(la, lb, cells, { title: T(`Mean ${resp} by ${A} and ${B}`, `Media de ${resp} por ${A} y ${B}`), xlab: B, ylab: A, fileName: slug(resp) + '_' + slug(A) + '_' + slug(B) + '_heatmap' }), c);
  }

  /* --- ANOVA partition --- */
  const c2 = groupCard(host, T('Variance partition', 'Reparto de la varianza'), T('How the total sum of squares is split among design sources and error: a compact visual summary of the ANOVA table.', 'Cómo se reparte la suma de cuadrados total entre las fuentes del diseño y el error: un resumen visual y compacto del cuadro de análisis de varianza.'));
  const rows = R.anova.rows.map(r => ({ label: r.label, ss: r.ss, df: r.df, p: r.isError ? NaN : r.p })).concat([{ label: T('Residual error', 'Error residual'), ss: R.anova.residual.ss, df: R.anova.residual.df, p: NaN }]);
  mount6('ss', T('Variance partition', 'Reparto de la varianza'), P6.ssPartition(rows, { fileName: slug(resp) + '_ss_partition', defaults: { title: T(`Partition of the total SS of ${resp}`, `Reparto de la SC total de ${resp}`) } }), c2);

  /* --- field maps --- */
  if (d.row && d.col) {
    const rowsL = R.levelsMap[d.row], colsL = R.levelsMap[d.col];
    const c3 = groupCard(host, T('Field layout', 'Acomodo en el terreno'), T('The experiment as it lay in the field: rows × columns, coloured by the response (left) and by the residual (right, to spot spatial patterns).', 'El experimento tal como quedó en el terreno: hileras × columnas, coloreado por la respuesta (izquierda) y por el residual (derecha, para ver patrones espaciales).'));
    const plots = R.recs.map(r => ({ row: r.f[d.row], col: r.f[d.col], label: d.factors.map(f => r.f[f]).join(' '), value: r.y }));
    mount6('field_y', T('Field map of the response', 'Croquis del terreno con la respuesta'), P6.fieldMap(rowsL, colsL, plots, { title: T(`Field map: ${resp}`, `Croquis del terreno: ${resp}`), fileName: slug(resp) + '_field_map' }), c3);
    const plotsR = R.recs.map((r, k) => ({ row: r.f[d.row], col: r.f[d.col], label: d.factors.map(f => r.f[f]).join(' '), value: R.fit.resid[k] }));
    mount6('field_res', T('Field map of residuals', 'Croquis del terreno con los residuales'), P6.fieldMap(rowsL, colsL, plotsR, { title: T('Field map: residuals', 'Croquis del terreno: residuales'), fileName: slug(resp) + '_field_residuals', defaults: { colormap: 'rdbu', centerZero: true } }), c3);
  }
  builtFor = sig();
  el('gfxCount').textContent = figs.length + T(' figures', ' figuras');
  el('gfxPanelHost').innerHTML = '';
}
/* the gallery belongs to one run of Block 5: a new run (even with the same response, design and
   number of plots but other data) rebuilds it */
function sig() { const R = state.anova; return R ? [R.runId, R.resp, R.design.id, R.method, R.alpha, R.recs.length, el('gfxYlab').value].join('|') : ''; }

/* ---------- presets ---------- */
function applyPreset(key) {
  const p = PRESETS[key]; if (!p) return;
  Prefs.set('figstyle', Object.assign({}, Prefs.get('figstyle', {}), p.style));
  figs.forEach(f => { Object.assign(f.api.cfg, p.style); if (p.style.palette) f.api.cfg.palette = p.style.palette; f.api.redraw(); });
  const pf = Fig.registry.fig6_panel; if (pf) { Object.assign(pf.cfg, p.style); pf.redraw(); }
  els('.preset-btn').forEach(b => b.classList.toggle('active', b.dataset.preset === key));
}

/* ---------- batch export ---------- */
async function exportAll() {
  const fmt = el('gfxFmt').value, scale = +el('gfxRes').value, dpi = scale * 75;
  const btn = el('gfxZip'); btn.disabled = true; btn.textContent = T('Preparing…', 'Preparando…');
  const files = [];
  const list = figs.slice(); const pf = Fig.registry.fig6_panel; if (pf) list.push({ id: 'panel', api: pf });
  try {
    for (const f of list) {
      const svg = f.api.svg, name = (f.api.fileName || f.id);
      if (fmt === 'svg' || fmt === 'all') files.push({ name: name + '.svg', data: Fig.serialize(svg) });
      if (fmt !== 'svg') { const ff = fmt === 'all' ? 'png' : fmt; const blob = await Fig.toRaster(svg, { format: ff, scale, dpi, background: '#ffffff' }); files.push({ name: name + '.' + (ff === 'jpg' ? 'jpg' : ff === 'tiff' ? 'tif' : ff), data: blob }); }
    }
    files.push({ name: 'README.txt', data: T(`AgriDesign figures\nResponse: ${state.anova.resp}\nDesign: ${T(state.anova.design.name)}\nMean separation: ${PH.methods[state.anova.method].name}, alpha = ${state.anova.alpha}\nResolution: ${dpi} dpi (${scale}x)\nGenerated: ${new Date().toISOString()}\n`,
      `Figuras de AgriDesign\nRespuesta: ${state.anova.resp}\nDiseño: ${T(state.anova.design.name)}\nComparación de medias: ${PH.methods[state.anova.method].name}, alfa = ${state.anova.alpha}\nResolución: ${dpi} ppp (${scale}x)\nGeneradas: ${new Date().toISOString()}\n`) });
    const zip = await Zip.build(files);
    download(zip, slug(state.anova.resp) + '_figures_' + dpi + 'dpi.zip');
  } catch (e) { alert(T('Export failed: ', 'Falló la exportación: ') + e.message); }
  btn.disabled = false; btn.textContent = T('⬇ Download all figures (ZIP)', '⬇ Descargar todas las figuras (ZIP)');
}

/* ---------- multi-panel ---------- */
function buildPanel() {
  const sel = figs.filter(f => f.cb.checked);
  if (sel.length < 2) { alert(T('Tick at least two figures ("Add to multi-panel figure").', 'Marca al menos dos figuras («Agregar a la figura de varios paneles»).')); return; }
  if (sel.length > 8) { alert(T('Up to 8 panels.', 'Hasta 8 paneles.')); return; }
  const host = el('gfxPanelHost'); host.innerHTML = '';
  const div = mk('div', { id: 'fig6_panel' }); host.appendChild(div);
  const cols = sel.length <= 2 ? sel.length : sel.length <= 4 ? 2 : 3;
  const rowsN = Math.ceil(sel.length / cols);
  Fig.mount(div, P6.panel(sel.map(f => ({ spec: f.spec, api: f.api })), { title: T('Multi-panel figure (', 'Figura de varios paneles (') + sel.map(f => f.title).join(' · ') + ')', fileName: slug(state.anova.resp) + '_panel', width: cols * 700, height: rowsN * 460, defaults: { cols } }));
  host.scrollIntoView({ behavior: 'smooth' });
}

function init() {
  if (!el('gfxFigs')) return;
  const pb = el('gfxPresets');
  Object.entries(PRESETS).forEach(([k, p]) => { const b = mk('button', { class: 'preset-btn tab' + (k === 'colour' ? ' active' : ''), 'data-preset': k }, p.label); b.addEventListener('click', () => applyPreset(k)); pb.appendChild(b); });
  el('gfxZip').addEventListener('click', exportAll);
  el('gfxPanelBtn').addEventListener('click', buildPanel);
  el('gfxRebuild').addEventListener('click', build);
  el('gfxGo5').addEventListener('click', () => goStep(5));
  document.addEventListener('datachange', () => { el('gfxFigs').innerHTML = ''; el('gfxPanelHost').innerHTML = ''; figs = []; builtFor = null; });
  document.addEventListener('stepchange', e => {
    if (e.detail.step !== 6) return;
    const has = !!state.anova;
    el('gfxNoResults').style.display = has ? 'none' : '';
    el('gfxMain').style.display = has ? '' : 'none';
    if (has && builtFor !== sig()) build();
  });
  /* a change of language rebuilds the gallery, so every title and note is rewritten */
  document.addEventListener('langchange', () => {
    els('.preset-btn').forEach((b, i) => { b.textContent = PRESETS[Object.keys(PRESETS)[i]].label; });
    if (state.anova && figs.length) build();
  });
}
document.addEventListener('DOMContentLoaded', init);
})();
