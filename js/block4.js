/* AgriDesign — Block 4: ANOVA assumptions, transformations and non-parametric alternatives. */

(function () {
const colBy = n => state.columns.find(c => c.name === n);
let A = null;                 /* current analysis */
let dataDirty = true;         /* data or roles changed since the last diagnostics */

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
  showFormula();
  const resp = el('assResponse').value, alpha = +el('assAlpha').value;
  const o = modelOpts();
  const terms = LM.termsFromDesign(o);
  const { recs, levelsMap } = LM.records(resp, o);
  if (recs.length < 4) { showMessage('assMessages', 'error', T('Too few complete observations.', 'Hay muy pocas observaciones completas.')); return; }
  const y = recs.map(r => r.y);
  const M = LM.modelMatrix(recs, terms, levelsMap);
  const fit = LM.fit(M, y);
  if (fit.dfRes < 2) { clearMessages('assMessages'); showMessage('assMessages', 'error', T(`The model leaves ${fit.dfRes} residual degrees of freedom: nothing can be tested. This happens with one observation per treatment combination when all interactions are included. Untick "include interactions" or check the design roles in Block 2.`, `El modelo deja ${fit.dfRes} grados de libertad del error: no se puede probar nada. Esto pasa cuando hay una sola observación por combinación de tratamiento y se incluyen todas las interacciones. Desmarca «incluir las interacciones» o revisa los papeles del diseño en el Bloque 2.`)); return; }
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
  state.assumptions = A; dataDirty = false;
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
    [T('Observations', 'Observaciones'), a.recs.length, T(`${a.fit.dfRes} residual df`, `${a.fit.dfRes} g.l. del error`)],
    [T('RMSE', 'RCME'), fx(Math.sqrt(a.fit.mse)), T('√MSE of the model', '√CME del modelo')],
    [T('CV (ANOVA)', 'CV (análisis de varianza)'), fmtFixed(a.cv, 1) + ' %', T('residual / grand mean', 'error / media general'), a.cv < 20 ? 'ok' : a.cv < 30 ? 'warn' : 'bad'],
    ['Shapiro–Wilk', 'W = ' + fx(a.sw.W), fmtPLabel(a.sw.p), level(a.sw.p, al)],
    [T('Levene (median)', 'Levene (mediana)'), a.lev ? 'F = ' + fx(a.lev.F) : '—', a.lev ? fmtPLabel(a.lev.p) : T('not testable', 'no se puede probar'), a.lev ? level(a.lev.p, al) : ''],
    [T('Tukey additivity', 'Aditividad de Tukey'), a.tk ? 'F = ' + fx(a.tk.F) : '—', a.tk ? fmtPLabel(a.tk.p) : T('no blocking', 'sin bloques'), a.tk ? level(a.tk.p, al) : ''],
    ['Durbin–Watson', fmtFixed(a.dw.d, 2), a.dw.d > 1.5 && a.dw.d < 2.5 ? T('no serial pattern', 'sin patrón en el orden') : T('possible serial pattern', 'posible patrón en el orden'), a.dw.d > 1.5 && a.dw.d < 2.5 ? 'ok' : 'warn'],
    ['|r| > 2.5', a.stud.filter(v => Math.abs(v) > 2.5).length, T('studentized residuals', 'residuales estudentizados'), a.stud.some(v => Math.abs(v) > 3) ? 'warn' : 'ok'],
  ]);

  /* checks & verdict */
  const checks = [];
  const add = (lv, title, text) => checks.push({ lv, title, text });
  const nrm = level(a.sw.p, al);
  add(nrm, T(`Normality of residuals — Shapiro–Wilk W = ${fx(a.sw.W)}, ${fmtPLabel(a.sw.p)}`, `Normalidad de los residuales — Shapiro–Wilk W = ${fx(a.sw.W)}, ${fmtPLabel(a.sw.p)}`),
    nrm === 'ok' ? T('No evidence against normality. Anderson–Darling and Jarque–Bera agree below.', 'No hay evidencia en contra de la normalidad. Anderson–Darling y Jarque–Bera coinciden más abajo.') :
    T(`Residuals depart from normality (skewness ${fmtFixed(a.jb.skew, 2)}, excess kurtosis ${fmtFixed(a.jb.kurt, 2)}). With balanced designs and n ≥ 20 the F-test is fairly robust to moderate non-normality; look at the Q–Q plot: a few extreme points matter more than a mild curve. ${a.sw.p < al / 5 ? 'Consider a transformation or a non-parametric analysis.' : ''}`,
      `Los residuales se apartan de la normalidad (sesgo ${fmtFixed(a.jb.skew, 2)}, exceso de curtosis ${fmtFixed(a.jb.kurt, 2)}). Con diseños balanceados y n ≥ 20 la prueba de F aguanta bien una falta moderada de normalidad; mira la gráfica Q–Q: unos pocos puntos extremos pesan más que una curva leve. ${a.sw.p < al / 5 ? 'Considera una transformación o un análisis no paramétrico.' : ''}`));
  if (a.lev) {
    const hv = level(a.lev.p, al);
    add(hv, T(`Homogeneity of variances — Levene (median) F = ${fx(a.lev.F)}, ${fmtPLabel(a.lev.p)}; Fmax = ${fmtFixed(a.fmax.Fmax, 2)}`, `Homogeneidad de varianzas — Levene (mediana) F = ${fx(a.lev.F)}, ${fmtPLabel(a.lev.p)}; Fmáx = ${fmtFixed(a.fmax.Fmax, 2)}`),
      hv === 'ok' ? T('Treatment variances can be considered equal.', 'Las varianzas de los tratamientos se pueden considerar iguales.')
      : T(`Variances differ among treatments. This affects the F-test and, above all, the mean comparisons (a common SE is used). ${a.fmax.Fmax > 10 ? 'The largest variance is more than 10 times the smallest: ' : ''}try a variance-stabilising transformation (table below) or use Welch / rank-based procedures.`,
          `Las varianzas difieren entre tratamientos. Eso afecta la prueba de F y, sobre todo, la comparación de medias (se usa un error estándar común). ${a.fmax.Fmax > 10 ? 'La varianza más grande es más de 10 veces la más chica: ' : ''}prueba una transformación que estabilice la varianza (cuadro de abajo) o usa Welch y los procedimientos de rangos.`));
  } else add('info', T('Homogeneity of variances not testable', 'No se puede probar la homogeneidad de varianzas'), T('Each treatment combination has a single observation. With blocking, look at the residual plots and at Tukey\'s additivity test instead.', 'Cada combinación de tratamiento tiene una sola observación. Si hay bloques, fíjate más bien en las gráficas de residuales y en la prueba de aditividad de Tukey.'));
  if (a.tk) {
    const tv = level(a.tk.p, al);
    add(tv, T(`Additivity of blocks and treatments — Tukey 1-df F = ${fx(a.tk.F)}, ${fmtPLabel(a.tk.p)}`, `Aditividad de bloques y tratamientos — Tukey de 1 g.l. F = ${fx(a.tk.F)}, ${fmtPLabel(a.tk.p)}`),
      tv === 'ok' ? T('Block and treatment effects add up: the RCBD / Latin-square model is appropriate.', 'Los efectos de bloque y de tratamiento se suman: el modelo de bloques al azar o de cuadro latino es el adecuado.')
      : T('There is a block × treatment interaction of multiplicative type. A log transformation usually removes it; otherwise the block × treatment interaction inflates the error.', 'Hay una interacción bloque × tratamiento de tipo multiplicativo. Una transformación logarítmica suele quitarla; si no, esa interacción infla el error.'));
  }
  const big = a.stud.filter(v => Math.abs(v) > 3).length;
  if (big) add('warn', T(`${big} observation${big > 1 ? 's' : ''} with |studentized residual| > 3`, `${big} ${big > 1 ? 'observaciones' : 'observación'} con |residual estudentizado| > 3`), T('Check them in the table below and in the field book. A single wrong value can trigger all the tests above.', 'Revísalas en el cuadro de abajo y en la libreta de campo. Un solo valor equivocado puede disparar todas las pruebas de arriba.'));
  else add('ok', T('No extreme residuals', 'Sin residuales extremos'), T('All studentized residuals are within ±3.', 'Todos los residuales estudentizados están dentro de ±3.'));
  add(a.dw.d > 1.5 && a.dw.d < 2.5 ? 'ok' : 'info', T(`Independence — Durbin–Watson d = ${fmtFixed(a.dw.d, 2)} in data order`, `Independencia — Durbin–Watson d = ${fmtFixed(a.dw.d, 2)} en el orden de los datos`), T('Independence is guaranteed by randomisation, not by a test. A d far from 2 in the row order of the file may reflect a spatial trend (neighbouring plots alike) if rows follow the field layout; blocking or spatial adjustment would then help.', 'La independencia la garantiza la aleatorización, no una prueba. Un valor de d lejos de 2 en el orden de los renglones del archivo puede reflejar una tendencia espacial (parcelas vecinas parecidas) si los renglones siguen el acomodo del terreno; entonces ayudarían los bloques o un ajuste espacial.'));
  const host = el('assChecks'); host.innerHTML = '';
  checks.forEach(c => host.appendChild(mk('div', { class: 'check-item ' + c.lv }, `<div class="ck-icon">${c.lv === 'ok' ? '✅' : c.lv === 'bad' ? '⛔' : c.lv === 'warn' ? '⚠️' : 'ℹ️'}</div><div class="ck-body"><div class="ck-title">${c.title}</div><div class="ck-text">${c.text}</div></div>`)));
  const nBad = checks.filter(c => c.lv === 'bad').length, nWarn = checks.filter(c => c.lv === 'warn').length;
  const grade = nBad >= 2 ? 'D' : nBad === 1 || nWarn >= 2 ? 'C' : nWarn === 1 ? 'B' : 'A';
  const tr = state.transforms && state.transforms[a.resp];
  const vt = {
    A: (tr ? T(`The data meet the ANOVA assumptions on the ${esc(T(tr.label))} scale. Proceed to Block 5 with ${esc(a.resp)}; means are reported back-transformed.`, `Los datos cumplen los supuestos en la escala ${esc(T(tr.label))}. Sigue al Bloque 5 con ${esc(a.resp)}; las medias se reportan retro-transformadas.`)
           : T('The data meet the ANOVA assumptions. Proceed to Block 5 with the original scale.', 'Los datos cumplen los supuestos del análisis de varianza. Sigue al Bloque 5 con la escala original.')),
    B: T('Minor deviations. ANOVA is acceptable; mention the check in the methods and, if the deviation is in the variances, be careful with the mean comparisons.', 'Desviaciones menores. El análisis de varianza es aceptable; menciona la revisión en los métodos y, si la desviación está en las varianzas, ten cuidado con la comparación de medias.'),
    C: T('Clear deviation from at least one assumption. Compare the transformations below or use the non-parametric route; report which one you chose and why.', 'Hay una desviación clara en al menos un supuesto. Compara las transformaciones de abajo o toma la vía no paramétrica; reporta cuál elegiste y por qué.'),
    D: T('Several assumptions fail. A transformation is unlikely to fix everything; the rank-based procedures below are the safer choice, or a generalised linear model for counts and proportions.', 'Fallan varios supuestos. Es poco probable que una transformación lo arregle todo; los procedimientos de rangos de abajo son la opción más segura, o un modelo lineal generalizado si la respuesta es un conteo o una proporción.'),
  }[grade];
  el('assVerdict').innerHTML = `<div class="grade g-${grade.toLowerCase()}">${grade}<small>${T('grade', 'grado')}</small></div><div class="v-text"><b>${{ A: T('Assumptions satisfied', 'Supuestos cumplidos'), B: T('Acceptable', 'Aceptable'), C: T('Problematic', 'Con problemas'), D: T('Assumptions fail', 'Los supuestos fallan') }[grade]}.</b> ${vt}</div>`;
  A.grade = grade;

  /* tests table */
  const normalH0 = T('Residuals are normal', 'Los residuales son normales');
  const equalVar = T('Equal treatment variances', 'Varianzas iguales entre tratamientos');
  const rows = [
    { test: 'Shapiro–Wilk', h0: normalH0, stat: 'W = ' + fx(a.sw.W), df: '', p: a.sw.p },
    { test: 'Anderson–Darling', h0: normalH0, stat: isFinite(a.ad.A) ? 'A² = ' + fx(a.ad.A) : '—', df: '', p: a.ad.p },
    { test: 'Jarque–Bera', h0: T('Skewness = 0 and kurtosis = 3', 'Sesgo = 0 y curtosis = 3'), stat: 'JB = ' + fx(a.jb.JB), df: '2', p: a.jb.p },
  ];
  if (a.lev) rows.push(
    { test: T('Levene (median-centred, Brown–Forsythe)', 'Levene (centrada en la mediana, Brown–Forsythe)'), h0: equalVar, stat: 'F = ' + fx(a.lev.F), df: `${a.lev.df1}, ${a.lev.df2}`, p: a.lev.p },
    { test: T('Levene (mean-centred)', 'Levene (centrada en la media)'), h0: equalVar, stat: 'F = ' + fx(a.levMean.F), df: `${a.levMean.df1}, ${a.levMean.df2}`, p: a.levMean.p },
    { test: 'Bartlett', h0: T('Equal treatment variances (needs normality)', 'Varianzas iguales (necesita normalidad)'), stat: 'K² = ' + fx(a.bart.K2), df: String(a.bart.df), p: a.bart.p },
    { test: 'Fligner–Killeen', h0: T('Equal treatment variances (robust)', 'Varianzas iguales (robusta)'), stat: 'χ² = ' + fx(a.flig.X2), df: String(a.flig.df), p: a.flig.p },
    { test: T("Hartley's Fmax (descriptive)", 'Fmáx de Hartley (descriptiva)'), h0: T('max variance / min variance', 'varianza mayor / varianza menor'), stat: fmtFixed(a.fmax.Fmax, 2), df: T(`${a.fmax.k} groups`, `${a.fmax.k} grupos`), p: NaN });
  if (a.tk) rows.push({ test: T('Tukey one-degree-of-freedom non-additivity', 'No aditividad de Tukey con un grado de libertad'), h0: T('Block and treatment effects are additive', 'Los efectos de bloque y tratamiento son aditivos'), stat: 'F = ' + fx(a.tk.F), df: `${a.tk.df1}, ${a.tk.df2}`, p: a.tk.p });
  rows.push({ test: T('Durbin–Watson (descriptive)', 'Durbin–Watson (descriptiva)'), h0: T('No serial correlation in data order', 'Sin correlación serial en el orden de los datos'), stat: 'd = ' + fmtFixed(a.dw.d, 3), df: '', p: NaN });
  buildTable('assTable', [
    { key: 'test', label: T('Test', 'Prueba') }, { key: 'h0', label: T('Null hypothesis', 'Hipótesis nula') }, { key: 'stat', label: T('Statistic', 'Estadístico') }, { key: 'df', label: T('df', 'g.l.') },
    { key: 'p', label: T('p-value', 'valor de p'), num: true, fmt: fmtP }, { key: 'dec', label: T('Decision', 'Decisión'), html: true, get: r => !isFinite(r.p) ? '—' : r.p < al ? `<span class="flag bad">${T('reject H₀', 'se rechaza H₀')} (p &lt; ${al})</span>` : `<span class="flag ok">${T('do not reject', 'no se rechaza')}</span>` },
  ], rows, { caption: T(`Assumption tests on the residuals of ${LM.formula(a.resp, a.terms)}`, `Pruebas de supuestos en los residuales de ${LM.formula(a.resp, a.terms)}`) });

  /* outliers */
  const out = a.stud.map((v, i) => ({ v, i })).filter(x => Math.abs(x.v) > 2.5).sort((p, q) => Math.abs(q.v) - Math.abs(p.v));
  const oh = el('assOutliers');
  if (!out.length) oh.innerHTML = `<p class="hint">${T('No observation has |studentized residual| &gt; 2.5.', 'Ninguna observación tiene |residual estudentizado| &gt; 2.5.')}</p>`;
  else buildTable(oh, [
    { key: 'row', label: T('Row in file', 'Renglón del archivo'), num: true }, { key: 'trt', label: T('Treatment', 'Tratamiento') }, { key: 'blk', label: T('Block', 'Bloque') },
    { key: 'obs', label: T('Observed', 'Observado'), num: true, fmt: fx }, { key: 'fit', label: T('Fitted', 'Ajustado'), num: true, fmt: fx }, { key: 'res', label: T('Residual', 'Residual'), num: true, fmt: fx }, { key: 'stud', label: T('Studentized', 'Estudentizado'), num: true, fmt: fx }, { key: 'lev', label: T('Leverage', 'Apalancamiento'), num: true, fmt: fx },
  ], out.map(x => { const r = a.recs[x.i]; return { row: r.row + 2, trt: trtKey(r), blk: a.o.blocks.map(b => r.f[b]).join(' / ') || (a.o.row ? r.f[a.o.row] + ' / ' + r.f[a.o.col] : '—'), obs: r.y, fit: a.fit.fitted[x.i], res: a.fit.resid[x.i], stud: x.v, lev: a.fit.hat[x.i] }; }), { caption: T('Observations with |studentized residual| > 2.5', 'Observaciones con |residual estudentizado| > 2.5') });

  /* figures */
  const fh = el('assFigs'); fh.innerHTML = '';
  const mount = (id, spec) => { const div = mk('div', { id: 'fig4_' + id }); fh.appendChild(div); Fig.mount(div, spec); };
  const labels = a.recs.map(r => T('row ', 'renglón ') + (r.row + 2));
  const grid = mk('div', { class: 'fig-grid' }); fh.appendChild(grid);
  const mountG = (id, spec) => { const div = mk('div', { id: 'fig4_' + id }); grid.appendChild(div); Fig.mount(div, spec); };
  mountG('qq', P4.qq(a.stud, { labels, fileName: slug(a.resp) + '_qq' }));
  mountG('hist', P3.histogram(a.fit.resid, { title: T('Histogram of residuals', 'Histograma de los residuales'), xlab: T('Residual', 'Residual'), fileName: slug(a.resp) + '_resid_hist', defaults: { showRug: true } }));
  mountG('rvf', P4.residScatter(a.fit.fitted, a.stud, { title: T('Residuals vs fitted values', 'Residuales contra valores ajustados'), xlab: T('Fitted value', 'Valor ajustado'), ylab: T('Studentized residual', 'Residual estudentizado'), labels, fileName: slug(a.resp) + '_resid_fitted' }));
  mountG('sl', P4.residScatter(a.fit.fitted, a.stud.map(v => Math.sqrt(Math.abs(v))), { title: T('Scale–location', 'Escala–posición'), xlab: T('Fitted value', 'Valor ajustado'), ylab: T('√|studentized residual|', '√|residual estudentizado|'), symmetric: false, labels, fileName: slug(a.resp) + '_scale_location', defaults: { showRef: false } }));
  const gr = a.gb.keys.map((k, i) => ({ label: k, values: a.gb.groups[i] }));
  mountG('rvg', P3.boxplot(gr, { title: T('Residuals by treatment', 'Residuales por tratamiento'), xlab: state.design.factors.join(' × '), ylab: T('Residual', 'Residual'), fileName: slug(a.resp) + '_resid_by_trt', defaults: { showMean: false, showN: false } }));
  mountG('order', P4.residScatter(a.recs.map((_, i) => i + 1), a.stud, { title: T('Residuals in data order', 'Residuales en el orden de los datos'), xlab: T('Observation order in the file', 'Orden de la observación en el archivo'), ylab: T('Studentized residual', 'Residual estudentizado'), labels, connect: true, fileName: slug(a.resp) + '_resid_order', defaults: { showSmooth: false } }));
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
  const none = rows[0];
  const bc = AS.boxcox(a.M, a.recs);
  /* prefer the conventional power suggested by Box–Cox when it already satisfies the tests;
     otherwise take the candidate with the least evidence against the assumptions */
  const bcId = bc ? { '-1': 'inv', '0': 'log', '0.5': 'sqrt' }[String(bc.rounded)] : null;
  const bcRow = rows.find(r => r.t.id === bcId);
  const best = bcRow && bcRow.score >= al ? bcRow : rows.reduce((p, r) => r.score > p.score ? r : p, rows[0]);
  const worth = best !== none && best.score >= al && none.score < al;
  el('transVerdict').innerHTML = worth
    ? `<div class="callout"><b>${T('Suggested: ', 'Sugerida: ')}${esc(T(best.t.label))}</b> ${best === bcRow
        ? T(`It is the power closest to the Box–Cox estimate and it satisfies the tests (smallest p = ${fmtP(best.score)} vs ${fmtP(none.score)} on the original scale).`, `Es la potencia más cercana a la estimación de Box–Cox y cumple las pruebas (el menor p es ${fmtP(best.score)} contra ${fmtP(none.score)} en la escala original).`)
        : T(`It is the transformation with the least evidence against the assumptions (smallest p = ${fmtP(best.score)} vs ${fmtP(none.score)} on the original scale).`, `Es la transformación con menos evidencia en contra de los supuestos (el menor p es ${fmtP(best.score)} contra ${fmtP(none.score)} en la escala original).`)} ${best.t.when ? T('Typical use: ', 'Uso típico: ') + T(best.t.when) + '.' : ''} ${T('Remember: means and letters are compared on the transformed scale; report back-transformed means (Block 5 does it) and state the transformation in the methods.', 'Recuerda: las medias y las letras se comparan en la escala transformada; reporta las medias retro-transformadas (el Bloque 5 lo hace) y di cuál transformación usaste en los métodos.')}</div>`
    : none.score >= al ? `<div class="callout"><b>${T('No transformation needed.', 'No hace falta transformar.')}</b> ${T('The original scale already satisfies the assumptions; transforming would only make the results harder to interpret.', 'La escala original ya cumple los supuestos; transformar solo haría más difícil interpretar los resultados.')}</div>`
    : `<div class="callout warn"><b>${T('No transformation fixes all the problems.', 'Ninguna transformación arregla todos los problemas.')}</b> ${T(`The best candidate is ${esc(T(best.t.label))} (smallest p = ${fmtP(best.score)}).`, `La mejor candidata es ${esc(T(best.t.label))} (el menor p es ${fmtP(best.score)}).`)} ${T('Consider the non-parametric route below, or a generalised linear model if the response is a count or a proportion.', 'Considera la vía no paramétrica de abajo, o un modelo lineal generalizado si la respuesta es un conteo o una proporción.')}</div>`;
  buildTable('transTable', [
    { key: 'label', label: T('Transformation', 'Transformación'), html: true, get: r => (r === best && worth ? '★ ' : '') + esc(T(r.t.label)) + (r.t.when ? `<br><small class="hint" style="margin:0">${esc(T(r.t.when))}</small>` : '') },
    { key: 'sw', label: T('Shapiro W', 'W de Shapiro'), num: true, get: r => fmtFixed(r.sw.W, 3) }, { key: 'swp', label: T('p (normality)', 'p (normalidad)'), num: true, html: true, get: r => pill(r.sw.p, al) },
    { key: 'lev', label: T('p (Levene)', 'p (Levene)'), num: true, html: true, get: r => r.lev ? pill(r.lev.p, al) : '—' },
    { key: 'tk', label: T('p (additivity)', 'p (aditividad)'), num: true, html: true, get: r => r.tk ? pill(r.tk.p, al) : '—' },
    { key: 'fm', label: T('Fmax', 'Fmáx'), num: true, get: r => r.fm ? fmtFixed(r.fm.Fmax, 2) : '—' },
    { key: 'skew', label: T('Residual skewness', 'Sesgo de los residuales'), num: true, get: r => fmtFixed(r.skew, 2) },
    { key: 'cv', label: 'CV %', num: true, get: r => fmtFixed(r.cv, 1) },
    { key: 'use', label: '', html: true, get: r => r.t.id === 'none' ? '' : `<button class="btn btn-secondary btn-sm" data-trans="${r.t.id}">${T('Use', 'Usar')}</button>` },
  ], rows, { caption: T('Assumption tests after each candidate transformation (same model)', 'Pruebas de supuestos después de cada transformación candidata (el mismo modelo)') });
  els('#transTable button[data-trans]').forEach(b => b.addEventListener('click', () => applyTransform(list.find(t => t.id === b.dataset.trans))));
  /* Box–Cox */
  const bh = el('boxcoxHost'); bh.innerHTML = '';
  if (bc) {
    Fig.mount(bh, P4.boxcox(bc, {}));
    const lab = { '-1': T('reciprocal (1/y)', 'recíproco (1/y)'), '-0.5': T('reciprocal square root', 'recíproco de la raíz cuadrada'), '0': T('logarithm', 'logaritmo'), '0.5': T('square root', 'raíz cuadrada'), '1': T('none (λ = 1 is inside the interval)', 'ninguna (λ = 1 cae dentro del intervalo)'), '2': T('square', 'cuadrado') }[String(bc.rounded)];
    el('boxcoxText').innerHTML = T(`Box–Cox estimate λ̂ = <b>${bc.lambda.toFixed(2)}</b>, 95 % interval ${bc.ciLow.toFixed(1)} to ${bc.ciHigh.toFixed(1)}. `, `Estimación de Box–Cox λ̂ = <b>${bc.lambda.toFixed(2)}</b>, intervalo del 95 % de ${bc.ciLow.toFixed(1)} a ${bc.ciHigh.toFixed(1)}. `)
      + (bc.oneInside ? T('The interval includes 1: <b>no transformation is required</b> by this criterion.', 'El intervalo incluye el 1: por este criterio <b>no hace falta transformar</b>.')
                      : T(`Nearest conventional power: <b>λ = ${bc.rounded}</b> → ${lab}.`, `Potencia convencional más cercana: <b>λ = ${bc.rounded}</b> → ${lab}.`));
  } else el('boxcoxText').textContent = T('Box–Cox needs strictly positive values; add a constant first if the response has zeros.', 'Box–Cox necesita valores estrictamente positivos; suma una constante antes si la respuesta tiene ceros.');
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
  showMessage('assMessages', 'success', T(`New column <b>${esc(name)}</b> = ${esc(T(t.label))} of ${esc(from)} was added as a response variable and the diagnostics were re-run on it. The original column is untouched.`, `Se agregó la columna <b>${esc(name)}</b> = ${esc(T(t.label))} de ${esc(from)} como variable de respuesta y el diagnóstico se volvió a correr sobre ella. La columna original queda intacta.`));
  el('assResults').scrollIntoView({ behavior: 'smooth' });
}

