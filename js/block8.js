/* AgriDesign — Block 8: design generator (randomisation, field layout, field book) and replicates / power. */

(function () {
/* The name of every design and every source of the skeleton ANOVA is written in the language in use;
   `name` is a getter so the menu can be rewritten without rebuilding this list. */
const SRC = () => ({ trt: T('Treatments', 'Tratamientos'), err: T('Error', 'Error'), tot: T('Total', 'Total'), blk: T('Blocks', 'Bloques'), rep: T('Replicates', 'Repeticiones'), rows: T('Rows', 'Hileras'), cols: T('Columns', 'Columnas') });
const DESIGNS = [
  { id: 'crd', get name() { return T('Completely randomised design (CRD)', 'Diseño completamente al azar (DCA)'); }, needs: ['trts', 'reps', 'cols'], df: o => [[SRC().trt, o.t - 1], [SRC().err, o.t * (o.r - 1)], [SRC().tot, o.t * o.r - 1]] },
  { id: 'rcbd', get name() { return T('Randomised complete block design (RCBD)', 'Diseño de bloques completos al azar (DBCA)'); }, needs: ['trts', 'reps', 'cols', 'arr'], df: o => [[SRC().blk, o.r - 1], [SRC().trt, o.t - 1], [SRC().err, (o.r - 1) * (o.t - 1)], [SRC().tot, o.t * o.r - 1]] },
  { id: 'latin', get name() { return T('Latin square', 'Cuadro latino'); }, needs: ['trts'], df: o => [[SRC().rows, o.t - 1], [SRC().cols, o.t - 1], [SRC().trt, o.t - 1], [SRC().err, (o.t - 1) * (o.t - 2)], [SRC().tot, o.t * o.t - 1]] },
  { id: 'fact_crd', get name() { return T('Factorial (A × B [× C]) in CRD', 'Factorial (A × B [× C]) completamente al azar'); }, needs: ['A', 'B', 'C', 'reps', 'cols'], df: o => { const ab = o.a * o.b * (o.c || 1); const rows = [['A', o.a - 1], ['B', o.b - 1], ['A × B', (o.a - 1) * (o.b - 1)]]; if (o.c) rows.push(['C', o.c - 1], ['A × C', (o.a - 1) * (o.c - 1)], ['B × C', (o.b - 1) * (o.c - 1)], ['A × B × C', (o.a - 1) * (o.b - 1) * (o.c - 1)]); rows.push([SRC().err, ab * (o.r - 1)], [SRC().tot, ab * o.r - 1]); return rows; } },
  { id: 'fact_rcbd', get name() { return T('Factorial (A × B [× C]) in RCBD', 'Factorial (A × B [× C]) en bloques al azar'); }, needs: ['A', 'B', 'C', 'reps', 'cols', 'arr'], df: o => { const ab = o.a * o.b * (o.c || 1); const rows = [[SRC().blk, o.r - 1], ['A', o.a - 1], ['B', o.b - 1], ['A × B', (o.a - 1) * (o.b - 1)]]; if (o.c) rows.push(['C', o.c - 1], ['A × C', (o.a - 1) * (o.c - 1)], ['B × C', (o.b - 1) * (o.c - 1)], ['A × B × C', (o.a - 1) * (o.b - 1) * (o.c - 1)]); rows.push([SRC().err, (ab - 1) * (o.r - 1)], [SRC().tot, ab * o.r - 1]); return rows; } },
  { id: 'split_rcbd', get name() { return T('Split-plot in RCBD (A on main plots, B on sub-plots)', 'Parcelas divididas en bloques al azar (A en las parcelas grandes, B en las subparcelas)'); }, needs: ['A', 'B', 'reps', 'arr'], df: o => [[SRC().blk, o.r - 1], [T('A (main plot)', 'A (parcela grande)'), o.a - 1], ['Error a', (o.r - 1) * (o.a - 1)], [T('B (sub-plot)', 'B (subparcela)'), o.b - 1], ['A × B', (o.a - 1) * (o.b - 1)], ['Error b', o.a * (o.r - 1) * (o.b - 1)], [SRC().tot, o.a * o.b * o.r - 1]] },
  { id: 'strip', get name() { return T('Strip-plot (split-block) in RCBD', 'Franjas divididas (bloques divididos) en bloques al azar'); }, needs: ['A', 'B', 'reps', 'arr'], df: o => [[SRC().blk, o.r - 1], ['A', o.a - 1], ['Error a', (o.r - 1) * (o.a - 1)], ['B', o.b - 1], ['Error b', (o.r - 1) * (o.b - 1)], ['A × B', (o.a - 1) * (o.b - 1)], ['Error c', (o.r - 1) * (o.a - 1) * (o.b - 1)], [SRC().tot, o.a * o.b * o.r - 1]] },
  { id: 'splitsplit', get name() { return T('Split-split-plot in RCBD', 'Parcelas subdivididas en bloques al azar'); }, needs: ['A', 'B', 'C', 'reps', 'arr'], df: o => [[SRC().blk, o.r - 1], ['A', o.a - 1], ['Error a', (o.r - 1) * (o.a - 1)], ['B', o.b - 1], ['A × B', (o.a - 1) * (o.b - 1)], ['Error b', o.a * (o.r - 1) * (o.b - 1)], ['C', o.c - 1], ['A × C', (o.a - 1) * (o.c - 1)], ['B × C', (o.b - 1) * (o.c - 1)], ['A × B × C', (o.a - 1) * (o.b - 1) * (o.c - 1)], ['Error c', o.a * o.b * (o.r - 1) * (o.c - 1)], [SRC().tot, o.a * o.b * o.c * o.r - 1]] },
  { id: 'ibd', get name() { return T('Resolvable incomplete blocks (random blocks of size k within replicates)', 'Bloques incompletos resolubles (bloques al azar de tamaño k dentro de cada repetición)'); }, needs: ['trts', 'reps', 'k', 'arr'], df: o => [[SRC().rep, o.r - 1], [T('Blocks within replicates', 'Bloques dentro de repeticiones'), o.r * (o.t / o.k - 1)], [T('Treatments (adjusted)', 'Tratamientos (ajustados)'), o.t - 1], [T('Intra-block error', 'Error intrabloque'), (o.r - 1) * (o.t - 1) - o.r * (o.t / o.k - 1)], [SRC().tot, o.t * o.r - 1]] },
  { id: 'augmented', get name() { return T('Augmented design (checks in every block + unreplicated entries)', 'Diseño aumentado (testigos en cada bloque + entradas sin repetir)'); }, needs: ['checks', 'entries', 'reps', 'cols', 'arr'], df: o => [[SRC().blk, o.r - 1], [T('Checks', 'Testigos'), o.nc - 1], [T('Error (from checks)', 'Error (de los testigos)'), (o.r - 1) * (o.nc - 1)]] },
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
  /* a failed generation must not leave the previous layout and field book on screen */
  el('gnResults').style.display = 'none';
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
      case 'splitsplit': if (!C.length) throw new Error(T('Enter the levels of factor C.', 'Escribe los niveles del factor C.')); Object.assign(o, { A, B, C }); L = GEN.splitsplit(o); t = [...new Set(L.plots.map(p => p.trt))]; break;
      case 'ibd': o.trts = trts(); L = GEN.ibd(o); t = o.trts; break;
      case 'augmented': o.checks = levels('gnChecks', [T('Check 1', 'Testigo 1'), T('Check 2', 'Testigo 2')]); o.entries = levels('gnEntries', Array.from({ length: 12 }, (_, i) => 'G' + (i + 1))); L = GEN.augmented(o); t = o.checks.concat(o.entries); break;
    }
  } catch (e) { showMessage('gnMessages', 'error', esc(e.message)); return; }
  GEN.number(L, { serpentine: el('gnSerp').checked, blockPrefix: el('gnNum').value === 'block' });
  lastOpts = Object.assign(o, { design: d, trtList: t, A, B, C });
  /* stats */
  const nPlots = L.plots.length, pw = +el('gnPW').value || 0, pl = +el('gnPL').value || 0;
  const dfo = { t: t.length, r: o.reps, a: A.length, b: B.length, c: C.length || 0, k: o.k, nc: (o.checks || []).length };
  const dfs = d.df(dfo);
  /* a Latin square has as many replicates (rows = columns) as treatments; the replicates box is hidden for it */
  const nRep = d.id === 'latin' ? t.length : o.reps;
  const errRow = dfs.find(x => /^Error/i.test(x[0])) || [0, 0];
  statTiles('gnTiles', [
    [T('Plots', 'Parcelas'), nPlots, T(`${L.nRows} rows × ${L.nCols} columns`, `${L.nRows} hileras × ${L.nCols} columnas`)],
    [T('Treatments', 'Tratamientos'), t.length, d.id === 'augmented' ? T(`${o.checks.length} checks + ${o.entries.length} entries`, `${o.checks.length} testigos + ${o.entries.length} entradas`) : ''],
    [T('Replicates / blocks', 'Repeticiones / bloques'), nRep, d.id === 'latin' ? T('rows = columns = treatments', 'hileras = columnas = tratamientos') : ''],
    [T('Field area', 'Superficie'), pw && pl ? (nPlots * pw * pl / 10000).toFixed(3) + ' ha' : '—', pw && pl ? `${(L.nCols * pw).toFixed(1)} × ${(L.nRows * pl).toFixed(1)} m` : T('enter plot size', 'escribe el tamaño de la parcela')],
    [T('Error df', 'g.l. del error'), errRow[1], errRow[1] < 10 ? T('fewer than 10–12: consider more replicates', 'menos de 10 a 12: considera más repeticiones') : T('adequate', 'adecuados'), errRow[1] < 10 ? 'warn' : 'ok'],
    [T('Seed', 'Semilla'), seed, T('reproducible randomisation', 'aleatorización reproducible')]]);
  buildTable('gnDf', [{ key: 0, label: T('Source', 'Fuente'), get: r => r[0] }, { key: 1, label: T('df', 'g.l.'), num: true, get: r => r[1] }], dfs.map(x => x[0] === SRC().tot ? Object.assign(x, { _class: 'total' }) : x), { caption: T('Skeleton ANOVA (degrees of freedom) for this layout', 'Esqueleto del análisis de varianza (grados de libertad) de este acomodo') });
  /* figure */
  const host = el('gnLayout'); host.innerHTML = '';
  const div = mk('div', { id: 'fig8_layout' }); host.appendChild(div);
  Fig.mount(div, P8.layout(L, { trts: t, plotW: pw, plotL: pl, title: T(`${d.name.replace(/\s*\(.*?\)\s*$/, '')} — ${nRep} ${d.id === 'latin' ? 'rows/columns' : 'replicates'}, seed ${seed}`, `${d.name.replace(/\s*\(.*?\)\s*$/, '')} — ${nRep} ${d.id === 'latin' ? 'hileras/columnas' : 'repeticiones'}, semilla ${seed}`), fileName: 'field_layout_' + d.id + '_seed' + seed, defaults: { subtitle: T(`${nPlots} plots · ${t.length} treatments`, `${nPlots} parcelas · ${t.length} tratamientos`) } }));
  /* field book */
  const fb = GEN.fieldBook(L, { repName: el('gnRepName').value.trim(), aName: el('gnAName').value.trim() || 'A', bName: el('gnBName').value.trim() || 'B', cName: el('gnCName').value.trim() || 'C', trtName: el('gnTrtName').value.trim(), responses: parseList(el('gnResp').value) });
  lastOpts.fb = fb;
  buildTable('gnBook', fb.header.map((h, j) => ({ key: j, label: esc(h), get: r => r[j] })), fb.rows, { limit: 300, caption: T('Field book (one row per plot)', 'Libreta de campo (un renglón por parcela)') });
  el('gnResults').style.display = '';
  el('gnResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function downloadBook(kind) {
  if (!lastOpts) return;
  const { header, rows } = lastOpts.fb, name = 'field_book_' + lastOpts.design.id + '_seed' + lastOpts.seed;
  if (kind === 'csv') download(matrixToCSV(header, rows), name + '.csv', 'text/csv;charset=utf-8');
  else { const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet([header].concat(rows)); XLSX.utils.book_append_sheet(wb, ws, T('Field book', 'Libreta de campo')); const info = XLSX.utils.aoa_to_sheet([[T('Design', 'Diseño'), lastOpts.design.name], [T('Seed', 'Semilla'), lastOpts.seed], [T('Replicates', 'Repeticiones'), lastOpts.reps], [T('Generated', 'Generada'), new Date().toISOString()], [T('Software', 'Programa'), 'AgriDesign']]); XLSX.utils.book_append_sheet(wb, info, T('Info', 'Datos')); XLSX.writeFile(wb, name + '.xlsx'); }
}
function useAsTemplate() {
  if (!lastOpts) return;
  const { header, rows } = lastOpts.fb;
  const hdr = header.slice(), rs = rows.map(r => r.slice());
  if (!parseList(el('gnResp').value).length) { hdr.push(T('Response', 'Respuesta')); rs.forEach(r => r.push('')); }
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
    [T('Replicates needed', 'Repeticiones necesarias'), need.r != null ? need.r : '> 200', T(`to detect ${o.d} % with power ${o.power}`, `para detectar ${o.d} % con potencia ${o.power}`), need.r != null && need.r <= 6 ? 'ok' : 'warn'],
    [T('With r = ', 'Con r = ') + rNow, fmtFixed(powNow.power, 2), T('power for the chosen difference', 'potencia para la diferencia elegida'), powNow.power >= o.power ? 'ok' : 'warn'],
    [T('Detectable difference', 'Diferencia detectable'), fmtFixed(detNow, 1) + ' %', T(`of the mean with r = ${rNow}`, `de la media con r = ${rNow}`)],
    [T('Error df', 'g.l. del error'), need.r != null ? (o.design === 'rcbd' ? (o.t - 1) * (need.r - 1) : o.t * (need.r - 1)) : '—', T('at the required r', 'con la r que hace falta')],
  ]);
  buildTable('pwTable', [{ key: 'r', label: T('Replicates', 'Repeticiones'), num: true }, { key: 'df', label: T('Error df', 'g.l. del error'), num: true }, { key: 'power', label: T('Power', 'Potencia'), num: true, fmt: v => fmtFixed(v, 3) }, { key: 'det', label: T('Detectable difference (%)', 'Diferencia detectable (%)'), num: true, get: r => fmtFixed(GEN.detectable(r.r, o), 1) }, { key: 'ok', label: '', html: true, get: r => r.power >= o.power ? `<span class="flag ok">${T('meets target', 'alcanza la meta')}</span>` : '' }], need.rows.slice(0, 20), { caption: T(`Power to detect a difference of ${o.d} % of the mean between two treatments (CV ${o.cv} %, α ${o.alpha}, ${o.t} treatments, ${o.design.toUpperCase()})`, `Potencia para detectar una diferencia de ${o.d} % de la media entre dos tratamientos (CV ${o.cv} %, α ${o.alpha}, ${o.t} tratamientos, ${o.design === 'rcbd' ? 'bloques al azar' : 'completamente al azar'})`) });
  const ds = [...new Set([5, 10, 15, 20, 30, o.d])].sort((a, b) => a - b), cvs = [...new Set([5, 10, 15, 20, 30, o.cv])].sort((a, b) => a - b);
  const h1 = el('pwFig1'); h1.innerHTML = ''; const d1 = mk('div', { id: 'fig8_power' }); h1.appendChild(d1); Fig.mount(d1, P8.power(o, { ds }));
  const h2 = el('pwFig2'); h2.innerHTML = ''; const d2 = mk('div', { id: 'fig8_detectable' }); h2.appendChild(d2); Fig.mount(d2, P8.detectable(o, { cvs }));
  el('pwInterp').innerHTML = `<div class="callout"><b>${T('Reading', 'Cómo se lee')}</b> ` + T(
    `With a CV of ${o.cv} % (use the CV of previous trials on the same site and crop), ${need.r != null ? `<b>${need.r} replicates</b> are enough to detect a difference of ${o.d} % between two treatment means with probability ${o.power}` : 'more than 200 replicates would be needed: the difference of interest is too small for that CV'}. ${detNow > o.d ? `With only ${rNow} replicates you would detect differences of about ${fmtFixed(detNow, 0)} % or larger.` : `With ${rNow} replicates you can already detect ${fmtFixed(detNow, 0)} % differences.`} Reducing the CV (uniform field, adequate plot size, border rows, blocking along the gradient) is usually cheaper than adding replicates: halving the CV is equivalent to quadrupling r.`,
    `Con un CV de ${o.cv} % (usa el CV de ensayos anteriores en el mismo sitio y cultivo), ${need.r != null ? `<b>${need.r} repeticiones</b> bastan para detectar una diferencia de ${o.d} % entre dos medias de tratamiento con probabilidad ${o.power}` : 'harían falta más de 200 repeticiones: la diferencia que buscas es demasiado chica para ese CV'}. ${detNow > o.d ? `Con solo ${rNow} repeticiones detectarías diferencias de alrededor de ${fmtFixed(detNow, 0)} % o mayores.` : `Con ${rNow} repeticiones ya alcanzas a detectar diferencias de ${fmtFixed(detNow, 0)} %.`} Bajar el CV (terreno uniforme, parcela de buen tamaño, surcos de orilla, bloques a lo largo del gradiente) suele salir más barato que agregar repeticiones: reducir el CV a la mitad equivale a cuadruplicar r.`) + `</div>`;
  el('pwResults').style.display = '';
}

