/* AgriDesign — Block 4: ANOVA assumptions, transformations and non-parametric alternatives. */

(function () {
const colBy = n => state.columns.find(c => c.name === n);
let A = null;                 /* current analysis */

function modelOpts() {
  const d = state.design;
  return { blocks: d.blocks, row: d.row, col: d.col, factors: d.factors, covariates: d.covariates, interactions: el('assInter').checked };
}
function fillControls() {
  const rs = el('assResponse'); const prev = rs.value;
  rs.innerHTML = '';
  state.design.responses.forEach(r => rs.appendChild(mk('option', { value: r }, esc(r))));
  if (prev && [...rs.options].some(o => o.value === prev)) rs.value = prev;
  const d = state.design;
  el('assInter').disabled = d.factors.length < 2;
  showFormula();
}
function showFormula() {
  const o = modelOpts();
  const terms = LM.termsFromDesign(o);
  el('assFormula').textContent = LM.formula(el('assResponse').value || 'y', terms);
}
function trtKey(r) { return state.design.factors.map(f => r.f[f]).join(' × '); }
function groupsBy(recs, values, keyFn) {
  const map = new Map();
  recs.forEach((r, i) => { const k = keyFn(r); if (!map.has(k)) map.set(k, []); map.get(k).push(values[i]); });
  return { keys: [...map.keys()], groups: [...map.values()] };
}
function level(p, a) { return !isFinite(p) ? 'info' : p >= a ? 'ok' : p >= a / 5 ? 'warn' : 'bad'; }

/* ================= diagnostics ================= */
function run() {
  if (!state.ready) return;
  const resp = el('assResponse').value, alpha = +el('assAlpha').value;
  const o = modelOpts();
  const terms = LM.termsFromDesign(o);
  const { recs, levelsMap } = LM.records(resp, o);
  if (recs.length < 4) { showMessage('assMessages', 'error', 'Too few complete observations.'); return; }
  const y = recs.map(r => r.y);
  const M = LM.modelMatrix(recs, terms, levelsMap);
  const fit = LM.fit(M, y);
  if (fit.dfRes < 2) { clearMessages('assMessages'); showMessage('assMessages', 'error', `The model leaves ${fit.dfRes} residual degrees of freedom: nothing can be tested. This happens with one observation per treatment combination when all interactions are included. Untick "include interactions" or check the design roles in Block 2.`); return; }
  clearMessages('assMessages');
  const stud = AS.studentized(fit);
  const sw = AS.shapiro(fit.resid), ad = AS.andersonDarling(fit.resid), jb = AS.jarqueBera(fit.resid);
  const gb = groupsBy(recs, fit.resid, trtKey);
  const gy = groupsBy(recs, y, trtKey);
  const canVar = gb.groups.length > 1 && gb.groups.every(g => g.length > 1);
  const lev = canVar ? AS.levene(gb.groups, 'median') : null;
  const levMean = canVar ? AS.levene(gb.groups, 'mean') : null;
  const bart = canVar ? AS.bartlett(gy.groups) : null;
  const flig = canVar ? AS.fligner(gy.groups) : null;
  const fmax = canVar ? AS.fmax(gy.groups) : null;
  /* additivity: additive model (no interactions) when there is blocking */
  let tk = null;
  const hasBlocking = o.blocks.length || (o.row && o.col);
  if (hasBlocking) {
    /* the model keeps the treatment interactions, so the extra fitted² term captures
       block × treatment (multiplicative) non-additivity, not a genuine A × B interaction */
    tk = AS.tukeyAdditivity(M, y, terms);
  }
  const dw = AS.durbinWatson(fit.resid);
  const gm = S.mean(y), cv = Math.sqrt(fit.mse) / gm * 100;
  A = { resp, alpha, o, terms, recs, levelsMap, M, fit, y, stud, sw, ad, jb, lev, levMean, bart, flig, fmax, tk, dw, cv, gb, gy };
  state.assumptions = A;
  renderResults();
  renderTransforms();
  setupNonpar();
  el('assResults').style.display = '';
  el('transCard').style.display = '';
  el('npCard').style.display = '';
}

function renderResults() {
  const a = A, al = a.alpha;
  const fx = v => fmtFixed(v, 3);
  statTiles('assTiles', [
    ['Observations', a.recs.length, `${a.fit.dfRes} residual df`],
    ['RMSE', fx(Math.sqrt(a.fit.mse)), '√MSE of the model'],
    ['CV (ANOVA)', fmtFixed(a.cv, 1) + ' %', 'residual / grand mean', a.cv < 20 ? 'ok' : a.cv < 30 ? 'warn' : 'bad'],
    ['Shapiro–Wilk', 'W = ' + fx(a.sw.W), fmtPLabel(a.sw.p), level(a.sw.p, al)],
    ['Levene (median)', a.lev ? 'F = ' + fx(a.lev.F) : '—', a.lev ? fmtPLabel(a.lev.p) : 'not testable', a.lev ? level(a.lev.p, al) : ''],
    ['Tukey additivity', a.tk ? 'F = ' + fx(a.tk.F) : '—', a.tk ? fmtPLabel(a.tk.p) : 'no blocking', a.tk ? level(a.tk.p, al) : ''],
    ['Durbin–Watson', fmtFixed(a.dw.d, 2), a.dw.d > 1.5 && a.dw.d < 2.5 ? 'no serial pattern' : 'possible serial pattern', a.dw.d > 1.5 && a.dw.d < 2.5 ? 'ok' : 'warn'],
    ['|r| > 2.5', a.stud.filter(v => Math.abs(v) > 2.5).length, 'studentized residuals', a.stud.some(v => Math.abs(v) > 3) ? 'warn' : 'ok'],
  ]);

  /* checks & verdict */
  const checks = [];
  const add = (lv, title, text) => checks.push({ lv, title, text });
  const nrm = level(a.sw.p, al);
  add(nrm, `Normality of residuals — Shapiro–Wilk W = ${fx(a.sw.W)}, ${fmtPLabel(a.sw.p)}`,
    nrm === 'ok' ? 'No evidence against normality. Anderson–Darling and Jarque–Bera agree below.' :
    `Residuals depart from normality (skewness ${fmtFixed(a.jb.skew, 2)}, excess kurtosis ${fmtFixed(a.jb.kurt, 2)}). With balanced designs and n ≥ 20 the F-test is fairly robust to moderate non-normality; look at the Q–Q plot: a few extreme points matter more than a mild curve. ${a.sw.p < al / 5 ? 'Consider a transformation or a non-parametric analysis.' : ''}`);
  if (a.lev) {
    const hv = level(a.lev.p, al);
    add(hv, `Homogeneity of variances — Levene (median) F = ${fx(a.lev.F)}, ${fmtPLabel(a.lev.p)}; Fmax = ${fmtFixed(a.fmax.Fmax, 2)}`,
      hv === 'ok' ? 'Treatment variances can be considered equal.' : `Variances differ among treatments. This affects the F-test and, above all, the mean comparisons (a common SE is used). ${a.fmax.Fmax > 10 ? 'The largest variance is more than 10 times the smallest: ' : ''}try a variance-stabilising transformation (table below) or use Welch / rank-based procedures.`);
  } else add('info', 'Homogeneity of variances not testable', 'Each treatment combination has a single observation. With blocking, look at the residual plots and at Tukey\'s additivity test instead.');
  if (a.tk) {
    const tv = level(a.tk.p, al);
    add(tv, `Additivity of blocks and treatments — Tukey 1-df F = ${fx(a.tk.F)}, ${fmtPLabel(a.tk.p)}`,
      tv === 'ok' ? 'Block and treatment effects add up: the RCBD / Latin-square model is appropriate.' : 'There is a block × treatment interaction of multiplicative type. A log transformation usually removes it; otherwise the block × treatment interaction inflates the error.');
  }
  const big = a.stud.filter(v => Math.abs(v) > 3).length;
  if (big) add('warn', `${big} observation${big > 1 ? 's' : ''} with |studentized residual| > 3`, 'Check them in the table below and in the field book. A single wrong value can trigger all the tests above.');
  else add('ok', 'No extreme residuals', 'All studentized residuals are within ±3.');
  add(a.dw.d > 1.5 && a.dw.d < 2.5 ? 'ok' : 'info', `Independence — Durbin–Watson d = ${fmtFixed(a.dw.d, 2)} in data order`, 'Independence is guaranteed by randomisation, not by a test. A d far from 2 in the row order of the file may reflect a spatial trend (neighbouring plots alike) if rows follow the field layout; blocking or spatial adjustment would then help.');
  const host = el('assChecks'); host.innerHTML = '';
  checks.forEach(c => host.appendChild(mk('div', { class: 'check-item ' + c.lv }, `<div class="ck-icon">${c.lv === 'ok' ? '✅' : c.lv === 'bad' ? '⛔' : c.lv === 'warn' ? '⚠️' : 'ℹ️'}</div><div class="ck-body"><div class="ck-title">${c.title}</div><div class="ck-text">${c.text}</div></div>`)));
  const nBad = checks.filter(c => c.lv === 'bad').length, nWarn = checks.filter(c => c.lv === 'warn').length;
  const grade = nBad >= 2 ? 'D' : nBad === 1 || nWarn >= 2 ? 'C' : nWarn === 1 ? 'B' : 'A';
  const vt = { A: 'The data meet the ANOVA assumptions. Proceed to Block 5 with the original scale.', B: 'Minor deviations. ANOVA is acceptable; mention the check in the methods and, if the deviation is in the variances, be careful with the mean comparisons.', C: 'Clear deviation from at least one assumption. Compare the transformations below or use the non-parametric route; report which one you chose and why.', D: 'Several assumptions fail. A transformation is unlikely to fix everything; the rank-based procedures below are the safer choice, or a generalised linear model for counts and proportions.' }[grade];
  el('assVerdict').innerHTML = `<div class="grade g-${grade.toLowerCase()}">${grade}<small>grade</small></div><div class="v-text"><b>${{ A: 'Assumptions satisfied', B: 'Acceptable', C: 'Problematic', D: 'Assumptions fail' }[grade]}.</b> ${vt}</div>`;
  A.grade = grade;

  /* tests table */
  const rows = [
    { test: 'Shapiro–Wilk', h0: 'Residuals are normal', stat: 'W = ' + fx(a.sw.W), df: '', p: a.sw.p },
    { test: 'Anderson–Darling', h0: 'Residuals are normal', stat: isFinite(a.ad.A) ? 'A² = ' + fx(a.ad.A) : '—', df: '', p: a.ad.p },
    { test: 'Jarque–Bera', h0: 'Skewness = 0 and kurtosis = 3', stat: 'JB = ' + fx(a.jb.JB), df: '2', p: a.jb.p },
  ];
  if (a.lev) rows.push(
    { test: 'Levene (median-centred, Brown–Forsythe)', h0: 'Equal treatment variances', stat: 'F = ' + fx(a.lev.F), df: `${a.lev.df1}, ${a.lev.df2}`, p: a.lev.p },
    { test: 'Levene (mean-centred)', h0: 'Equal treatment variances', stat: 'F = ' + fx(a.levMean.F), df: `${a.levMean.df1}, ${a.levMean.df2}`, p: a.levMean.p },
    { test: 'Bartlett', h0: 'Equal treatment variances (needs normality)', stat: 'K² = ' + fx(a.bart.K2), df: String(a.bart.df), p: a.bart.p },
    { test: 'Fligner–Killeen', h0: 'Equal treatment variances (robust)', stat: 'χ² = ' + fx(a.flig.X2), df: String(a.flig.df), p: a.flig.p },
    { test: "Hartley's Fmax (descriptive)", h0: 'max variance / min variance', stat: fmtFixed(a.fmax.Fmax, 2), df: `${a.fmax.k} groups`, p: NaN });
  if (a.tk) rows.push({ test: 'Tukey one-degree-of-freedom non-additivity', h0: 'Block and treatment effects are additive', stat: 'F = ' + fx(a.tk.F), df: `${a.tk.df1}, ${a.tk.df2}`, p: a.tk.p });
  rows.push({ test: 'Durbin–Watson (descriptive)', h0: 'No serial correlation in data order', stat: 'd = ' + fmtFixed(a.dw.d, 3), df: '', p: NaN });
  buildTable('assTable', [
    { key: 'test', label: 'Test' }, { key: 'h0', label: 'Null hypothesis' }, { key: 'stat', label: 'Statistic' }, { key: 'df', label: 'df' },
    { key: 'p', label: 'p-value', num: true, fmt: fmtP }, { key: 'dec', label: 'Decision', html: true, get: r => !isFinite(r.p) ? '—' : r.p < al ? `<span class="flag bad">reject H₀ (p &lt; ${al})</span>` : '<span class="flag ok">do not reject</span>' },
  ], rows, { caption: `Assumption tests on the residuals of ${LM.formula(a.resp, a.terms)}` });

  /* outliers */
  const out = a.stud.map((v, i) => ({ v, i })).filter(x => Math.abs(x.v) > 2.5).sort((p, q) => Math.abs(q.v) - Math.abs(p.v));
  const oh = el('assOutliers');
  if (!out.length) oh.innerHTML = '<p class="hint">No observation has |studentized residual| &gt; 2.5.</p>';
  else buildTable(oh, [
    { key: 'row', label: 'Row in file', num: true }, { key: 'trt', label: 'Treatment' }, { key: 'blk', label: 'Block' },
    { key: 'obs', label: 'Observed', num: true, fmt: fx }, { key: 'fit', label: 'Fitted', num: true, fmt: fx }, { key: 'res', label: 'Residual', num: true, fmt: fx }, { key: 'stud', label: 'Studentized', num: true, fmt: fx }, { key: 'lev', label: 'Leverage', num: true, fmt: fx },
  ], out.map(x => { const r = a.recs[x.i]; return { row: r.row + 2, trt: trtKey(r), blk: a.o.blocks.map(b => r.f[b]).join(' / ') || (a.o.row ? r.f[a.o.row] + ' / ' + r.f[a.o.col] : '—'), obs: r.y, fit: a.fit.fitted[x.i], res: a.fit.resid[x.i], stud: x.v, lev: a.fit.hat[x.i] }; }), { caption: 'Observations with |studentized residual| > 2.5' });

  /* figures */
  const fh = el('assFigs'); fh.innerHTML = '';
  const mount = (id, spec) => { const div = mk('div', { id: 'fig4_' + id }); fh.appendChild(div); Fig.mount(div, spec); };
  const labels = a.recs.map(r => 'row ' + (r.row + 2));
  const grid = mk('div', { class: 'fig-grid' }); fh.appendChild(grid);
  const mountG = (id, spec) => { const div = mk('div', { id: 'fig4_' + id }); grid.appendChild(div); Fig.mount(div, spec); };
  mountG('qq', P4.qq(a.stud, { labels, fileName: slug(a.resp) + '_qq' }));
  mountG('hist', P3.histogram(a.fit.resid, { title: 'Histogram of residuals', xlab: 'Residual', fileName: slug(a.resp) + '_resid_hist', defaults: { showRug: true } }));
  mountG('rvf', P4.residScatter(a.fit.fitted, a.stud, { title: 'Residuals vs fitted values', xlab: 'Fitted value', ylab: 'Studentized residual', labels, fileName: slug(a.resp) + '_resid_fitted' }));
  mountG('sl', P4.residScatter(a.fit.fitted, a.stud.map(v => Math.sqrt(Math.abs(v))), { title: 'Scale–location', xlab: 'Fitted value', ylab: '√|studentized residual|', symmetric: false, labels, fileName: slug(a.resp) + '_scale_location', defaults: { showRef: false } }));
  const gr = a.gb.keys.map((k, i) => ({ label: k, values: a.gb.groups[i] }));
  mountG('rvg', P3.boxplot(gr, { title: 'Residuals by treatment', xlab: state.design.factors.join(' × '), ylab: 'Residual', fileName: slug(a.resp) + '_resid_by_trt', defaults: { showMean: false, showN: false } }));
  mountG('order', P4.residScatter(a.recs.map((_, i) => i + 1), a.stud, { title: 'Residuals in data order', xlab: 'Observation order in the file', ylab: 'Studentized residual', labels, connect: true, fileName: slug(a.resp) + '_resid_order', defaults: { showSmooth: false } }));
}

/* ================= transformations ================= */
function renderTransforms() {
  const a = A, al = a.alpha;
  const list = AS.transforms(a.y);
  const rows = list.map(t => {
    const yt = a.y.map(t.f);
    if (yt.some(v => !isFinite(v))) return null;
    const fit = LM.fit(a.M, yt);
    const sw = AS.shapiro(fit.resid);
    const gb = groupsBy(a.recs, fit.resid, trtKey);
    const lev = gb.groups.length > 1 && gb.groups.every(g => g.length > 1) ? AS.levene(gb.groups) : null;
    const gy = groupsBy(a.recs, yt, trtKey);
    const fm = lev ? AS.fmax(gy.groups) : null;
    const tk = a.tk ? AS.tukeyAdditivity(a.M, yt, a.terms) : null;
    const score = Math.min(sw.p, lev ? lev.p : 1, tk ? tk.p : 1);
    return { t, sw, lev, fm, tk, skew: S.skewness(fit.resid), score, cv: Math.sqrt(fit.mse) / Math.abs(S.mean(yt)) * 100 };
  }).filter(Boolean);
  const best = rows.reduce((p, r) => r.score > p.score ? r : p, rows[0]);
  const none = rows[0];
  const worth = best !== none && best.score >= al && none.score < al;
  el('transVerdict').innerHTML = worth
    ? `<div class="callout"><b>Suggested: ${esc(best.t.label)}</b> It is the transformation with the least evidence against the assumptions (smallest p = ${fmtP(best.score)} vs ${fmtP(none.score)} on the original scale). ${best.t.when ? 'Typical use: ' + best.t.when + '.' : ''} Remember: means and letters are compared on the transformed scale; report back-transformed means (Block 5 does it) and state the transformation in the methods.</div>`
    : none.score >= al ? '<div class="callout"><b>No transformation needed.</b> The original scale already satisfies the assumptions; transforming would only make the results harder to interpret.</div>'
    : `<div class="callout warn"><b>No transformation fixes all the problems.</b> The best candidate is ${esc(best.t.label)} (smallest p = ${fmtP(best.score)}). Consider the non-parametric route below, or a generalised linear model if the response is a count or a proportion.</div>`;
  buildTable('transTable', [
    { key: 'label', label: 'Transformation', html: true, get: r => (r === best && worth ? '★ ' : '') + esc(r.t.label) + (r.t.when ? `<br><small class="hint" style="margin:0">${esc(r.t.when)}</small>` : '') },
    { key: 'sw', label: 'Shapiro W', num: true, get: r => fmtFixed(r.sw.W, 3) }, { key: 'swp', label: 'p (normality)', num: true, html: true, get: r => pill(r.sw.p, al) },
    { key: 'lev', label: 'p (Levene)', num: true, html: true, get: r => r.lev ? pill(r.lev.p, al) : '—' },
    { key: 'tk', label: 'p (additivity)', num: true, html: true, get: r => r.tk ? pill(r.tk.p, al) : '—' },
    { key: 'fm', label: 'Fmax', num: true, get: r => r.fm ? fmtFixed(r.fm.Fmax, 2) : '—' },
    { key: 'skew', label: 'Residual skewness', num: true, get: r => fmtFixed(r.skew, 2) },
    { key: 'cv', label: 'CV %', num: true, get: r => fmtFixed(r.cv, 1) },
    { key: 'use', label: '', html: true, get: r => r.t.id === 'none' ? '' : `<button class="btn btn-secondary btn-sm" data-trans="${r.t.id}">Use</button>` },
  ], rows, { caption: 'Assumption tests after each candidate transformation (same model)' });
  els('#transTable button[data-trans]').forEach(b => b.addEventListener('click', () => applyTransform(list.find(t => t.id === b.dataset.trans))));
  /* Box–Cox */
  const bh = el('boxcoxHost'); bh.innerHTML = '';
  const bc = AS.boxcox(a.M, a.recs);
  if (bc) {
    Fig.mount(bh, P4.boxcox(bc, {}));
    const lab = { '-1': 'reciprocal (1/y)', '-0.5': 'reciprocal square root', '0': 'logarithm', '0.5': 'square root', '1': 'none (λ = 1 is inside the interval)', '2': 'square' }[String(bc.rounded)];
    el('boxcoxText').innerHTML = `Box–Cox estimate λ̂ = <b>${bc.lambda.toFixed(2)}</b>, 95 % interval ${bc.ciLow.toFixed(1)} to ${bc.ciHigh.toFixed(1)}. ${bc.oneInside ? 'The interval includes 1: <b>no transformation is required</b> by this criterion.' : `Nearest conventional power: <b>λ = ${bc.rounded}</b> → ${lab}.`}`;
  } else el('boxcoxText').textContent = 'Box–Cox needs strictly positive values; add a constant first if the response has zeros.';
}
function pill(p, al) { return `<span class="flag ${p >= al ? 'ok' : p >= al / 5 ? '' : 'bad'}">${fmtP(p)}</span>`; }
function applyTransform(t) {
  const rc = colBy(A.resp);
  const vals = state.rawRows.map(r => { const v = toNumber(r[rc.index], state.decimal); if (v == null) return null; const y = t.f(v); return isFinite(y) ? +y.toFixed(6) : null; });
  const from = A.resp;
  const name = addDerivedColumn(from + t.suffix, vals, 'response');
  state.transforms = state.transforms || {};
  state.transforms[name] = { from, id: t.id, label: t.label, inv: t.inv };
  fillControls();
  el('assResponse').value = name;
  run();
  showMessage('assMessages', 'success', `New column <b>${esc(name)}</b> = ${esc(t.label)} of ${esc(from)} was added as a response variable and the diagnostics were re-run on it. The original column is untouched.`);
  el('assResults').scrollIntoView({ behavior: 'smooth' });
}

/* ================= non-parametric ================= */
function setupNonpar() {
  const a = A, d = state.design;
  const sel = el('npMethod'); sel.innerHTML = '';
  const one = d.factors.length === 1;
  const noBlk = !d.blocks.length && !d.row;
  const opts = [];
  if (one && noBlk) { opts.push(['kw', 'Kruskal–Wallis (one factor, completely randomised)']); opts.push(['welch', 'Welch ANOVA (unequal variances, normal data)']); }
  if (one && d.blocks.length === 1) {
    const b = d.blocks[0]; const cnt = {}; a.recs.forEach(r => { const k = r.f[b] + '|' + r.f[d.factors[0]]; cnt[k] = (cnt[k] || 0) + 1; });
    const nb = a.levelsMap[b].length, nt = a.levelsMap[d.factors[0]].length;
    if (Object.keys(cnt).length === nb * nt && Object.values(cnt).every(v => v === 1)) opts.push(['friedman', 'Friedman (one factor in complete blocks)']);
  }
  if (d.factors.length === 2 && noBlk) opts.push(['srh', 'Scheirer–Ray–Hare (two factors on ranks)']);
  opts.push(['art', 'Aligned Rank Transform ANOVA (any factorial / blocked design)']);
  if (one && noBlk) opts.push(['kw2', 'Kruskal–Wallis with pairwise Mann–Whitney']);
  opts.forEach(([v, t]) => sel.appendChild(mk('option', { value: v }, t)));
  el('npResults').innerHTML = '';
}
function runNonpar() {
  const a = A, d = state.design, al = a.alpha, method = el('npMethod').value, adj = el('npAdjust').value;
  const host = el('npResults'); host.innerHTML = '';
  const f1 = d.factors[0];
  const lv = a.levelsMap[f1];
  const byLevel = lv.map(l => a.recs.filter(r => r.f[f1] === l).map(r => r.y));
  const card = (title, hint) => { const c = mk('div', { style: 'margin-top:14px' }); c.appendChild(mk('h3', null, title)); if (hint) c.appendChild(mk('p', { class: 'hint' }, hint)); host.appendChild(c); return c; };
  const summaryAndLetters = (pairs, statKey, extra) => {
    const diff = (i, j) => { const p = pairs.find(q => (q.i === i && q.j === j) || (q.i === j && q.j === i)); return p ? p.padj < al : false; };
    const means = lv.map((l, i) => ({ name: l, mean: S.median(byLevel[i]) }));
    const letters = NP.letters(means, diff);
    const c1 = card('Pairwise comparisons', `Adjustment: ${NP.adjustNames[adj] || adj}. Two levels differ when the adjusted p is below ${al}.`);
    const ts = mk('div', { class: 'table-scroll' }); c1.appendChild(ts);
    buildTable(ts, [{ key: 'a', label: 'Level i' }, { key: 'b', label: 'Level j' }, { key: 's', label: statKey, num: true, fmt: v => fmtFixed(v, 3) }, { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 'padj', label: 'adjusted p', num: true, fmt: fmtP }, { key: 'sig', label: '', html: true }],
      pairs.map(p => ({ a: lv[p.i], b: lv[p.j], s: p[statKey.toLowerCase()] != null ? p[statKey.toLowerCase()] : p.z, p: p.p, padj: p.padj, sig: p.padj < al ? '<span class="flag bad">different</span>' : '<span class="flag ok">ns</span>' })));
    const c2 = card('Groups', 'Levels sharing a letter are not significantly different (letters from maximal cliques, so a level may carry several).');
    const ts2 = mk('div', { class: 'table-scroll' }); c2.appendChild(ts2);
    buildTable(ts2, [{ key: 'l', label: f1 }, { key: 'n', label: 'n', num: true }, { key: 'med', label: 'Median', num: true, fmt: v => fmtFixed(v, 3) }, { key: 'mean', label: 'Mean', num: true, fmt: v => fmtFixed(v, 3) }, { key: 'mr', label: 'Mean rank', num: true, fmt: v => fmtFixed(v, 2) }, { key: 'let', label: 'Group', html: true }],
      lv.map((l, i) => ({ l, n: byLevel[i].length, med: S.median(byLevel[i]), mean: S.mean(byLevel[i]), mr: extra.meanRanks ? extra.meanRanks[i] : NaN, let: `<b>${letters[i]}</b>` })).sort((p, q) => q.med - p.med));
    const fh = mk('div', { id: 'fig4_np' }); host.appendChild(fh);
    Fig.mount(fh, P4.rankMeans(lv.map((l, i) => ({ label: l, value: S.median(byLevel[i]), letters: letters[i] })), { title: `Median ${a.resp} by ${f1} with ${extra.postName} groups`, xlab: f1, ylab: 'Median ' + a.resp, fileName: slug(a.resp) + '_nonparametric' }));
  };
  const testTable = (rows, caption) => { const c = card('Test'); const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts); buildTable(ts, [{ key: 'k', label: 'Quantity' }, { key: 'v', label: 'Value', html: true }], rows.map(([k, v]) => ({ k, v })), { caption }); };

  if (method === 'kw' || method === 'kw2') {
    const kw = NP.kruskal(byLevel);
    testTable([['H (tie-corrected)', fmtFixed(kw.H, 3)], ['df', kw.df], ['p-value', `<b>${fmtP(kw.p)}</b> ${sigStars(kw.p)}`], ['ε² (effect size)', fmtFixed(kw.eps2, 3)], ['Interpretation', kw.p < al ? `At least one ${f1} level has a different distribution (median).` : `No evidence of differences among ${f1} levels.`]], `Kruskal–Wallis rank sum test: ${a.resp} ~ ${f1}`);
    if (method === 'kw') summaryAndLetters(NP.dunn(byLevel, kw, adj), 'z', { meanRanks: kw.meanRanks, postName: 'Dunn' });
    else { const pairs = []; for (let i = 0; i < lv.length; i++) for (let j = i + 1; j < lv.length; j++) { const w = NP.wilcoxPair(byLevel[i], byLevel[j]); pairs.push({ i, j, z: w.z, p: w.p }); } const pa = NP.adjust(pairs.map(p => p.p), adj); pairs.forEach((p, k) => p.padj = pa[k]); summaryAndLetters(pairs, 'z', { meanRanks: kw.meanRanks, postName: 'Mann–Whitney' }); }
  } else if (method === 'welch') {
    const w = NP.welch(byLevel);
    testTable([['F (Welch)', fmtFixed(w.F, 3)], ['df', `${w.df1}, ${fmtFixed(w.df2, 2)}`], ['p-value', `<b>${fmtP(w.p)}</b> ${sigStars(w.p)}`], ['Interpretation', w.p < al ? 'Means differ (variances not assumed equal).' : 'No evidence of mean differences.']], `Welch one-way ANOVA: ${a.resp} ~ ${f1}`);
    /* Games–Howell pairwise */
    const pairs = []; const n = byLevel.map(g => g.length), m = byLevel.map(S.mean), v = byLevel.map(S.variance);
    for (let i = 0; i < lv.length; i++) for (let j = i + 1; j < lv.length; j++) {
      const se = Math.sqrt(v[i] / n[i] + v[j] / n[j]);
      const df = se ** 4 / ((v[i] / n[i]) ** 2 / (n[i] - 1) + (v[j] / n[j]) ** 2 / (n[j] - 1));
      const q = Math.abs(m[i] - m[j]) / se * Math.SQRT2;
      pairs.push({ i, j, q, p: 1 - S.ptukey(q, lv.length, df), padj: 1 - S.ptukey(q, lv.length, df) });
    }
    summaryAndLetters(pairs, 'q', { postName: 'Games–Howell' });
  } else if (method === 'friedman') {
    const b = d.blocks[0], lb = a.levelsMap[b];
    const table = lb.map(bl => lv.map(l => a.recs.find(r => r.f[b] === bl && r.f[f1] === l).y));
    const fr = NP.friedman(table);
    testTable([['Friedman χ² (tie-corrected)', fmtFixed(fr.Fr, 3)], ['df', fr.df], ['p-value', `<b>${fmtP(fr.p)}</b> ${sigStars(fr.p)}`], ['Iman–Davenport F', `${fmtFixed(fr.Ff, 3)} on ${fr.df1}, ${fr.df2} df, p = ${fmtP(fr.pF)}`], ["Kendall's W (agreement among blocks)", fmtFixed(fr.W, 3)], ['Interpretation', fr.p < al ? `${f1} levels differ, taking blocks into account.` : `No evidence of ${f1} differences.`]], `Friedman test: ${a.resp} ~ ${f1} | ${b}`);
    const post = el('npPost').value === 'nemenyi' ? NP.nemenyi(fr) : NP.conover(fr, adj);
    summaryAndLetters(post, el('npPost').value === 'nemenyi' ? 'q' : 't', { meanRanks: fr.meanRanks, postName: el('npPost').value === 'nemenyi' ? 'Nemenyi' : 'Conover' });
  } else if (method === 'srh') {
    const terms = LM.termsFromDesign({ factors: d.factors, interactions: true });
    const r = NP.srh(a.recs, terms, a.levelsMap);
    const c = card('Scheirer–Ray–Hare extension of Kruskal–Wallis', 'H = SS of ranks / MS total of ranks; compared with χ².');
    const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts);
    buildTable(ts, [{ key: 'term', label: 'Source' }, { key: 'df', label: 'df', num: true }, { key: 'ss', label: 'SS (ranks)', num: true, fmt: v => fmtFixed(v, 2) }, { key: 'H', label: 'H', num: true, fmt: v => fmtFixed(v, 3) }, { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 's', label: '', get: q => sigStars(q.p) }], r.rows);
  } else if (method === 'art') {
    const r = NP.art(a.recs, a.terms, a.levelsMap);
    const c = card('Aligned Rank Transform ANOVA', 'Each row comes from its own alignment and ranking. F-tests are read like a parametric ANOVA. The "aligned sum" column should be ≈ 0 for every row (sanity check).');
    const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts);
    buildTable(ts, [{ key: 'term', label: 'Source' }, { key: 'df', label: 'df', num: true }, { key: 'dfRes', label: 'df error', num: true }, { key: 'F', label: 'F', num: true, fmt: v => fmtFixed(v, 3) }, { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 's', label: '', get: q => sigStars(q.p) }, { key: 'sumAligned', label: 'aligned sum', num: true, fmt: v => fmtFixed(v, 6) }], r.rows, { caption: `ART ANOVA for ${LM.formula(a.resp, a.terms)}` });
    /* post-hoc on the first treatment factor via Tukey HSD on aligned ranks */
    const ti = a.terms.findIndex(t => t.name === f1);
    if (ti >= 0 && r.rows[ti].p < al && lv.length > 2) {
      const keep = a.M.cols.map((_, j) => j).filter(j => a.M.colTerm[j] !== ti);
      const red = LM.fit(a.M, a.y), red2 = LM.fit(a.M, a.y, keep);
      const aligned = a.recs.map((rr, i) => red.resid[i] + red.fitted[i] - red2.fitted[i]);
      const rk = S.ranks(aligned);
      const an = LM.anova(a.M, rk, a.terms, 3);
      const mse = an.residual.ms, dfe = an.residual.df;
      const groups = lv.map(l => rk.filter((_, i) => a.recs[i].f[f1] === l));
      const pairs = [];
      for (let i = 0; i < lv.length; i++) for (let j = i + 1; j < lv.length; j++) {
        const q = Math.abs(S.mean(groups[i]) - S.mean(groups[j])) / Math.sqrt(mse / 2 * (1 / groups[i].length + 1 / groups[j].length));
        const p = 1 - S.ptukey(q, lv.length, dfe); pairs.push({ i, j, q, p, padj: p });
      }
      summaryAndLetters(pairs, 'q', { meanRanks: groups.map(S.mean), postName: 'Tukey HSD on aligned ranks' });
    } else if (ti >= 0 && lv.length > 2) host.appendChild(mk('p', { class: 'hint' }, `The main effect of ${esc(f1)} is not significant at α = ${al}; no pairwise comparisons are shown.`));
  }
}

function init() {
  if (!el('assResponse')) return;
  el('assRun').addEventListener('click', run);
  el('assResponse').addEventListener('change', showFormula);
  el('assInter').addEventListener('change', showFormula);
  el('npRun').addEventListener('click', runNonpar);
  el('npMethod').addEventListener('change', () => { el('npPostWrap').style.display = el('npMethod').value === 'friedman' ? '' : 'none'; });
  document.addEventListener('datachange', () => { if (state.ready) fillControls(); });
  document.addEventListener('stepchange', e => { if (e.detail.step === 4 && state.ready) { fillControls(); if (!A || A.resp !== el('assResponse').value || A.recs.length !== state.rawRows.length) run(); } });
}
document.addEventListener('DOMContentLoaded', init);
})();
