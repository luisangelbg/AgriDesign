/* AgriDesign — Block 6: result graphics gallery, style presets, batch export, multi-panel composer. */

(function () {
const SPLIT = new Set(['split_rcbd', 'split_crd', 'strip_rcbd', 'splitsplit_rcbd']);
let figs = [];          /* [{id, title, spec, api, host}] */
let builtFor = null;

const PRESETS = {
  colour:  { label: 'Colour (screen)', style: { theme: 'light', font: 'sans', grid: true, gridDash: false, axisBold: false, fontScale: 1, fsTitle: 1, fsAxis: 1, fsLabel: 1 } },
  journal: { label: 'Journal (black axes, no grid, Arial)', style: { theme: 'journal', font: 'arial', grid: false, gridDash: false, axisBold: false, fontScale: 1.1, fsTitle: 1, fsAxis: 1, fsLabel: 1 } },
  serif:   { label: 'Journal serif (Times)', style: { theme: 'journal', font: 'times', grid: false, gridDash: false, axisBold: false, fontScale: 1.1, fsTitle: 1, fsAxis: 1, fsLabel: 1 } },
  grey:    { label: 'Greyscale print', style: { theme: 'journal', font: 'arial', grid: false, gridDash: false, axisBold: false, fontScale: 1.1, fsTitle: 1, fsAxis: 1, fsLabel: 1, palette: 'greys' } },
  slides:  { label: 'Presentation (large fonts)', style: { theme: 'light', font: 'segoe', grid: true, gridDash: true, axisBold: true, fontScale: 1.5, fsTitle: 1.1, fsAxis: 1, fsLabel: 1 } },
  dark:    { label: 'Dark background', style: { theme: 'dark', font: 'segoe', grid: true, gridDash: true, axisBold: false, fontScale: 1.2, fsTitle: 1, fsAxis: 1, fsLabel: 1 } },
};

function mount6(id, title, spec, group) {
  const wrap = mk('div', { class: 'fig6-wrap' });
  const host = mk('div', { id: 'fig6_' + id });
  const bar = mk('label', { class: 'checkbox-label fig6-pick' });
  const cb = mk('input', { type: 'checkbox', 'data-fig': id });
  bar.appendChild(cb); bar.appendChild(document.createTextNode('Add to multi-panel figure'));
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
  const ylab = resp + (R.transform ? ' (' + R.transform.label + ')' : '');
  const respLabel = el('gfxYlab').value.trim() || ylab;

  /* --- treatment factors --- */
  d.factors.forEach(f => {
    const fc = DS.factorComparison(R, f);
    const c = groupCard(host, `Means of ${f}`, `Letters from ${testName}; error: ${fc.err.label}. Four presentations of the same result — pick the one that suits the journal.`);
    const items = fc.means.map((m, i) => ({ label: m.label, mean: m.mean, se: m.se, letters: fc.cmp.letters[i], tq: S.qt(0.975, fc.err.df) }));
    mount6('bars_' + slug(f), `Means of ${f} (bars)`, P5.meansLetters(items, { title: `${resp} by ${f}`, xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_bars', testName: PH.methods[R.method].name }), c);
    mount6('points_' + slug(f), `Means of ${f} (points)`, P5.meansLetters(items, { title: `${resp} by ${f}`, xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_points', testName: PH.methods[R.method].name, defaults: { style: 'points', includeZero: false, errorType: 'ci' } }), c);
    const groups = fc.means.map((m, i) => ({ label: m.label, values: fc.raw[i], letters: fc.cmp.letters[i] }));
    mount6('box_' + slug(f), `Box plot of ${f} with letters`, P6.boxLetters(groups, { title: `${resp} by ${f} — distribution and groups`, xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_box', testName: PH.methods[R.method].name }), c);
    mount6('strip_' + slug(f), `Observations of ${f} with letters`, P6.stripLetters(groups, { title: `${resp} by ${f} — all plots`, xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_strip' }), c);
    /* differences with CI */
    const pairs = fc.cmp.pairs.map(p => { const half = p.crit != null ? p.crit : S.qt(0.975, fc.err.df) * p.se; return { label: `${fc.means[p.i].label} − ${fc.means[p.j].label}`, diff: p.diff, lo: p.diff - half, hi: p.diff + half, sig: !!p.sig }; });
    if (pairs.length) mount6('diff_' + slug(f), `Differences between ${f} means`, P6.diffCI(pairs, { title: `Pairwise differences of ${resp} between ${f} levels`, xlab: 'Difference (' + respLabel + ')', fileName: slug(resp) + '_' + slug(f) + '_differences', note: `${PH.methods[R.method].name}: interval = difference ± critical value; intervals crossing 0 are not significant` }), c);
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
        let optimum = null; if (Math.max(1, deg) === 2 && b[2] !== 0) { const xo = -b[1] / (2 * b[2]); optimum = { x: xo, y: pf.fn(xo), kind: b[2] < 0 ? 'maximum' : 'minimum' }; }
        mount6('trend_' + slug(f), `Response curve of ${f}`, P5.trend(x, fc.means.map((m, i) => ({ mean: m.mean, se: m.se, letters: fc.cmp.letters[i] })), pf.fn, { title: `Response of ${resp} to ${f}`, xlab: f, ylab: respLabel, fileName: slug(resp) + '_' + slug(f) + '_curve', equation: eq, optimum }), c);
      }
    }
  });

  /* --- two-factor interactions --- */
  for (let i = 0; i < d.factors.length; i++) for (let j = i + 1; j < d.factors.length; j++) {
    const A = d.factors[i], B = d.factors[j];
    if (!R.terms.some(t => t.factors && t.factors.length === 2 && t.factors.includes(A) && t.factors.includes(B))) continue;
    const la = R.levelsMap[A], lb = R.levelsMap[B];
    const sl = DS.sliceLetters(R, A, B);
    const c = groupCard(host, `Interaction ${A} × ${B}`, `Letters in the line plot compare the levels of ${B} within each level of ${A} (residual / sub-plot error). ${SPLIT.has(R.design.id) ? 'Comparisons across main-plot levels need the pooled error shown in Block 5.' : 'The heat map and grouped bars compare all combinations together.'}`);
    const series = lb.map(b => ({ label: `${B} ${b}`, values: la.map(a => sl.byLevel[a + '|' + b].mean), se: la.map(a => sl.byLevel[a + '|' + b].se), letters: la.map(a => sl.byLevel[a + '|' + b].letters) }));
    mount6('int_' + slug(A) + '_' + slug(B), `Interaction plot ${A} × ${B}`, P6.interactionLetters(la, series, { title: `${resp}: ${A} × ${B}`, xlab: A, ylab: respLabel, fileName: slug(resp) + '_' + slug(A) + '_' + slug(B) + '_interaction', note: `letters: ${B} within ${A}, ${PH.methods[R.method].name}` }), c);
    const series2 = la.map(a => ({ label: `${A} ${a}`, values: lb.map(b => sl.byLevel[a + '|' + b].mean), se: lb.map(b => sl.byLevel[a + '|' + b].se), letters: lb.map(b => sl.byLevel[a + '|' + b].letters) }));
    mount6('int2_' + slug(A) + '_' + slug(B), `Interaction plot ${B} × ${A}`, P6.interactionLetters(lb, series2, { title: `${resp}: ${B} × ${A}`, xlab: B, ylab: respLabel, fileName: slug(resp) + '_' + slug(B) + '_' + slug(A) + '_interaction', note: `letters: ${B} within ${A}` }), c);
    let cellLetters = null;
    if (!SPLIT.has(R.design.id)) { const cc = DS.cellComparison(R, A, B); cellLetters = {}; cc.cells.forEach((m, k) => cellLetters[m.levels[A] + '|' + m.levels[B]] = cc.cmp.letters[k]); }
    const cells = sl.cells.map(m => ({ a: m.levels[A], b: m.levels[B], mean: m.mean, se: m.se, letters: cellLetters ? cellLetters[m.levels[A] + '|' + m.levels[B]] : sl.byLevel[m.levels[A] + '|' + m.levels[B]].letters }));
    mount6('grp_' + slug(A) + '_' + slug(B), `Grouped bars ${A} × ${B}`, P5.groupedMeans(cells, la, lb, { title: `${resp}: ${A} × ${B}`, xlab: A, ylab: respLabel, bName: B, fileName: slug(resp) + '_' + slug(A) + '_' + slug(B) + '_grouped' }), c);
    mount6('heat_' + slug(A) + '_' + slug(B), `Heat map ${A} × ${B}`, P6.cellHeat(la, lb, cells, { title: `Mean ${resp} by ${A} and ${B}`, xlab: B, ylab: A, fileName: slug(resp) + '_' + slug(A) + '_' + slug(B) + '_heatmap' }), c);
  }

  /* --- ANOVA partition --- */
  const c2 = groupCard(host, 'Variance partition', 'How the total sum of squares is split among design sources and error: a compact visual summary of the ANOVA table.');
  const rows = R.anova.rows.map(r => ({ label: r.label, ss: r.ss, df: r.df, p: r.isError ? NaN : r.p })).concat([{ label: 'Residual error', ss: R.anova.residual.ss, df: R.anova.residual.df, p: NaN }]);
  mount6('ss', 'Variance partition', P6.ssPartition(rows, { fileName: slug(resp) + '_ss_partition', defaults: { title: `Partition of the total SS of ${resp}` } }), c2);

  /* --- field maps --- */
  if (d.row && d.col) {
    const rowsL = R.levelsMap[d.row], colsL = R.levelsMap[d.col];
    const c3 = groupCard(host, 'Field layout', 'The experiment as it lay in the field: rows × columns, coloured by the response (left) and by the residual (right, to spot spatial patterns).');
    const plots = R.recs.map(r => ({ row: r.f[d.row], col: r.f[d.col], label: d.factors.map(f => r.f[f]).join(' '), value: r.y }));
    mount6('field_y', 'Field map of the response', P6.fieldMap(rowsL, colsL, plots, { title: `Field map: ${resp}`, fileName: slug(resp) + '_field_map' }), c3);
    const plotsR = R.recs.map((r, k) => ({ row: r.f[d.row], col: r.f[d.col], label: d.factors.map(f => r.f[f]).join(' '), value: R.fit.resid[k] }));
    mount6('field_res', 'Field map of residuals', P6.fieldMap(rowsL, colsL, plotsR, { title: 'Field map: residuals', fileName: slug(resp) + '_field_residuals', defaults: { colormap: 'rdbu' } }), c3);
  }
  builtFor = sig();
  el('gfxCount').textContent = figs.length + ' figures';
  el('gfxPanelHost').innerHTML = '';
}
function sig() { const R = state.anova; return R ? [R.resp, R.design.id, R.method, R.alpha, R.recs.length, el('gfxYlab').value].join('|') : ''; }

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
  const btn = el('gfxZip'); btn.disabled = true; btn.textContent = 'Preparing…';
  const files = [];
  const list = figs.slice(); const pf = Fig.registry.fig6_panel; if (pf) list.push({ id: 'panel', api: pf });
  try {
    for (const f of list) {
      const svg = f.api.svg, name = (f.api.fileName || f.id);
      if (fmt === 'svg' || fmt === 'all') files.push({ name: name + '.svg', data: Fig.serialize(svg) });
      if (fmt !== 'svg') { const ff = fmt === 'all' ? 'png' : fmt; const blob = await Fig.toRaster(svg, { format: ff, scale, dpi, background: '#ffffff' }); files.push({ name: name + '.' + (ff === 'jpg' ? 'jpg' : ff === 'tiff' ? 'tif' : ff), data: blob }); }
    }
    files.push({ name: 'README.txt', data: `AgriDesign figures\nResponse: ${state.anova.resp}\nDesign: ${state.anova.design.name}\nMean separation: ${PH.methods[state.anova.method].name}, alpha = ${state.anova.alpha}\nResolution: ${dpi} dpi (${scale}x)\nGenerated: ${new Date().toISOString()}\n` });
    const zip = await Zip.build(files);
    download(zip, slug(state.anova.resp) + '_figures_' + dpi + 'dpi.zip');
  } catch (e) { alert('Export failed: ' + e.message); }
  btn.disabled = false; btn.textContent = '⬇ Download all figures (ZIP)';
}

/* ---------- multi-panel ---------- */
function buildPanel() {
  const sel = figs.filter(f => f.cb.checked);
  if (sel.length < 2) { alert('Tick at least two figures ("Add to multi-panel figure").'); return; }
  if (sel.length > 8) { alert('Up to 8 panels.'); return; }
  const host = el('gfxPanelHost'); host.innerHTML = '';
  const div = mk('div', { id: 'fig6_panel' }); host.appendChild(div);
  const cols = sel.length <= 2 ? sel.length : sel.length <= 4 ? 2 : 3;
  const rowsN = Math.ceil(sel.length / cols);
  Fig.mount(div, P6.panel(sel.map(f => ({ spec: f.spec, api: f.api })), { title: 'Multi-panel figure (' + sel.map(f => f.title).join(' · ') + ')', fileName: slug(state.anova.resp) + '_panel', width: cols * 700, height: rowsN * 460, defaults: { cols } }));
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
  document.addEventListener('stepchange', e => {
    if (e.detail.step !== 6) return;
    const has = !!state.anova;
    el('gfxNoResults').style.display = has ? 'none' : '';
    el('gfxMain').style.display = has ? '' : 'none';
    if (has && builtFor !== sig()) build();
  });
}
document.addEventListener('DOMContentLoaded', init);
})();
