/* AgriDesign — Block 7: self-contained HTML report, print-to-PDF and ZIP package. */

(function () {
const Report = {};
const lc = s => { const t = s.replace(/\s*\(.*?\)\s*$/, ''); return t.charAt(0).toLowerCase() + t.slice(1); };
const fx = (v, d) => fmtFixed(v, d == null ? 3 : d);
let figN = 0, tabN = 0;

/* ---------- helpers ---------- */
function htmlTable(cols, rows, caption) {
  tabN++;
  const th = cols.map(c => `<th${c.num ? ' class="num"' : ''}>${c.label}</th>`).join('');
  const body = rows.map(r => `<tr${r._class ? ' class="' + r._class + '"' : ''}>` + cols.map(c => { let v = c.get ? c.get(r) : r[c.key]; if (!c.html) { if (c.fmt && v != null && v !== '') v = c.fmt(v); v = (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) ? '—' : esc(v); } return `<td${c.num ? ' class="num"' : ''}>${v == null ? '—' : v}</td>`; }).join('') + '</tr>').join('');
  return `<table><caption><b>Table ${tabN}.</b> ${caption}</caption><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}
function figure(svgEl, caption) {
  figN++;
  const clone = svgEl.cloneNode(true);
  clone.removeAttribute('width'); clone.removeAttribute('height');
  clone.setAttribute('style', 'max-width:100%;height:auto');
  return `<figure>${new XMLSerializer().serializeToString(clone)}<figcaption><b>Figure ${figN}.</b> ${caption}</figcaption></figure>`;
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
  const facs = d.factors.map(f => `${f} (${R.levelsMap[f].length} levels: ${R.levelsMap[f].join(', ')})`).join('; ');
  const reps = d.blocks.length ? `${R.levelsMap[d.blocks[0]].length} blocks` : (d.row ? `${R.levelsMap[d.row].length} rows × ${R.levelsMap[d.col].length} columns` : `${Math.round(R.recs.length / d.factors.reduce((p, f) => p * R.levelsMap[f].length, 1))} replicates per treatment`);
  const trans = R.transform ? ` The response was ${R.transform.label} transformed before analysis to meet the assumptions; means are reported back-transformed.` : '';
  const assum = A && (A.resp === R.resp || (R.transform && A.resp === R.resp)) ? ` Residuals were checked for normality (Shapiro–Wilk), homogeneity of variances (Levene's test${A.tk ? ') and additivity (Tukey\'s one-degree-of-freedom test' : ''}).` : ' Residuals were checked for normality (Shapiro–Wilk) and homogeneity of variances (Levene\'s test).';
  const cov = d.covariates.length ? ` ${d.covariates.join(', ')} ${d.covariates.length > 1 ? 'were' : 'was'} included as covariate${d.covariates.length > 1 ? 's' : ''} (ANCOVA).` : '';
  return `<p>The experiment was laid out as a <b>${lc(c.name)}</b> with ${reps}. Treatment factor${d.factors.length > 1 ? 's were' : ' was'} ${facs}. The response variable was <b>${esc(R.resp.replace(/_(ln|log10|sqrt|sqrt05|asin|logit|inv|ln1)$/, ''))}</b>${o.units ? ' (' + esc(o.units) + ')' : ''}.${cov}${trans}${assum} Data were analysed by analysis of variance according to the model <code>${esc(c.model)}</code> with ${R.terms.some(t => t.isError) ? 'the appropriate error strata' : 'a single error term'} and Type ${+el('anSS').value === 1 ? 'I' : 'III'} sums of squares. Treatment means were compared with ${PH.methods[R.method].name} at α = ${R.alpha}${d.factors.some(f => R.levelsMap[f].length >= 3 && R.levelsMap[f].every(l => /^[+-]?\d+(\.\d+)?$/.test(l))) ? ', and trends over quantitative factors were examined with orthogonal polynomial contrasts' : ''}. All computations were performed with AgriDesign (browser-based platform for the design and analysis of agricultural experiments).</p>`;
}
function dataSection(R) {
  const d = R.d, trt = r => d.factors.map(f => r.f[f]).join(' × ');
  const map = new Map(); R.recs.forEach(r => { const k = trt(r); if (!map.has(k)) map.set(k, []); map.get(k).push(r.y); });
  const rows = [...map.entries()].map(([k, v]) => ({ trt: k, n: v.length, mean: S.mean(v), sd: v.length > 1 ? S.sd(v) : NaN, se: v.length > 1 ? S.se(v) : NaN, cv: S.cv(v), min: S.min(v), max: S.max(v) }));
  const all = R.recs.map(r => r.y);
  rows.push({ trt: 'All observations', n: all.length, mean: S.mean(all), sd: S.sd(all), se: S.se(all), cv: S.cv(all), min: S.min(all), max: S.max(all), _class: 'total' });
  return `<p>The data set <b>${esc(state.fileName || 'data')}</b> contains ${state.rawRows.length} rows and ${state.rawHeader.length} columns; ${R.recs.length} observations of ${esc(R.resp)} entered the analysis${R.recs.length < state.rawRows.length ? ` (${state.rawRows.length - R.recs.length} rows without a valid value were excluded)` : ''}.</p>` +
    htmlTable([{ key: 'trt', label: d.factors.join(' × ') }, { key: 'n', label: 'n', num: true }, { key: 'mean', label: 'Mean', num: true, fmt: fx }, { key: 'sd', label: 'SD', num: true, fmt: fx }, { key: 'se', label: 'SE', num: true, fmt: fx }, { key: 'cv', label: 'CV %', num: true, fmt: v => fx(v, 1) }, { key: 'min', label: 'Min', num: true, fmt: fx }, { key: 'max', label: 'Max', num: true, fmt: fx }], rows, `Descriptive statistics of ${esc(R.resp)} by treatment.`);
}
function assumptionsSection(A) {
  const al = A.alpha;
  const rows = [{ t: 'Shapiro–Wilk (normality of residuals)', s: 'W = ' + fx(A.sw.W), p: A.sw.p }, { t: 'Anderson–Darling (normality)', s: isFinite(A.ad.A) ? 'A² = ' + fx(A.ad.A) : '—', p: A.ad.p }];
  if (A.lev) rows.push({ t: 'Levene, median-centred (homogeneity of variances)', s: `F(${A.lev.df1}, ${A.lev.df2}) = ` + fx(A.lev.F), p: A.lev.p }, { t: 'Bartlett (homogeneity of variances)', s: 'K² = ' + fx(A.bart.K2), p: A.bart.p });
  if (A.tk) rows.push({ t: "Tukey's one-degree-of-freedom non-additivity", s: `F(${A.tk.df1}, ${A.tk.df2}) = ` + fx(A.tk.F), p: A.tk.p });
  rows.push({ t: 'Durbin–Watson (data order)', s: 'd = ' + fx(A.dw.d, 2), p: NaN });
  const g = A.grade || '—';
  const vt = { A: 'assumptions satisfied', B: 'minor deviations, ANOVA acceptable', C: 'clear deviation from at least one assumption', D: 'several assumptions fail' }[g] || '';
  return `<div class="box ${g === 'A' || g === 'B' ? '' : g === 'C' ? 'warn' : 'bad'}"><span class="grade">${g}</span> Overall: ${vt}. Model: <code>${esc(LM.formula(A.resp, A.terms))}</code>; residual df = ${A.fit.dfRes}; CV = ${fx(A.cv, 1)} %.</div>` +
    htmlTable([{ key: 't', label: 'Test' }, { key: 's', label: 'Statistic' }, { key: 'p', label: 'p-value', num: true, fmt: fmtP }, { key: 'd', label: 'Decision', get: r => !isFinite(r.p) ? '—' : r.p < al ? 'reject H₀' : 'do not reject' }], rows, `Assumption tests on the residuals of ${esc(A.resp)} (α = ${al}).`);
}
function anovaSection(R) {
  const a = R.anova;
  const rows = a.rows.map(r => ({ src: r.label, df: r.df, ss: r.ss, ms: r.ms, F: r.F, p: r.p, sig: sigStars(r.p), err: r.errorTerm === 'Residuals' ? 'Residual' : (R.strata[r.errorTerm] || {}).label || r.errorTerm, _class: r.isError ? 'dim' : '' }));
  rows.push({ src: 'Residual error', df: a.residual.df, ss: a.residual.ss, ms: a.residual.ms, F: NaN, p: NaN, sig: '', err: '', _class: 'dim' }, { src: 'Total', df: a.total.df, ss: a.total.ss, ms: NaN, F: NaN, p: NaN, sig: '', err: '', _class: 'total' });
  const t = htmlTable([{ key: 'src', label: 'Source' }, { key: 'df', label: 'df', num: true }, { key: 'ss', label: 'SS', num: true, fmt: v => fx(v, 4) }, { key: 'ms', label: 'MS', num: true, fmt: v => fx(v, 4) }, { key: 'F', label: 'F', num: true, fmt: fx }, { key: 'p', label: 'p', num: true, fmt: fmtP }, { key: 'sig', label: '' }, { key: 'err', label: 'Tested against' }], rows,
    `Analysis of variance of ${esc(R.resp)} (${esc(R.design.name)}). CV = ${fx(R.cv, 1)} %, R² = ${fx(R.r2)}, grand mean = ${fx(R.grandMean)}. Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05, ns not significant.`);
  const nar = el('anNarrative') ? el('anNarrative').innerText.replace(/^Draft for the results section\s*/, '') : '';
  return t + (nar ? `<p>${esc(nar)}</p>` : '');
}
function meansSection(R) {
  let out = '';
  const d = R.d;
  d.factors.forEach(f => {
    const fc = DS.factorComparison(R, f);
    const rows = fc.means.map((m, i) => ({ l: m.label, n: m.n, mean: m.mean, se: m.se, bt: R.transform ? R.transform.inv(m.mean) : NaN, let: fc.cmp.letters[i] })).sort((p, q) => q.mean - p.mean);
    const cols = [{ key: 'l', label: f }, { key: 'n', label: 'n', num: true }, { key: 'mean', label: 'Mean', num: true, fmt: fx }, { key: 'se', label: 'SE', num: true, fmt: fx }];
    if (R.transform) cols.push({ key: 'bt', label: 'Back-transformed', num: true, fmt: fx });
    cols.push({ key: 'let', label: 'Group' });
    const msd = fc.cmp.msd != null && !Array.isArray(fc.cmp.msd) ? ` ${fc.cmp.msdLabel} = ${fx(fc.cmp.msd)}.` : '';
    out += htmlTable(cols, rows, `Means of ${esc(R.resp)} by ${esc(f)}. Means followed by the same letter are not significantly different (${PH.methods[R.method].name}, α = ${R.alpha}; error: ${esc(fc.err.label)}).${msd}`);
    const lv = R.levelsMap[f];
    if (lv.length >= 3 && lv.every(l => /^[+-]?\d+(\.\d+)?$/.test(l))) {
      const pc = PH.polyContrasts(fc.means.map(m => ({ label: m.label, mean: m.mean, n: m.n })), lv.map(Number), fc.err.ms, fc.err.df, Math.min(3, lv.length - 1));
      out += htmlTable([{ key: 'name', label: 'Component' }, { key: 'ss', label: 'SS', num: true, fmt: v => fx(v, 4) }, { key: 'F', label: 'F', num: true, fmt: fx }, { key: 'pF', label: 'p', num: true, fmt: fmtP }, { key: 's', label: '', get: r => sigStars(r.pF) }], pc, `Orthogonal polynomial contrasts for ${esc(f)}.`);
    }
  });
  for (let i = 0; i < d.factors.length; i++) for (let j = i + 1; j < d.factors.length; j++) {
    const A = d.factors[i], B = d.factors[j];
    if (!R.terms.some(t => t.factors && t.factors.length === 2 && t.factors.includes(A) && t.factors.includes(B))) continue;
    const sl = DS.sliceLetters(R, A, B);
    const la = R.levelsMap[A], lb = R.levelsMap[B];
    const rows = la.map(a => { const o = { a }; lb.forEach(b => { const c = sl.byLevel[a + '|' + b]; o[b] = `${fx(c.mean)} ${c.letters}`; }); return o; });
    out += htmlTable([{ key: 'a', label: `${A} \\ ${B}` }].concat(lb.map(b => ({ key: b, label: b, num: true }))), rows, `Cell means of ${esc(R.resp)} for ${esc(A)} × ${esc(B)}. Letters compare the levels of ${esc(B)} within each level of ${esc(A)} (${PH.methods[R.method].name}, α = ${R.alpha}).`);
  }
  return out;
}
function pairwiseAppendix(R) {
  let out = '';
  R.d.factors.forEach(f => {
    const fc = DS.factorComparison(R, f);
    out += htmlTable([{ key: 'a', label: 'Level i', get: p => fc.means[p.i].label }, { key: 'b', label: 'Level j', get: p => fc.means[p.j].label }, { key: 'diff', label: 'Difference', num: true, fmt: fx }, { key: 'se', label: 'SE', num: true, fmt: fx }, { key: 'stat', label: 'Statistic', num: true, fmt: fx }, { key: 'padj', label: 'adj. p', num: true, fmt: fmtP }, { key: 's', label: '', get: p => p.sig ? '*' : 'ns' }], fc.cmp.pairs, `Pairwise comparisons for ${esc(f)} (${PH.methods[R.method].name}).`);
  });
  return out;
}
function figuresSection(o) {
  const groups = [[3, 'Exploratory figures (Block 3)', /^fig3_/], [4, 'Residual diagnostics (Block 4)', /^fig4_/], [5, 'Means and trends (Block 5)', /^fig5_/], [6, 'Result graphics (Block 6)', /^fig6_/]];
  let out = '';
  const mounted = Fig.mounted();
  groups.forEach(([n, title, rx]) => {
    if (!o.figBlocks.includes(n)) return;
    const list = mounted.filter(a => rx.test(a.hostId));
    if (!list.length) return;
    out += `<h3>${title}</h3>` + list.map(a => figure(a.svg, esc(a.title.replace(/_/g, ' ')))).join('');
  });
  return out || '<p class="small">No figures were included.</p>';
}

/* ---------- assemble ---------- */
Report.build = o => {
  figN = 0; tabN = 0;
  const R = state.anova, A = state.assumptions;
  const date = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  let body = `<h1>${esc(o.title)}</h1><div class="meta">${o.authors ? '<b>' + esc(o.authors) + '</b><br>' : ''}${o.affil ? esc(o.affil) + '<br>' : ''}${o.trial ? esc(o.trial) + '<br>' : ''}Report generated on ${date} with AgriDesign · data file: ${esc(state.fileName || '—')}</div>`;
  if (o.objective) body += `<h2>Objective</h2><p>${esc(o.objective)}</p>`;
  body += `<h2>Materials and methods</h2>${methodsText(R, A, o)}`;
  if (o.secData) body += `<h2>Data</h2>${dataSection(R)}`;
  if (o.secAssump && A) body += `<h2>Assumptions of the analysis of variance</h2>${assumptionsSection(A)}`;
  body += `<h2>Results</h2><h3>Analysis of variance</h3>${anovaSection(R)}<h3>Treatment means</h3>${meansSection(R)}`;
  if (o.secFigs) body += `<h2>Figures</h2>${figuresSection(o)}`;
  if (o.secPairs) body += `<h2>Appendix A · Pairwise comparisons</h2>${pairwiseAppendix(R)}`;
  if (o.secRaw) body += `<h2>Appendix B · Data</h2>` + htmlTable(state.rawHeader.map((h, j) => ({ key: j, label: esc(h), get: r => r[j] })), state.rawRows, 'Data as loaded.');
  body += `<div class="footer">AgriDesign — design and analysis of agricultural experiments. All computations were performed locally in the browser; figures are embedded as vector graphics and can be extracted from this file.</div>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${esc(o.title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
};

/* ---------- ZIP package ---------- */
Report.zip = async (o, html) => {
  const R = state.anova;
  const files = [{ name: 'report.html', data: html }];
  files.push({ name: 'data/' + slug(state.fileName || 'data') + '.csv', data: matrixToCSV(state.rawHeader, state.rawRows) });
  const a = R.anova;
  files.push({ name: 'tables/anova.csv', data: matrixToCSV(['Source', 'df', 'SS', 'MS', 'F', 'p', 'Tested against'], a.rows.map(r => [r.label, r.df, r.ss, r.ms, r.F, r.p, r.errorTerm]).concat([['Residual error', a.residual.df, a.residual.ss, a.residual.ms, '', '', ''], ['Total', a.total.df, a.total.ss, '', '', '', '']])) });
  R.d.factors.forEach(f => {
    const fc = DS.factorComparison(R, f);
    files.push({ name: `tables/means_${slug(f)}.csv`, data: matrixToCSV([f, 'n', 'LS mean', 'SE', 'Raw mean', 'SD', 'Group'], fc.means.map((m, i) => [m.label, m.n, m.mean, m.se, m.rawMean, m.sd, fc.cmp.letters[i]])) });
    files.push({ name: `tables/pairwise_${slug(f)}.csv`, data: matrixToCSV(['Level i', 'Level j', 'Difference', 'SE', 'Statistic', 'p', 'adj p', 'Significant'], fc.cmp.pairs.map(p => [fc.means[p.i].label, fc.means[p.j].label, p.diff, p.se, p.stat, p.p, p.padj, p.sig ? 'yes' : 'no'])) });
  });
  const scale = +o.zipRes, dpi = scale * 75;
  const mounted = Fig.mounted().filter(x => o.figBlocks.some(n => x.hostId.startsWith('fig' + n + '_')));
  for (const f of mounted) {
    files.push({ name: `figures/svg/${f.fileName}.svg`, data: Fig.serialize(f.svg) });
    if (o.zipFmt !== 'svg') { const blob = await Fig.toRaster(f.svg, { format: o.zipFmt, scale, dpi, background: '#ffffff' }); files.push({ name: `figures/${o.zipFmt}/${f.fileName}.${o.zipFmt === 'tiff' ? 'tif' : o.zipFmt}`, data: blob }); }
  }
  files.push({ name: 'README.txt', data: `${o.title}\n\nGenerated by AgriDesign on ${new Date().toISOString()}\nReport: report.html (open in any browser; print to PDF from the browser)\nData: data/\nTables: tables/ (CSV)\nFigures: figures/svg (vector) and figures/${o.zipFmt} (${dpi} dpi)\n` });
  return Zip.build(files);
};

/* ---------- UI ---------- */
function opts() {
  return {
    title: el('rpTitle').value.trim() || 'Analysis report', authors: el('rpAuthors').value.trim(), affil: el('rpAffil').value.trim(), trial: el('rpTrial').value.trim(), objective: el('rpObjective').value.trim(), units: el('rpUnits').value.trim(),
    secData: el('rpSecData').checked, secAssump: el('rpSecAssump').checked, secFigs: el('rpSecFigs').checked, secPairs: el('rpSecPairs').checked, secRaw: el('rpSecRaw').checked,
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
  el('rpInfo').textContent = `${(lastHtml.length / 1024).toFixed(0)} KB · ${tabN} tables · ${figN} figures`;
}
function init() {
  if (!el('rpTitle')) return;
  el('rpPreview').addEventListener('click', preview);
  el('rpHtml').addEventListener('click', () => { if (!lastHtml) preview(); download(lastHtml, slug(opts().title) + '.html', 'text/html;charset=utf-8'); });
  el('rpPrint').addEventListener('click', () => { if (!lastHtml) preview(); const w = window.open('', '_blank'); if (!w) { alert('Allow pop-ups to print.'); return; } w.document.write(lastHtml); w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 600); });
  el('rpZip').addEventListener('click', async () => { if (!lastHtml) preview(); const b = el('rpZip'); b.disabled = true; b.textContent = 'Packing…'; try { download(await Report.zip(opts(), lastHtml), slug(opts().title) + '_package.zip'); } catch (e) { alert('Could not build the package: ' + e.message); } b.disabled = false; b.textContent = '⬇ Download full package (ZIP)'; });
  el('rpMethods').addEventListener('click', () => { const t = document.createElement('div'); t.innerHTML = methodsText(state.anova, state.assumptions, opts()); navigator.clipboard.writeText(t.innerText).then(() => showMessage('rpMessages', 'success', 'Methods paragraph copied to the clipboard.')); });
  el('rpGo5').addEventListener('click', () => goStep(5));
  document.addEventListener('stepchange', e => {
    if (e.detail.step !== 7) return;
    const has = !!state.anova;
    el('rpNoResults').style.display = has ? 'none' : ''; el('rpMain').style.display = has ? '' : 'none';
    if (has && !el('rpTitle').value) el('rpTitle').value = `Effect of ${state.anova.d.factors.join(' and ')} on ${state.anova.resp}`;
    if (has) preview();
  });
}
document.addEventListener('DOMContentLoaded', init);
window.Report = Report;
})();