/* The column names and the example levels travel in the generated file, so they follow the
   language — unless the user typed something of their own, which is never overwritten. */
function syncNames() {
  [['gnRepName', ['Block', 'Bloque'], T('Block', 'Bloque')],
   ['gnTrtName', ['Treatment', 'Tratamiento'], T('Treatment', 'Tratamiento')],
   ['gnResp', ['Yield', 'Rendimiento'], T('Yield', 'Rendimiento')],
   ['gnA', ['Drip, Furrow', 'Goteo, Surco'], T('Drip, Furrow', 'Goteo, Surco')],
   ['gnChecks', ['Check A, Check B', 'Testigo A, Testigo B'], T('Check A, Check B', 'Testigo A, Testigo B')],
  ].forEach(([id, defaults, now]) => { const inp = el(id); if (inp && defaults.includes(inp.value.trim())) inp.value = now; });
}

function init() {
  if (!el('gnDesign')) return;
  const ds = el('gnDesign'); DESIGNS.forEach(d => ds.appendChild(mk('option', { value: d.id }, d.name))); ds.value = 'rcbd';
  syncNames();
  /* a change of language renames the designs and repeats the generation and the power calculation */
  document.addEventListener('langchange', () => {
    const keep = ds.value;
    [...ds.options].forEach((op, i) => { op.textContent = DESIGNS[i].name; });
    ds.value = keep;
    syncNames();
    if (lastOpts) generate();
    if (el('pwResults').style.display !== 'none') power();
  });
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