/* ================= non-parametric ================= */
function setupNonpar() {
  const a = A, d = state.design;
  const sel = el('npMethod'); sel.innerHTML = '';
  const one = d.factors.length === 1;
  const noBlk = !d.blocks.length && !d.row;
  const opts = [];
  if (one && noBlk) { opts.push(['kw', T('Kruskal–Wallis (one factor, completely randomised)', 'Kruskal–Wallis (un factor, completamente al azar)')]); opts.push(['welch', T('Welch ANOVA (unequal variances, normal data)', 'Análisis de varianza de Welch (varianzas desiguales, datos normales)')]); }
  if (one && d.blocks.length === 1) {
    const b = d.blocks[0]; const cnt = {}; a.recs.forEach(r => { const k = r.f[b] + '|' + r.f[d.factors[0]]; cnt[k] = (cnt[k] || 0) + 1; });
    const nb = a.levelsMap[b].length, nt = a.levelsMap[d.factors[0]].length;
    if (Object.keys(cnt).length === nb * nt && Object.values(cnt).every(v => v === 1)) opts.push(['friedman', T('Friedman (one factor in complete blocks)', 'Friedman (un factor en bloques completos)')]);
  }
  if (d.factors.length === 2 && noBlk) opts.push(['srh', T('Scheirer–Ray–Hare (two factors on ranks)', 'Scheirer–Ray–Hare (dos factores sobre rangos)')]);
  opts.push(['art', T('Aligned Rank Transform ANOVA (any factorial / blocked design)', 'Análisis de varianza por rangos alineados (cualquier diseño factorial o en bloques)')]);
  if (one && noBlk) opts.push(['kw2', T('Kruskal–Wallis with pairwise Mann–Whitney', 'Kruskal–Wallis con Mann–Whitney por pares')]);
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
    const c1 = card(T('Pairwise comparisons', 'Comparaciones por pares'), T(`Adjustment: ${NP.adjustNames[adj] || adj}. Two levels differ when the adjusted p is below ${al}.`, `Ajuste: ${NP.adjustNames[adj] || adj}. Dos niveles difieren cuando la p ajustada queda por debajo de ${al}.`));
    const ts = mk('div', { class: 'table-scroll' }); c1.appendChild(ts);
    buildTable(ts, [{ key: 'a', label: T('Level i', 'Nivel i') }, { key: 'b', label: T('Level j', 'Nivel j') }, { key: 's', label: statKey, num: true, fmt: v => fmtFixed(v, 3) }, { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 'padj', label: T('adjusted p', 'p ajustada'), num: true, fmt: fmtP }, { key: 'sig', label: '', html: true }],
      pairs.map(p => ({ a: lv[p.i], b: lv[p.j], s: p[statKey.toLowerCase()] != null ? p[statKey.toLowerCase()] : p.z, p: p.p, padj: p.padj, sig: p.padj < al ? `<span class="flag bad">${T('different', 'difieren')}</span>` : '<span class="flag ok">ns</span>' })));
    const c2 = card(T('Groups', 'Grupos'), T('Levels sharing a letter are not significantly different (letters from maximal cliques, so a level may carry several).', 'Los niveles que comparten una letra no difieren de manera significativa (las letras salen de camarillas máximas, así que un nivel puede llevar varias).'));
    const ts2 = mk('div', { class: 'table-scroll' }); c2.appendChild(ts2);
    buildTable(ts2, [{ key: 'l', label: f1 }, { key: 'n', label: 'n', num: true }, { key: 'med', label: T('Median', 'Mediana'), num: true, fmt: v => fmtFixed(v, 3) }, { key: 'mean', label: T('Mean', 'Media'), num: true, fmt: v => fmtFixed(v, 3) }, { key: 'mr', label: T('Mean rank', 'Rango medio'), num: true, fmt: v => fmtFixed(v, 2) }, { key: 'let', label: T('Group', 'Grupo'), html: true }],
      lv.map((l, i) => ({ l, n: byLevel[i].length, med: S.median(byLevel[i]), mean: S.mean(byLevel[i]), mr: extra.meanRanks ? extra.meanRanks[i] : NaN, let: `<b>${letters[i]}</b>` })).sort((p, q) => q.med - p.med));
    const fh = mk('div', { id: 'fig4_np' }); host.appendChild(fh);
    Fig.mount(fh, P4.rankMeans(lv.map((l, i) => ({ label: l, value: S.median(byLevel[i]), letters: letters[i] })), { title: T(`Median ${a.resp} by ${f1} with ${extra.postName} groups`, `Mediana de ${a.resp} por ${f1} con los grupos de ${extra.postName}`), xlab: f1, ylab: T('Median ', 'Mediana de ') + a.resp, fileName: slug(a.resp) + '_nonparametric' }));
  };
  const testTable = (rows, caption) => { const c = card(T('Test', 'Prueba')); const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts); buildTable(ts, [{ key: 'k', label: T('Quantity', 'Cantidad') }, { key: 'v', label: T('Value', 'Valor'), html: true }], rows.map(([k, v]) => ({ k, v })), { caption }); };

  if (method === 'kw' || method === 'kw2') {
    const kw = NP.kruskal(byLevel);
    testTable([[T('H (tie-corrected)', 'H (corregida por empates)'), fmtFixed(kw.H, 3)], [T('df', 'g.l.'), kw.df], [T('p-value', 'valor de p'), `<b>${fmtP(kw.p)}</b> ${sigStars(kw.p)}`], [T('ε² (effect size)', 'ε² (tamaño del efecto)'), fmtFixed(kw.eps2, 3)], [T('Interpretation', 'Interpretación'), kw.p < al ? T(`At least one ${f1} level has a different distribution (median).`, `Al menos un nivel de ${f1} tiene una distribución (mediana) distinta.`) : T(`No evidence of differences among ${f1} levels.`, `No hay evidencia de diferencias entre los niveles de ${f1}.`)]], T(`Kruskal–Wallis rank sum test: ${a.resp} ~ ${f1}`, `Prueba de sumas de rangos de Kruskal–Wallis: ${a.resp} ~ ${f1}`));
    if (method === 'kw') summaryAndLetters(NP.dunn(byLevel, kw, adj), 'z', { meanRanks: kw.meanRanks, postName: 'Dunn' });
    else { const pairs = []; for (let i = 0; i < lv.length; i++) for (let j = i + 1; j < lv.length; j++) { const w = NP.wilcoxPair(byLevel[i], byLevel[j]); pairs.push({ i, j, z: w.z, p: w.p }); } const pa = NP.adjust(pairs.map(p => p.p), adj); pairs.forEach((p, k) => p.padj = pa[k]); summaryAndLetters(pairs, 'z', { meanRanks: kw.meanRanks, postName: 'Mann–Whitney' }); }
  } else if (method === 'welch') {
    const w = NP.welch(byLevel);
    testTable([['F (Welch)', fmtFixed(w.F, 3)], [T('df', 'g.l.'), `${w.df1}, ${fmtFixed(w.df2, 2)}`], [T('p-value', 'valor de p'), `<b>${fmtP(w.p)}</b> ${sigStars(w.p)}`], [T('Interpretation', 'Interpretación'), w.p < al ? T('Means differ (variances not assumed equal).', 'Las medias difieren (sin suponer varianzas iguales).') : T('No evidence of mean differences.', 'No hay evidencia de diferencias entre medias.')]], T(`Welch one-way ANOVA: ${a.resp} ~ ${f1}`, `Análisis de varianza de Welch de un factor: ${a.resp} ~ ${f1}`));
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
    testTable([[T('Friedman χ² (tie-corrected)', 'χ² de Friedman (corregida por empates)'), fmtFixed(fr.Fr, 3)], [T('df', 'g.l.'), fr.df], [T('p-value', 'valor de p'), `<b>${fmtP(fr.p)}</b> ${sigStars(fr.p)}`], ['F de Iman–Davenport', T(`${fmtFixed(fr.Ff, 3)} on ${fr.df1}, ${fr.df2} df, p = ${fmtP(fr.pF)}`, `${fmtFixed(fr.Ff, 3)} con ${fr.df1}, ${fr.df2} g.l., p = ${fmtP(fr.pF)}`)], [T("Kendall's W (agreement among blocks)", 'W de Kendall (concordancia entre bloques)'), fmtFixed(fr.W, 3)], [T('Interpretation', 'Interpretación'), fr.p < al ? T(`${f1} levels differ, taking blocks into account.`, `Los niveles de ${f1} difieren, tomando en cuenta los bloques.`) : T(`No evidence of ${f1} differences.`, `No hay evidencia de diferencias en ${f1}.`)]], T(`Friedman test: ${a.resp} ~ ${f1} | ${b}`, `Prueba de Friedman: ${a.resp} ~ ${f1} | ${b}`));
    const post = el('npPost').value === 'nemenyi' ? NP.nemenyi(fr) : NP.conover(fr, adj);
    summaryAndLetters(post, el('npPost').value === 'nemenyi' ? 'q' : 't', { meanRanks: fr.meanRanks, postName: el('npPost').value === 'nemenyi' ? 'Nemenyi' : 'Conover' });
  } else if (method === 'srh') {
    const terms = LM.termsFromDesign({ factors: d.factors, interactions: true });
    const r = NP.srh(a.recs, terms, a.levelsMap);
    const c = card(T('Scheirer–Ray–Hare extension of Kruskal–Wallis', 'Extensión de Scheirer–Ray–Hare de Kruskal–Wallis'), T('H = SS of ranks / MS total of ranks; compared with χ².', 'H = SC de los rangos / CM total de los rangos; se compara con χ².'));
    const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts);
    buildTable(ts, [{ key: 'term', label: T('Source', 'Fuente') }, { key: 'df', label: T('df', 'g.l.'), num: true }, { key: 'ss', label: T('SS (ranks)', 'SC (rangos)'), num: true, fmt: v => fmtFixed(v, 2) }, { key: 'H', label: 'H', num: true, fmt: v => fmtFixed(v, 3) }, { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 's', label: '', get: q => sigStars(q.p) }], r.rows);
  } else if (method === 'art') {
    const r = NP.art(a.recs, a.terms, a.levelsMap);
    const c = card(T('Aligned Rank Transform ANOVA', 'Análisis de varianza por rangos alineados'), T('Each row comes from its own alignment and ranking. F-tests are read like a parametric ANOVA. The "aligned sum" column should be ≈ 0 for every row (sanity check).', 'Cada renglón sale de su propio alineamiento y de su propio ordenamiento por rangos. Las pruebas de F se leen como en un análisis de varianza paramétrico. La columna «suma alineada» debe dar ≈ 0 en todos los renglones (comprobación).'));
    const ts = mk('div', { class: 'table-scroll' }); c.appendChild(ts);
    buildTable(ts, [{ key: 'term', label: T('Source', 'Fuente') }, { key: 'df', label: T('df', 'g.l.'), num: true }, { key: 'dfRes', label: T('df error', 'g.l. del error'), num: true }, { key: 'F', label: 'F', num: true, fmt: v => fmtFixed(v, 3) }, { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 's', label: '', get: q => sigStars(q.p) }, { key: 'sumAligned', label: T('aligned sum', 'suma alineada'), num: true, fmt: v => fmtFixed(v, 6) }], r.rows, { caption: T(`ART ANOVA for ${LM.formula(a.resp, a.terms)}`, `Análisis por rangos alineados de ${LM.formula(a.resp, a.terms)}`) });
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
    } else if (ti >= 0 && lv.length > 2) host.appendChild(mk('p', { class: 'hint' }, T(`The main effect of ${esc(f1)} is not significant at α = ${al}; no pairwise comparisons are shown.`, `El efecto principal de ${esc(f1)} no es significativo con α = ${al}; no se muestran comparaciones por pares.`)));
  }
}

