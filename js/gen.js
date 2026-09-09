/* AgriDesign — Block 8 algorithms: randomisation of the classical designs, field layout geometry,
   plot numbering, and replicate / power calculations. All randomisation is seeded and reproducible. */

const GEN = {};

const lab = (a, b, c) => [a, b, c].filter(x => x != null).join(' × ');

/* ---------- layout helpers ---------- */
/* put a list of "block" grids (each an array of rows of cells) on the field: stacked vertically or side by side */
function arrange(blocks, o) {
  const plots = [], boxes = [];
  let r0 = 0, c0 = 0, maxRows = 0;
  const side = o.arrangement === 'side';
  const perRow = side ? (o.blocksPerRow || blocks.length) : 1;
  blocks.forEach((b, bi) => {
    if (bi > 0 && bi % perRow === 0) { r0 += maxRows + (o.gap ? 1 : 0); c0 = 0; maxRows = 0; }
    const rows = b.grid.length, cols = Math.max(...b.grid.map(r => r.length));
    b.grid.forEach((row, ri) => row.forEach((cell, ci) => { if (cell) plots.push(Object.assign({ row: r0 + ri, col: c0 + ci, block: b.name }, cell)); }));
    boxes.push({ name: b.name, r0, c0, r1: r0 + rows - 1, c1: c0 + cols - 1, kind: 'block' });
    (b.boxes || []).forEach(x => boxes.push({ name: x.name, r0: r0 + x.r0, c0: c0 + x.c0, r1: r0 + x.r1, c1: c0 + x.c1, kind: x.kind || 'main' }));
    c0 += cols + (o.gap ? 1 : 0); maxRows = Math.max(maxRows, rows);
  });
  const nRows = Math.max(...plots.map(p => p.row)) + 1, nCols = Math.max(...plots.map(p => p.col)) + 1;
  return { plots, boxes, nRows, nCols };
}
/* cut a list into a rectangle of `cols` columns */
function toGrid(list, cols) {
  const grid = [];
  for (let i = 0; i < list.length; i += cols) grid.push(list.slice(i, i + cols));
  return grid;
}
/* plot numbers: row-wise or serpentine, starting at 1 or at block*100+1 */
GEN.number = (L, o) => {
  const byRow = {}; L.plots.forEach(p => (byRow[p.row] = byRow[p.row] || []).push(p));
  let n = o.start || 1;
  Object.keys(byRow).map(Number).sort((a, b) => a - b).forEach((r, ri) => {
    const row = byRow[r].sort((a, b) => a.col - b.col);
    if (o.serpentine && ri % 2 === 1) row.reverse();
    row.forEach(p => { p.plot = o.blockPrefix && p.blockIndex != null ? (p.blockIndex + 1) * 100 + (p.inBlock + 1) : n++; });
  });
  return L;
};

