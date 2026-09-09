/* AgriDesign — linear model engine (fixed effects, least squares).
   - Effect (sum-to-zero) coding for factors, so drop-one-term tests are Type III.
   - Modified Gram–Schmidt QR with column dropping for rank-deficient designs
     (incomplete factorials, aliased terms), as R's lm does with pivoting.
   Data are passed as arrays of "records": {y, f: {Factor: level}, x: {Cov: value}}. */

const LM = {};

/* ---------- model matrix ---------- */
/* term = { name, factors: ['A','B'], numeric: ['x'] } ; interactions = several factors / numerics */
LM.levels = (recs, f) => [...new Set(recs.map(r => r.f[f]))];

function effectCols(level, levels) {
  const k = levels.length, out = new Array(k - 1).fill(0);
  const i = levels.indexOf(level);
  if (i === k - 1) out.fill(-1); else out[i] = 1;
  return out;
}
LM.modelMatrix = (recs, terms, levelsMap) => {
  levelsMap = levelsMap || {};
  const lv = f => levelsMap[f] || (levelsMap[f] = LM.levels(recs, f));
  const n = recs.length;
  const cols = [new Array(n).fill(1)], colTerm = [-1], names = ['(Intercept)'];
  terms.forEach((t, ti) => {
    /* build the list of column-generators per component then take products */
    let gens = [[() => 1, '']];
    (t.factors || []).forEach(f => {
      const L = lv(f);
      const next = [];
      gens.forEach(([g, nm]) => L.slice(0, -1).forEach((l, i) => next.push([r => g(r) * effectCols(r.f[f], L)[i], nm + (nm ? ':' : '') + f + '[' + l + ']'])));
      gens = next;
    });
    (t.numeric || []).forEach(x => {
      const next = [];
      gens.forEach(([g, nm]) => next.push([r => g(r) * r.x[x], nm + (nm ? ':' : '') + x]));
      gens = next;
    });
    gens.forEach(([g, nm]) => { cols.push(recs.map(g)); colTerm.push(ti); names.push(nm); });
  });
  return { cols, colTerm, names, n, levelsMap };
};

/* ---------- least squares via MGS-QR with column dropping ---------- */
LM.fit = (M, y, keepCols) => {
  const n = M.n;
  const idx = keepCols || M.cols.map((_, j) => j);
  const Q = [], R = [], used = [];         /* Q: orthonormal columns; R upper triangular (dense by used index) */
  const tol = 1e-9;
  idx.forEach(j => {
    let v = M.cols[j].slice();
    const norm0 = Math.sqrt(v.reduce((s, a) => s + a * a, 0)) || 1;
    const rcol = [];
    Q.forEach(q => { let d = 0; for (let i = 0; i < n; i++) d += q[i] * v[i]; rcol.push(d); for (let i = 0; i < n; i++) v[i] -= d * q[i]; });
    /* re-orthogonalise once for stability */
    Q.forEach((q, k) => { let d = 0; for (let i = 0; i < n; i++) d += q[i] * v[i]; rcol[k] += d; for (let i = 0; i < n; i++) v[i] -= d * q[i]; });
    const norm = Math.sqrt(v.reduce((s, a) => s + a * a, 0));
    if (norm / norm0 < tol) return;         /* aliased column: dropped */
    for (let i = 0; i < n; i++) v[i] /= norm;
    rcol.push(norm);
    Q.push(v); R.push(rcol); used.push(j);
  });
  const p = Q.length;
  /* Q'y */
  const qty = Q.map(q => { let d = 0; for (let i = 0; i < n; i++) d += q[i] * y[i]; return d; });
  /* back-substitution: R is stored per column (R[k] holds entries rows 0..k) */
  const beta = new Array(p).fill(0);
  for (let k = p - 1; k >= 0; k--) { let s = qty[k]; for (let m = k + 1; m < p; m++) s -= R[m][k] * beta[m]; beta[k] = s / R[k][k]; }
  const fitted = new Array(n).fill(0);
  for (let k = 0; k < p; k++) for (let i = 0; i < n; i++) fitted[i] += qty[k] * Q[k][i];
  const resid = y.map((v, i) => v - fitted[i]);
  const sse = resid.reduce((s, e) => s + e * e, 0);
  const hat = new Array(n).fill(0);
  for (let k = 0; k < p; k++) for (let i = 0; i < n; i++) hat[i] += Q[k][i] * Q[k][i];
  const coef = {}; used.forEach((j, k) => coef[M.names[j]] = beta[k]);
  return { rank: p, dfRes: n - p, sse, mse: n - p > 0 ? sse / (n - p) : NaN, fitted, resid, hat, beta, coef, used, n, R };
};

