/* AgriDesign — Block 2: data import, tidy-format checks, variable roles and design structure. */

(function () {

const MISSING_CODES = new Set(['', 'na', 'n/a', 'nan', 'null', 'none', '.', '-', '--', '?', 'nd', 's/d', 'sd',
  'missing', 'faltante', '#n/a', '#div/0!', '#value!', '#valor!', '#ref!', '#name?', 'inf', '-inf']);

const ROLES = {
  response:  { label: 'Response (Y)',         color: '#2b7bb9', help: 'Measured outcome: yield, height, biomass, pH…' },
  factor:    { label: 'Treatment factor',      color: '#2f7d4f', help: 'What you compare: variety, dose, irrigation. Several factors = factorial.' },
  block:     { label: 'Block / replicate',     color: '#c8842a', help: 'Local control: block, rep, field, year, location.' },
  row:       { label: 'Row (Latin square)',    color: '#7a5195', help: 'Row blocking factor for Latin square / row–column designs.' },
  col:       { label: 'Column (Latin square)', color: '#9b6bb0', help: 'Column blocking factor for Latin square / row–column designs.' },
  covariate: { label: 'Covariate (ANCOVA)',    color: '#3b9db3', help: 'Numeric variable measured before treatment, e.g. initial stand.' },
  id:        { label: 'Identifier / plot',     color: '#6d6e71', help: 'Plot number, sample id. Not analysed.' },
  excluded:  { label: 'Exclude',               color: '#b5b5b5', help: 'Ignore this column.' },
};
window.ROLES = ROLES;

/* ============================================================
   File reading
   ============================================================ */
function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length).slice(0, 10);
  const cands = [',', ';', '\t', '|'];
  let best = ',', bestScore = -1;
  cands.forEach(d => {
    const counts = lines.map(l => l.split(d).length - 1);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const consistent = counts.every(c => c === counts[0]) ? 1 : 0.5;
    const score = mean * consistent;
    if (score > bestScore) { bestScore = score; best = d; }
  });
  return best;
}
function parseCSV(text, delim) {
  text = text.replace(/^﻿/, '');
  const d = delim || detectDelimiter(text);
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === d) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function toNumber(v, decimal) {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (v instanceof Date) return null;
  let s = String(v).trim();
  if (!s || MISSING_CODES.has(s.toLowerCase())) return null;
  s = s.replace(/\s| /g, '').replace(/%$/, '');
  if (decimal === 'comma') s = s.replace(/\./g, '').replace(',', '.');
  else if (decimal === 'auto') {
    if (/,\d{1,3}$/.test(s) && !/\.\d/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else s = s.replace(/,/g, '');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}
function isMissing(v) {
  if (v == null) return true;
  if (typeof v === 'number') return !isFinite(v);
  return MISSING_CODES.has(String(v).trim().toLowerCase());
}
/* Guess the decimal separator from the whole table */
function guessDecimal(rows) {
  let comma = 0, dot = 0;
  rows.slice(0, 500).forEach(r => r.forEach(v => {
    if (typeof v !== 'string') return;
    const s = v.trim();
    if (/^[+-]?\d+,\d+$/.test(s)) comma++;
    else if (/^[+-]?\d+\.\d+$/.test(s)) dot++;
  }));
  return comma > dot ? 'comma' : 'dot';
}

/* ============================================================
   Tidy-format diagnostics on the raw grid
   ============================================================ */
function diagnoseGrid(rows, merges) {
  const issues = [];
  if (!rows.length) { issues.push({ level: 'bad', title: 'The sheet is empty', text: 'No rows with content were found.' }); return { issues, headerRow: 0 }; }
  /* title rows above the header: rows with ≤ 1 non-empty cell before a wide row */
  const widths = rows.map(r => r.filter(v => !isMissing(v)).length);
  const maxW = Math.max(...widths);
  let headerRow = 0;
  while (headerRow < rows.length - 1 && widths[headerRow] < Math.max(2, maxW * 0.5)) headerRow++;
  if (headerRow > 0) issues.push({ level: 'warn', title: `${headerRow} title row${headerRow > 1 ? 's' : ''} above the header`, text: `The header appears to be on row ${headerRow + 1}. Those rows were skipped automatically — check the preview.` });
  if (merges && merges.length) issues.push({ level: 'bad', title: `${merges.length} merged cell range${merges.length > 1 ? 's' : ''} detected`, text: 'Merged cells break the one-row-per-plot rule: only the first cell keeps its value, the others read as blank. Unmerge them and fill every row.' });
  const hdr = rows[headerRow] || [];
  const blanks = hdr.filter(v => isMissing(v)).length;
  if (blanks) issues.push({ level: 'warn', title: `${blanks} column${blanks > 1 ? 's' : ''} without a name`, text: 'Unnamed columns were named V1, V2… Give every column a short header without spaces or symbols (e.g. Yield_kg).' });
  const names = hdr.map(v => String(v ?? '').trim()).filter(Boolean);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) issues.push({ level: 'warn', title: 'Duplicated column names', text: `Renamed with a suffix: ${[...new Set(dup)].join(', ')}.` });
  /* ragged rows */
  const body = rows.slice(headerRow + 1);
  const ragged = body.filter(r => r.filter(v => !isMissing(v)).length > hdr.length).length;
  if (ragged) issues.push({ level: 'warn', title: `${ragged} row${ragged > 1 ? 's' : ''} with more cells than the header`, text: 'Extra cells beyond the last column were dropped. Notes or totals written beside the table cause this.' });
  /* fully empty rows inside the body */
  const empty = body.filter(r => r.every(v => isMissing(v))).length;
  if (empty) issues.push({ level: 'info', title: `${empty} empty row${empty > 1 ? 's' : ''} removed`, text: 'Blank rows are ignored. Keep the table compact.' });
  /* totals rows */
  const totals = body.filter(r => /^(total|mean|average|promedio|suma|sum|media)$/i.test(String(r[0] ?? '').trim())).length;
  if (totals) issues.push({ level: 'bad', title: `${totals} summary row${totals > 1 ? 's' : ''} (Total / Mean) inside the data`, text: 'Remove totals and averages from the data table: the app computes them and they would be analysed as plots.' });
  return { issues, headerRow };
}

/* ============================================================
   Column profiling
   ============================================================ */
const BLOCK_RX = /^(block|blk|bloque|rep|reps|replicate|replication|repeticion|repetición|r|blocks|bloques)$/i;
const ROW_RX = /^(row|fila|hilera|renglon|renglón)$/i;
const COL_RX = /^(col|column|columna)$/i;
const ID_RX = /^(id|plot|parcela|unit|ue|u.e.|sample|muestra|obs|no|n°|num|number|planta|plant|fieldrow|fieldcol|field_row|field_col|plotno|plot_no)$/i;
const COV_RX = /^(cov|covariate|covariable|initial|inicial|x0|stand|plants_per_plot)/i;

function profileColumns(header, rows, decimal) {
  return header.map((name, j) => {
    const raw = rows.map(r => r[j]);
    const present = raw.filter(v => !isMissing(v));
    const nums = present.map(v => toNumber(v, decimal));
    const nOk = nums.filter(v => v !== null).length;
    const numericRatio = present.length ? nOk / present.length : 0;
    const uniq = new Set(present.map(v => String(v).trim()));
    const col = {
      name, index: j, n: present.length, missing: rows.length - present.length,
      missingPct: rows.length ? (rows.length - present.length) / rows.length : 0,
      unique: uniq.size, numericRatio, values: raw,
    };
    const lname = name.trim();
    if (present.length === 0) {
      Object.assign(col, { kind: 'numeric', num: [], allInt: false, constant: false, levels: [], levelCounts: {}, role: 'response', detected: 'Empty (to be filled in)', empty: true });
      return col;
    }
    if (numericRatio >= 0.9 && nOk >= 2) {
      const v = nums.filter(x => x !== null);
      col.kind = 'numeric';
      col.num = v;
      col.allInt = v.every(x => Number.isInteger(x));
      col.mean = S.mean(v); col.sd = S.sd(v); col.min = S.min(v); col.max = S.max(v);
      col.median = S.median(v); col.cv = col.mean ? Math.abs(col.sd / col.mean) * 100 : NaN;
      col.skew = S.skewness(v); col.kurt = S.kurtosis(v);
      col.negatives = v.filter(x => x < 0).length; col.zeros = v.filter(x => x === 0).length;
      col.outliers = col.sd > 0 ? v.filter(x => Math.abs((x - col.mean) / col.sd) > 3).length : 0;
      col.constant = !(col.sd > 0);
      col.levels = [...uniq].sort((a, b) => +a - +b);
      col.levelCounts = {}; present.forEach(x => { const k = String(x).trim(); col.levelCounts[k] = (col.levelCounts[k] || 0) + 1; });
      /* Integer codes for treatments are few, repeated evenly and not named like a measurement;
         an ordinal score (1-9) has uneven counts and a measurement-like name. */
      const cnts = Object.values(col.levelCounts);
      const evenCounts = Math.min(...cnts) >= 2 && Math.max(...cnts) / Math.min(...cnts) <= 1.5;
      const measureName = /(score|scale|sever|yield|height|weight|mass|count|number|num|index|percent|pct|rate|days|length|width|diam|area|content|ph$|_n$|nota|calif|rend|altura|peso)/i.test(lname);
      const fewLevels = col.allInt && uniq.size <= 12 && uniq.size < present.length / 2;
      const codeLike = fewLevels && evenCounts && !measureName;
      if (/^(fieldrow|fieldcol|field_row|field_col|plotno|plot_no|plot)$/i.test(lname)) { col.role = 'id'; col.detected = 'Field position / plot number'; }
      else if (BLOCK_RX.test(lname)) { col.role = 'block'; col.detected = 'Block code'; }
      else if (ROW_RX.test(lname)) { col.role = 'row'; col.detected = 'Row code'; }
      else if (COL_RX.test(lname)) { col.role = 'col'; col.detected = 'Column code'; }
      else if (ID_RX.test(lname) && uniq.size === present.length) { col.role = 'id'; col.detected = 'Identifier'; }
      else if (col.constant) { col.role = 'excluded'; col.detected = 'Constant'; }
      else if (codeLike) { col.role = 'factor'; col.detected = `Integer codes (${uniq.size} levels)`; col.hintCat = true; }
      else if (fewLevels && !measureName) { col.role = 'response'; col.detected = `Numeric (${uniq.size} distinct values)`; col.hintCat = true; }
      else if (COV_RX.test(lname)) { col.role = 'covariate'; col.detected = 'Numeric (covariate?)'; }
      else { col.role = 'response'; col.detected = col.allInt ? 'Numeric (integers)' : 'Numeric (continuous)'; }
    } else {
      col.kind = 'categorical';
      col.levelCounts = {};
      present.forEach(v => { const k = String(v).trim(); col.levelCounts[k] = (col.levelCounts[k] || 0) + 1; });
      col.levels = Object.keys(col.levelCounts);
      if (uniq.size === present.length && present.length > 3) { col.role = 'id'; col.detected = 'Text, all distinct (identifier)'; }
      else if (BLOCK_RX.test(lname)) { col.role = 'block'; col.detected = `Block (${uniq.size} levels)`; }
      else if (ROW_RX.test(lname)) { col.role = 'row'; col.detected = `Row (${uniq.size} levels)`; }
      else if (COL_RX.test(lname)) { col.role = 'col'; col.detected = `Column (${uniq.size} levels)`; }
      else if (uniq.size > 40) { col.role = 'excluded'; col.detected = `Text (${uniq.size} categories)`; }
      else { col.role = 'factor'; col.detected = `Categorical (${uniq.size} levels)`; }
      if (numericRatio > 0.5 && numericRatio < 0.9) col.mixed = true;
    }
    return col;
  });
}

/* ============================================================
   Loading pipeline
   ============================================================ */
function uniqueNames(hdr) {
  const seen = {};
  return hdr.map((h, i) => {
    let n = String(h ?? '').trim() || ('V' + (i + 1));
    if (seen[n]) { let k = 2; while (seen[n + '_' + k]) k++; n = n + '_' + k; }
    seen[n] = true;
    return n;
  });
}
function afterLoad(grid, fileName, sheetName, merges) {
  const rows0 = grid.filter(r => r.some(v => !isMissing(v)));
  const diag = diagnoseGrid(rows0, merges);
  if (!rows0.length) { showMessage('dataMessages', 'error', 'The file has no data.'); return; }
  const hdrRow = rows0[diag.headerRow] || [];
  const header = uniqueNames(hdrRow);
  let rows = rows0.slice(diag.headerRow + 1).map(r => header.map((_, j) => r[j] == null ? '' : r[j]));
  rows = rows.filter(r => !/^(total|mean|average|promedio|suma|sum|media)$/i.test(String(r[0] ?? '').trim()));
  const decSel = el('decimalSel').value;
  const decimal = decSel === 'auto' ? guessDecimal(rows) : decSel;
  state.decimal = decimal;
  state.fileName = fileName; state.sheetName = sheetName || null;
  state.rawHeader = header; state.rawRows = rows;
  state.columns = profileColumns(header, rows, decimal);
  state.gridIssues = diag.issues;
  state.ready = false;

  clearMessages('dataMessages');
  showMessage('dataMessages', 'success',
    `<b>${esc(fileName)}</b>${sheetName ? ' · sheet <b>' + esc(sheetName) + '</b>' : ''} — ` +
    `${rows.length} rows × ${header.length} columns read. Decimal separator: <b>${decimal === 'comma' ? 'comma' : 'point'}</b>.`);
  renderIssues();
  renderVarTable();
  renderPreview();
  el('varCard').style.display = '';
  el('previewCard').style.display = '';
  el('reshapeCard').style.display = '';
  updateDesign();
  el('varCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function readFile(file) {
  const name = file.name.toLowerCase();
  const reader = new FileReader();
  clearMessages('dataMessages');
  showMessage('dataMessages', 'info', '<span class="loading"></span> Reading file…');
  const ext = name.split('.').pop();
  if (['csv', 'tsv', 'txt', 'dat', 'prn'].includes(ext)) {
    reader.onload = e => {
      try {
        const delim = el('delimSel').value || null;
        const rows = parseCSV(e.target.result, ext === 'tsv' ? '\t' : delim);
        afterLoad(rows, file.name);
      } catch (err) { clearMessages('dataMessages'); showMessage('dataMessages', 'error', 'Could not read the text file: ' + err.message); }
    };
    reader.readAsText(file, 'UTF-8');
  } else if (ext === 'json') {
    reader.onload = e => {
      try { afterLoad(jsonToGrid(JSON.parse(e.target.result)), file.name); }
      catch (err) { clearMessages('dataMessages'); showMessage('dataMessages', 'error', 'Could not read the JSON file: ' + err.message); }
    };
    reader.readAsText(file, 'UTF-8');
  } else {
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        state.sheets = wb.SheetNames; state.workbook = wb;
        const pick = el('sheetSelect');
        pick.innerHTML = '';
        wb.SheetNames.forEach(s => pick.appendChild(mk('option', { value: s }, esc(s))));
        el('sheetPicker').style.display = wb.SheetNames.length > 1 ? '' : 'none';
        loadSheet(wb.SheetNames[0], file.name);
      } catch (err) { clearMessages('dataMessages'); showMessage('dataMessages', 'error', 'Could not read the spreadsheet: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  }
}
function loadSheet(sheetName, fileName) {
  const ws = state.workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '', raw: true });
  afterLoad(grid, fileName || state.fileName, sheetName, ws['!merges'] || []);
}
/* JSON: array of objects, array of arrays, or {columns:[], data:[]} */
function jsonToGrid(j) {
  if (Array.isArray(j) && j.length && Array.isArray(j[0])) return j;
  if (Array.isArray(j) && j.length && typeof j[0] === 'object') {
    const keys = [...new Set(j.flatMap(o => Object.keys(o)))];
    return [keys].concat(j.map(o => keys.map(k => o[k] == null ? '' : o[k])));
  }
  if (j && Array.isArray(j.columns) && Array.isArray(j.data)) return [j.columns].concat(j.data);
  if (j && typeof j === 'object') {                       /* {col: [values]} */
    const keys = Object.keys(j).filter(k => Array.isArray(j[k]));
    if (keys.length) { const n = Math.max(...keys.map(k => j[k].length)); return [keys].concat(Array.from({ length: n }, (_, i) => keys.map(k => j[k][i] == null ? '' : j[k][i]))); }
  }
  throw new Error('Unrecognised JSON layout. Use an array of objects (one object per plot).');
}
function loadPasted() {
  const text = el('pasteArea').value;
  if (!text.trim()) return;
  try { afterLoad(parseCSV(text, el('delimSel').value || null), 'pasted-data.txt'); }
  catch (err) { showMessage('dataMessages', 'error', 'Could not parse the pasted text: ' + err.message); }
}

/* ============================================================
   UI: issues, variable table, preview
   ============================================================ */
function renderIssues() {
  const host = el('gridIssues');
  host.innerHTML = '';
  const issues = state.gridIssues || [];
  if (!issues.length) {
    host.innerHTML = '<div class="check-item ok"><div class="ck-icon">✅</div><div class="ck-body"><div class="ck-title">Tidy table</div><div class="ck-text">One header row, one row per experimental unit, no merged cells or summary rows.</div></div></div>';
    return;
  }
  issues.forEach(i => {
    host.appendChild(mk('div', { class: 'check-item ' + i.level },
      `<div class="ck-icon">${i.level === 'bad' ? '⛔' : i.level === 'warn' ? '⚠️' : 'ℹ️'}</div><div class="ck-body"><div class="ck-title">${esc(i.title)}</div><div class="ck-text">${i.text}</div></div>`));
  });
}
function sparkline(col) {
  const w = 96, h = 24;
  let body = '';
  if (col.kind === 'numeric' && col.num.length > 1 && col.sd > 0 && !col.hintCat) {
    const hist = S.histogram(col.num, 18);
    const mx = Math.max(...hist.counts);
    const bw = w / hist.k;
    hist.counts.forEach((c, i) => {
      const bh = mx ? (c / mx) * (h - 3) : 0;
      body += `<rect x="${(i * bw).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw - 0.6).toFixed(1)}" height="${bh.toFixed(1)}" fill="#2b7bb9" opacity="0.75"/>`;
    });
  } else if (col.levelCounts) {
    const ent = Object.entries(col.levelCounts).slice(0, 12);
    const mx = Math.max(...ent.map(e => e[1]));
    const bw = w / Math.max(ent.length, 1);
    ent.forEach((e, i) => {
      const bh = (e[1] / mx) * (h - 3);
      body += `<rect x="${(i * bw).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${bh.toFixed(1)}" fill="#c8842a" opacity="0.8"/>`;
    });
  }
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
function flagsFor(col) {
  const f = [];
  if (col.constant) f.push('<span class="flag bad">zero variance</span>');
  if (col.missingPct > 0.2) f.push(`<span class="flag bad">${fmtPct(col.missingPct, 0)} missing</span>`);
  else if (col.missingPct > 0) f.push(`<span class="flag">${col.missing} missing</span>`);
  if (col.mixed) f.push('<span class="flag bad">numbers mixed with text</span>');
  if (col.kind === 'numeric' && col.role === 'response') {
    if (Math.abs(col.skew) > 2) f.push('<span class="flag bad">strongly skewed</span>');
    else if (Math.abs(col.skew) > 1) f.push('<span class="flag">skewed</span>');
    if (col.outliers > 0) f.push(`<span class="flag">${col.outliers} outlier${col.outliers > 1 ? 's' : ''} |z|&gt;3</span>`);
    if (col.negatives && col.zeros === 0) f.push('<span class="flag">negative values</span>');
  }
  if (col.hintCat) f.push('<span class="flag">integer codes → factor?</span>');
  if (col.kind === 'categorical' && col.levels) {
    const lc = col.levels.map(l => l.toLowerCase());
    if (new Set(lc).size < lc.length) f.push('<span class="flag bad">levels differ only by case</span>');
    if (col.levels.some(l => /\s$|^\s/.test(l))) f.push('<span class="flag bad">levels with trailing spaces</span>');
  }
  if (!f.length) f.push('<span class="flag ok">ok</span>');
  return f.join(' ');
}
function renderVarTable() {
  const host = el('varTable');
  host.innerHTML = '';
  const table = mk('table', { class: 'var-table' });
  table.innerHTML = `<thead><tr><th>Variable</th><th>Detected</th><th>Role in the experiment</th><th class="num">n</th><th class="num">Missing</th><th class="num">Levels / unique</th><th>Summary</th><th>Distribution</th><th>Checks</th></tr></thead>`;
  const tb = mk('tbody');
  state.columns.forEach(col => {
    const tr = mk('tr');
    const sel = mk('select');
    Object.entries(ROLES).forEach(([k, r]) => {
      if (col.kind !== 'numeric' && (k === 'response' || k === 'covariate')) return;
      const op = mk('option', { value: k }, r.label); if (col.role === k) op.selected = true; sel.appendChild(op);
    });
    sel.addEventListener('change', () => { col.role = sel.value; updateDesign(); renderVarTable(); });
    const pillClass = col.kind === 'numeric' ? (col.role === 'factor' || col.role === 'block' ? 'cat' : 'num') : (col.role === 'id' ? 'id' : 'cat');
    const summary = col.kind === 'numeric' && !col.hintCat && col.role !== 'factor' && col.role !== 'block'
      ? `mean ${fmtNum(col.mean, 3)} · SD ${fmtNum(col.sd, 3)} · [${fmtNum(col.min, 3)}, ${fmtNum(col.max, 3)}]`
      : (col.levels || []).slice(0, 6).map(esc).join(', ') + ((col.levels || []).length > 6 ? ', …' : '');
    tr.innerHTML = `<td class="var-name">${esc(col.name)}</td><td><span class="pill ${pillClass}">${esc(col.detected)}</span></td><td></td>
      <td class="num">${col.n}</td><td class="num">${col.missing}</td><td class="num">${col.unique}</td><td>${summary}</td><td>${sparkline(col)}</td><td>${flagsFor(col)}</td>`;
    tr.children[2].appendChild(sel);
    tr.style.opacity = col.role === 'excluded' ? 0.55 : 1;
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  host.appendChild(table);
}
function renderPreview() {
  const host = el('previewTable');
  const cols = state.rawHeader.map((h, j) => ({ key: j, label: esc(h), get: r => r[j] }));
  buildTable(host, cols, state.rawRows, { limit: 200 });
}

/* ============================================================
   Design structure
   ============================================================ */
function levelsOf(col) { return col.levels || [...new Set(col.values.filter(v => !isMissing(v)).map(v => String(v).trim()))]; }

function updateDesign() {
  const d = state.design;
  const by = role => state.columns.filter(c => c.role === role);
  d.responses = by('response').map(c => c.name);
  d.factors = by('factor').map(c => c.name);
  d.blocks = by('block').map(c => c.name);
  d.row = (by('row')[0] || {}).name || null;
  d.col = (by('col')[0] || {}).name || null;
  d.covariates = by('covariate').map(c => c.name);
  const host = el('designSummary');
  const checks = el('designChecks');
  host.innerHTML = ''; checks.innerHTML = '';
  const colBy = n => state.columns.find(c => c.name === n);
  const n = state.rawRows.length;
  const items = [];
  const facInfo = d.factors.map(f => ({ name: f, levels: levelsOf(colBy(f)) }));
  const nTrt = facInfo.reduce((p, f) => p * f.levels.length, 1);
  items.push(['Observations', n, 'rows in the table']);
  items.push(['Response variables', d.responses.length ? d.responses.join(', ') : '—', d.responses.length > 1 ? 'each is analysed separately' : '']);
  items.push(['Treatment factors', facInfo.length ? facInfo.map(f => `${f.name} (${f.levels.length})`).join(' × ') : '—', facInfo.length ? `${nTrt} treatment combination${nTrt > 1 ? 's' : ''}` : '']);
  items.push(['Blocking', d.blocks.length ? d.blocks.map(b => `${b} (${levelsOf(colBy(b)).length})`).join(', ') : (d.row && d.col ? `${d.row} × ${d.col}` : 'none'), '']);
  if (d.covariates.length) items.push(['Covariates', d.covariates.join(', '), 'ANCOVA']);
  /* replication */
  let repText = '—', balance = null;
  if (facInfo.length) {
    const key = r => d.factors.map(f => String(r[colBy(f).index]).trim()).join(' | ');
    const counts = {};
    state.rawRows.forEach(r => { if (d.factors.every(f => !isMissing(r[colBy(f).index]))) { const k = key(r); counts[k] = (counts[k] || 0) + 1; } });
    const vals = Object.values(counts);
    const observed = Object.keys(counts).length;
    const mn = Math.min(...vals), mx = Math.max(...vals);
    balance = { counts, observed, expected: nTrt, min: mn, max: mx, balanced: mn === mx && observed === nTrt };
    repText = mn === mx ? `${mn} per treatment` : `${mn}–${mx} per treatment`;
    items.push(['Replication', repText, balance.balanced ? 'balanced' : 'unbalanced']);
  }
  items.forEach(([l, v, s]) => host.appendChild(mk('div', { class: 'ds-item' }, `<div class="ds-label">${l}</div><div class="ds-value">${esc(String(v))}</div>${s ? `<div class="ds-sub">${esc(s)}</div>` : ''}`)));

  /* checks */
  const add = (level, title, text) => checks.appendChild(mk('div', { class: 'check-item ' + level },
    `<div class="ck-icon">${level === 'ok' ? '✅' : level === 'bad' ? '⛔' : level === 'warn' ? '⚠️' : 'ℹ️'}</div><div class="ck-body"><div class="ck-title">${title}</div><div class="ck-text">${text}</div></div>`));
  if (!d.responses.length) add('bad', 'No response variable', 'Mark at least one numeric column as <b>Response (Y)</b>.');
  if (!d.factors.length) add('bad', 'No treatment factor', 'Mark the column that identifies the treatments as <b>Treatment factor</b>.');
  if (!d.factors.length && d.responses.length >= 3) add('info', 'This looks like a wide table', 'Several numeric columns and no factor: the treatments are probably spread across columns. Use the <b>wide → long</b> converter below, keeping the block / plot columns as identifiers.');
  facInfo.forEach(f => {
    if (f.levels.length < 2) add('bad', `Factor ${esc(f.name)} has a single level`, 'A factor needs at least two levels to be compared.');
    if (f.levels.length > 30) add('warn', `Factor ${esc(f.name)} has ${f.levels.length} levels`, 'Many levels: is this really a treatment factor, or an identifier?');
  });
  if (balance) {
    if (balance.observed < balance.expected) add('warn', `${balance.expected - balance.observed} treatment combination${balance.expected - balance.observed > 1 ? 's' : ''} never observed`, 'The factorial is incomplete. Interactions will be partially estimable; consider analysing as a one-way layout of the observed combinations.');
    if (balance.min < 2) add('bad', 'Some treatments have a single observation', 'Without replication the experimental error cannot be estimated. Check the factor and block roles: a wide table (treatments in columns) must be reshaped to long format first.');
    else if (balance.min < 3) add('warn', 'Only 2 replicates for some treatments', 'Two replicates give a very imprecise error estimate. Three or more are recommended (four is the usual minimum in field trials).');
    else add('ok', `Replication: ${repText}`, balance.balanced ? 'Balanced design: every treatment has the same number of observations.' : 'Unbalanced: sums of squares will be computed with Type III (marginal) tests.');
  }
  if (d.blocks.length) {
    const b = colBy(d.blocks[0]);
    const bl = levelsOf(b);
    if (facInfo.length === 1 && balance) {
      /* each treatment once per block? */
      const seen = {};
      state.rawRows.forEach(r => { const k = String(r[b.index]).trim() + '|' + String(r[colBy(d.factors[0]).index]).trim(); seen[k] = (seen[k] || 0) + 1; });
      const v = Object.values(seen);
      if (Object.keys(seen).length === bl.length * facInfo[0].levels.length && v.every(x => x === 1)) add('ok', 'Complete blocks', `Every treatment appears exactly once in each of the ${bl.length} blocks → randomised complete block design (RCBD).`);
      else if (v.every(x => x >= 1) && Object.keys(seen).length === bl.length * facInfo[0].levels.length) add('ok', 'Generalised complete blocks', 'Every treatment appears more than once per block → generalised RCBD (block × treatment interaction estimable).');
      else add('info', 'Incomplete blocks', 'Not every treatment appears in every block → incomplete block design (lattice, alpha, BIBD) or missing plots.');
    }
    if (bl.length < 2) add('bad', 'Blocking column with one level', 'A blocking factor needs at least two blocks.');
  }
  if (d.row && d.col && facInfo.length === 1) {
    const rl = levelsOf(colBy(d.row)).length, cl = levelsOf(colBy(d.col)).length, tl = facInfo[0].levels.length;
    if (rl === cl && cl === tl) add('ok', 'Latin square structure', `${tl} treatments × ${rl} rows × ${cl} columns.`);
    else add('warn', 'Row–column layout is not a Latin square', `Rows: ${rl}, columns: ${cl}, treatments: ${tl}. A Latin square needs all three equal; otherwise use a row–column design.`);
  }
  d.responses.forEach(rn => {
    const c = colBy(rn);
    if (c.empty) { add('info', `${esc(rn)} is empty`, 'A field-book template: fill in the measurements, save the file and load it again. The design structure above is already valid.'); return; }
    if (c.missing) add('warn', `${esc(rn)}: ${c.missing} missing value${c.missing > 1 ? 's' : ''}`, 'Missing plots make the design unbalanced. Rows with a missing response are dropped for that variable.');
    if (c.negatives === 0 && c.zeros === 0 && c.min > 0 && c.max / c.min > 20) add('info', `${esc(rn)} spans more than one order of magnitude`, 'A log transformation may be needed (Block 4 will test this).');
    const ordinalName = /(score|scale|sever|nota|calif|grade|rating|escala)/i.test(rn);
    if (c.allInt && c.min >= 0 && c.max <= 10 && (c.unique <= 6 || ordinalName)) add('info', `${esc(rn)} looks like a short ordinal scale`, 'Scores (1–5, 1–9) violate ANOVA assumptions; the non-parametric alternatives in Block 4 (Kruskal–Wallis, Friedman, aligned ranks) are appropriate.');
    else if (c.max <= 100 && c.min >= 0 && /(%|pct|percent|porc|incid|germ|proportion|mortal)/i.test(rn)) add('info', `${esc(rn)} looks like a percentage`, 'Percentages from counts often need an arcsine-√ or logit transformation, or a GLM (Block 4).');
  });
  /* balance table for factor × block */
  const bt = el('balanceTable');
  bt.innerHTML = '';
  if (facInfo.length && (d.blocks.length || facInfo.length >= 2)) {
    const rowsF = colBy(facInfo[0].name);
    const colsF = d.blocks.length ? colBy(d.blocks[0]) : colBy(facInfo[1].name);
    const rl = levelsOf(rowsF), cl = levelsOf(colsF);
    const cnt = {};
    state.rawRows.forEach(r => { const k = String(r[rowsF.index]).trim() + '|' + String(r[colsF.index]).trim(); cnt[k] = (cnt[k] || 0) + 1; });
    const cols = [{ key: 'lvl', label: esc(rowsF.name) + ' \\ ' + esc(colsF.name), html: true }].concat(cl.map(c => ({ key: c, label: esc(c), num: true, html: true })));
    const rows = rl.map(l => { const o = { lvl: `<b>${esc(l)}</b>` }; cl.forEach(c => { const v = cnt[l + '|' + c] || 0; o[c] = v === 0 ? '<span class="flag bad">0</span>' : String(v); }); return o; });
    buildTable(bt, cols, rows, { caption: 'Observations per cell' });
  }
  const ok = d.responses.some(rn => !colBy(rn).empty) && d.factors.length && (!balance || balance.min >= 2);
  state.ready = !!ok;
  enableStep(3, !!ok); enableStep(4, !!ok); enableStep(5, !!ok); enableStep(7, !!ok);
  el('nextBtn2').disabled = !ok;
  document.dispatchEvent(new CustomEvent('datachange'));
}

/* ============================================================
   Wide → long reshape
   ============================================================ */
function renderReshape() {
  const keep = el('reshapeKeep'), stack = el('reshapeStack');
  keep.innerHTML = ''; stack.innerHTML = '';
  state.columns.forEach(c => {
    const l1 = mk('label', { class: 'checkbox-label' }); const c1 = mk('input', { type: 'checkbox', value: c.name });
    c1.checked = c.role !== 'response' && c.role !== 'covariate' && c.role !== 'excluded'; l1.appendChild(c1); l1.appendChild(document.createTextNode(c.name)); keep.appendChild(l1);
    const l2 = mk('label', { class: 'checkbox-label' }); const c2 = mk('input', { type: 'checkbox', value: c.name });
    c2.checked = c.role === 'response'; l2.appendChild(c2); l2.appendChild(document.createTextNode(c.name)); stack.appendChild(l2);
  });
}
function doReshape() {
  const keep = els('input:checked', el('reshapeKeep')).map(i => i.value);
  const stack = els('input:checked', el('reshapeStack')).map(i => i.value);
  if (!stack.length) { alert('Select at least one column to stack.'); return; }
  const nameCol = el('reshapeName').value.trim() || 'Treatment';
  const valCol = el('reshapeValue').value.trim() || 'Value';
  const idx = n => state.rawHeader.indexOf(n);
  const header = keep.concat([nameCol, valCol]);
  const rows = [];
  state.rawRows.forEach(r => stack.forEach(s => { rows.push(keep.map(k => r[idx(k)]).concat([s, r[idx(s)]])); }));
  afterLoad([header].concat(rows), (state.fileName || 'data').replace(/\.[^.]+$/, '') + '_long.csv', null, []);
}

/* ============================================================
   Downloads & init
   ============================================================ */
function downloadClean() {
  const keep = state.columns.filter(c => c.role !== 'excluded');
  const header = keep.map(c => c.name);
  const rows = state.rawRows.map(r => keep.map(c => r[c.index]));
  download(matrixToCSV(header, rows), slug(state.fileName) + '_clean.csv', 'text/csv;charset=utf-8');
}
function loadExample(path, name) {
  clearMessages('dataMessages');
  showMessage('dataMessages', 'info', '<span class="loading"></span> Loading example…');
  fetch(path).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(txt => afterLoad(parseCSV(txt, ','), name))
    .catch(() => { clearMessages('dataMessages'); showMessage('dataMessages', 'error', 'Could not load the example. Open the app through <b>server.ps1</b> (examples cannot be read from file://).'); });
}

/* Add a derived column (e.g. a transformed response). Never overwrites an existing one. */
function addDerivedColumn(name, values, role) {
  let nm = name, k = 2;
  while (state.rawHeader.includes(nm)) nm = name + '_' + k++;
  state.rawHeader.push(nm);
  state.rawRows.forEach((r, i) => r.push(values[i] == null || !isFinite(values[i]) ? '' : values[i]));
  const prof = profileColumns([nm], state.rawRows.map(r => [r[r.length - 1]]), state.decimal)[0];
  prof.index = state.rawHeader.length - 1;
  prof.role = role || 'response';
  prof.derived = true;
  state.columns.push(prof);
  renderVarTable(); renderPreview(); updateDesign();
  return nm;
}

function init() {
  if (!el('fileInput')) return;
  const dz = el('dropZone'), fi = el('fileInput');
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
  fi.addEventListener('change', () => { if (fi.files[0]) readFile(fi.files[0]); fi.value = ''; });
  el('sheetSelect').addEventListener('change', () => loadSheet(el('sheetSelect').value));
  el('pasteBtn').addEventListener('click', loadPasted);
  el('reshapeBtn').addEventListener('click', doReshape);
  el('downloadCleanBtn').addEventListener('click', downloadClean);
  el('nextBtn2').addEventListener('click', () => goStep(3));
  els('.example-btn').forEach(b => b.addEventListener('click', () => loadExample(b.dataset.path, b.dataset.name)));
  document.addEventListener('datachange', renderReshape, { once: false });
  /* grids produced elsewhere (Block 8 field-book template) */
  document.addEventListener('loadgrid', e => { clearMessages('dataMessages'); afterLoad(e.detail.grid, e.detail.name, null, []); });
  /* role legend */
  const leg = el('roleLegend');
  Object.entries(ROLES).forEach(([k, r]) => leg.appendChild(mk('div', { class: 'role-item' }, `<span class="r-dot" style="background:${r.color}"></span><div><b>${r.label}</b><span>${r.help}</span></div>`)));
}
document.addEventListener('DOMContentLoaded', init);
Object.assign(window, { parseCSV, toNumber, isMissing, loadExample, profileColumns, addDerivedColumn });
})();