/* ---------- designs ---------- */
/* o: { seed, trts:[names], reps, cols (plots per row within block), arrangement, gap, A:[], B:[], C:[], k, checks:[], entries:[] } */
GEN.crd = o => {
  const rng = S.rng(o.seed);
  const list = rng.shuffle(o.trts.flatMap(t => Array(o.reps).fill(t)));
  const cols = o.cols || Math.ceil(Math.sqrt(list.length));
  const cells = list.map((t, i) => ({ trt: t, label: t, inBlock: i, blockIndex: 0 }));
  return arrange([{ name: 'Field', grid: toGrid(cells, cols) }], { arrangement: 'stacked' });
};
GEN.rcbd = o => {
  const rng = S.rng(o.seed);
  const blocks = [];
  for (let b = 0; b < o.reps; b++) {
    const perm = rng.shuffle(o.trts);
    const cols = o.cols || perm.length;
    blocks.push({ name: 'Block ' + (b + 1), grid: toGrid(perm.map((t, i) => ({ trt: t, label: t, rep: b + 1, inBlock: i, blockIndex: b })), cols) });
  }
  return arrange(blocks, o);
};
GEN.latin = o => {
  const rng = S.rng(o.seed), t = o.trts.length;
  const rp = rng.shuffle(o.trts.map((_, i) => i)), cp = rng.shuffle(o.trts.map((_, i) => i)), sp = rng.shuffle(o.trts);
  const grid = [];
  for (let i = 0; i < t; i++) { const row = []; for (let j = 0; j < t; j++) { const s = sp[(rp[i] + cp[j]) % t]; row.push({ trt: s, label: s, rowF: i + 1, colF: j + 1, inBlock: i * t + j, blockIndex: 0 }); } grid.push(row); }
  return arrange([{ name: 'Square', grid }], { arrangement: 'stacked' });
};
GEN.factorial = o => {
  const combos = [];
  o.A.forEach(a => o.B.forEach(b => { if (o.C && o.C.length) o.C.forEach(c => combos.push({ A: a, B: b, C: c, name: lab(a, b, c) })); else combos.push({ A: a, B: b, name: lab(a, b) }); }));
  const t = combos.map(c => c.name);
  const L = o.blocked ? GEN.rcbd(Object.assign({}, o, { trts: t })) : GEN.crd(Object.assign({}, o, { trts: t }));
  L.plots.forEach(p => { const c = combos.find(x => x.name === p.trt); p.A = c.A; p.B = c.B; if (c.C) p.C = c.C; });
  return L;
};
GEN.split = o => {
  const rng = S.rng(o.seed);
  const blocks = [];
  for (let b = 0; b < o.reps; b++) {
    const mains = rng.shuffle(o.A);
    const grid = Array.from({ length: o.B.length }, () => []);
    const boxes = [];
    let k = 0;
    mains.forEach((a, mi) => {
      const subs = rng.shuffle(o.B);
      subs.forEach((s, si) => { grid[si][mi] = { trt: lab(a, s), label: s, A: a, B: s, main: mi + 1, rep: b + 1, inBlock: k++, blockIndex: b }; });
      boxes.push({ name: a, r0: 0, c0: mi, r1: o.B.length - 1, c1: mi, kind: 'main' });
    });
    blocks.push({ name: (o.crdMain ? 'Rep ' : 'Block ') + (b + 1), grid, boxes });
  }
  return arrange(blocks, o);
};
GEN.strip = o => {
  const rng = S.rng(o.seed);
  const blocks = [];
  for (let b = 0; b < o.reps; b++) {
    const ra = rng.shuffle(o.A), cb = rng.shuffle(o.B);
    let k = 0;
    const grid = ra.map(a => cb.map(bb => ({ trt: lab(a, bb), label: lab(a, bb), A: a, B: bb, rep: b + 1, inBlock: k++, blockIndex: b })));
    const boxes = ra.map((a, i) => ({ name: a, r0: i, c0: 0, r1: i, c1: cb.length - 1, kind: 'main' }));
    blocks.push({ name: 'Block ' + (b + 1), grid, boxes });
  }
  return arrange(blocks, o);
};
GEN.splitsplit = o => {
  const rng = S.rng(o.seed);
  const blocks = [];
  for (let b = 0; b < o.reps; b++) {
    const mains = rng.shuffle(o.A);
    const grid = Array.from({ length: o.C.length }, () => []);
    const boxes = []; let k = 0, col = 0;
    mains.forEach(a => {
      const subs = rng.shuffle(o.B); const c0 = col;
      subs.forEach(s => { const ss = rng.shuffle(o.C); ss.forEach((c, ci) => { grid[ci][col] = { trt: lab(a, s, c), label: c, A: a, B: s, C: c, rep: b + 1, inBlock: k++, blockIndex: b }; }); boxes.push({ name: s, r0: 0, c0: col, r1: o.C.length - 1, c1: col, kind: 'sub' }); col++; });
      boxes.push({ name: a, r0: 0, c0, r1: o.C.length - 1, c1: col - 1, kind: 'main' });
    });
    blocks.push({ name: 'Block ' + (b + 1), grid, boxes });
  }
  return arrange(blocks, o);
};
/* resolvable incomplete blocks: each replicate split at random into blocks of size k (t must be a multiple of k) */
GEN.ibd = o => {
  const rng = S.rng(o.seed), t = o.trts.length, k = o.k;
  if (t % k) throw new Error(`The number of treatments (${t}) must be a multiple of the block size (${k}).`);
  const blocks = [];
  for (let r = 0; r < o.reps; r++) {
    const perm = rng.shuffle(o.trts);
    const nb = t / k;
    const grid = []; const boxes = [];
    for (let b = 0; b < nb; b++) { grid.push(perm.slice(b * k, (b + 1) * k).map((tt, i) => ({ trt: tt, label: tt, rep: r + 1, ib: b + 1, inBlock: b * k + i, blockIndex: r }))); boxes.push({ name: 'B' + (b + 1), r0: b, c0: 0, r1: b, c1: k - 1, kind: 'sub' }); }
    blocks.push({ name: 'Rep ' + (r + 1), grid, boxes });
  }
  return arrange(blocks, o);
};
GEN.augmented = o => {
  const rng = S.rng(o.seed);
  const entries = rng.shuffle(o.entries);
  const per = Math.ceil(entries.length / o.reps);
  const blocks = [];
  for (let b = 0; b < o.reps; b++) {
    const mine = entries.slice(b * per, (b + 1) * per);
    const list = rng.shuffle(o.checks.concat(mine));
    const cols = o.cols || list.length;
    blocks.push({ name: 'Block ' + (b + 1), grid: toGrid(list.map((t, i) => ({ trt: t, label: t, rep: b + 1, check: o.checks.includes(t), inBlock: i, blockIndex: b })), cols) });
  }
  return arrange(blocks, o);
};

