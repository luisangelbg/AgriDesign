/* AgriDesign — Block 5: experimental designs, ANOVA, mean separation, contrasts. */

(function () {
let R = null;
const SPLIT = new Set(['split_rcbd', 'split_crd', 'strip_rcbd', 'splitsplit_rcbd']);
const fx3 = v => fmtFixed(v, 3);
const isNumericLevels = lv => lv.length >= 3 && lv.every(l => /^[+-]?\d+(\.\d+)?$/.test(l));

/* ================= controls ================= */
function fillControls() {
  const rs = el('anResponse'); const prev = rs.value; rs.innerHTML = '';
  state.design.responses.forEach(r => rs.appendChild(mk('option', { value: r }, esc(r))));
  if (prev && [...rs.options].some(o => o.value === prev)) rs.value = prev;
  const d = state.design;
  const recs = LM.records(rs.value, d).recs;
  const ap = DS.applicable(d, recs);
  const ds = el('anDesign'); const prevD = ds.value; ds.innerHTML = '';
  ap.list.forEach(a => { const op = mk('option', { value: a.design.id }, esc(a.design.name) + (a.ok ? (a.design.id === ap.suggested ? '  ★ suggested' : '') : '  — ' + a.why)); if (!a.ok) op.disabled = true; ds.appendChild(op); });
  if (prevD && [...ds.options].some(o => o.value === prevD && !o.disabled)) ds.value = prevD; else ds.value = ap.suggested || ap.list.find(a => a.ok).design.id;
  designChanged();
}
function designChanged() {
  const c = DS.byId(el('anDesign').value);
  el('anDesignDesc').innerHTML = `<b>${esc(c.name)}</b> · model: <code>${esc(c.model)}</code><br>${esc(c.desc)}`;
  el('anDesignArt').innerHTML = Art.design(c.art);
  const host = el('anDesignOpts'); host.innerHTML = '';
  (c.options || []).forEach(o => { const l = mk('label', { class: 'checkbox-label' }); const cb = mk('input', { type: 'checkbox', 'data-opt': o.key }); cb.checked = !!o.default; l.appendChild(cb); l.appendChild(document.createTextNode(o.label)); host.appendChild(l); });
  /* control level for Dunnett */
  const d = state.design, cs = el('anControl'); cs.innerHTML = '';
  if (d.factors.length) { const col = state.columns.find(x => x.name === d.factors[0]); (col.levels || []).forEach(l => cs.appendChild(mk('option', { value: String(l).trim() }, esc(String(l).trim())))); }
  el('anMethodDesc').textContent = PH.methods[el('anMethod').value].desc;
  el('anControlWrap').style.display = el('anMethod').value === 'dunnett' ? '' : 'none';
}
function designOpts() { const o = {}; els('#anDesignOpts input[data-opt]').forEach(cb => o[cb.dataset.opt] = cb.checked); return o; }

/* ================= run ================= */
function run() {
  if (!state.ready) return;
  const resp = el('anResponse').value, alpha = +el('anAlpha').value, method = el('anMethod').value;
  clearMessages('anMessages');
  let res;
  try { res = DS.analyze(el('anDesign').value, resp, state.design, { ssType: +el('anSS').value, designOpts: designOpts() }); }
  catch (e) { showMessage('anMessages', 'error', 'The analysis failed: ' + esc(e.message)); console.error(e); return; }
  if (!(res.anova.residual.df > 0)) { showMessage('anMessages', 'error', 'No residual degrees of freedom: the model is saturated. Check the design and the roles in Block 2 (usually a missing replication or an interaction that cannot be estimated).'); return; }
  res.alpha = alpha; res.method = method; res.control = el('anControl').value;
  res.transform = (state.transforms || {})[resp] || null;
  R = res; state.anova = res;
  renderAnova(); renderInterpretation(); renderMeans();
  el('anResults').style.display = '';
  enableStep(6, true);
}

/* ================= ANOVA table ================= */
function renderAnova() {
  const a = R.anova, res = R, al = R.alpha;
  const rows = a.rows.map(r => ({ src: r.label + (r.isError ? '' : ''), df: r.df, ss: r.ss, ms: r.ms, F: r.isError && r.errorTerm === 'Residuals' && !res.terms.find(t => t.name === r.term).error ? NaN : r.F, p: r.p, err: r.errorTerm === 'Residuals' ? 'Residual' : (res.strata[r.errorTerm] || {}).label || r.errorTerm, eta: r.ss / (r.ss + (r.errorTerm === 'Residuals' ? a.residual.ss : (a.rows.find(x => x.term === r.errorTerm) || a.residual).ss)), _class: r.isError ? 'dim' : '' }));
  rows.push({ src: 'Residual error', df: a.residual.df, ss: a.residual.ss, ms: a.residual.ms, F: NaN, p: NaN, err: '', eta: NaN, _class: 'dim' });
  rows.push({ src: 'Total', df: a.total.df, ss: a.total.ss, ms: NaN, F: NaN, p: NaN, err: '', eta: NaN, _class: 'total' });
  buildTable('anTable', [
    { key: 'src', label: 'Source' }, { key: 'df', label: 'df', num: true }, { key: 'ss', label: 'SS', num: true, fmt: v => fmtFixed(v, 4) }, { key: 'ms', label: 'MS', num: true, fmt: v => fmtFixed(v, 4) },
    { key: 'F', label: 'F', num: true, fmt: v => fmtFixed(v, 3) }, { key: 'p', label: 'p-value', num: true, fmt: fmtP }, { key: 'sig', label: '', get: r => sigStars(r.p) },
    { key: 'eta', label: 'partial η²', num: true, fmt: v => fmtFixed(v, 3) }, { key: 'err', label: 'Tested against' },
  ], rows, { caption: `ANOVA · ${LM.formula(R.resp, R.terms)} · ${+el('anSS').value === 1 ? 'Type I (sequential)' : 'Type III (marginal)'} sums of squares` });
  const trt = a.rows.filter(r => !r.isError && R.terms.find(t => t.name === r.term).factors && R.terms.find(t => t.name === r.term).factors.every(f => R.d.factors.includes(f)));
  const firstTrt = trt[0];
  const err0 = firstTrt ? DS.errorFor(R, firstTrt.term) : R.strata.Residuals;
  const nPer = firstTrt ? R.recs.length / R.levelsMap[R.d.factors[0]].length : R.recs.length;
  statTiles('anTiles', [
    ['Grand mean', fx3(R.grandMean), R.resp], ['CV', fmtFixed(R.cv, 1) + ' %', '√MSE / mean', R.cv < 20 ? 'ok' : R.cv < 30 ? 'warn' : 'bad'],
    ['R²', fmtFixed(R.r2, 3), 'model'], ['RMSE', fx3(R.rmse), 'residual SD'],
    ['SE of a treatment mean', fx3(Math.sqrt(err0.ms / nPer)), `√(MS error / ${Math.round(nPer)})`], ['SE of a difference', fx3(Math.sqrt(2 * err0.ms / nPer)), '√(2 MS error / r)'],
    ['Residual df', a.residual.df, 'error degrees of freedom', a.residual.df < 6 ? 'warn' : 'ok'],
  ]);
  el('anStrata').innerHTML = Object.entries(R.strata).map(([k, s]) => `<span class="pill">${esc(s.label)}: MS = ${fx3(s.ms)}, df = ${s.df}</span>`).join(' ');
  el('anDownloadAnova').onclick = () => download(tableToCSV(el('anTable').querySelector('table')), slug(R.resp) + '_anova.csv', 'text/csv;charset=utf-8');
}

/* ================= interpretation ================= */
function renderInterpretation() {
  const a = R.anova, al = R.alpha, host = el('anInterp'); host.innerHTML = '';
  const add = (lv, title, text) => host.appendChild(mk('div', { class: 'check-item ' + lv }, `<div class="ck-icon">${lv === 'ok' ? '✅' : lv === 'bad' ? '⛔' : lv === 'warn' ? '⚠️' : 'ℹ️'}</div><div class="ck-body"><div class="ck-title">${title}</div><div class="ck-text">${text}</div></div>`));
  const trtRows = a.rows.filter(r => { const t = R.terms.find(x => x.name === r.term); return !r.isError && t.factors && t.factors.every(f => R.d.factors.includes(f)); });
  const blkRows = a.rows.filter(r => { const t = R.terms.find(x => x.name === r.term); return !r.isError && t.factors && !t.factors.every(f => R.d.factors.includes(f)); });
  const covRows = a.rows.filter(r => R.terms.find(x => x.name === r.term).cov);
  const inter = trtRows.filter(r => r.term.includes(':'));
  const sigInter = inter.filter(r => r.p < al);
  trtRows.forEach(r => {
    const t = R.terms.find(x => x.name === r.term);
    const isInt = t.factors.length > 1;
    add(r.p < al ? 'ok' : 'info', `${isInt ? 'Interaction ' : 'Effect of '}${esc(r.term.replace(/:/g, ' × '))}: F(${r.df}, ${r.dfErr}) = ${fx3(r.F)}, ${fmtPLabel(r.p)}, partial η² = ${fmtFixed(r.ss / (r.ss + r.msErr * r.dfErr), 3)}`,
      r.p < al ? (isInt ? 'The effect of one factor depends on the level of the other: interpret the cell means (simple effects) rather than the main effects alone.' : 'At least two levels differ; see the mean separation below.') : (isInt ? 'No interaction: the factors act additively and their main effects can be interpreted separately.' : `No evidence of differences among the levels of ${esc(r.term)} at α = ${al}.`));
  });
  blkRows.forEach(r => add('info', `${esc(r.label)}: F = ${fx3(r.F)}, ${fmtPLabel(r.p)}`, r.p < al ? 'Blocking was effective: it removed a substantial part of the variation. Keep blocking in future trials on this site.' : 'Blocks did not differ much; blocking cost degrees of freedom without a large gain in precision (still harmless).'));
  covRows.forEach(r => add(r.p < al ? 'ok' : 'info', `Covariate ${esc(r.term)}: F = ${fx3(r.F)}, ${fmtPLabel(r.p)}`, r.p < al ? 'The covariate explains part of the error; treatment means below are adjusted to its mean value.' : 'The covariate adds little; consider dropping it.'));
  add(R.cv < 20 ? 'ok' : R.cv < 30 ? 'warn' : 'bad', `Precision: CV = ${fmtFixed(R.cv, 1)} %, R² = ${fmtFixed(R.r2, 3)}`, R.cv < 20 ? 'Acceptable precision for a field trial.' : 'High experimental error; differences must be large to be detected. Report it and consider more replicates or better local control next time.');
  if (a.residual.df < 6) add('warn', `Only ${a.residual.df} residual degrees of freedom`, 'F-tests and critical values are imprecise with so few error df; results should be taken as indicative.');
  if (sigInter.length) add('warn', 'Significant interaction present', 'Main-effect letters are shown for completeness, but conclusions should be drawn from the interaction means and the simple-effect comparisons.');
  /* narrative */
  const first = trtRows[0];
  const nar = [];
  const dn = R.design.name.replace(/\s*\(.*?\)\s*$/, '');
  nar.push(`Data were analysed as a ${dn.charAt(0).toLowerCase() + dn.slice(1)} with ${esc(R.resp)} as response${R.transform ? ` (${R.transform.label} transformed)` : ''}${R.d.covariates.length ? ` and ${R.d.covariates.join(', ')} as covariate${R.d.covariates.length > 1 ? 's' : ''}` : ''}.`);
  trtRows.forEach(r => nar.push(`The ${r.term.includes(':') ? 'interaction ' + r.term.replace(/:/g, ' × ') : 'effect of ' + r.term} was ${r.p < al ? '' : 'not '}significant (F<sub>${r.df},${r.dfErr}</sub> = ${fmtFixed(r.F, 2)}, ${fmtPLabel(r.p)}).`));
  nar.push(`The coefficient of variation was ${fmtFixed(R.cv, 1)} %. Means were separated with ${PH.methods[R.method].name} at α = ${al}.`);
  el('anNarrative').innerHTML = `<div class="callout"><b>Draft for the results section</b>${nar.join(' ')}</div>`;
}

/* ================= means & comparisons ================= */
function renderMeans() {
  const host = el('anMeans'); host.innerHTML = '';
  const a = R.anova, al = R.alpha, d = R.d;
  const trtTerms = R.terms.filter(t => !t.isError && t.factors && t.factors.every(f => d.factors.includes(f)));
  trtTerms.forEach(t => {
    const row = a.rows.find(r => r.term === t.name);
    if (t.factors.length === 1) renderFactorMeans(host, t, row);
    else if (t.factors.length === 2) renderInteractionMeans(host, t, row);
    else renderCellTable(host, t, row);
  });
  renderUserContrast(host);
}
function backTransformCol() {
  if (!R.transform) return [];
  return [{ key: 'bt', label: 'Back-transformed mean', num: true, get: m => fmtFixed(R.transform.inv(m.mean), 3) }];
}
function meansTable(container, means, cmp, caption, factorLabel) {
  const rows = means.map((m, i) => Object.assign({}, m, { letters: cmp ? cmp.letters[i] : '' })).sort((p, q) => q.mean - p.mean);
  buildTable(container, [
    { key: 'label', label: factorLabel }, { key: 'n', label: 'n', num: true },
    { key: 'mean', label: 'LS mean', num: true, fmt: fx3 }, { key: 'se', label: 'SE', num: true, fmt: fx3 },
    { key: 'rawMean', label: 'Raw mean', num: true, fmt: fx3 }, { key: 'sd', label: 'SD', num: true, fmt: fx3 },
    ...backTransformCol(),
    { key: 'letters', label: 'Group', html: true, get: r => `<b>${esc(r.letters)}</b>` },
  ], rows, { caption });
}
function pairTable(container, cmp, means) {
  const det = mk('details', { class: 'acc' }); det.appendChild(mk('summary', null, `Pairwise comparisons (${cmp.pairs.length}) · ${PH.methods[cmp.method].name}`));
  const body = mk('div', { class: 'acc-body' });
  if (cmp.note) body.appendChild(mk('p', { class: 'hint' }, esc(cmp.note)));
  if (cmp.msd != null) body.appendChild(mk('p', { class: 'hint' }, Array.isArray(cmp.msd) ? `${esc(cmp.msdLabel)}: ` + cmp.msd.map(m => `p = ${m.p}: ${fx3(m.value)}`).join(' · ') : `<b>${esc(cmp.msdLabel)} = ${fx3(cmp.msd)}</b> (α = ${cmp.alpha}, df = ${fmtFixed(cmp.dfe, 1)}): two means differ when their difference exceeds this value.`));
  const ts = mk('div', { class: 'table-scroll' }); body.appendChild(ts);
  const fam = PH.methods[cmp.method].family;
  buildTable(ts, [
    { key: 'a', label: 'Level i', get: p => means[p.i].label }, { key: 'b', label: 'Level j', get: p => means[p.j].label },
    { key: 'diff', label: 'Difference', num: true, fmt: fx3 }, { key: 'se', label: 'SE diff', num: true, fmt: fx3 },
    { key: 'stat', label: fam === 'q' || fam === 'range' || fam === 'gh' ? 'q' : fam === 'F' ? 'F' : 't', num: true, fmt: fx3 },
    ...(fam === 'range' ? [{ key: 'span', label: 'means spanned', num: true }] : []),
    { key: 'crit', label: 'Critical difference', num: true, fmt: fx3 },
    { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 'padj', label: 'adjusted p', num: true, fmt: fmtP },
    { key: 'sig', label: '', html: true, get: p => p.sig ? '<span class="flag bad">different</span>' : '<span class="flag ok">ns</span>' },
  ], cmp.pairs);
  det.appendChild(body); container.appendChild(det);
}
function compareMeans(means, err, seDiff, dfe, opts) {
  const groups = means.map(m => ({ label: m.label, mean: m.mean, n: m.n, sd: m.sd }));
  const control = Math.max(0, means.findIndex(m => m.label === R.control));
  return PH.compare(Object.assign({ groups, mse: err.ms, dfe: dfe != null ? dfe : err.df, alpha: R.alpha, method: R.method, control, seDiff }, opts || {}));
}
function section(host, title, hint) { const c = mk('div', { class: 'card' }); c.appendChild(mk('h2', null, title)); if (hint) c.appendChild(mk('p', { class: 'hint' }, hint)); host.appendChild(c); return c; }

function renderFactorMeans(host, t, row) {
  const f = t.factors[0], al = R.alpha;
  const means = DS.lsmeans(R, [f]);
  const err = DS.errorFor(R, t.name);
  const seDiff = DS.seDiffFn(R, means, err);
  const cmp = compareMeans(means, err, seDiff);
  if (err.name !== 'Residuals') means.forEach(m => m.se = Math.sqrt(err.ms / m.n));
  const c = section(host, `Means of ${f}`, `${row.p < al ? 'The F-test is significant' : 'The F-test is not significant'} (${fmtPLabel(row.p)}); error term: ${esc(err.label)} (MS = ${fx3(err.ms)}, df = ${err.df}). ${row.p >= al && R.method === 'lsd' ? 'With a non-significant F the LSD is unprotected — do not interpret differences.' : ''}`);
  const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts);
  meansTable(ts, means, cmp, `${R.resp} by ${f} — letters: ${PH.methods[R.method].name}, α = ${al}`, f);
  pairTable(c, cmp, means);
  const fh = mk('div', { id: 'fig5_' + slug(f) }); c.appendChild(fh);
  Fig.mount(fh, P5.meansLetters(means.map((m, i) => ({ label: m.label, mean: m.mean, se: m.se, letters: cmp.letters[i], tq: S.qt(0.975, err.df) })), { title: `${R.resp} by ${f}`, xlab: f, ylab: R.resp + (R.transform ? ' (transformed)' : ''), fileName: slug(R.resp) + '_' + slug(f) + '_means', testName: PH.methods[R.method].name }));
  /* trend analysis for quantitative factors */
  const lv = R.levelsMap[f];
  if (isNumericLevels(lv)) renderTrend(c, f, means, err);
  const dl = mk('div', { class: 'btn-row' }); c.appendChild(dl);
  dl.appendChild(mk('button', { class: 'btn btn-secondary btn-sm', onclick: () => download(tableToCSV(ts.querySelector('table')), slug(R.resp) + '_' + slug(f) + '_means.csv', 'text/csv;charset=utf-8') }, '⬇ Download means (CSV)'));
}
function renderTrend(c, f, means, err) {
  const x = R.levelsMap[f].map(Number);
  const groups = means.map(m => ({ label: m.label, mean: m.mean, n: m.n }));
  const pc = PH.polyContrasts(groups, x, err.ms, err.df, Math.min(4, x.length - 1));
  const h = mk('h3', null, `Trend analysis of ${f} (orthogonal polynomial contrasts)`); c.appendChild(h);
  c.appendChild(mk('p', { class: 'hint' }, 'The treatment sum of squares is partitioned into linear, quadratic… components. The highest significant degree tells you the shape of the response curve.'));
  const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts);
  buildTable(ts, [{ key: 'name', label: 'Component' }, { key: 'coef', label: 'Coefficients', get: r => r.coef.join(', ') }, { key: 'ss', label: 'SS', num: true, fmt: v => fmtFixed(v, 4) }, { key: 'F', label: 'F', num: true, fmt: fx3 }, { key: 'pF', label: 'p', num: true, fmt: fmtP }, { key: 's', label: '', get: r => sigStars(r.pF) }], pc, { caption: `Polynomial contrasts for ${f} (error: ${err.label})` });
  let deg = 0; pc.forEach((r, i) => { if (r.pF < R.alpha) deg = i + 1; });
  const xs = R.recs.map(r => +r.f[f]), ys = R.recs.map(r => r.y);
  const fitDeg = Math.max(1, deg);
  const pf = PH.polyFit(xs, ys, fitDeg);
  if (pf) {
    const b = pf.coef;
    const eq = `ŷ = ${b.map((v, i) => (i ? (v < 0 ? ' − ' : ' + ') : (v < 0 ? '−' : '')) + Math.abs(v).toPrecision(4) + (i ? (i === 1 ? '·x' : '·x' + '²³⁴'[i - 2]) : '')).join('')}   R² = ${pf.r2.toFixed(3)}`;
    let optimum = null;
    if (fitDeg === 2 && b[2] !== 0) { const xo = -b[1] / (2 * b[2]); optimum = { x: xo, y: pf.fn(xo), kind: b[2] < 0 ? 'maximum' : 'minimum' }; }
    c.appendChild(mk('p', { class: 'hint' }, deg ? `Highest significant component: <b>${pc[deg - 1].name.toLowerCase()}</b>. Fitted ${['', 'linear', 'quadratic', 'cubic', 'quartic'][fitDeg]} response: <code>${esc(eq)}</code>${optimum ? ` — ${optimum.kind} response at x = ${optimum.x.toFixed(2)} (ŷ = ${optimum.y.toFixed(3)})` : ''}.` : 'No polynomial component is significant: the response does not change systematically with the level.'));
    const fh = mk('div', { id: 'fig5_trend_' + slug(f) }); c.appendChild(fh);
    Fig.mount(fh, P5.trend(x, means.map(m => ({ mean: m.mean, se: m.se })), pf.fn, { title: `Response of ${R.resp} to ${f}`, xlab: f, ylab: R.resp, fileName: slug(R.resp) + '_' + slug(f) + '_trend', equation: eq, optimum }));
  }
}

