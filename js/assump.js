/* AgriDesign — assumption tests: normality, homogeneity of variances, additivity,
   independence, transformations and Box–Cox. Algorithms follow R (stats, car, nortest, MASS). */

const AS = {};

function poly(cc, x) { let r = cc[0]; if (cc.length > 1) { let p = x * cc[cc.length - 1]; for (let j = cc.length - 2; j > 0; j--) p = (p + cc[j]) * x; r += p; } return r; }

/* ---------- Shapiro–Wilk (Royston 1995, AS R94; 3 ≤ n ≤ 5000) ---------- */
AS.shapiro = x0 => {
  const x = S.sorted(x0), n = x.length;
  if (n < 3) return { W: NaN, p: NaN, n };
  const nn2 = Math.floor(n / 2), an = n;
  const c1 = [0, 0.221157, -0.147981, -2.071190, 4.434685, -2.706056];
  const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
  const c3 = [0.5440, -0.39978, 0.025054, -6.714e-4];
  const c4 = [1.3822, -0.77857, 0.062767, -0.0020322];
  const c5 = [-1.5861, -0.31082, -0.083751, 0.0038915];
  const c6 = [-0.4803, -0.082676, 0.0030302];
  const g = [-2.273, 0.459];
  const a = new Array(nn2).fill(0);
  if (n === 3) a[0] = Math.SQRT1_2;
  else {
    const an25 = an + 0.25, m = [];
    let summ2 = 0;
    for (let i = 0; i < nn2; i++) { m[i] = S.qnorm((i + 1 - 0.375) / an25); summ2 += m[i] * m[i]; }
    summ2 *= 2;
    const ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(an);
    const a1 = poly(c1, rsn) - m[0] / ssumm2;
    let i1, fac;
    if (n > 5) {
      i1 = 2;
      const a2 = -m[1] / ssumm2 + poly(c2, rsn);
      fac = Math.sqrt((summ2 - 2 * m[0] * m[0] - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1 - 2 * a2 * a2));
      a[1] = a2;
    } else { i1 = 1; fac = Math.sqrt((summ2 - 2 * m[0] * m[0]) / (1 - 2 * a1 * a1)); }
    a[0] = a1;
    for (let i = i1; i < nn2; i++) a[i] = -m[i] / fac;
  }
  const range = x[n - 1] - x[0];
  if (range < 1e-19) return { W: 1, p: 1, n, note: 'all values identical' };
  const sign = v => v > 0 ? 1 : v < 0 ? -1 : 0;
  let sx = x[0] / range, sa = -a[0];
  for (let i = 1, j = n - 2; i < n; i++, j--) { sx += x[i] / range; if (i !== j) sa += sign(i - j) * a[Math.min(i, j)]; }
  sa /= n; sx /= n;
  let ssa = 0, ssx = 0, sax = 0;
  for (let i = 0, j = n - 1; i < n; i++, j--) {
    const asa = i !== j ? sign(i - j) * a[Math.min(i, j)] - sa : -sa;
    const xsx = x[i] / range - sx;
    ssa += asa * asa; ssx += xsx * xsx; sax += asa * xsx;
  }
  const ssassx = Math.sqrt(ssa * ssx);
  const w1 = (ssassx - sax) * (ssassx + sax) / (ssa * ssx);
  const W = 1 - w1;
  let p;
  if (n === 3) { p = Math.max(0, 1.90985931710274 * (Math.asin(Math.sqrt(W)) - 1.04719755119660)); return { W, p, n }; }
  let y = Math.log(w1);
  const xx = Math.log(an);
  let mu, s;
  if (n <= 11) {
    const gamma = poly(g, an);
    if (y >= gamma) return { W, p: 1e-99, n };
    y = -Math.log(gamma - y); mu = poly(c3, an); s = Math.exp(poly(c4, an));
  } else { mu = poly(c5, xx); s = Math.exp(poly(c6, xx)); }
  p = 1 - S.pnorm(y, mu, s);
  return { W, p: Math.min(1, Math.max(0, p)), n };
};

/* ---------- Anderson–Darling (parameters estimated; nortest::ad.test) ---------- */
AS.andersonDarling = x0 => {
  const x = S.sorted(x0), n = x.length;
  if (n < 8) return { A: NaN, p: NaN, n, note: 'needs n ≥ 8' };
  const m = S.mean(x), sd = S.sd(x);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const F1 = Math.min(1 - 1e-12, Math.max(1e-12, S.pnorm((x[i] - m) / sd)));
    const F2 = Math.min(1 - 1e-12, Math.max(1e-12, S.pnorm((x[n - 1 - i] - m) / sd)));
    s += (2 * i + 1) * (Math.log(F1) + Math.log(1 - F2));
  }
  const A = -n - s / n;
  const AA = A * (1 + 0.75 / n + 2.25 / (n * n));
  let p;
  if (AA >= 0.6) p = Math.exp(1.2937 - 5.709 * AA + 0.0186 * AA * AA);
  else if (AA > 0.34) p = Math.exp(0.9177 - 4.279 * AA - 1.38 * AA * AA);
  else if (AA > 0.2) p = 1 - Math.exp(-8.318 + 42.796 * AA - 59.938 * AA * AA);
  else p = 1 - Math.exp(-13.436 + 101.14 * AA - 223.73 * AA * AA);
  return { A: AA, p: Math.min(1, Math.max(0, p)), n };
};

