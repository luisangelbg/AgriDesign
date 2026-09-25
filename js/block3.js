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
  if (!ex.gcs.length) return [{ label: T('All observations', 'Todas las observaciones'), values: ex.y }];
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
  const opts = [['', T('None (all observations)', 'Ninguno (todas las observaciones)')]];
  d.factors.forEach(f => opts.push([f, f + T(' (factor)', ' (factor)')]));
  if (d.factors.length > 1) opts.push(['__trt__', T('All treatment combinations (', 'Todas las combinaciones de tratamiento (') + d.factors.join(' × ') + ')']);
  d.blocks.forEach(b => opts.push([b, b + T(' (block)', ' (bloque)')]));
  if (d.row) opts.push([d.row, d.row + T(' (row)', ' (hilera)')]);
  if (d.col) opts.push([d.col, d.col + T(' (column)', ' (columna)')]);
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
    [T('Observations', 'Observaciones'), all.n, ex.rowIdx.length < state.rawRows.length ? T(`${state.rawRows.length - ex.rowIdx.length} row(s) without value`, `${state.rawRows.length - ex.rowIdx.length} renglón(es) sin valor`) : T('complete', 'completas')],
    [T('Mean', 'Media'), fx(all.mean), '± ' + fx(all.se) + T(' SE', ' EE')],
    [T('Median', 'Mediana'), fx(all.median), T('IQR ', 'RIC ') + fx(all.iqr)],
    [T('SD', 'DE'), fx(all.sd), T('standard deviation', 'desviación estándar')],
    ['CV', fmtFixed(all.cv, 1) + ' %', T('overall (includes treatment effects)', 'general (incluye los efectos de tratamiento)'), cvLevel],
    [T('Range', 'Rango'), fx(all.min) + ' – ' + fx(all.max), ''],
    [T('Skewness', 'Sesgo'), fmtFixed(all.skew, 2), Math.abs(all.skew) < 0.5 ? T('symmetric', 'simétrica') : Math.abs(all.skew) < 1 ? T('moderate', 'moderado') : T('strong', 'fuerte'), Math.abs(all.skew) < 1 ? 'ok' : 'warn'],
    [T('Kurtosis (excess)', 'Curtosis (exceso)'), fmtFixed(all.kurt, 2), Math.abs(all.kurt) < 1 ? T('near normal', 'cerca de la normal') : all.kurt > 0 ? T('heavy tails', 'colas pesadas') : T('light tails', 'colas ligeras')],
  ]);

  /* summary table */
  const cols = [
    { key: 'label', label: groupName ? esc(groupName) : T('Group', 'Grupo') }, { key: 'n', label: 'n', num: true },
    { key: 'mean', label: T('Mean', 'Media'), num: true, fmt: fx }, { key: 'se', label: T('SE', 'EE'), num: true, fmt: fx }, { key: 'sd', label: T('SD', 'DE'), num: true, fmt: fx },
    { key: 'cv', label: 'CV %', num: true, fmt: v => fmtFixed(v, 1) }, { key: 'min', label: T('Min', 'Mín'), num: true, fmt: fx }, { key: 'q1', label: 'Q1', num: true, fmt: fx },
    { key: 'median', label: T('Median', 'Mediana'), num: true, fmt: fx }, { key: 'q3', label: 'Q3', num: true, fmt: fx }, { key: 'max', label: T('Max', 'Máx'), num: true, fmt: fx },
    { key: 'skew', label: T('Skew', 'Sesgo'), num: true, fmt: v => fmtFixed(v, 2) }, { key: 'kurt', label: T('Kurt', 'Curtosis'), num: true, fmt: v => fmtFixed(v, 2) },
    { key: 'lo', label: T('95 % CI low', 'IC 95 % inf'), num: true, fmt: fx }, { key: 'hi', label: T('95 % CI high', 'IC 95 % sup'), num: true, fmt: fx },
  ];
  const rows = gcols.length ? gd.concat([Object.assign({ label: T('Overall', 'General'), _class: 'total' }, all)]) : [Object.assign({ label: T('All observations', 'Todas las observaciones') }, all)];
  buildTable('descTable', cols, rows, { caption: T(`Descriptive statistics of ${resp}${groupName ? ' by ' + groupName : ''}`, `Estadística descriptiva de ${resp}${groupName ? ' por ' + groupName : ''}`) });
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
    const colMeans = { lvl: `<b>${T('Mean', 'Media')}</b>`, _class: 'total' }; lb.forEach(b => { const vals = la.flatMap(a => cell[a + '|' + b] || []); colMeans[b] = fx(mean(vals)); }); colMeans.__mean = fx(all.mean);
    rowsT.push(colMeans);
    const colsT = [{ key: 'lvl', label: esc(A.name) + ' \\ ' + esc(B.name), html: true }].concat(lb.map(b => ({ key: b, label: esc(b), num: true, html: true }))).concat([{ key: '__mean', label: T('Mean', 'Media'), num: true, html: true }]);
    buildTable(tw, colsT, rowsT, { caption: T(`Cell means of ${resp}: ${A.name} × ${B.name}`, `Medias de celda de ${resp}: ${A.name} × ${B.name}`) });
  }

  /* interpretation */
  renderInterpretation(resp, groupName, all, gd, ex);

  /* figures */
  renderFigures(resp, groupName, groups, ex, gcols);
}

