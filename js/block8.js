/* AgriDesign — Block 8: design generator (randomisation, field layout, field book) and replicates / power. */

(function () {
const DESIGNS = [
  { id: 'crd', name: 'Completely randomised design (CRD)', needs: ['trts', 'reps', 'cols'], df: o => [['Treatments', o.t - 1], ['Error', o.t * (o.r - 1)], ['Total', o.t * o.r - 1]] },
  { id: 'rcbd', name: 'Randomised complete block design (RCBD)', needs: ['trts', 'reps', 'cols', 'arr'], df: o => [['Blocks', o.r - 1], ['Treatments', o.t - 1], ['Error', (o.r - 1) * (o.t - 1)], ['Total', o.t * o.r - 1]] },
  { id: 'latin', name: 'Latin square', needs: ['trts'], df: o => [['Rows', o.t - 1], ['Columns', o.t - 1], ['Treatments', o.t - 1], ['Error', (o.t - 1) * (o.t - 2)], ['Total', o.t * o.t - 1]] },
  { id: 'fact_crd', name: 'Factorial (A × B [× C]) in CRD', needs: ['A', 'B', 'C', 'reps', 'cols'], df: o => { const ab = o.a * o.b * (o.c || 1); const rows = [['A', o.a - 1], ['B', o.b - 1], ['A × B', (o.a - 1) * (o.b - 1)]]; if (o.c) rows.push(['C', o.c - 1], ['A × C', (o.a - 1) * (o.c - 1)], ['B × C', (o.b - 1) * (o.c - 1)], ['A × B × C', (o.a - 1) * (o.b - 1) * (o.c - 1)]); rows.push(['Error', ab * (o.r - 1)], ['Total', ab * o.r - 1]); return rows; } },
  { id: 'fact_rcbd', name: 'Factorial (A × B [× C]) in RCBD', needs: ['A', 'B', 'C', 'reps', 'cols', 'arr'], df: o => { const ab = o.a * o.b * (o.c || 1); const rows = [['Blocks', o.r - 1], ['A', o.a - 1], ['B', o.b - 1], ['A × B', (o.a - 1) * (o.b - 1)]]; if (o.c) rows.push(['C', o.c - 1], ['A × C', (o.a - 1) * (o.c - 1)], ['B × C', (o.b - 1) * (o.c - 1)], ['A × B × C', (o.a - 1) * (o.b - 1) * (o.c - 1)]); rows.push(['Error', (ab - 1) * (o.r - 1)], ['Total', ab * o.r - 1]); return rows; } },
  { id: 'split_rcbd', name: 'Split-plot in RCBD (A on main plots, B on sub-plots)', needs: ['A', 'B', 'reps', 'arr'], df: o => [['Blocks', o.r - 1], ['A (main plot)', o.a - 1], ['Error a', (o.r - 1) * (o.a - 1)], ['B (sub-plot)', o.b - 1], ['A × B', (o.a - 1) * (o.b - 1)], ['Error b', o.a * (o.r - 1) * (o.b - 1)], ['Total', o.a * o.b * o.r - 1]] },
  { id: 'strip', name: 'Strip-plot (split-block) in RCBD', needs: ['A', 'B', 'reps', 'arr'], df: o => [['Blocks', o.r - 1], ['A', o.a - 1], ['Error a', (o.r - 1) * (o.a - 1)], ['B', o.b - 1], ['Error b', (o.r - 1) * (o.b - 1)], ['A × B', (o.a - 1) * (o.b - 1)], ['Error c', (o.r - 1) * (o.a - 1) * (o.b - 1)], ['Total', o.a * o.b * o.r - 1]] },
  { id: 'splitsplit', name: 'Split-split-plot in RCBD', needs: ['A', 'B', 'C', 'reps', 'arr'], df: o => [['Blocks', o.r - 1], ['A', o.a - 1], ['Error a', (o.r - 1) * (o.a - 1)], ['B', o.b - 1], ['A × B', (o.a - 1) * (o.b - 1)], ['Error b', o.a * (o.r - 1) * (o.b - 1)], ['C', o.c - 1], ['A × C', (o.a - 1) * (o.c - 1)], ['B × C', (o.b - 1) * (o.c - 1)], ['A × B × C', (o.a - 1) * (o.b - 1) * (o.c - 1)], ['Error c', o.a * o.b * (o.r - 1) * (o.c - 1)], ['Total', o.a * o.b * o.c * o.r - 1]] },
  { id: 'ibd', name: 'Resolvable incomplete blocks (random blocks of size k within replicates)', needs: ['trts', 'reps', 'k', 'arr'], df: o => [['Replicates', o.r - 1], ['Blocks within replicates', o.r * (o.t / o.k - 1)], ['Treatments (adjusted)', o.t - 1], ['Intra-block error', (o.r - 1) * (o.t - 1) - o.r * (o.t / o.k - 1)], ['Total', o.t * o.r - 1]] },
  { id: 'augmented', name: 'Augmented design (checks in every block + unreplicated entries)', needs: ['checks', 'entries', 'reps', 'cols', 'arr'], df: o => [['Blocks', o.r - 1], ['Checks', o.nc - 1], ['Error (from checks)', (o.r - 1) * (o.nc - 1)]] },
];
let L = null, lastOpts = null;

function parseList(txt) { return txt.split(/\r?\n|,|;/).map(s => s.trim()).filter(Boolean); }
function trts() {
  const raw = el('gnTrts').value.trim();
  if (raw) return parseList(raw);
  const n = Math.max(2, +el('gnNTrts').value || 4);
  return Array.from({ length: n }, (_, i) => 'T' + (i + 1));
}
function levels(id, def) { const v = parseList(el(id).value); return v.length ? v : def; }
function showNeeds() {
  const d = DESIGNS.find(x => x.id === el('gnDesign').value);
  els('[data-need]').forEach(e => e.style.display = d.needs.includes(e.dataset.need) ? '' : 'none');
}
function generate() {
  clearMessages('gnMessages');
  const d = DESIGNS.find(x => x.id === el('gnDesign').value);
  const seed = +el('gnSeed').value || 1;
  const o = { seed, reps: Math.max(1, +el('gnReps').value || 3), cols: +el('gnCols').value || 0, arrangement: el('gnArr').value, blocksPerRow: +el('gnBpr').value || 2, gap: el('gnGap').checked, k: +el('gnK').value || 2 };
  const A = levels('gnA', ['A1', 'A2']), B = levels('gnB', ['B1', 'B2', 'B3']), C = levels('gnC', []);
  let t;
  try {
    switch (d.id) {
      case 'crd': o.trts = trts(); L = GEN.crd(o); t = o.trts; break;
      case 'rcbd': o.trts = trts(); L = GEN.rcbd(o); t = o.trts; break;
      case 'latin': o.trts = trts(); L = GEN.latin(o); t = o.trts; break;
      case 'fact_crd': case 'fact_rcbd': Object.assign(o, { A, B, C, blocked: d.id === 'fact_rcbd' }); L = GEN.factorial(o); t = [...new Set(L.plots.map(p => p.trt))]; break;
      case 'split_rcbd': Object.assign(o, { A, B }); L = GEN.split(o); t = [...new Set(L.plots.map(p => p.trt))]; break;
      case 'strip': Object.assign(o, { A, B }); L = GEN.strip(o); t = [...new Set(L.plots.map(p => p.trt))]; break;
      case 'splitsplit': if (!C.length) throw new Error('Enter the levels of factor C.'); Object.assign(o, { A, B, C }); L = GEN.splitsplit(o); t = [...new Set(L.plots.map(p => p.trt))]; break;
      case 'ibd': o.trts = trts(); L = GEN.ibd(o); t = o.trts; break;
      case 'augmented': o.checks = levels('gnChecks', ['Check 1', 'Check 2']); o.entries = levels('gnEntries', Array.from({ length: 12 }, (_, i) => 'G' + (i + 1))); L = GEN.augmented(o); t = o.checks.concat(o.entries); break;
    }
  } catch (e) { showMessage('gnMessages', 'error', esc(e.message)); return; }
  GEN.number(L, { serpentine: el('gnSerp').checked, blockPrefix: el('gnNum').value === 'block' });
  lastOpts = Object.assign(o, { design: d, trtList: t, A, B, C });
  /* stats */
  const nPlots = L.plots.length, pw = +el('gnPW').value || 0, pl = +el('gnPL').value || 0;
  const dfo = { t: t.length, r: o.reps, a: A.length, b: B.length, c: C.length || 0, k: o.k, nc: (o.checks || []).length };
  const dfs = d.df(dfo);
  statTiles('gnTiles', [['Plots', nPlots, `${L.nRows} rows × ${L.nCols} columns`], ['Treatments', t.length, d.id === 'augmented' ? `${o.checks.length} checks + ${o.entries.length} entries` : ''], ['Replicates / blocks', o.reps, ''], ['Field area', pw && pl ? (nPlots * pw * pl / 10000).toFixed(3) + ' ha' : '—', pw && pl ? `${(L.nCols * pw).toFixed(1)} × ${(L.nRows * pl).toFixed(1)} m` : 'enter plot size'], ['Error df', (dfs.find(x => /^Error/.test(x[0]) || /error/i.test(x[0])) || [])[1], (dfs.find(x => /^Error/.test(x[0]) || /error/i.test(x[0])) || [0, 0])[1] < 10 ? 'fewer than 10–12: consider more replicates' : 'adequate', (dfs.find(x => /^Error/.test(x[0]) || /error/i.test(x[0])) || [0, 0])[1] < 10 ? 'warn' : 'ok'], ['Seed', seed, 'reproducible randomisation']]);
  buildTable('gnDf', [{ key: 0, label: 'Source', get: r => r[0] }, { key: 1, label: 'df', num: true, get: r => r[1] }], dfs.map(x => x[0] === 'Total' ? Object.assign(x, { _class: 'total' }) : x), { caption: 'Skeleton ANOVA (degrees of freedom) for this layout' });
  /* figure */
  const host = el('gnLayout'); host.innerHTML = '';
  const div = mk('div', { id: 'fig8_layout' }); host.appendChild(div);
  Fig.mount(div, P8.layout(L, { trts: t, plotW: pw, plotL: pl, title: `${d.name.replace(/\s*\(.*?\)\s*$/, '')} — ${o.reps} ${d.id === 'latin' ? 'rows/columns' : 'replicates'}, seed ${seed}`, fileName: 'field_layout_' + d.id + '_seed' + seed, defaults: { subtitle: `${nPlots} plots · ${t.length} treatments` } }));
  /* field book */
  const fb = GEN.fieldBook(L, { repName: el('gnRepName').value.trim() || 'Block', aName: el('gnAName').value.trim() || 'A', bName: el('gnBName').value.trim() || 'B', cName: el('gnCName').value.trim() || 'C', trtName: el('gnTrtName').value.trim() || 'Treatment', responses: parseList(el('gnResp').value) });
  lastOpts.fb = fb;
  buildTable('gnBook', fb.header.map((h, j) => ({ key: j, label: esc(h), get: r => r[j] })), fb.rows, { limit: 300, caption: 'Field book (one row per plot)' });
  el('gnResults').style.display = '';
  el('gnResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function downloadBook(kind) {
  if (!lastOpts) return;
  const { header, rows } = lastOpts.fb, name = 'field_book_' + lastOpts.design.id + '_seed' + lastOpts.seed;
  if (kind === 'csv') download(matrixToCSV(header, rows), name + '.csv', 'text/csv;charset=utf-8');
  else { const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet([header].concat(rows)); XLSX.utils.book_append_sheet(wb, ws, 'Field book'); const info = XLSX.utils.aoa_to_sheet([['Design', lastOpts.design.name], ['Seed', lastOpts.seed], ['Replicates', lastOpts.reps], ['Generated', new Date().toISOString()], ['Software', 'AgriDesign']]); XLSX.utils.book_append_sheet(wb, info, 'Info'); XLSX.writeFile(wb, name + '.xlsx'); }
}
function useAsTemplate() {
  if (!lastOpts) return;
  const { header, rows } = lastOpts.fb;
  const hdr = header.slice(), rs = rows.map(r => r.slice());
  if (!parseList(el('gnResp').value).length) { hdr.push('Response'); rs.forEach(r => r.push('')); }
  goStep(2);
  /* load through the public parser so the tidy checks run */
  const txt = matrixToCSV(hdr, rs).replace(/^﻿/, '');
  const grid = parseCSV(txt, ',');
  document.dispatchEvent(new CustomEvent('loadgrid', { detail: { grid, name: 'field_book_' + lastOpts.design.id + '.csv' } }));
}

/* ---------- power ---------- */
function power() {
  const o = { cv: +el('pwCV').value || 15, d: +el('pwD').value || 15, alpha: +el('pwAlpha').value || 0.05, power: +el('pwPower').value || 0.8, t: Math.max(2, +el('pwT').value || 4), design: el('pwDesign').value };
  const need = GEN.repsNeeded(o);
  const rNow = Math.max(2, +el('pwR').value || 4);
  const detNow = GEN.detectable(rNow, o), powNow = GEN.powerFor(rNow, o);
  statTiles('pwTiles', [
    ['Replicates needed', need.r != null ? need.r : '> 200', `to detect ${o.d} % with power ${o.power}`, need.r != null && need.r <= 6 ? 'ok' : 'warn'],
    ['With r = ' + rNow, fmtFixed(powNow.power, 2), 'power for the chosen difference', powNow.power >= o.power ? 'ok' : 'warn'],
    ['Detectable difference', fmtFixed(detNow, 1) + ' %', `of the mean with r = ${rNow}`],
    ['Error df', need.r != null ? (o.design === 'rcbd' ? (o.t - 1) * (need.r - 1) : o.t * (need.r - 1)) : '—', 'at the required r'],
  ]);
  buildTable('pwTable', [{ key: 'r', label: 'Replicates', num: true }, { key: 'df', label: 'Error df', num: true }, { key: 'power', label: 'Power', num: true, fmt: v => fmtFixed(v, 3) }, { key: 'det', label: 'Detectable difference (%)', num: true, get: r => fmtFixed(GEN.detectable(r.r, o), 1) }, { key: 'ok', label: '', html: true, get: r => r.power >= o.power ? '<span class="flag ok">meets target</span>' : '' }], need.rows.slice(0, 20), { caption: `Power to detect a difference of ${o.d} % of the mean between two treatments (CV ${o.cv} %, α ${o.alpha}, ${o.t} treatments, ${o.design.toUpperCase()})` });
  const ds = [...new Set([5, 10, 15, 20, 30, o.d])].sort((a, b) => a - b), cvs = [...new Set([5, 10, 15, 20, 30, o.cv])].sort((a, b) => a - b);
  const h1 = el('pwFig1'); h1.innerHTML = ''; const d1 = mk('div', { id: 'fig8_power' }); h1.appendChild(d1); Fig.mount(d1, P8.power(o, { ds }));
  const h2 = el('pwFig2'); h2.innerHTML = ''; const d2 = mk('div', { id: 'fig8_detectable' }); h2.appendChild(d2); Fig.mount(d2, P8.detectable(o, { cvs }));
  el('pwInterp').innerHTML = `<div class="callout"><b>Reading</b> With a CV of ${o.cv} % (use the CV of previous trials on the same site and crop), ${need.r != null ? `<b>${need.r} replicates</b> are enough to detect a difference of ${o.d} % between two treatment means with probability ${o.power}` : 'more than 200 replicates would be needed: the difference of interest is too small for that CV'}. ${detNow > o.d ? `With only ${rNow} replicates you would detect differences of about ${fmtFixed(detNow, 0)} % or larger.` : `With ${rNow} replicates you can already detect ${fmtFixed(detNow, 0)} % differences.`} Reducing the CV (uniform field, adequate plot size, border rows, blocking along the gradient) is usually cheaper than adding replicates: halving the CV is equivalent to quadrupling r.</div>`;
  el('pwResults').style.display = '';
}

function init() {
  if (!el('gnDesign')) return;
  const ds = el('gnDesign'); DESIGNS.forEach(d => ds.appendChild(mk('option', { value: d.id }, d.name))); ds.value = 'rcbd';
  ds.addEventListener('change', showNeeds); showNeeds();
  el('gnRun').addEventListener('click', generate);
  el('gnNewSeed').addEventListener('click', () => { el('gnSeed').value = Math.floor(Math.random() * 90000) + 1000; });
  el('gnCsv').addEventListener('click', () => downloadBook('csv'));
  el('gnXlsx').addEventListener('click', () => downloadBook('xlsx'));
  el('gnTemplate').addEventListener('click', useAsTemplate);
  el('pwRun').addEventListener('click', power);
  ['pwCV', 'pwD', 'pwAlpha', 'pwPower', 'pwT', 'pwDesign', 'pwR'].forEach(id => el(id).addEventListener('change', power));
}
document.addEventListener('DOMContentLoaded', init);
})();