/* ---------- Jarque–Bera (skewness + kurtosis) ---------- */
AS.jarqueBera = x => {
  const n = x.length, m = S.mean(x);
  let m2 = 0, m3 = 0, m4 = 0;
  x.forEach(v => { const d = v - m; m2 += d * d; m3 += d * d * d; m4 += d * d * d * d; });
  m2 /= n; m3 /= n; m4 /= n;
  const sk = m3 / Math.pow(m2, 1.5), ku = m4 / (m2 * m2) - 3;
  const JB = n / 6 * (sk * sk + ku * ku / 4);
  return { JB, p: 1 - S.pchisq(JB, 2), skew: sk, kurt: ku };
};

/* ---------- one-way ANOVA helper ---------- */
AS.oneway = groups => {
  const k = groups.length, all = groups.flat(), N = all.length, gm = S.mean(all);
  let ssb = 0, ssw = 0;
  groups.forEach(g => { const m = S.mean(g); ssb += g.length * (m - gm) ** 2; g.forEach(v => ssw += (v - m) ** 2); });
  const df1 = k - 1, df2 = N - k;
  const F = (ssb / df1) / (ssw / df2);
  return { F, df1, df2, p: 1 - S.pf(F, df1, df2), ssb, ssw };
};

/* ---------- homogeneity of variances ---------- */
AS.levene = (groups, center) => {
  center = center || 'median';
  const z = groups.map(g => { const c = center === 'mean' ? S.mean(g) : S.median(g); return g.map(v => Math.abs(v - c)); });
  const r = AS.oneway(z);
  return { F: r.F, df1: r.df1, df2: r.df2, p: r.p, center };
};
AS.bartlett = groups => {
  const gs = groups.filter(g => g.length > 1);
  const k = gs.length, N = gs.reduce((s, g) => s + g.length, 0);
  const vars = gs.map(S.variance), dfs = gs.map(g => g.length - 1);
  const sp = dfs.reduce((s, d, i) => s + d * vars[i], 0) / (N - k);
  const num = (N - k) * Math.log(sp) - dfs.reduce((s, d, i) => s + d * Math.log(vars[i]), 0);
  const C = 1 + (1 / (3 * (k - 1))) * (dfs.reduce((s, d) => s + 1 / d, 0) - 1 / (N - k));
  const K2 = num / C;
  return { K2, df: k - 1, p: 1 - S.pchisq(K2, k - 1), vars };
};
AS.fmax = groups => {
  const vars = groups.filter(g => g.length > 1).map(S.variance);
  return { Fmax: S.max(vars) / S.min(vars), k: vars.length };
};
AS.fligner = groups => {
  /* Fligner–Killeen: normal scores of ranks of |x - median| */
  const cen = groups.map(g => g.map(v => Math.abs(v - S.median(g))));
  const all = cen.flat(), N = all.length, k = groups.length;
  const rk = S.ranks(all);
  const a = rk.map(r => S.qnorm(0.5 + r / (2 * (N + 1))));
  const abar = S.mean(a);
  let idx = 0, stat = 0;
  const v = a.reduce((s, x) => s + (x - abar) ** 2, 0) / (N - 1);
  cen.forEach(g => { const ag = a.slice(idx, idx + g.length); idx += g.length; stat += g.length * (S.mean(ag) - abar) ** 2; });
  stat /= v;
  return { X2: stat, df: k - 1, p: 1 - S.pchisq(stat, k - 1) };
};

/* ---------- Tukey's one-degree-of-freedom test for non-additivity ----------
   Adds fitted² to the additive model; F for that extra term. */
AS.tukeyAdditivity = (M, y, terms) => {
  const fit = LM.fit(M, y);
  if (fit.dfRes < 2) return null;
  const m = S.mean(fit.fitted);
  const M2 = { cols: M.cols.concat([fit.fitted.map(f => (f - m) ** 2)]), colTerm: M.colTerm.concat([terms.length]), names: M.names.concat(['fitted²']), n: M.n };
  const fit2 = LM.fit(M2, y);
  const df = fit.dfRes - fit2.dfRes;
  if (df < 1) return null;
  const ss = fit.sse - fit2.sse;
  const F = (ss / df) / fit2.mse;
  return { F, df1: df, df2: fit2.dfRes, p: 1 - S.pf(F, df, fit2.dfRes), ss };
};