function renderInterpretation(resp, groupName, all, gd, ex) {
  const host = el('descInterp'); host.innerHTML = '';
  const add = (level, title, text) => host.appendChild(mk('div', { class: 'check-item ' + level }, `<div class="ck-icon">${level === 'ok' ? '✅' : level === 'bad' ? '⛔' : level === 'warn' ? '⚠️' : 'ℹ️'}</div><div class="ck-body"><div class="ck-title">${title}</div><div class="ck-text">${text}</div></div>`));
  const cvTxt = all.cv < 10 ? T('low variability', 'poca variabilidad') : all.cv < 20 ? T('the usual range for field yield trials', 'el rango usual en ensayos de rendimiento en campo') : all.cv < 30 ? T('high; precision may be limited', 'alto; la precisión puede quedar corta') : T('very high; check for outliers, data-entry errors or a variable that needs transformation', 'muy alto; busca valores atípicos, errores de captura o una variable que pida transformación');
  add(all.cv < 20 ? 'ok' : all.cv < 30 ? 'warn' : 'bad',
    T(`Overall CV of ${esc(resp)} = ${fmtFixed(all.cv, 1)} %`, `CV general de ${esc(resp)} = ${fmtFixed(all.cv, 1)} %`),
    T(`${cvTxt}. This descriptive CV includes the treatment and block effects; the CV reported by the ANOVA (Block 5) uses the residual error and is usually smaller. A CV of 10–20 % is usually considered acceptable for yield trials in the field, lower for controlled conditions.`,
      `${cvTxt}. Este CV descriptivo incluye los efectos de tratamiento y de bloque; el CV que reporta el análisis de varianza (Bloque 5) usa el error residual y suele ser más chico. Un CV de 10 a 20 % se considera aceptable en ensayos de rendimiento en campo, y menor en condiciones controladas.`));
  if (Math.abs(all.skew) >= 1) add('warn',
    T(`Distribution is ${all.skew > 0 ? 'right' : 'left'}-skewed (skewness ${fmtFixed(all.skew, 2)})`, `La distribución está sesgada a la ${all.skew > 0 ? 'derecha' : 'izquierda'} (sesgo ${fmtFixed(all.skew, 2)})`),
    T(`The mean (${fmtFixed(all.mean, 3)}) and median (${fmtFixed(all.median, 3)}) differ. ${all.skew > 0 && all.min > 0 ? 'A log or square-root transformation may make the residuals closer to normal; ' : ''}Block 4 will test normality on the residuals, which is what matters, not on the raw values.`,
      `La media (${fmtFixed(all.mean, 3)}) y la mediana (${fmtFixed(all.median, 3)}) difieren. ${all.skew > 0 && all.min > 0 ? 'Una transformación logarítmica o de raíz cuadrada puede acercar los residuales a la normal; ' : ''}el Bloque 4 probará la normalidad en los residuales, que es lo que importa, no en los valores crudos.`));
  else add('ok', T('Approximately symmetric distribution', 'Distribución aproximadamente simétrica'),
    T(`Skewness ${fmtFixed(all.skew, 2)}; mean and median are close (${fmtFixed(all.mean, 3)} vs ${fmtFixed(all.median, 3)}).`, `Sesgo ${fmtFixed(all.skew, 2)}; la media y la mediana están cerca (${fmtFixed(all.mean, 3)} contra ${fmtFixed(all.median, 3)}).`));
  const b = S.boxStats(ex.y);
  if (b.outliers.length) add('info',
    T(`${b.outliers.length} potential outlier${b.outliers.length > 1 ? 's' : ''} by Tukey's rule`, `${b.outliers.length} ${b.outliers.length > 1 ? 'posibles valores atípicos' : 'posible valor atípico'} según la regla de Tukey`),
    T(`Values beyond 1.5 × IQR from the quartiles: ${b.outliers.map(v => fmtFixed(v, 3)).join(', ')}. Verify them in the field book before deciding anything; outliers are only removed with a documented reason.`,
      `Valores a más de 1.5 × RIC de los cuartiles: ${b.outliers.map(v => fmtFixed(v, 3)).join(', ')}. Compruébalos en la libreta de campo antes de decidir nada; un atípico solo se quita con una razón documentada.`));
  if (gd.length > 1) {
    const valid = gd.filter(g => g.n > 1 && isFinite(g.sd));
    const best = gd.reduce((p, g) => g.mean > p.mean ? g : p), worst = gd.reduce((p, g) => g.mean < p.mean ? g : p);
    add('info',
      T(`Highest mean: ${esc(best.label)} (${fmtFixed(best.mean, 3)}); lowest: ${esc(worst.label)} (${fmtFixed(worst.mean, 3)})`, `Media más alta: ${esc(best.label)} (${fmtFixed(best.mean, 3)}); más baja: ${esc(worst.label)} (${fmtFixed(worst.mean, 3)})`),
      T(`A difference of ${fmtFixed(best.mean - worst.mean, 3)} (${fmtFixed(100 * (best.mean - worst.mean) / worst.mean, 1)} % of the lowest). Whether it is statistically significant is decided in Block 5, not here.`,
        `Una diferencia de ${fmtFixed(best.mean - worst.mean, 3)} (${fmtFixed(100 * (best.mean - worst.mean) / worst.mean, 1)} % de la más baja). Si es estadísticamente significativa se decide en el Bloque 5, no aquí.`));
    if (valid.length > 1) {
      const sds = valid.map(g => g.sd), ratio = S.max(sds) / S.min(sds);
      if (ratio > 3) add('warn',
        T(`Group standard deviations differ ${fmtFixed(ratio, 1)}-fold`, `Las desviaciones estándar de los grupos difieren ${fmtFixed(ratio, 1)} veces`),
        T(`Largest SD ${fmtFixed(S.max(sds), 3)} vs smallest ${fmtFixed(S.min(sds), 3)}. Heterogeneous variances violate an ANOVA assumption; Block 4 will test it (Levene, Bartlett) and suggest a transformation or Welch / non-parametric alternatives.`,
          `La mayor DE es ${fmtFixed(S.max(sds), 3)} y la menor ${fmtFixed(S.min(sds), 3)}. Las varianzas heterogéneas violan un supuesto del análisis de varianza; el Bloque 4 lo prueba (Levene, Bartlett) y sugiere una transformación o las alternativas de Welch y no paramétricas.`));
      else add('ok', T('Group standard deviations are of similar size', 'Las desviaciones estándar de los grupos son parecidas'),
        T(`Largest / smallest SD ratio = ${fmtFixed(ratio, 2)} (below 3, a common rule of thumb).`, `Cociente entre la mayor y la menor DE = ${fmtFixed(ratio, 2)} (menos de 3, la regla práctica usual).`));
      if (valid.length >= 4) {
        const r = S.pearson(valid.map(g => g.mean), sds);
        if (r > 0.7) add('info', T('The spread grows with the mean', 'La dispersión crece con la media'),
          T(`Correlation between group means and SDs r = ${fmtFixed(r, 2)}. This pattern is typical of counts and of variables that vary proportionally; a log or square-root transformation often stabilises the variance.`,
            `La correlación entre las medias de los grupos y sus DE es r = ${fmtFixed(r, 2)}. Ese patrón es típico de los conteos y de las variables que varían de manera proporcional; una transformación logarítmica o de raíz cuadrada suele estabilizar la varianza.`));
      }
    }
    const small = gd.filter(g => g.n < 3);
    if (small.length) add('warn',
      T(`${small.length} group${small.length > 1 ? 's' : ''} with fewer than 3 observations`, `${small.length} ${small.length > 1 ? 'grupos con menos de 3 observaciones' : 'grupo con menos de 3 observaciones'}`),
      T('SD, CV and confidence intervals are unreliable for such small groups.', 'Con grupos tan chicos, la DE, el CV y los intervalos de confianza no son de fiar.'));
  }
}

