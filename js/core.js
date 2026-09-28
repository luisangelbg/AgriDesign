/* AgriDesign — global state and shared utilities.
   No ES modules: everything hangs from window so the app also works from file:// */

const state = {
  /* --- Block 2: data --- */
  fileName: null,
  sheetName: null,
  sheets: [],
  workbook: null,
  rawHeader: [],
  rawRows: [],          // array of arrays
  columns: [],          // [{name, kind, role, n, missing, unique, stats..., levels[]}]
  /* role: 'response' | 'factor' | 'block' | 'row' | 'col' | 'covariate' | 'id' | 'excluded'
     factor sub-roles are ordered by state.design.factors */
  design: {
    responses: [],       // column names
    factors: [],         // treatment factors in order (main plot first)
    blocks: [],          // block / replicate columns
    row: null, col: null,
    covariates: [],
  },
  ready: false,
  /* later blocks */
  desc: null, assumptions: null, anova: null,
};
window.state = state;

/* ---------------- DOM ---------------- */
function el(id) { return document.getElementById(id); }
function els(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
function mk(tag, attrs, html) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'style') n.setAttribute('style', attrs[k]);
    else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  if (html != null) n.innerHTML = html;
  return n;
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showMessage(container, type, text) {
  if (typeof container === 'string') container = el(container);
  if (!container) return null;
  const div = mk('div', { class: 'msg msg-' + type }, text);
  /* errors and warnings are announced to screen readers */
  if (window.LABG) LABG.messageRole(div, type);
  container.appendChild(div);
  return div;
}
function clearMessages(container) {
  if (typeof container === 'string') container = el(container);
  if (container) container.innerHTML = '';
}

function statTiles(container, tiles) {
  if (typeof container === 'string') container = el(container);
  container.innerHTML = '';
  tiles.forEach(t => {
    const [label, value, sub, level] = Array.isArray(t) ? t : [t.label, t.value, t.sub, t.level];
    const d = mk('div', { class: 'stat-tile' + (level ? ' ' + level : '') });
    d.innerHTML = `<div class="stat-label">${label}</div><div class="stat-value">${value}</div>` +
      (sub ? `<div class="stat-sub">${sub}</div>` : '');
    container.appendChild(d);
  });
}