function renderInteractionMeans(host, t, row) {
  const [A, B] = t.factors, al = R.alpha;
  const la = R.levelsMap[A], lb = R.levelsMap[B];
  const cells = DS.lsmeans(R, [A, B]);
  const c = section(host, `Interaction ${A} × ${B}: cell means`, row.p < al ? `The interaction is significant (${fmtPLabel(row.p)}): compare the simple effects below.` : `The interaction is not significant (${fmtPLabel(row.p)}); the cell means are shown for completeness and the main-effect comparisons above are the ones to report.`);
  /* two-way table of cell means */
  const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts);
  const cellOf = (a, b) => cells.find(m => m.levels[A] === a && m.levels[B] === b);
  const bt = R.transform;
  const rowsT = la.map(a => { const o = { lvl: `<b>${esc(a)}</b>` }; lb.forEach(b => { const m = cellOf(a, b); o[b] = m ? `${fx3(m.mean)}${bt ? ' <small>(' + fx3(bt.inv(m.mean)) + ')</small>' : ''}` : '—'; }); return o; });
  buildTable(ts, [{ key: 'lvl', label: esc(A) + ' \\ ' + esc(B), html: true }].concat(lb.map(b => ({ key: b, label: esc(b), num: true, html: true }))), rowsT, { caption: `LS means of ${R.resp}: ${A} × ${B}${bt ? ' (back-transformed in parentheses)' : ''}` });
  const split = SPLIT.has(R.design.id);
  const err = DS.errorFor(R, t.name);
  /* strata for split designs */
  let specBinA = null, specAinB = null;
  if (R.design.id === 'split_rcbd' || R.design.id === 'split_crd') {
    const ea = R.strata[R.terms.find(x => x.isError).name], eb = R.strata.Residuals, r = R.recs.length / (la.length * lb.length);
    specBinA = { err: eb, seDiff: () => Math.sqrt(2 * eb.ms / r), df: eb.df, note: 'Error b (sub-plot)' };
    const msP = ((lb.length - 1) * eb.ms + ea.ms) / lb.length;
    const dfP = msP * msP / (Math.pow((lb.length - 1) * eb.ms / lb.length, 2) / eb.df + Math.pow(ea.ms / lb.length, 2) / ea.df);
    specAinB = { err: { ms: msP, df: dfP, label: 'pooled Error a + b' }, seDiff: () => Math.sqrt(2 * msP / r), df: dfP, note: `pooled error [(b−1)E_b + E_a]/b with Satterthwaite df = ${dfP.toFixed(1)}` };
  } else if (R.design.id === 'strip_rcbd') {
    const errs = R.terms.filter(x => x.isError).map(x => R.strata[x.name]); const ea = errs[0], eb = errs[1], ec = R.strata.Residuals, r = R.recs.length / (la.length * lb.length);
    const msB = ((la.length - 1) * ec.ms + eb.ms) / la.length, dfB = msB * msB / (Math.pow((la.length - 1) * ec.ms / la.length, 2) / ec.df + Math.pow(eb.ms / la.length, 2) / eb.df);
    const msA = ((lb.length - 1) * ec.ms + ea.ms) / lb.length, dfA = msA * msA / (Math.pow((lb.length - 1) * ec.ms / lb.length, 2) / ec.df + Math.pow(ea.ms / lb.length, 2) / ea.df);
    specBinA = { err: { ms: msB, df: dfB, label: 'pooled Error b + c' }, seDiff: () => Math.sqrt(2 * msB / r), df: dfB, note: `pooled error [(a−1)E_c + E_b]/a, Satterthwaite df = ${dfB.toFixed(1)}` };
    specAinB = { err: { ms: msA, df: dfA, label: 'pooled Error a + c' }, seDiff: () => Math.sqrt(2 * msA / r), df: dfA, note: `pooled error [(b−1)E_c + E_a]/b, Satterthwaite df = ${dfA.toFixed(1)}` };
  }
  /* simple effects: B within each A, A within each B */
  const slice = (byF, cmpF, spec) => {
    const byL = R.levelsMap[byF], cmpL = R.levelsMap[cmpF];
    const h = mk('h3', null, `Simple effects: ${cmpF} within each level of ${byF}`); c.appendChild(h);
    c.appendChild(mk('p', { class: 'hint' }, `Error: ${spec ? esc(spec.note) : esc(err.label) + ' (residual)'} · ${PH.methods[R.method].name}, α = ${al}. Letters are valid within a row only.`));
    const ts2 = mk('div', { class: 'table-scroll' }); c.appendChild(ts2);
    const rows = byL.map(bl => {
      const sub = cmpL.map(cl => byF === A ? cellOf(bl, cl) : cellOf(cl, bl)).filter(Boolean);
      const e = spec ? spec.err : err;
      const seDiff = spec ? spec.seDiff : (err.name === 'Residuals' ? DS.seDiffFn(R, sub, err) : (i, j) => Math.sqrt(err.ms * (1 / sub[i].n + 1 / sub[j].n)));
      const cmp = compareMeans(sub, e, seDiff, spec ? spec.df : e.df);
      const o = { lvl: `<b>${esc(bl)}</b>` };
      sub.forEach((m, i) => { o[m.levels[cmpF]] = `${fx3(m.mean)} <b>${esc(cmp.letters[i])}</b>`; });
      return o;
    });
    buildTable(ts2, [{ key: 'lvl', label: esc(byF), html: true }].concat(cmpL.map(l => ({ key: l, label: esc(cmpF) + ' ' + esc(l), num: true, html: true }))), rows);
  };
  slice(A, B, specBinA);
  slice(B, A, specAinB);
  /* all cells compared together (non-split designs) */
  let lettersAll = null;
  if (!split) {
    const seDiff = DS.seDiffFn(R, cells, err);
    const cmp = compareMeans(cells, err, seDiff);
    lettersAll = cmp.letters;
    const h = mk('h3', null, 'All treatment combinations compared together'); c.appendChild(h);
    const ts3 = mk('div', { class: 'table-scroll' }); c.appendChild(ts3);
    meansTable(ts3, cells, cmp, `${R.resp}: ${la.length * lb.length} combinations — ${PH.methods[R.method].name}, α = ${al}`, `${A} × ${B}`);
    pairTable(c, cmp, cells);
  }
  const fh = mk('div', { id: 'fig5_int_' + slug(A) + '_' + slug(B) }); c.appendChild(fh);
  Fig.mount(fh, P5.groupedMeans(cells.map((m, i) => ({ a: m.levels[A], b: m.levels[B], mean: m.mean, se: m.se, letters: lettersAll ? lettersAll[i] : '' })), la, lb, { title: `${R.resp}: ${A} × ${B}`, xlab: A, ylab: R.resp, bName: B, fileName: slug(R.resp) + '_' + slug(A) + '_' + slug(B) + '_cells', defaults: { showLetters: !!lettersAll } }));
}
function renderCellTable(host, t, row) {
  const cells = DS.lsmeans(R, t.factors);
  const c = section(host, `Interaction ${t.factors.join(' × ')}: cell means`, `${fmtPLabel(row.p)}. Higher-order interactions are listed without letters; use the two-factor tables above or compare specific combinations with a contrast.`);
  const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts);
  buildTable(ts, t.factors.map((f, i) => ({ key: 'f' + i, label: esc(f), get: m => m.levels[f] })).concat([{ key: 'n', label: 'n', num: true }, { key: 'mean', label: 'LS mean', num: true, fmt: fx3 }, { key: 'se', label: 'SE', num: true, fmt: fx3 }]), cells);
}