/* (X'X)^-1 = R^-1 R^-T from the stored triangular factor (columns in `used` order) */
LM.xtxInv = fit => {
  if (fit._inv) return fit._inv;
  const p = fit.rank, R = fit.R;
  const Rinv = Array.from({ length: p }, () => new Array(p).fill(0));   /* Rinv[row][col] */
  for (let c = 0; c < p; c++) {                                        /* solve R x = e_c */
    for (let r = p - 1; r >= 0; r--) {
      let s = (r === c ? 1 : 0);
      for (let m = r + 1; m < p; m++) s -= R[m][r] * Rinv[m][c];
      Rinv[r][c] = s / R[r][r];
    }
  }
  const inv = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) { let s = 0; for (let m = 0; m < p; m++) s += Rinv[a][m] * Rinv[b][m]; inv[a][b] = s; }
  fit._inv = inv;
  return inv;
};
/* predictions (and SE with a given error variance) for new records built with the same terms/levels */
LM.predict = (fit, terms, levelsMap, newRecs, varScale) => {
  const Mn = LM.modelMatrix(newRecs, terms, levelsMap);
  const inv = LM.xtxInv(fit);
  const out = [];
  for (let i = 0; i < newRecs.length; i++) {
    const x = fit.used.map(j => Mn.cols[j][i]);
    let yhat = 0; for (let k = 0; k < x.length; k++) yhat += x[k] * fit.beta[k];
    let q = 0; for (let a = 0; a < x.length; a++) for (let b = 0; b < x.length; b++) q += x[a] * inv[a][b] * x[b];
    out.push({ fit: yhat, se: Math.sqrt(Math.max(0, q) * (varScale == null ? fit.mse : varScale)), x });
  }
  return out;
};

/* ---------- ANOVA tables ---------- */
/* Type I: sequential; Type III: drop each term from the full model */
LM.anova = (M, y, terms, type) => {
  const full = LM.fit(M, y);
  const rows = [];
  if (type === 1 || type === 'I') {
    let prev = LM.fit(M, y, M.cols.map((_, j) => j).filter(j => M.colTerm[j] === -1));
    terms.forEach((t, ti) => {
      const keep = M.cols.map((_, j) => j).filter(j => M.colTerm[j] <= ti);
      const cur = LM.fit(M, y, keep);
      const ss = prev.sse - cur.sse, df = prev.dfRes - cur.dfRes;
      rows.push({ term: t.name, df, ss });
      prev = cur;
    });
  } else {
    terms.forEach((t, ti) => {
      const keep = M.cols.map((_, j) => j).filter(j => M.colTerm[j] !== ti);
      const red = LM.fit(M, y, keep);
      rows.push({ term: t.name, df: red.dfRes - full.dfRes, ss: red.sse - full.sse });
    });
  }
  rows.forEach(r => { r.ms = r.df > 0 ? r.ss / r.df : NaN; r.F = full.dfRes > 0 && r.df > 0 ? r.ms / full.mse : NaN; r.p = isFinite(r.F) ? 1 - S.pf(r.F, r.df, full.dfRes) : NaN; });
  const sst = S.sumsq(y);
  return { rows, residual: { term: 'Residuals', df: full.dfRes, ss: full.sse, ms: full.mse }, total: { term: 'Total', df: y.length - 1, ss: sst }, fit: full };
};

/* ---------- convenience: build terms from the design ---------- */
/* opts: { blocks:[], row, col, factors:[], covariates:[], interactions:true, maxOrder } */
LM.termsFromDesign = o => {
  const terms = [];
  (o.covariates || []).forEach(c => terms.push({ name: c, numeric: [c] }));
  (o.blocks || []).forEach(b => terms.push({ name: b, factors: [b] }));
  if (o.row) terms.push({ name: o.row, factors: [o.row] });
  if (o.col) terms.push({ name: o.col, factors: [o.col] });
  const F = o.factors || [];
  const maxOrder = o.interactions === false ? 1 : (o.maxOrder || F.length);
  for (let order = 1; order <= Math.min(maxOrder, F.length); order++) {
    const combos = [];
    const rec = (start, cur) => { if (cur.length === order) { combos.push(cur.slice()); return; } for (let i = start; i < F.length; i++) { cur.push(F[i]); rec(i + 1, cur); cur.pop(); } };
    rec(0, []);
    combos.forEach(c => terms.push({ name: c.join(':'), factors: c }));
  }
  return terms;
};
LM.formula = (resp, terms) => resp + ' ~ ' + terms.map(t => t.name).join(' + ');

/* records from the app state for a response */
LM.records = (resp, o) => {
  const colBy = n => state.columns.find(c => c.name === n);
  const rc = colBy(resp);
  const fnames = [].concat(o.blocks || [], o.row ? [o.row] : [], o.col ? [o.col] : [], o.factors || []);
  const fcols = fnames.map(colBy), ccols = (o.covariates || []).map(colBy);
  const recs = [];
  state.rawRows.forEach((r, i) => {
    const y = toNumber(r[rc.index], state.decimal);
    if (y == null) return;
    if (fcols.some(c => isMissing(r[c.index]))) return;
    const x = {}; let ok = true;
    ccols.forEach(c => { const v = toNumber(r[c.index], state.decimal); if (v == null) ok = false; x[c.name] = v; });
    if (!ok) return;
    const f = {}; fcols.forEach(c => f[c.name] = String(r[c.index]).trim());
    recs.push({ y, f, x, row: i });
  });
  /* centre covariates */
  ccols.forEach(c => { const m = S.mean(recs.map(r => r.x[c.name])); recs.forEach(r => r.x[c.name] -= m); });
  /* level order as profiled (numeric-sorted for numeric codes) */
  const levelsMap = {};
  fcols.forEach(c => { const present = new Set(recs.map(r => r.f[c.name])); levelsMap[c.name] = (c.levels || []).map(l => String(l).trim()).filter(l => present.has(l)); });
  return { recs, levelsMap };
};

window.LM = LM;
