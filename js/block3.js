/* AgriDesign — Block 3: descriptive statistics and exploratory graphics. */

(function () {
let rendered = null;          /* signature of the last render, to avoid recomputing */

const colBy = n => state.columns.find(c => c.name === n);
const lvl = v => String(v ?? '').trim();

/* numeric values of a response with the group labels of the chosen columns */
function extract(resp, groupCols) {
  const rc = colBy(resp);
  const gcs = groupCols.map(colBy);
  const y = [], labels = [], rowIdx = [];
  state.rawRows.forEach((r, i) => {
    const v = toNumber(r[rc.index], state.decimal);
    if (v == null) return;
    if (gcs.some(c => isMissing(r[c.index]))) return;
    y.push(v); labels.push(gcs.map(c => lvl(r[c.index]))); rowIdx.push(i);
  });
  return { y, labels, rowIdx, gcs };
}
function levelOrder(col) { return (col.levels || []).map(lvl); }
/* build ordered groups from extracted data; groupCols may be 0, 1 or 2+ columns (combined) */
function makeGroups(ex) {
  if (!ex.gcs.length) return [{ label: 'All observations', values: ex.y }];
  const orders = ex.gcs.map(levelOrder);
  const keyOf = lab => lab.join(' × ');
  const map = new Map();
  ex.y.forEach((v, i) => { const k = keyOf(ex.labels[i]); if (!map.has(k)) map.set(k, []); map.get(k).push(v); });
  /* order: cartesian product of level orders */
  const combos = orders.reduce((acc, o) => acc.flatMap(a => o.map(l => a.concat([l]))), [[]]);
  return combos.map(c => ({ label: keyOf(c), values: map.get(keyOf(c)) || [] })).filter(g => g.values.length);
}
function describe(v) {
  const n = v.length;
  if (!n) return { n: 0 };
  const m = S.mean(v), sd = n > 1 ? S.sd(v) : NaN, se = n > 1 ? sd / Math.sqrt(n) : NaN;
  const t = n > 1 ? S.qt(0.975, n - 1) : NaN;
  return {
    n, mean: m, sd, se, cv: m ? Math.abs(sd / m) * 100 : NaN, min: S.min(v), q1: S.quantile(v, 0.25), median: S.median(v), q3: S.quantile(v, 0.75), max: S.max(v),
    skew: S.skewness(v), kurt: S.kurtosis(v), lo: m - t * se, hi: m + t * se, iqr: S.iqr(v),
  };
}

/* ---------------- controls ---------------- */
function groupOptions() {
  const d = state.design;
  const opts = [['', 'None (all observations)']];
  d.factors.forEach(f => opts.push([f, f + ' (factor)']));
  if (d.factors.length > 1) opts.push(['__trt__', 'All treatment combinations (' + d.factors.join(' × ') + ')']);
  d.blocks.forEach(b => opts.push([b, b + ' (block)']));
  if (d.row) opts.push([d.row, d.row + ' (row)']);
  if (d.col) opts.push([d.col, d.col + ' (column)']);
  return opts;
}
function fillControls() {
  const rs = el('descResponse'), gs = el('descGroup');
  const prevR = rs.value, prevG = gs.value;
  rs.innerHTML = ''; gs.innerHTML = '';
  state.design.responses.forEach(r => rs.appendChild(mk('option', { value: r }, esc(r))));
  groupOptions().forEach(([v, t]) => gs.appendChild(mk('option', { value: v }, esc(t))));
  if ([...rs.options].some(o => o.value === prevR)) rs.value = prevR;
  if (prevG && [...gs.options].some(o => o.value === prevG)) gs.value = prevG;
  else gs.value = state.design.factors[0] || '';
}
function groupColsFor(sel) {
  if (!sel) return [];
  if (sel === '__trt__') return state.design.factors.slice();
  return [sel];
}

/* ---------------- render ---------------- */
function render(force) {
  if (!state.ready || !el('descResponse')) return;
  const resp = el('descResponse').value, gsel = el('descGroup').value, digits = +el('descDigits').value;
  const sig = [resp, gsel, digits, state.fileName, state.rawRows.length, state.design.factors.join(), state.design.blocks.join()].join('|');
  if (!force && sig === rendered) return;
  rendered = sig;
  const gcols = groupColsFor(gsel);
  const ex = extract(resp, gcols);
  const groups = makeGroups(ex);
  const all = describe(ex.y);
  const gd = groups.map(g => Object.assign({ label: g.label }, describe(g.values)));
  const fx = v => fmtFixed(v, digits);
  const groupName = gsel === '__trt__' ? state.design.factors.join(' × ') : gsel;

  /* tiles */
  const cvLevel = all.cv < 10 ? 'ok' : all.cv < 20 ? 'ok' : all.cv < 30 ? 'warn' : 'bad';
  statTiles('descTiles', [
    ['Observations', all.n, ex.rowIdx.length < state.rawRows.length ? `${state.rawRows.length - ex.rowIdx.length} row(s) without value` : 'complete'],
    ['Mean', fx(all.mean), '± ' + fx(all.se) + ' SE'],
    ['Median', fx(all.median), 'IQR ' + fx(all.iqr)],
    ['SD', fx(all.sd), 'standard deviation'],
    ['CV', fmtFixed(all.cv, 1) + ' %', 'overall (includes treatment effects)', cvLevel],
    ['Range', fx(all.min) + ' – ' + fx(all.max), ''],
    ['Skewness', fmtFixed(all.skew, 2), Math.abs(all.skew) < 0.5 ? 'symmetric' : Math.abs(all.skew) < 1 ? 'moderate' : 'strong', Math.abs(all.skew) < 1 ? 'ok' : 'warn'],
    ['Kurtosis (excess)', fmtFixed(all.kurt, 2), Math.abs(all.kurt) < 1 ? 'near normal' : all.kurt > 0 ? 'heavy tails' : 'light tails'],
  ]);

  /* summary table */
  const cols = [
    { key: 'label', label: groupName ? esc(groupName) : 'Group' }, { key: 'n', label: 'n', num: true },
    { key: 'mean', label: 'Mean', num: true, fmt: fx }, { key: 'se', label: 'SE', num: true, fmt: fx }, { key: 'sd', label: 'SD', num: true, fmt: fx },
    { key: 'cv', label: 'CV %', num: true, fmt: v => fmtFixed(v, 1) }, { key: 'min', label: 'Min', num: true, fmt: fx }, { key: 'q1', label: 'Q1', num: true, fmt: fx },
    { key: 'median', label: 'Median', num: true, fmt: fx }, { key: 'q3', label: 'Q3', num: true, fmt: fx }, { key: 'max', label: 'Max', num: true, fmt: fx },
    { key: 'skew', label: 'Skew', num: true, fmt: v => fmtFixed(v, 2) }, { key: 'kurt', label: 'Kurt', num: true, fmt: v => fmtFixed(v, 2) },
    { key: 'lo', label: '95 % CI low', num: true, fmt: fx }, { key: 'hi', label: '95 % CI high', num: true, fmt: fx },
  ];
  const rows = gcols.length ? gd.concat([Object.assign({ label: 'Overall', _class: 'total' }, all)]) : [Object.assign({ label: 'All observations' }, all)];
  buildTable('descTable', cols, rows, { caption: `Descriptive statistics of ${resp}${groupName ? ' by ' + groupName : ''}` });
  el('descDownload').onclick = () => download(tableToCSV(el('descTable').querySelector('table')), slug(resp) + '_descriptives.csv', 'text/csv;charset=utf-8');

  /* two-way table of means when there are 2 factors */
  const tw = el('descTwoWay'); tw.innerHTML = '';
  const d = state.design;
  if (d.factors.length >= 2) {
    const A = colBy(d.factors[0]), B = colBy(d.factors[1]);
    const ex2 = extract(resp, [d.factors[0], d.factors[1]]);
    const la = levelOrder(A), lb = levelOrder(B);
    const cell = {}; ex2.y.forEach((v, i) => { const k = ex2.labels[i].join('|'); (cell[k] = cell[k] || []).push(v); });
    const mean = arr => arr && arr.length ? S.mean(arr) : NaN;
    const rowsT = la.map(a => { const o = { lvl: `<b>${esc(a)}</b>` }; const rowVals = []; lb.forEach(b => { const v = cell[a + '|' + b] || []; rowVals.push(...v); o[b] = fx(mean(v)); }); o.__mean = `<b>${fx(mean(rowVals))}</b>`; return o; });
    const colMeans = { lvl: '<b>Mean</b>', _class: 'total' }; lb.forEach(b => { const vals = la.flatMap(a => cell[a + '|' + b] || []); colMeans[b] = fx(mean(vals)); }); colMeans.__mean = fx(all.mean);
    rowsT.push(colMeans);
    const colsT = [{ key: 'lvl', label: esc(A.name) + ' \\ ' + esc(B.name), html: true }].concat(lb.map(b => ({ key: b, label: esc(b), num: true, html: true }))).concat([{ key: '__mean', label: 'Mean', num: true, html: true }]);
    buildTable(tw, colsT, rowsT, { caption: `Cell means of ${resp}: ${A.name} × ${B.name}` });
  }

  /* interpretation */
  renderInterpretation(resp, groupName, all, gd, ex);

  /* figures */
  renderFigures(resp, groupName, groups, ex, gcols);
}

function renderInterpretation(resp, groupName, all, gd, ex) {
  const host = el('descInterp'); host.innerHTML = '';
  const add = (level, title, text) => host.appendChild(mk('div', { class: 'check-item ' + level }, `<div class="ck-icon">${level === 'ok' ? '✅' : level === 'bad' ? '⛔' : level === 'warn' ? '⚠️' : 'ℹ️'}</div><div class="ck-body"><div class="ck-title">${title}</div><div class="ck-text">${text}</div></div>`));
  const cvTxt = all.cv < 10 ? 'low variability' : all.cv < 20 ? 'the usual range for field yield trials' : all.cv < 30 ? 'high; precision may be limited' : 'very high; check for outliers, data-entry errors or a variable that needs transformation';
  add(all.cv < 20 ? 'ok' : all.cv < 30 ? 'warn' : 'bad', `Overall CV of ${esc(resp)} = ${fmtFixed(all.cv, 1)} %`, `${cvTxt}. This descriptive CV includes the treatment and block effects; the CV reported by the ANOVA (Block 5) uses the residual error and is usually smaller. A CV of 10–20 % is usually considered acceptable for yield trials in the field, lower for controlled conditions.`);
  if (Math.abs(all.skew) >= 1) add('warn', `Distribution is ${all.skew > 0 ? 'right' : 'left'}-skewed (skewness ${fmtFixed(all.skew, 2)})`, `The mean (${fmtFixed(all.mean, 3)}) and median (${fmtFixed(all.median, 3)}) differ. ${all.skew > 0 && all.min > 0 ? 'A log or square-root transformation may make the residuals closer to normal; ' : ''}Block 4 will test normality on the residuals, which is what matters, not on the raw values.`);
  else add('ok', 'Approximately symmetric distribution', `Skewness ${fmtFixed(all.skew, 2)}; mean and median are close (${fmtFixed(all.mean, 3)} vs ${fmtFixed(all.median, 3)}).`);
  const b = S.boxStats(ex.y);
  if (b.outliers.length) add('info', `${b.outliers.length} potential outlier${b.outliers.length > 1 ? 's' : ''} by Tukey's rule`, `Values beyond 1.5 × IQR from the quartiles: ${b.outliers.map(v => fmtFixed(v, 3)).join(', ')}. Verify them in the field book before deciding anything; outliers are only removed with a documented reason.`);
  if (gd.length > 1) {
    const valid = gd.filter(g => g.n > 1 && isFinite(g.sd));
    const best = gd.reduce((p, g) => g.mean > p.mean ? g : p), worst = gd.reduce((p, g) => g.mean < p.mean ? g : p);
    add('info', `Highest mean: ${esc(best.label)} (${fmtFixed(best.mean, 3)}); lowest: ${esc(worst.label)} (${fmtFixed(worst.mean, 3)})`, `A difference of ${fmtFixed(best.mean - worst.mean, 3)} (${fmtFixed(100 * (best.mean - worst.mean) / worst.mean, 1)} % of the lowest). Whether it is statistically significant is decided in Block 5, not here.`);
    if (valid.length > 1) {
      const sds = valid.map(g => g.sd), ratio = S.max(sds) / S.min(sds);
      if (ratio > 3) add('warn', `Group standard deviations differ ${fmtFixed(ratio, 1)}-fold`, `Largest SD ${fmtFixed(S.max(sds), 3)} vs smallest ${fmtFixed(S.min(sds), 3)}. Heterogeneous variances violate an ANOVA assumption; Block 4 will test it (Levene, Bartlett) and suggest a transformation or Welch / non-parametric alternatives.`);
      else add('ok', 'Group standard deviations are of similar size', `Largest / smallest SD ratio = ${fmtFixed(ratio, 2)} (below 3, a common rule of thumb).`);
      if (valid.length >= 4) {
        const r = S.pearson(valid.map(g => g.mean), sds);
        if (r > 0.7) add('info', 'The spread grows with the mean', `Correlation between group means and SDs r = ${fmtFixed(r, 2)}. This pattern is typical of counts and of variables that vary proportionally; a log or square-root transformation often stabilises the variance.`);
      }
    }
    const small = gd.filter(g => g.n < 3);
    if (small.length) add('warn', `${small.length} group${small.length > 1 ? 's' : ''} with fewer than 3 observations`, 'SD, CV and confidence intervals are unreliable for such small groups.');
  }
}

function renderFigures(resp, groupName, groups, ex, gcols) {
  const host = el('descFigs'); host.innerHTML = '';
  const d = state.design;
  const add = (id, spec) => { const div = mk('div', { id: 'fig3_' + id }); host.appendChild(div); Fig.mount(div, spec); };
  const ylab = resp, xlab = groupName || '';

  add('hist', P3.histogram(ex.y, { title: `Distribution of ${resp}`, xlab: resp, fileName: slug(resp) + '_histogram' }));
  if (groups.length > 1) {
    add('box', P3.boxplot(groups, { title: `${resp} by ${groupName}`, xlab, ylab, fileName: slug(resp) + '_boxplot' }));
    add('violin', P3.violin(groups, { title: `${resp} by ${groupName} — violin plot`, xlab, ylab, fileName: slug(resp) + '_violin' }));
    add('means', P3.means(groups, { title: `Mean ${resp} by ${groupName}`, xlab, ylab, fileName: slug(resp) + '_means' }));
    add('strip', P3.strip(groups, { title: `${resp}: individual plots by ${groupName}`, xlab, ylab, fileName: slug(resp) + '_strip' }));
  }
  /* block profiles: one line per block across the levels of the grouping factor */
  if (gcols.length === 1 && d.factors.includes(gcols[0]) && d.blocks.length) {
    const bcol = colBy(d.blocks[0]), fcol = colBy(gcols[0]);
    const ex2 = extract(resp, [d.blocks[0], gcols[0]]);
    const lb = levelOrder(bcol), lf = levelOrder(fcol);
    const cell = {}; ex2.y.forEach((v, i) => { const k = ex2.labels[i].join('|'); (cell[k] = cell[k] || []).push(v); });
    const series = lb.map(b => ({ label: `${bcol.name} ${b}`, values: lf.map(f => { const v = cell[b + '|' + f]; return v && v.length ? S.mean(v) : null; }) }));
    add('profiles', P3.lines(lf, series, { title: `${resp} across ${fcol.name} levels, one line per ${bcol.name}`, xlab: fcol.name, ylab, fileName: slug(resp) + '_block_profiles', defaults: { palette: 'greys', subtitle: 'Parallel lines = consistent treatment ranking across blocks (additivity)' } }));
  }
  /* interaction plot for two factors */
  if (d.factors.length >= 2) {
    const A = colBy(d.factors[0]), B = colBy(d.factors[1]);
    const ex2 = extract(resp, [d.factors[0], d.factors[1]]);
    const la = levelOrder(A), lb = levelOrder(B);
    const cell = {}; ex2.y.forEach((v, i) => { const k = ex2.labels[i].join('|'); (cell[k] = cell[k] || []).push(v); });
    const series = lb.map(b => ({ label: `${B.name} ${b}`, values: la.map(a => { const v = cell[a + '|' + b]; return v && v.length ? S.mean(v) : null; }), se: la.map(a => { const v = cell[a + '|' + b]; return v && v.length > 1 ? S.se(v) : 0; }) }));
    add('interaction', P3.lines(la, series, { title: `Interaction plot: ${A.name} × ${B.name}`, xlab: A.name, ylab: 'Mean ' + resp, fileName: slug(resp) + '_interaction', defaults: { subtitle: 'Non-parallel lines suggest an interaction (tested in Block 5)' } }));
  }
  /* covariates */
  d.covariates.forEach(cv => {
    const cc = colBy(cv), rc = colBy(resp);
    const x = [], y = [], gv = [];
    const fcol = d.factors.length ? colBy(d.factors[0]) : null;
    state.rawRows.forEach(r => { const a = toNumber(r[cc.index], state.decimal), b = toNumber(r[rc.index], state.decimal); if (a != null && b != null) { x.push(a); y.push(b); if (fcol) gv.push(lvl(r[fcol.index])); } });
    if (x.length > 2) add('cov_' + slug(cv), P3.scatter(x, y, { title: `${resp} vs. covariate ${cv}`, xlab: cv, ylab: resp, fileName: slug(resp) + '_vs_' + slug(cv), groups: fcol ? { levels: levelOrder(fcol), values: gv } : null }));
  });
  /* correlations among responses */
  if (d.responses.length >= 2) {
    const names = d.responses, cols = names.map(colBy);
    const data = state.rawRows.map(r => cols.map(c => toNumber(r[c.index], state.decimal))).filter(r => r.every(v => v != null));
    if (data.length > 3) {
      const M = names.map((_, i) => names.map((_, j) => S.pearson(data.map(r => r[i]), data.map(r => r[j]))));
      add('corr', P3.corrHeat(names, M, { title: 'Pearson correlations among response variables', fileName: 'response_correlations', defaults: { subtitle: `n = ${data.length} complete rows` } }));
    }
  }
}

function init() {
  if (!el('descResponse')) return;
  ['descResponse', 'descGroup', 'descDigits'].forEach(id => el(id).addEventListener('change', () => render()));
  el('descRefresh').addEventListener('click', () => render(true));
  document.addEventListener('datachange', () => { rendered = null; if (state.ready) fillControls(); });
  document.addEventListener('stepchange', e => { if (e.detail.step === 3 && state.ready) { fillControls(); render(); } });
}
document.addEventListener('DOMContentLoaded', init);
})();