/* ---------- user-defined contrasts ---------- */
function renderUserContrast(host) {
  const c = section(host, 'Custom contrast', 'Compare groups of treatments: enter one coefficient per level (they must sum to zero), e.g. control vs the rest: 3, −1, −1, −1.');
  const fsel = mk('select'); R.d.factors.forEach(f => fsel.appendChild(mk('option', { value: f }, esc(f))));
  const levelsInfo = mk('p', { class: 'hint' });
  const inp = mk('input', { type: 'text', style: 'width:320px', placeholder: '1, -1, 0, 0' });
  const btn = mk('button', { class: 'btn btn-secondary btn-sm' }, 'Test contrast');
  const out = mk('div', { class: 'table-scroll', style: 'margin-top:10px' });
  const showLevels = () => { levelsInfo.innerHTML = 'Level order: ' + R.levelsMap[fsel.value].map((l, i) => `<b>${i + 1}</b> ${esc(l)}`).join(' · '); };
  fsel.addEventListener('change', showLevels); showLevels();
  const rows = [];
  btn.addEventListener('click', () => {
    const f = fsel.value, lv = R.levelsMap[f];
    const coef = inp.value.split(/[,;\s]+/).filter(Boolean).map(Number);
    if (coef.length !== lv.length || coef.some(v => !isFinite(v))) { alert(`Enter ${lv.length} numeric coefficients.`); return; }
    if (Math.abs(coef.reduce((s, v) => s + v, 0)) > 1e-9) { alert('Coefficients must sum to zero.'); return; }
    const means = DS.lsmeans(R, [f]); const err = DS.errorFor(R, f);
    const r = PH.contrast(means.map(m => ({ mean: m.mean, n: m.n })), coef, err.ms, err.df);
    rows.push({ f, coef: coef.join(', '), est: r.est, se: r.se, t: r.t, p: r.p, ss: r.ss });
    buildTable(out, [{ key: 'f', label: 'Factor' }, { key: 'coef', label: 'Coefficients' }, { key: 'est', label: 'Estimate', num: true, fmt: fx3 }, { key: 'se', label: 'SE', num: true, fmt: fx3 }, { key: 't', label: 't', num: true, fmt: fx3 }, { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 's', label: '', get: q => sigStars(q.p) }, { key: 'ss', label: 'SS', num: true, fmt: v => fmtFixed(v, 4) }], rows);
  });
  const row = mk('div', { class: 'btn-row' }); row.appendChild(fsel); row.appendChild(inp); row.appendChild(btn);
  c.appendChild(row); c.appendChild(levelsInfo); c.appendChild(out);
}

function init() {
  if (!el('anResponse')) return;
  el('anRun').addEventListener('click', run);
  el('anDesign').addEventListener('change', designChanged);
  el('anMethod').addEventListener('change', designChanged);
  el('anResponse').addEventListener('change', fillControls);
  document.addEventListener('datachange', () => { if (state.ready) fillControls(); });
  document.addEventListener('stepchange', e => { if (e.detail.step === 5 && state.ready) { fillControls(); if (!R || R.resp !== el('anResponse').value || R.recs.length !== state.rawRows.length) run(); } });
}
document.addEventListener('DOMContentLoaded', init);
})();