function init() {
  if (!el('assResponse')) return;
  el('assRun').addEventListener('click', run);
  el('assResponse').addEventListener('change', showFormula);
  el('assInter').addEventListener('change', showFormula);
  el('npRun').addEventListener('click', runNonpar);
  el('npMethod').addEventListener('change', () => { el('npPostWrap').style.display = el('npMethod').value === 'friedman' ? '' : 'none'; });
  document.addEventListener('datachange', () => {
    dataDirty = true; A = null;
    /* hide and clear the diagnostics of the previous table (the report collects every figure on the page) */
    el('assResults').style.display = 'none'; el('transCard').style.display = 'none'; el('npCard').style.display = 'none';
    el('assFigs').innerHTML = ''; el('boxcoxHost').innerHTML = ''; el('npResults').innerHTML = '';
    if (state.ready) fillControls();
  });
  document.addEventListener('stepchange', e => { if (e.detail.step === 4 && state.ready) { fillControls(); if (dataDirty || !A || A.resp !== el('assResponse').value) run(); } });
  /* a change of language redraws the diagnostics, the transformation table and the non-parametric menu */
  document.addEventListener('langchange', () => {
    if (!state.ready || !el('assResponse').options.length) return;
    showFormula();
    if (A) { const m = el('npMethod').value, hadNp = el('npResults').innerHTML !== ''; renderResults(); renderTransforms(); setupNonpar(); if ([...el('npMethod').options].some(o => o.value === m)) el('npMethod').value = m; if (hadNp) runNonpar(); }
  });
}
document.addEventListener('DOMContentLoaded', init);
})();