function renderFigures(resp, groupName, groups, ex, gcols) {
  const host = el('descFigs'); host.innerHTML = '';
  const d = state.design;
  const add = (id, spec) => { const div = mk('div', { id: 'fig3_' + id }); host.appendChild(div); Fig.mount(div, spec); };
  const ylab = resp, xlab = groupName || '';

  add('hist', P3.histogram(ex.y, { title: T(`Distribution of ${resp}`, `Distribución de ${resp}`), xlab: resp, fileName: slug(resp) + '_histogram' }));
  if (groups.length > 1) {
    add('box', P3.boxplot(groups, { title: T(`${resp} by ${groupName}`, `${resp} por ${groupName}`), xlab, ylab, fileName: slug(resp) + '_boxplot' }));
    add('violin', P3.violin(groups, { title: T(`${resp} by ${groupName} — violin plot`, `${resp} por ${groupName} — gráfica de violín`), xlab, ylab, fileName: slug(resp) + '_violin' }));
    add('means', P3.means(groups, { title: T(`Mean ${resp} by ${groupName}`, `Media de ${resp} por ${groupName}`), xlab, ylab, fileName: slug(resp) + '_means' }));
    add('strip', P3.strip(groups, { title: T(`${resp}: individual plots by ${groupName}`, `${resp}: parcelas individuales por ${groupName}`), xlab, ylab, fileName: slug(resp) + '_strip' }));
  }
  /* block profiles: one line per block across the levels of the grouping factor */
  if (gcols.length === 1 && d.factors.includes(gcols[0]) && d.blocks.length) {
    const bcol = colBy(d.blocks[0]), fcol = colBy(gcols[0]);
    const ex2 = extract(resp, [d.blocks[0], gcols[0]]);
    const lb = levelOrder(bcol), lf = levelOrder(fcol);
    const cell = {}; ex2.y.forEach((v, i) => { const k = ex2.labels[i].join('|'); (cell[k] = cell[k] || []).push(v); });
    const series = lb.map(b => ({ label: `${bcol.name} ${b}`, values: lf.map(f => { const v = cell[b + '|' + f]; return v && v.length ? S.mean(v) : null; }) }));
    add('profiles', P3.lines(lf, series, { title: T(`${resp} across ${fcol.name} levels, one line per ${bcol.name}`, `${resp} a lo largo de los niveles de ${fcol.name}, una línea por ${bcol.name}`), xlab: fcol.name, ylab, fileName: slug(resp) + '_block_profiles', defaults: { palette: 'greys', subtitle: T('Parallel lines = consistent treatment ranking across blocks (additivity)', 'Líneas paralelas = el orden de los tratamientos se repite en todos los bloques (aditividad)') } }));
  }
  /* interaction plot for two factors */
  if (d.factors.length >= 2) {
    const A = colBy(d.factors[0]), B = colBy(d.factors[1]);
    const ex2 = extract(resp, [d.factors[0], d.factors[1]]);
    const la = levelOrder(A), lb = levelOrder(B);
    const cell = {}; ex2.y.forEach((v, i) => { const k = ex2.labels[i].join('|'); (cell[k] = cell[k] || []).push(v); });
    const series = lb.map(b => ({ label: `${B.name} ${b}`, values: la.map(a => { const v = cell[a + '|' + b]; return v && v.length ? S.mean(v) : null; }), se: la.map(a => { const v = cell[a + '|' + b]; return v && v.length > 1 ? S.se(v) : 0; }) }));
    add('interaction', P3.lines(la, series, { title: T(`Interaction plot: ${A.name} × ${B.name}`, `Gráfica de interacción: ${A.name} × ${B.name}`), xlab: A.name, ylab: T('Mean ', 'Media de ') + resp, fileName: slug(resp) + '_interaction', defaults: { subtitle: T('Non-parallel lines suggest an interaction (tested in Block 5)', 'Las líneas no paralelas sugieren interacción (se prueba en el Bloque 5)') } }));
  }
  /* covariates */
  d.covariates.forEach(cv => {
    const cc = colBy(cv), rc = colBy(resp);
    const x = [], y = [], gv = [];
    const fcol = d.factors.length ? colBy(d.factors[0]) : null;
    state.rawRows.forEach(r => { const a = toNumber(r[cc.index], state.decimal), b = toNumber(r[rc.index], state.decimal); if (a != null && b != null) { x.push(a); y.push(b); if (fcol) gv.push(lvl(r[fcol.index])); } });
    if (x.length > 2) add('cov_' + slug(cv), P3.scatter(x, y, { title: T(`${resp} vs. covariate ${cv}`, `${resp} contra la covariable ${cv}`), xlab: cv, ylab: resp, fileName: slug(resp) + '_vs_' + slug(cv), groups: fcol ? { levels: levelOrder(fcol), values: gv } : null }));
  });
  /* correlations among responses */
  if (d.responses.length >= 2) {
    const names = d.responses, cols = names.map(colBy);
    const data = state.rawRows.map(r => cols.map(c => toNumber(r[c.index], state.decimal))).filter(r => r.every(v => v != null));
    if (data.length > 3) {
      const M = names.map((_, i) => names.map((_, j) => S.pearson(data.map(r => r[i]), data.map(r => r[j]))));
      add('corr', P3.corrHeat(names, M, { title: T('Pearson correlations among response variables', 'Correlaciones de Pearson entre las variables de respuesta'), fileName: 'response_correlations', defaults: { subtitle: T(`n = ${data.length} complete rows`, `n = ${data.length} renglones completos`) } }));
    }
  }
}

function init() {
  if (!el('descResponse')) return;
  ['descResponse', 'descGroup', 'descDigits'].forEach(id => el(id).addEventListener('change', () => render()));
  el('descRefresh').addEventListener('click', () => render(true));
  /* figures of the previous table must disappear at once: the report (Block 7) collects every figure on the page */
  document.addEventListener('datachange', () => { rendered = null; el('descFigs').innerHTML = ''; if (state.ready) fillControls(); });
  document.addEventListener('stepchange', e => { if (e.detail.step === 3 && state.ready) { fillControls(); render(); } });
  /* a change of language rewrites the labels of the menus, the tables, the interpretation and the figures */
  document.addEventListener('langchange', () => { if (!state.ready || !el('descResponse').options.length) return; fillControls(); render(true); });
}
document.addEventListener('DOMContentLoaded', init);
})();