/* ---------- field book ---------- */
GEN.fieldBook = (L, o) => {
  const hasA = L.plots.some(p => p.A != null), hasC = L.plots.some(p => p.C != null), hasRC = L.plots.some(p => p.rowF != null);
  const cols = ['Plot'];
  if (L.plots.some(p => p.rep != null)) cols.push(o.repName || 'Block');
  if (L.plots.some(p => p.ib != null)) cols.push('IncBlock');
  if (hasRC) cols.push('Row', 'Column'); else cols.push('FieldRow', 'FieldCol');
  if (hasA) { cols.push(o.aName || 'A', o.bName || 'B'); if (hasC) cols.push(o.cName || 'C'); }
  cols.push(o.trtName || 'Treatment');
  if (L.plots.some(p => p.check != null)) cols.push('Type');
  (o.responses || []).forEach(r => cols.push(r));
  const rows = L.plots.slice().sort((a, b) => a.plot - b.plot).map(p => {
    const r = [p.plot];
    if (p.rep != null) r.push(p.rep);
    if (p.ib != null) r.push(p.ib);
    if (hasRC) r.push(p.rowF, p.colF); else r.push(p.row + 1, p.col + 1);
    if (hasA) { r.push(p.A, p.B); if (hasC) r.push(p.C); }
    r.push(p.trt);
    if (p.check != null) r.push(p.check ? 'check' : 'entry');
    (o.responses || []).forEach(() => r.push(''));
    return r;
  });
  return { header: cols, rows };
};

/* ---------- replicates and power (difference between two treatment means) ---------- */
/* cv: CV %, d: difference as % of the mean, alpha, power (0-1), t: number of treatments, design: 'crd'|'rcbd' */
GEN.powerFor = (r, o) => {
  const df = o.design === 'rcbd' ? (o.t - 1) * (r - 1) : o.t * (r - 1);
  if (df < 1) return { df, power: 0 };
  const tc = S.qt(1 - o.alpha / 2, df);
  const delta = (o.d / o.cv) * Math.sqrt(r / 2);
  const power = 1 - S.pt(tc - delta, df) + S.pt(-tc - delta, df);
  return { df, power: Math.min(1, Math.max(0, power)), tc, delta };
};
GEN.repsNeeded = o => {
  const rows = [];
  let found = null;
  for (let r = 2; r <= 200; r++) { const p = GEN.powerFor(r, o); rows.push({ r, df: p.df, power: p.power }); if (found == null && p.power >= o.power) found = r; if (r > 30 && found != null) break; }
  return { r: found, rows };
};
/* detectable difference (% of mean) with r replicates */
GEN.detectable = (r, o) => {
  const df = o.design === 'rcbd' ? (o.t - 1) * (r - 1) : o.t * (r - 1);
  if (df < 1) return NaN;
  return (S.qt(1 - o.alpha / 2, df) + S.qt(o.power, df)) * o.cv * Math.sqrt(2 / r);
};

window.GEN = GEN;
