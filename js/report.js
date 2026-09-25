/* AgriDesign — Block 7: self-contained HTML report, print-to-PDF and ZIP package. */

(function () {
const Report = {};
/* ---------- software citation (kept in sync with CITATION.cff) ---------- */
Report.CITE = {
  author: 'Barrera-Guzmán, L. Á.', year: 2026, version: '1.0',
  title: 'AgriDesign: a browser-based platform for the design and analysis of agricultural experiments',
  doi: '10.5281/zenodo.22683046', url: 'https://doi.org/10.5281/zenodo.22683046', repo: 'https://github.com/luisangelbg/AgriDesign', online: 'https://luisangelbg.github.io/AgriDesign/',
};
Report.citation = () => { const c = Report.CITE; return `${c.author} (${c.year}). ${c.title} (Version ${c.version}) [Computer software]. Zenodo. ${c.url}`; };
Report.bibtex = () => { const c = Report.CITE; return `@software{barrera_guzman_agridesign_${c.year},\n  author  = {Barrera-Guzmán, Luis Ángel},\n  title   = {${c.title}},\n  year    = {${c.year}},\n  version = {${c.version}},\n  doi     = {${c.doi}},\n  url     = {${c.url}}\n}`; };
Report.citeSection = () => { const c = Report.CITE; return `<h2>${T('How to cite', 'Cómo citar')}</h2><p>${T('If this analysis is published, please cite the software:', 'Si este análisis se publica, cita por favor el programa:')}</p><p style="padding-left:2em;text-indent:-2em">${esc(c.author)} (${c.year}). <i>${esc(c.title)}</i> (${T('Version', 'Versión')} ${c.version}) [${T('Computer software', 'Programa de cómputo')}]. Zenodo. <a href="${c.url}">${c.url}</a></p><p class="small">${T('The DOI is a concept DOI and always resolves to the latest version; version-specific DOIs are listed on the Zenodo record.', 'El DOI es un DOI de concepto y siempre lleva a la versión más reciente; los DOI de cada versión están en el registro de Zenodo.')} ${T('Source code', 'Código fuente')}: <a href="${c.repo}">${c.repo}</a> · ${T('online version', 'versión en línea')}: <a href="${c.online}">${c.online}</a> · ${T('license GPL-3.0', 'licencia GPL-3.0')}.</p><pre style="background:#f4f6f3;border-radius:8px;padding:10px 12px;font-size:12px;overflow-x:auto">${esc(Report.bibtex())}</pre>`; };
const lc = s => { const t = s.replace(/\s*\(.*?\)\s*$/, ''); return t.charAt(0).toLowerCase() + t.slice(1); };
const fx = (v, d) => fmtFixed(v, d == null ? 3 : d);
let figN = 0, tabN = 0;

/* ---------- helpers ---------- */
function htmlTable(cols, rows, caption) {
  tabN++;
  const th = cols.map(c => `<th${c.num ? ' class="num"' : ''}>${c.label}</th>`).join('');
  const body = rows.map(r => `<tr${r._class ? ' class="' + r._class + '"' : ''}>` + cols.map(c => { let v = c.get ? c.get(r) : r[c.key]; if (!c.html) { if (c.fmt && v != null && v !== '') v = c.fmt(v); v = (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) ? '—' : esc(v); } return `<td${c.num ? ' class="num"' : ''}>${v == null ? '—' : v}</td>`; }).join('') + '</tr>').join('');
  return `<table><caption><b>${T('Table', 'Cuadro')} ${tabN}.</b> ${caption}</caption><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}
function figure(svgEl, caption) {
  figN++;
  const clone = svgEl.cloneNode(true);
  clone.removeAttribute('width'); clone.removeAttribute('height');
  clone.setAttribute('style', 'max-width:100%;height:auto');
  return `<figure>${new XMLSerializer().serializeToString(clone)}<figcaption><b>${T('Figure', 'Figura')} ${figN}.</b> ${caption}</figcaption></figure>`;
}
const CSS = `
body{font-family:Arial,Helvetica,sans-serif;color:#1b1f2a;max-width:960px;margin:0 auto;padding:28px 32px;line-height:1.5;font-size:14px}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.5px}h2{font-size:19px;margin:30px 0 8px;border-bottom:2px solid #2f7d4f;padding-bottom:4px;color:#256640}h3{font-size:15px;margin:18px 0 6px}
.meta{color:#5f6b64;margin-bottom:18px}.meta b{color:#1b1f2a}
table{border-collapse:collapse;width:100%;font-size:12.5px;margin:10px 0 16px}caption{caption-side:top;text-align:left;padding:4px 0 6px;font-size:13px}
th,td{padding:5px 8px;border-bottom:1px solid #dde4dc;text-align:left;white-space:nowrap}thead th{border-bottom:2px solid #9aa39d;background:#f4f6f3}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
tr.total td{font-weight:700;border-top:2px solid #9aa39d}tr.dim td{color:#5f6b64}
figure{margin:14px 0 22px;page-break-inside:avoid}figcaption{font-size:12.5px;color:#333;margin-top:6px}
.box{border-left:3px solid #2f7d4f;background:#f4f6f3;padding:10px 14px;margin:10px 0;border-radius:0 6px 6px 0;font-size:13px}.box.warn{border-color:#d98a1c}.box.bad{border-color:#c93a2c}
.grade{display:inline-block;font-weight:800;font-size:22px;padding:2px 12px;border-radius:8px;background:#e9eee7;margin-right:8px}
ul{padding-left:20px}li{margin-bottom:4px}.small{font-size:12px;color:#5f6b64}code{background:#e9eee7;padding:1px 4px;border-radius:3px;font-size:12px}
.footer{margin-top:40px;border-top:1px solid #dde4dc;padding-top:10px;font-size:11.5px;color:#5f6b64}
@media print{body{padding:0;max-width:none;font-size:12px}h2{page-break-after:avoid}table{font-size:11px}a{color:inherit;text-decoration:none}.nobreak{page-break-inside:avoid}}
@page{size:A4;margin:18mm}`;

/* ---------- content builders ---------- */
function methodsText(R, A, o) {
  const d = R.d, c = R.design;
  const facs = d.factors.map(f => T(`${f} (${R.levelsMap[f].length} levels: ${R.levelsMap[f].join(', ')})`, `${f} (${R.levelsMap[f].length} niveles: ${R.levelsMap[f].join(', ')})`)).join('; ');
  const reps = d.blocks.length ? T(`${R.levelsMap[d.blocks[0]].length} blocks`, `${R.levelsMap[d.blocks[0]].length} bloques`)
    : (d.row ? T(`${R.levelsMap[d.row].length} rows × ${R.levelsMap[d.col].length} columns`, `${R.levelsMap[d.row].length} hileras × ${R.levelsMap[d.col].length} columnas`)
             : T(`${Math.round(R.recs.length / d.factors.reduce((p, f) => p * R.levelsMap[f].length, 1))} replicates per treatment`, `${Math.round(R.recs.length / d.factors.reduce((p, f) => p * R.levelsMap[f].length, 1))} repeticiones por tratamiento`));
  const trans = R.transform ? T(` The response was ${T(R.transform.label)} transformed before analysis to meet the assumptions; means are reported back-transformed.`, ` La respuesta se transformó con ${T(R.transform.label)} antes del análisis, para cumplir los supuestos; las medias se reportan retro-transformadas.`) : '';
  /* only state that assumptions were checked when Block 4 was actually run on this response */
  const assum = A && A.resp === R.resp
    ? T(` Residuals were checked for normality (Shapiro–Wilk), homogeneity of variances (Levene's test${A.tk ? ') and additivity (Tukey\'s one-degree-of-freedom test' : ''}).`,
        ` Los residuales se revisaron en cuanto a normalidad (Shapiro–Wilk), homogeneidad de varianzas (prueba de Levene${A.tk ? ') y aditividad (prueba de un grado de libertad de Tukey' : ''}).`) : '';
  const cov = d.covariates.length ? T(` ${d.covariates.join(', ')} ${d.covariates.length > 1 ? 'were' : 'was'} included as covariate${d.covariates.length > 1 ? 's' : ''} (ANCOVA).`, ` Se ${d.covariates.length > 1 ? 'incluyeron' : 'incluyó'} ${d.covariates.join(', ')} como ${d.covariates.length > 1 ? 'covariables' : 'covariable'} (ANCOVA).`) : '';
  const resp = esc(R.resp.replace(/_(ln|log10|sqrt|sqrt05|asin|logit|inv|ln1)$/, ''));
  const trend = d.factors.some(f => R.levelsMap[f].length >= 3 && R.levelsMap[f].every(l => /^[+-]?\d+(\.\d+)?$/.test(l)));
  return T(
    `<p>The experiment was laid out as a <b>${lc(T(c.name))}</b> with ${reps}. Treatment factor${d.factors.length > 1 ? 's were' : ' was'} ${facs}. The response variable was <b>${resp}</b>${o.units ? ' (' + esc(o.units) + ')' : ''}.${cov}${trans}${assum} Data were analysed by analysis of variance according to the model <code>${esc(c.model)}</code> with ${R.terms.some(t => t.isError) ? 'the appropriate error strata' : 'a single error term'} and Type ${+el('anSS').value === 1 ? 'I' : 'III'} sums of squares. Treatment means were compared with ${PH.methods[R.method].name} at α = ${R.alpha}${trend ? ', and trends over quantitative factors were examined with orthogonal polynomial contrasts' : ''}. All computations were performed with AgriDesign version ${Report.CITE.version} (${Report.CITE.author.replace(/,.*/, '')}, ${Report.CITE.year}; ${Report.CITE.url}), a browser-based platform for the design and analysis of agricultural experiments.</p>`,
    `<p>El experimento se acomodó en un <b>${lc(T(c.name))}</b> con ${reps}. ${d.factors.length > 1 ? 'Los factores de tratamiento fueron' : 'El factor de tratamiento fue'} ${facs}. La variable de respuesta fue <b>${resp}</b>${o.units ? ' (' + esc(o.units) + ')' : ''}.${cov}${trans}${assum} Los datos se analizaron con análisis de varianza según el modelo <code>${esc(c.model)}</code>, con ${R.terms.some(t => t.isError) ? 'los estratos de error que corresponden' : 'un solo término de error'} y sumas de cuadrados de tipo ${+el('anSS').value === 1 ? 'I' : 'III'}. Las medias de tratamiento se compararon con ${PH.methods[R.method].name} y α = ${R.alpha}${trend ? ', y las tendencias sobre los factores cuantitativos se examinaron con contrastes polinomiales ortogonales' : ''}. Todos los cálculos se hicieron con AgriDesign versión ${Report.CITE.version} (${Report.CITE.author.replace(/,.*/, '')}, ${Report.CITE.year}; ${Report.CITE.url}), una plataforma de navegador para el diseño y el análisis de experimentos agrícolas.</p>`);
}
function dataSection(R) {
  const d = R.d, trt = r => d.factors.map(f => r.f[f]).join(' × ');
  const map = new Map(); R.recs.forEach(r => { const k = trt(r); if (!map.has(k)) map.set(k, []); map.get(k).push(r.y); });
  const rows = [...map.entries()].map(([k, v]) => ({ trt: k, n: v.length, mean: S.mean(v), sd: v.length > 1 ? S.sd(v) : NaN, se: v.length > 1 ? S.se(v) : NaN, cv: S.cv(v), min: S.min(v), max: S.max(v) }));
  const all = R.recs.map(r => r.y);
  rows.push({ trt: T('All observations', 'Todas las observaciones'), n: all.length, mean: S.mean(all), sd: S.sd(all), se: S.se(all), cv: S.cv(all), min: S.min(all), max: S.max(all), _class: 'total' });
  return `<p>` + T(`The data set <b>${esc(state.fileName || 'data')}</b> contains ${state.rawRows.length} rows and ${state.rawHeader.length} columns; ${R.recs.length} observations of ${esc(R.resp)} entered the analysis${R.recs.length < state.rawRows.length ? ` (${state.rawRows.length - R.recs.length} rows without a valid value were excluded)` : ''}.`,
    `El conjunto de datos <b>${esc(state.fileName || 'data')}</b> tiene ${state.rawRows.length} renglones y ${state.rawHeader.length} columnas; entraron al análisis ${R.recs.length} observaciones de ${esc(R.resp)}${R.recs.length < state.rawRows.length ? ` (se excluyeron ${state.rawRows.length - R.recs.length} renglones sin un valor válido)` : ''}.`) + `</p>` +
    htmlTable([{ key: 'trt', label: d.factors.join(' × ') }, { key: 'n', label: 'n', num: true }, { key: 'mean', label: T('Mean', 'Media'), num: true, fmt: fx }, { key: 'sd', label: T('SD', 'DE'), num: true, fmt: fx }, { key: 'se', label: T('SE', 'EE'), num: true, fmt: fx }, { key: 'cv', label: 'CV %', num: true, fmt: v => fx(v, 1) }, { key: 'min', label: T('Min', 'Mín'), num: true, fmt: fx }, { key: 'max', label: T('Max', 'Máx'), num: true, fmt: fx }], rows, T(`Descriptive statistics of ${esc(R.resp)} by treatment.`, `Estadística descriptiva de ${esc(R.resp)} por tratamiento.`));
}
function assumptionsSection(A) {
  const al = A.alpha;
  const rows = [{ t: T('Shapiro–Wilk (normality of residuals)', 'Shapiro–Wilk (normalidad de los residuales)'), s: 'W = ' + fx(A.sw.W), p: A.sw.p }, { t: T('Anderson–Darling (normality)', 'Anderson–Darling (normalidad)'), s: isFinite(A.ad.A) ? 'A² = ' + fx(A.ad.A) : '—', p: A.ad.p }];
  if (A.lev) rows.push({ t: T('Levene, median-centred (homogeneity of variances)', 'Levene, centrada en la mediana (homogeneidad de varianzas)'), s: `F(${A.lev.df1}, ${A.lev.df2}) = ` + fx(A.lev.F), p: A.lev.p }, { t: T('Bartlett (homogeneity of variances)', 'Bartlett (homogeneidad de varianzas)'), s: 'K² = ' + fx(A.bart.K2), p: A.bart.p });
  if (A.tk) rows.push({ t: T("Tukey's one-degree-of-freedom non-additivity", 'No aditividad de Tukey con un grado de libertad'), s: `F(${A.tk.df1}, ${A.tk.df2}) = ` + fx(A.tk.F), p: A.tk.p });
  rows.push({ t: T('Durbin–Watson (data order)', 'Durbin–Watson (orden de los datos)'), s: 'd = ' + fx(A.dw.d, 2), p: NaN });
  const g = A.grade || '—';
  const vt = { A: T('assumptions satisfied', 'supuestos cumplidos'), B: T('minor deviations, ANOVA acceptable', 'desviaciones menores, el análisis de varianza es aceptable'), C: T('clear deviation from at least one assumption', 'desviación clara en al menos un supuesto'), D: T('several assumptions fail', 'fallan varios supuestos') }[g] || '';
  return `<div class="box ${g === 'A' || g === 'B' ? '' : g === 'C' ? 'warn' : 'bad'}"><span class="grade">${g}</span> ` + T(`Overall: ${vt}. Model: <code>${esc(LM.formula(A.resp, A.terms))}</code>; residual df = ${A.fit.dfRes}; CV = ${fx(A.cv, 1)} %.`, `En conjunto: ${vt}. Modelo: <code>${esc(LM.formula(A.resp, A.terms))}</code>; g.l. del error = ${A.fit.dfRes}; CV = ${fx(A.cv, 1)} %.`) + `</div>` +
    htmlTable([{ key: 't', label: T('Test', 'Prueba') }, { key: 's', label: T('Statistic', 'Estadístico') }, { key: 'p', label: T('p-value', 'valor de p'), num: true, fmt: fmtP }, { key: 'd', label: T('Decision', 'Decisión'), get: r => !isFinite(r.p) ? '—' : r.p < al ? T('reject H₀', 'se rechaza H₀') : T('do not reject', 'no se rechaza') }], rows, T(`Assumption tests on the residuals of ${esc(A.resp)} (α = ${al}).`, `Pruebas de supuestos en los residuales de ${esc(A.resp)} (α = ${al}).`));
}
function anovaSection(R) {
  const a = R.anova;
  const rows = a.rows.map(r => ({ src: r.label, df: r.df, ss: r.ss, ms: r.ms, F: r.F, p: r.p, sig: sigStars(r.p), err: r.errorTerm === 'Residuals' ? T('Residual', 'Residual') : (R.strata[r.errorTerm] || {}).label || r.errorTerm, _class: r.isError ? 'dim' : '' }));
  rows.push({ src: T('Residual error', 'Error residual'), df: a.residual.df, ss: a.residual.ss, ms: a.residual.ms, F: NaN, p: NaN, sig: '', err: '', _class: 'dim' }, { src: T('Total', 'Total'), df: a.total.df, ss: a.total.ss, ms: NaN, F: NaN, p: NaN, sig: '', err: '', _class: 'total' });
  const t = htmlTable([{ key: 'src', label: T('Source', 'Fuente') }, { key: 'df', label: T('df', 'g.l.'), num: true }, { key: 'ss', label: T('SS', 'SC'), num: true, fmt: v => fx(v, 4) }, { key: 'ms', label: T('MS', 'CM'), num: true, fmt: v => fx(v, 4) }, { key: 'F', label: 'F', num: true, fmt: fx }, { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 'sig', label: '' }, { key: 'err', label: T('Tested against', 'Se prueba contra') }], rows,
    T(`Analysis of variance of ${esc(R.resp)} (${esc(T(R.design.name))}). CV = ${fx(R.cv, 1)} %, R² = ${fx(R.r2)}, grand mean = ${fx(R.grandMean)}. Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05, ns not significant.`,
      `Análisis de varianza de ${esc(R.resp)} (${esc(T(R.design.name))}). CV = ${fx(R.cv, 1)} %, R² = ${fx(R.r2)}, media general = ${fx(R.grandMean)}. Significancia: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05, ns = no significativo.`));
  /* the draft paragraph of Block 5 is app-generated HTML (names already escaped); keep its subscripts
     (F<sub>3,9</sub>) instead of flattening it to "F3,9" */
  const box = el('anNarrative') && el('anNarrative').querySelector('.callout');
  let nar = '';
  if (box) { const c = box.cloneNode(true); const b = c.querySelector('b'); if (b) b.remove(); nar = c.innerHTML.trim(); }
  return t + (nar ? `<p>${nar}</p>` : '');
}
function meansSection(R) {
  let out = '';
  const d = R.d;
  d.factors.forEach(f => {
    const fc = DS.factorComparison(R, f);
    const rows = fc.means.map((m, i) => ({ l: m.label, n: m.n, mean: m.mean, se: m.se, bt: R.transform ? R.transform.inv(m.mean) : NaN, let: fc.cmp.letters[i] })).sort((p, q) => q.mean - p.mean);
    const cols = [{ key: 'l', label: f }, { key: 'n', label: 'n', num: true }, { key: 'mean', label: T('Mean', 'Media'), num: true, fmt: fx }, { key: 'se', label: T('SE', 'EE'), num: true, fmt: fx }];
    if (R.transform) cols.push({ key: 'bt', label: T('Back-transformed', 'Retro-transformada'), num: true, fmt: fx });
    cols.push({ key: 'let', label: T('Group', 'Grupo') });
    const msd = fc.cmp.msd != null && !Array.isArray(fc.cmp.msd) ? ` ${fc.cmp.msdLabel} = ${fx(fc.cmp.msd)}.` : '';
    out += htmlTable(cols, rows, T(`Means of ${esc(R.resp)} by ${esc(f)}. Means followed by the same letter are not significantly different (${PH.methods[R.method].name}, α = ${R.alpha}; error: ${esc(fc.err.label)}).${msd}`,
      `Medias de ${esc(R.resp)} por ${esc(f)}. Las medias seguidas por la misma letra no difieren de manera significativa (${PH.methods[R.method].name}, α = ${R.alpha}; error: ${esc(fc.err.label)}).${msd}`));
    const lv = R.levelsMap[f];
    if (lv.length >= 3 && lv.every(l => /^[+-]?\d+(\.\d+)?$/.test(l))) {
      const pc = PH.polyContrasts(fc.means.map(m => ({ label: m.label, mean: m.mean, n: m.n })), lv.map(Number), fc.err.ms, fc.err.df, Math.min(3, lv.length - 1));
      out += htmlTable([{ key: 'name', label: T('Component', 'Componente') }, { key: 'ss', label: T('SS', 'SC'), num: true, fmt: v => fx(v, 4) }, { key: 'F', label: 'F', num: true, fmt: fx }, { key: 'pF', label: 'p', num: true, fmt: fmtP }, { key: 's', label: '', get: r => sigStars(r.pF) }], pc, T(`Orthogonal polynomial contrasts for ${esc(f)}.`, `Contrastes polinomiales ortogonales para ${esc(f)}.`));
    }
  });
  for (let i = 0; i < d.factors.length; i++) for (let j = i + 1; j < d.factors.length; j++) {
    const A = d.factors[i], B = d.factors[j];
    if (!R.terms.some(t => t.factors && t.factors.length === 2 && t.factors.includes(A) && t.factors.includes(B))) continue;
    const sl = DS.sliceLetters(R, A, B);
    const la = R.levelsMap[A], lb = R.levelsMap[B];
    const rows = la.map(a => { const o = { a }; lb.forEach(b => { const c = sl.byLevel[a + '|' + b]; o[b] = `${fx(c.mean)} ${c.letters}`; }); return o; });
    out += htmlTable([{ key: 'a', label: `${A} \\ ${B}` }].concat(lb.map(b => ({ key: b, label: b, num: true }))), rows, T(`Cell means of ${esc(R.resp)} for ${esc(A)} × ${esc(B)}. Letters compare the levels of ${esc(B)} within each level of ${esc(A)} (${PH.methods[R.method].name}, α = ${R.alpha}).`,
      `Medias de celda de ${esc(R.resp)} para ${esc(A)} × ${esc(B)}. Las letras comparan los niveles de ${esc(B)} dentro de cada nivel de ${esc(A)} (${PH.methods[R.method].name}, α = ${R.alpha}).`));
  }
  return out;
}
function pairwiseAppendix(R) {
  let out = '';
  R.d.factors.forEach(f => {
    const fc = DS.factorComparison(R, f);
    out += htmlTable([{ key: 'a', label: T('Level i', 'Nivel i'), get: p => fc.means[p.i].label }, { key: 'b', label: T('Level j', 'Nivel j'), get: p => fc.means[p.j].label }, { key: 'diff', label: T('Difference', 'Diferencia'), num: true, fmt: fx }, { key: 'se', label: T('SE', 'EE'), num: true, fmt: fx }, { key: 'stat', label: T('Statistic', 'Estadístico'), num: true, fmt: fx }, { key: 'padj', label: T('adj. p', 'p ajustada'), num: true, fmt: fmtP }, { key: 's', label: '', get: p => p.sig ? '*' : 'ns' }], fc.cmp.pairs, T(`Pairwise comparisons for ${esc(f)} (${PH.methods[R.method].name}).`, `Comparaciones por pares para ${esc(f)} (${PH.methods[R.method].name}).`));
  });
  return out;
}
function figuresSection(o) {
  const groups = [[3, T('Exploratory figures (Block 3)', 'Figuras de exploración (Bloque 3)'), /^fig3_/], [4, T('Residual diagnostics (Block 4)', 'Diagnóstico de residuales (Bloque 4)'), /^fig4_/], [5, T('Means and trends (Block 5)', 'Medias y tendencias (Bloque 5)'), /^fig5_/], [6, T('Result graphics (Block 6)', 'Gráficas de resultados (Bloque 6)'), /^fig6_/]];
  let out = '', first = true;
  const mounted = Fig.mounted();
  groups.forEach(([n, title, rx]) => {
    if (!o.figBlocks.includes(n)) return;
    const list = mounted.filter(a => rx.test(a.hostId));
    if (!list.length) return;
    const figs = list.map(a => figure(a.svg, esc(a.title.replace(/_/g, ' '))));
    /* keep each heading on the same printed page as its first figure (the section heading too) */
    out += `<div class="nobreak">${first ? `<h2>${T('Figures', 'Figuras')}</h2>` : ''}<h3>${title}</h3>${figs[0]}</div>` + figs.slice(1).join('');
    first = false;
  });
  return out || `<h2>${T('Figures', 'Figuras')}</h2><p class="small">${T('No figures were included.', 'No se incluyó ninguna figura.')}</p>`;
}

/* ---------- assemble ---------- */
Report.build = o => {
  figN = 0; tabN = 0;
  const R = state.anova, A = state.assumptions;
  const date = new Date().toLocaleDateString(T('en-GB', 'es-MX'), { year: 'numeric', month: 'long', day: 'numeric' });
  let body = `<h1>${esc(o.title)}</h1><div class="meta">${o.authors ? '<b>' + esc(o.authors) + '</b><br>' : ''}${o.affil ? esc(o.affil) + '<br>' : ''}${o.trial ? esc(o.trial) + '<br>' : ''}` +
    T(`Report generated on ${date} with AgriDesign · data file: ${esc(state.fileName || '—')}`, `Informe generado el ${date} con AgriDesign · archivo de datos: ${esc(state.fileName || '—')}`) + `</div>`;
  if (o.objective) body += `<h2>${T('Objective', 'Objetivo')}</h2><p>${esc(o.objective)}</p>`;
  body += `<h2>${T('Materials and methods', 'Materiales y métodos')}</h2>${methodsText(R, A, o)}`;
  if (o.secData) body += `<h2>${T('Data', 'Datos')}</h2>${dataSection(R)}`;
  if (o.secAssump && A && A.resp === R.resp) body += `<h2>${T('Assumptions of the analysis of variance', 'Supuestos del análisis de varianza')}</h2>${assumptionsSection(A)}`;
  body += `<h2>${T('Results', 'Resultados')}</h2><h3>${T('Analysis of variance', 'Análisis de varianza')}</h3>${anovaSection(R)}<h3>${T('Treatment means', 'Medias de tratamiento')}</h3>${meansSection(R)}`;
  if (o.secFigs) body += figuresSection(o);
  if (o.secPairs) body += `<h2>${T('Appendix A · Pairwise comparisons', 'Apéndice A · Comparaciones por pares')}</h2>${pairwiseAppendix(R)}`;
  if (o.secRaw) body += `<h2>${T('Appendix B · Data', 'Apéndice B · Datos')}</h2>` + htmlTable(state.rawHeader.map((h, j) => ({ key: j, label: esc(h), get: r => r[j] })), state.rawRows, T('Data as loaded.', 'Los datos tal como se cargaron.'));
  if (o.secCite !== false) body += Report.citeSection();
  body += `<div class="footer">` + T('AgriDesign — design and analysis of agricultural experiments. All computations were performed locally in the browser; figures are embedded as vector graphics and can be extracted from this file.',
    'AgriDesign: diseño y análisis de experimentos agrícolas. Todos los cálculos se hicieron en el navegador, en esta computadora; las figuras van incrustadas como gráficos vectoriales y se pueden extraer de este archivo.') + `</div>`;
  return `<!DOCTYPE html><html lang="${I18N.lang}"><head><meta charset="UTF-8"><title>${esc(o.title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
};

/* ---------- ZIP package ---------- */
Report.zip = async (o, html) => {
  const R = state.anova;
  const files = [{ name: 'report.html', data: html }];
  files.push({ name: 'data/' + slug(state.fileName || 'data') + '.csv', data: matrixToCSV(state.rawHeader, state.rawRows) });
  const a = R.anova;
  files.push({ name: 'tables/anova.csv', data: matrixToCSV([T('Source', 'Fuente'), T('df', 'g.l.'), T('SS', 'SC'), T('MS', 'CM'), 'F', 'p', T('Tested against', 'Se prueba contra')], a.rows.map(r => [r.label, r.df, r.ss, r.ms, r.F, r.p, r.errorTerm]).concat([[T('Residual error', 'Error residual'), a.residual.df, a.residual.ss, a.residual.ms, '', '', ''], [T('Total', 'Total'), a.total.df, a.total.ss, '', '', '', '']])) });
  R.d.factors.forEach(f => {
    const fc = DS.factorComparison(R, f);
    files.push({ name: `tables/means_${slug(f)}.csv`, data: matrixToCSV([f, 'n', T('LS mean', 'Media de mínimos cuadrados'), T('SE', 'EE'), T('Raw mean', 'Media simple'), T('SD', 'DE'), T('Group', 'Grupo')], fc.means.map((m, i) => [m.label, m.n, m.mean, m.se, m.rawMean, m.sd, fc.cmp.letters[i]])) });
    files.push({ name: `tables/pairwise_${slug(f)}.csv`, data: matrixToCSV([T('Level i', 'Nivel i'), T('Level j', 'Nivel j'), T('Difference', 'Diferencia'), T('SE', 'EE'), T('Statistic', 'Estadístico'), 'p', T('adj p', 'p ajustada'), T('Significant', 'Significativo')], fc.cmp.pairs.map(p => [fc.means[p.i].label, fc.means[p.j].label, p.diff, p.se, p.stat, p.p, p.padj, p.sig ? T('yes', 'sí') : 'no'])) });
  });
  const scale = +o.zipRes, dpi = scale * 75;
  const mounted = Fig.mounted().filter(x => o.figBlocks.some(n => x.hostId.startsWith('fig' + n + '_')));
  for (const f of mounted) {
    files.push({ name: `figures/svg/${f.fileName}.svg`, data: Fig.serialize(f.svg) });
    if (o.zipFmt !== 'svg') { const blob = await Fig.toRaster(f.svg, { format: o.zipFmt, scale, dpi, background: '#ffffff' }); files.push({ name: `figures/${o.zipFmt}/${f.fileName}.${o.zipFmt === 'tiff' ? 'tif' : o.zipFmt}`, data: blob }); }
  }
  files.push({ name: 'README.txt', data: T(`${o.title}\n\nGenerated by AgriDesign on ${new Date().toISOString()}\nReport: report.html (open in any browser; print to PDF from the browser)\nData: data/\nTables: tables/ (CSV)\nFigures: figures/svg (vector) and figures/${o.zipFmt} (${dpi} dpi)\n`,
    `${o.title}\n\nGenerado por AgriDesign el ${new Date().toISOString()}\nInforme: report.html (se abre en cualquier navegador; imprime a PDF desde el navegador)\nDatos: data/\nCuadros: tables/ (CSV)\nFiguras: figures/svg (vectorial) y figures/${o.zipFmt} (${dpi} ppp)\n`) });
  return Zip.build(files);
};

/* ---------- UI ---------- */
function opts() {
  return {
    title: el('rpTitle').value.trim() || T('Analysis report', 'Informe de análisis'), authors: el('rpAuthors').value.trim(), affil: el('rpAffil').value.trim(), trial: el('rpTrial').value.trim(), objective: el('rpObjective').value.trim(), units: el('rpUnits').value.trim(),
    secData: el('rpSecData').checked, secAssump: el('rpSecAssump').checked, secFigs: el('rpSecFigs').checked, secPairs: el('rpSecPairs').checked, secRaw: el('rpSecRaw').checked, secCite: el('rpSecCite').checked,
    figBlocks: [3, 4, 5, 6].filter(n => el('rpFig' + n).checked), zipFmt: el('rpZipFmt').value, zipRes: el('rpZipRes').value,
  };
}
let lastHtml = '';
function preview() {
  if (!state.anova) return;
  const o = opts();
  lastHtml = Report.build(o);
  const fr = el('rpFrame'); fr.srcdoc = lastHtml;
  el('rpPreviewCard').style.display = '';
  el('rpInfo').textContent = T(`${(lastHtml.length / 1024).toFixed(0)} KB · ${tabN} tables · ${figN} figures`, `${(lastHtml.length / 1024).toFixed(0)} KB · ${tabN} cuadros · ${figN} figuras`);
}
function init() {
  if (!el('rpTitle')) return;
  el('rpPreview').addEventListener('click', preview);
  el('rpHtml').addEventListener('click', () => { if (!lastHtml) preview(); download(lastHtml, slug(opts().title) + '.html', 'text/html;charset=utf-8'); });
  el('rpPrint').addEventListener('click', () => { if (!lastHtml) preview(); const w = window.open('', '_blank'); if (!w) { alert(T('Allow pop-ups to print.', 'Permite las ventanas emergentes para poder imprimir.')); return; } w.document.write(lastHtml); w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 600); });
  el('rpZip').addEventListener('click', async () => { if (!lastHtml) preview(); const b = el('rpZip'); b.disabled = true; b.textContent = T('Packing…', 'Empaquetando…'); try { download(await Report.zip(opts(), lastHtml), slug(opts().title) + '_package.zip'); } catch (e) { alert(T('Could not build the package: ', 'No se pudo armar el paquete: ') + e.message); } b.disabled = false; b.textContent = T('⬇ Download full package (ZIP)', '⬇ Descargar el paquete completo (ZIP)'); });
  el('rpMethods').addEventListener('click', () => { const t = document.createElement('div'); t.innerHTML = methodsText(state.anova, state.assumptions, opts()); navigator.clipboard.writeText(t.innerText).then(() => showMessage('rpMessages', 'success', T('Methods paragraph copied to the clipboard.', 'El párrafo de métodos se copió al portapapeles.'))); });
  el('rpGo5').addEventListener('click', () => goStep(5));
  let autoTitle = '';
  document.addEventListener('stepchange', e => {
    if (e.detail.step !== 7) return;
    const has = !!state.anova;
    el('rpNoResults').style.display = has ? 'none' : ''; el('rpMain').style.display = has ? '' : 'none';
    /* the suggested title follows the analysis; a title typed by the user is never replaced */
    if (has) {
      const t = T(`Effect of ${state.anova.d.factors.join(' and ')} on ${state.anova.resp}`, `Efecto de ${state.anova.d.factors.join(' y ')} sobre ${state.anova.resp}`);
      if (!el('rpTitle').value || el('rpTitle').value === autoTitle) { el('rpTitle').value = t; autoTitle = t; }
    }
    if (has) preview();
  });
  /* a change of language rewrites the suggested title and the whole report */
  document.addEventListener('langchange', () => {
    if (!state.anova || el('rpMain').style.display === 'none') return;
    const t = T(`Effect of ${state.anova.d.factors.join(' and ')} on ${state.anova.resp}`, `Efecto de ${state.anova.d.factors.join(' y ')} sobre ${state.anova.resp}`);
    if (!el('rpTitle').value || el('rpTitle').value === autoTitle) { el('rpTitle').value = t; autoTitle = t; }
    if (lastHtml) preview();
  });
}
document.addEventListener('DOMContentLoaded', init);
/* used by the manual's screenshot tool to print the report without a window */
window.B7 = { opts, preview };
window.Report = Report;
})();