/* Builds a <table>. columns: [{key,label,get?,fmt?,num?,html?}] */
function buildTable(container, columns, rows, opts) {
  opts = opts || {};
  if (typeof container === 'string') container = el(container);
  container.innerHTML = '';
  const table = mk('table');
  if (opts.caption) table.appendChild(mk('caption', null, opts.caption));
  const thead = mk('thead'), trh = mk('tr');
  columns.forEach(c => {
    const th = mk('th', { class: c.num ? 'num' : null });
    th.innerHTML = c.label != null ? c.label : c.key;
    trh.appendChild(th);
  });
  thead.appendChild(trh); table.appendChild(thead);
  const tbody = mk('tbody');
  const shown = opts.limit ? rows.slice(0, opts.limit) : rows;
  shown.forEach(r => {
    const tr = mk('tr');
    if (r && r._class) tr.className = r._class;
    columns.forEach(c => {
      const td = mk('td', { class: c.num ? 'num' : null });
      let v = c.get ? c.get(r) : r[c.key];
      if (c.html) { td.innerHTML = v == null ? '—' : v; tr.appendChild(td); return; }
      if (c.fmt && v != null && v !== '') v = c.fmt(v);
      td.textContent = (v === null || v === undefined || v === '' ||
        (typeof v === 'number' && !isFinite(v))) ? '—' : v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
  if (opts.limit && rows.length > opts.limit) {
    const p = mk('p', { class: 'hint', style: 'padding:6px 12px;margin:0' });
    p.textContent = `Showing ${opts.limit} of ${rows.length} rows.`;
    container.appendChild(p);
  }
  return table;
}

/* Table → CSV download button helper */
function tableToCSV(table) {
  const rows = [...table.querySelectorAll('tr')].map(tr =>
    [...tr.children].map(td => csvEscape(td.textContent.trim())).join(','));
  return '﻿' + rows.join('\r\n');
}

/* ---------------- numbers ---------------- */
function fmtNum(v, d) {
  if (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) return '—';
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs < 1e-4 || abs >= 1e7) return n.toExponential(d != null ? d : 2);
  return n.toLocaleString('en-US', { maximumFractionDigits: d != null ? d : 3 });
}
function fmtFixed(v, d) {
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '−∞';
  if (v == null || !isFinite(v)) return '—';
  return Number(v).toFixed(d == null ? 3 : d);
}
function fmtP(p) {
  if (p == null || !isFinite(p)) return '—';
  if (p < 0.0001) return '< 0.0001';
  return Number(p).toFixed(4);
}
function fmtPLabel(p) {
  if (p == null || !isFinite(p)) return 'p = —';
  return p < 0.0001 ? 'p < 0.0001' : 'p = ' + Number(p).toFixed(4);
}
function sigStars(p) {
  if (p == null || !isFinite(p)) return '';
  return p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : p < 0.1 ? '.' : 'ns';
}
function fmtPct(x, d) {
  if (x == null || !isFinite(x)) return '—';
  return (x * 100).toLocaleString('en-US', { maximumFractionDigits: d == null ? 1 : d }) + '%';
}

/* ---------------- CSV / downloads ---------------- */
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function matrixToCSV(header, rows) {
  const head = header.map(csvEscape).join(',');
  const body = rows.map(r => r.map(csvEscape).join(','));
  return '﻿' + [head, ...body].join('\r\n');
}
function download(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = mk('a', { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function slug(s) {
  return String(s || 'agridesign').replace(/\.[^.]+$/, '')
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'agridesign';
}

/* ---------------- step navigation ----------------
   Blocks are numbered 1..8 and read in that order. Block 1 is the home page
   and Block 8 (design generator) works without data, so neither counts when
   deciding whether a block of the data route is finished. */
const STEP_ORDER = [1, 2, 3, 4, 5, 6, 7, 8];
const STEP_ROUTE = [2, 3, 4, 5, 6, 7];
const stepBtn = n => document.querySelector('.step-btn[data-step="' + n + '"]');
/* T() lives in i18n.js; without it (tests) the English original is used */
const TT = (en, es) => (typeof T === 'function' ? T(en, es) : en);
const stepOn = n => { const b = stepBtn(n); return !!b && !b.disabled; };

function goStep(n) {
  /* the listeners of 'stepchange' compare numbers: the keyboard and the block
     footers hand over the data-step text, so it is turned into a number here */
  n = Number(n);
  els('.step-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + n));
  els('.step-btn').forEach(b => b.classList.toggle('active', b.dataset.step === String(n)));
  document.body.classList.toggle('on-home', n === 1);
  if (window.LABG) {
    LABG.setCurrentStep(n);
    LABG.announce(TT('Block: ', 'Bloque: ') + stepLabel(n));
  }
  refreshStepFooters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.dispatchEvent(new CustomEvent('stepchange', { detail: { step: n } }));
}
function enableStep(n, on) {
  const b = stepBtn(n);
  if (b) b.disabled = (on === false);
  refreshStepMarks();
  refreshStepFooters();
}

/* A block of the data route is «finished» when a later block of the route is
   already open. Recomputed on every enableStep, so loading new data clears it. */
function refreshStepMarks() {
  if (!window.LABG) return;
  STEP_ROUTE.forEach((s, i) => {
    const later = STEP_ROUTE.slice(i + 1).some(stepOn);
    LABG.markStep(s, stepOn(s) && later ? 'done' : null);
  });
}

/* Footer of every block: Previous / Next, with the name of the block. */
function stepLabel(n) {
  const b = stepBtn(n); if (!b) return '';
  const num = b.querySelector('.step-num').textContent.trim();
  const name = (b.querySelector('[data-es]') || b).textContent.replace(/\s+/g, ' ').trim();
  return num + ' · ' + name;
}
function refreshStepFooters() {
  const bar = el('stepper');
  if (bar) bar.setAttribute('aria-label', TT('Blocks', 'Bloques'));
  els('.step-panel').forEach(p => {
    const n = Number(p.id.replace('panel-', ''));
    const i = STEP_ORDER.indexOf(n);
    if (i < 0) return;
    let f = p.querySelector(':scope > .step-footer');
    if (!f) {
      f = mk('nav', { class: 'step-footer no-print' });
      f.innerHTML = '<button type="button" class="btn btn-secondary prev"></button><button type="button" class="btn btn-primary next"></button>';
      /* data-target, not data-go: the home page binds every [data-go] on load */
      f.addEventListener('click', e => { const b = e.target.closest('button[data-target]'); if (b && !b.disabled) goStep(b.dataset.target); });
      p.appendChild(f);
    }
    f.setAttribute('aria-label', TT('Blocks', 'Bloques'));
    const prev = STEP_ORDER.slice(0, i).reverse().find(stepOn);
    const next = STEP_ORDER.slice(i + 1).find(s => stepBtn(s));
    const bp = f.querySelector('.prev'), bn = f.querySelector('.next');
    bp.hidden = !prev;
    if (prev) { bp.dataset.target = prev; bp.innerHTML = `← <span><small>${TT('Previous', 'Anterior')}</small>${esc(stepLabel(prev))}</span>`; }
    bn.hidden = !next;
    if (next) {
      bn.dataset.target = next; bn.disabled = !stepOn(next);
      bn.innerHTML = `<span><small>${TT('Next', 'Siguiente')}</small>${esc(stepLabel(next))}</span> →`;
    }
  });
}

/* Common suite bar: shortcuts, help, warning before closing and keyboard.
   Language and theme stay with I18N and Theme (i18n.js). Only in the app:
   the tests load core.js without labg-core.js. */
document.addEventListener('DOMContentLoaded', () => {
  if (!window.LABG) return;
  const hb = el('helpBtn');
  if (hb) hb.addEventListener('click', () => LABG.showShortcuts());
  LABG.shortcuts([]);
  LABG.bindStepKeys(goStep);
  LABG.guardUnload(() => !!state.fileName);
  LABG.setCurrentStep((document.querySelector('.step-btn.active') || {}).dataset?.step || '1');
  document.addEventListener('langchange', () => { refreshStepMarks(); refreshStepFooters(); });
  refreshStepMarks();
  refreshStepFooters();
});

/* Persisted user preferences (figure style etc.) */
const Prefs = {
  get(k, d) { try { const v = localStorage.getItem('agridesign:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('agridesign:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};

Object.assign(window, {
  el, els, mk, esc, showMessage, clearMessages, statTiles, buildTable, tableToCSV,
  fmtNum, fmtFixed, fmtP, fmtPLabel, sigStars, fmtPct, csvEscape, matrixToCSV, download, slug,
  goStep, enableStep, Prefs,
});