/* ---------- Durbin–Watson on residuals in data order ---------- */
AS.durbinWatson = e => {
  let num = 0, den = 0;
  for (let i = 0; i < e.length; i++) { den += e[i] * e[i]; if (i) num += (e[i] - e[i - 1]) ** 2; }
  return { d: num / den };
};

/* ---------- studentized residuals ---------- */
AS.studentized = fit => {
  const s = Math.sqrt(fit.mse);
  return fit.resid.map((e, i) => e / (s * Math.sqrt(Math.max(1e-12, 1 - fit.hat[i]))));
};

/* ---------- transformations ---------- */
AS.transforms = y => {
  const mn = S.min(y), mx = S.max(y);
  const list = [{ id: 'none', label: 'None (original scale)', f: v => v, inv: v => v, suffix: '' }];
  if (mn > 0) list.push({ id: 'log', label: 'Natural logarithm ln(y)', f: Math.log, inv: Math.exp, suffix: '_ln', when: 'multiplicative effects, CV constant across treatments, SD ∝ mean' });
  if (mn >= 0) list.push({ id: 'log1', label: 'ln(y + 1)', f: v => Math.log(v + 1), inv: v => Math.exp(v) - 1, suffix: '_ln1', when: 'counts with zeros' });
  if (mn > 0) list.push({ id: 'log10', label: 'log₁₀(y)', f: Math.log10, inv: v => Math.pow(10, v), suffix: '_log10' });
  if (mn >= 0) list.push({ id: 'sqrt', label: 'Square root √y', f: Math.sqrt, inv: v => v * v, suffix: '_sqrt', when: 'Poisson counts, variance ∝ mean' });
  if (mn >= 0) list.push({ id: 'sqrt05', label: '√(y + 0.5)', f: v => Math.sqrt(v + 0.5), inv: v => v * v - 0.5, suffix: '_sqrt05', when: 'small counts with zeros (Bartlett)' });
  if (mn >= 0 && mx <= 100 && mx > 1) list.push({ id: 'asin', label: 'Arcsine √(y/100)', f: v => Math.asin(Math.sqrt(v / 100)), inv: v => 100 * Math.sin(v) ** 2, suffix: '_asin', when: 'percentages from counts, especially < 20 % or > 80 %' });
  if (mn >= 0 && mx <= 1) list.push({ id: 'asinp', label: 'Arcsine √y (proportion)', f: v => Math.asin(Math.sqrt(v)), inv: v => Math.sin(v) ** 2, suffix: '_asin', when: 'proportions from counts' });
  if (mn > 0 && mx < 1) list.push({ id: 'logit', label: 'Logit ln(y / (1 − y))', f: v => Math.log(v / (1 - v)), inv: v => 1 / (1 + Math.exp(-v)), suffix: '_logit', when: 'proportions away from 0 and 1' });
  if (mn > 0) list.push({ id: 'inv', label: 'Reciprocal 1/y', f: v => 1 / v, inv: v => 1 / v, suffix: '_inv', when: 'rates and times; SD ∝ mean²' });
  return list;
};
/* Box–Cox profile likelihood on a grid; y must be > 0 */
AS.boxcox = (M, recs, lambdas) => {
  const y = recs.map(r => r.y);
  if (S.min(y) <= 0) return null;
  const n = y.length, slog = y.reduce((s, v) => s + Math.log(v), 0);
  lambdas = lambdas || Array.from({ length: 41 }, (_, i) => -2 + i * 0.1);
  const prof = lambdas.map(l => {
    const yt = y.map(v => Math.abs(l) < 1e-9 ? Math.log(v) : (Math.pow(v, l) - 1) / l);
    const fit = LM.fit(M, yt);
    return { lambda: +l.toFixed(2), ll: -n / 2 * Math.log(fit.sse / n) + (l - 1) * slog };
  });
  const best = prof.reduce((p, c) => c.ll > p.ll ? c : p);
  const cut = best.ll - S.qchisq(0.95, 1) / 2;
  const inside = prof.filter(p => p.ll >= cut).map(p => p.lambda);
  const candidates = [-1, -0.5, 0, 0.5, 1, 2];
  const rounded = candidates.reduce((p, c) => Math.abs(c - best.lambda) < Math.abs(p - best.lambda) ? c : p);
  return { profile: prof, lambda: best.lambda, ciLow: S.min(inside), ciHigh: S.max(inside), rounded, cut, oneInside: inside.includes(1) || (S.min(inside) <= 1 && S.max(inside) >= 1) };
};

window.AS = AS;
