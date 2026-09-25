/* AgriDesign — mean-separation procedures, Dunnett, contrasts and orthogonal polynomials.
   Input: groups = [{label, mean, n, se?}], mse (error mean square), dfe (error df), alpha, method.
   Output: { pairs:[{i,j,diff,se,stat,p,padj,sig,crit}], letters:[], msd, note } */

const PH = {};

/* A getter, so the names and the descriptions of the tests always come back in the language in use. */
Object.defineProperty(PH, 'methods', { get: () => ({
  tukey:      { name: T('Tukey HSD (Tukey–Kramer)', 'Tukey HSD (Tukey–Kramer)'), family: 'q', desc: T('Controls the family-wise error rate for all pairwise comparisons; the standard for agronomic trials.', 'Controla el error por familia en todas las comparaciones por pares; es la norma en ensayos agronómicos.') },
  lsd:        { name: T("Fisher's LSD", 'DMS de Fisher'), family: 't', desc: T('Least significant difference. Per-comparison error rate; use only after a significant F (protected LSD) and with few treatments.', 'Diferencia mínima significativa. Controla el error por comparación; úsala solo después de una F significativa (DMS protegida) y con pocos tratamientos.') },
  bonferroni: { name: 'Bonferroni', family: 't', desc: T('Very conservative for many treatments; safe with pre-planned comparisons.', 'Muy conservadora cuando hay muchos tratamientos; segura con comparaciones planeadas de antemano.') },
  sidak:      { name: 'Šidák', family: 't', desc: T('Slightly less conservative than Bonferroni.', 'Un poco menos conservadora que Bonferroni.') },
  holm:       { name: T('Holm (step-down Bonferroni)', 'Holm (Bonferroni descendente)'), family: 't', desc: T('Uniformly more powerful than Bonferroni, same error control.', 'Siempre más potente que Bonferroni, con el mismo control del error.') },
  duncan:     { name: T("Duncan's multiple range test", 'Prueba de rangos múltiples de Duncan'), family: 'range', desc: T('Liberal (does not control the family-wise error); still common in agronomy journals, now discouraged.', 'Liberal (no controla el error por familia); sigue siendo común en revistas de agronomía, pero ya se desaconseja.') },
  snk:        { name: 'Student–Newman–Keuls', family: 'range', desc: T('Multiple range test with the studentized range at each step; controls per-step error only.', 'Prueba de rangos múltiples con el rango estudentizado en cada paso; solo controla el error por paso.') },
  regwq:      { name: 'REGWQ (Ryan–Einot–Gabriel–Welsch)', family: 'range', desc: T('Multiple range test that controls the family-wise error; more powerful than Tukey when many means are equal.', 'Prueba de rangos múltiples que sí controla el error por familia; más potente que Tukey cuando muchas medias son iguales.') },
  scheffe:    { name: 'Scheffé', family: 'F', desc: T('Protects all possible contrasts, so it is the most conservative for pairwise comparisons; use when contrasts are chosen after seeing the data.', 'Protege todos los contrastes posibles, así que es la más conservadora para comparaciones por pares; úsala cuando los contrastes se eligen después de ver los datos.') },
  dunnett:    { name: T('Dunnett (vs control)', 'Dunnett (contra el testigo)'), family: 'dunnett', desc: T('Compares every treatment with the control only; exact multivariate-t adjustment.', 'Compara cada tratamiento solo con el testigo; ajuste exacto con la t multivariante.') },
  gameshowell:{ name: 'Games–Howell', family: 'gh', desc: T('For unequal variances; uses the studentized range with Welch degrees of freedom per pair (needs group SDs).', 'Para varianzas desiguales; usa el rango estudentizado con grados de libertad de Welch en cada par (necesita las DE de los grupos).') },
}) });

/* studentized range critical value */
const qcrit = (alpha, p, df) => S.qtukey(1 - alpha, p, df);

/* Dunnett two-sided p-value: P(max|T_i| > t) with k comparisons, df, common correlation rho.
   Double integral over the chi variable and the standard normal (Gauss–Legendre / midpoint). */
PH.dunnettP = (t, k, df, rho) => {
  rho = rho == null ? 0.5 : rho;
  t = Math.abs(t);
  const sr = Math.sqrt(rho), s1 = Math.sqrt(1 - rho);
  /* inner: P(all |T_i| <= t | s) = ∫ Π [Φ((t s + sr z)/s1) − Φ((−t s + sr z)/s1)] φ(z) dz */
  const inner = s => {
    let acc = 0; const N = 80, lo = -7, hi = 7, h = (hi - lo) / N;
    for (let i = 0; i < N; i++) {
      const z = lo + (i + 0.5) * h;
      const p = S.pnorm((t * s + sr * z) / s1) - S.pnorm((-t * s + sr * z) / s1);
      acc += Math.pow(Math.max(0, p), k) * S.dnorm(z) * h;
    }
    return acc;
  };
  if (!isFinite(df) || df > 5000) return 1 - inner(1);
  /* outer over s = sqrt(chi2_df / df): density f(s) = 2 (df/2)^(df/2) / Γ(df/2) · s^(df−1) e^(−df s²/2) */
  const lg = S.lgamma(df / 2);
  const dens = s => Math.exp(Math.log(2) + (df / 2) * Math.log(df / 2) - lg + (df - 1) * Math.log(s) - df * s * s / 2);
  const sMax = 1 + 6 / Math.sqrt(df), sMin = Math.max(1e-6, 1 - 6 / Math.sqrt(df));
  let acc = 0; const N = 48, h = (sMax - sMin) / N;
  for (let i = 0; i < N; i++) { const s = sMin + (i + 0.5) * h; acc += inner(s) * dens(s) * h; }
  return Math.min(1, Math.max(0, 1 - acc));
};
PH.dunnettCrit = (alpha, k, df, rho) => { let a = 0.5, b = 6; for (let i = 0; i < 28; i++) { const m = (a + b) / 2; if (PH.dunnettP(m, k, df, rho) > alpha) a = m; else b = m; } return (a + b) / 2; };

/* ---------- main pairwise engine ---------- */
PH.compare = o => {
  const { groups, mse, dfe, alpha, method } = o;
  const k = groups.length;
  const pairs = [];
  const seDiff = (i, j) => o.seDiff ? o.seDiff(i, j) : Math.sqrt(mse * (1 / groups[i].n + 1 / groups[j].n));
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const diff = groups[i].mean - groups[j].mean, se = seDiff(i, j);
    pairs.push({ i, j, diff, se, t: diff / se, q: Math.abs(diff) / se * Math.SQRT2 });
  }
  const m = pairs.length;
  let note = '', msd = null, msdLabel = '';
  const nBal = groups.every(g => g.n === groups[0].n) ? groups[0].n : null;
  const seBal = nBal ? seDiff(0, 1) : null;

  if (method === 'lsd' || method === 'bonferroni' || method === 'sidak' || method === 'holm') {
    pairs.forEach(p => { p.stat = p.t; p.p = 2 * (1 - S.pt(Math.abs(p.t), dfe)); });
    const raw = pairs.map(p => p.p);
    const adj = method === 'lsd' ? raw : method === 'bonferroni' ? raw.map(p => Math.min(1, p * m)) : method === 'sidak' ? raw.map(p => 1 - Math.pow(1 - p, m)) : NP.adjust(raw, 'holm');
    pairs.forEach((p, q) => { p.padj = adj[q]; p.sig = p.padj < alpha; });
    const a = method === 'lsd' ? alpha : method === 'bonferroni' ? alpha / m : method === 'sidak' ? 1 - Math.pow(1 - alpha, 1 / m) : null;
    if (a != null && seBal) { msd = S.qt(1 - a / 2, dfe) * seBal; msdLabel = method === 'lsd' ? T('LSD', 'DMS') : T('Minimum significant difference', 'Diferencia mínima significativa'); }
    pairs.forEach(p => { if (a != null) p.crit = S.qt(1 - a / 2, dfe) * p.se; });
    if (method === 'lsd') note = T('Per-comparison α; interpret as a protected LSD only if the treatment F-test was significant.', 'α por comparación; interprétala como DMS protegida solo si la prueba de F de tratamientos resultó significativa.');
  } else if (method === 'tukey') {
    pairs.forEach(p => { p.stat = p.q; p.p = 1 - S.ptukey(p.q, k, dfe); p.padj = p.p; p.sig = p.p < alpha; p.crit = qcrit(alpha, k, dfe) * p.se / Math.SQRT2; });
    if (seBal) { msd = qcrit(alpha, k, dfe) * seBal / Math.SQRT2; msdLabel = 'HSD'; }
    if (!nBal) note = T('Unequal replication: Tukey–Kramer form (harmonic SE for each pair).', 'Repetición desigual: forma de Tukey–Kramer (error estándar armónico en cada par).');
  } else if (method === 'scheffe') {
    pairs.forEach(p => { p.stat = p.t * p.t / (k - 1); p.p = 1 - S.pf(p.stat, k - 1, dfe); p.padj = p.p; p.sig = p.p < alpha; p.crit = Math.sqrt((k - 1) * S.qf(1 - alpha, k - 1, dfe)) * p.se; });
    if (seBal) { msd = Math.sqrt((k - 1) * S.qf(1 - alpha, k - 1, dfe)) * seBal; msdLabel = T('Scheffé MSD', 'DMS de Scheffé'); }
  } else if (method === 'snk' || method === 'duncan' || method === 'regwq') {
    /* multiple range procedure on sorted means */
    const order = groups.map((g, i) => i).sort((a, b) => groups[b].mean - groups[a].mean);
    const pos = {}; order.forEach((g, r) => pos[g] = r);
    const alphaP = p => method === 'snk' ? alpha : method === 'duncan' ? 1 - Math.pow(1 - alpha, p - 1) : (p >= k - 1 ? alpha : 1 - Math.pow(1 - alpha, p / k));
    /* nonsig[r1][r2] : span from rank r1 to r2 declared homogeneous */
    const homog = [];
    const decl = (r1, r2) => homog.some(([a, b]) => a <= r1 && r2 <= b);
    for (let span = k; span >= 2; span--) {
      for (let r1 = 0; r1 + span - 1 < k; r1++) {
        const r2 = r1 + span - 1;
        if (decl(r1, r2)) continue;
        const gi = order[r1], gj = order[r2];
        const p = pairs.find(x => (x.i === gi && x.j === gj) || (x.i === gj && x.j === gi));
        const crit = qcrit(alphaP(span), span, dfe);
        if (p.q < crit) homog.push([r1, r2]);
      }
    }
    pairs.forEach(p => {
      const span = Math.abs(pos[p.i] - pos[p.j]) + 1;
      const a = alphaP(span);
      p.stat = p.q; p.span = span; p.crit = qcrit(a, span, dfe) * p.se / Math.SQRT2;
      p.p = 1 - S.ptukey(p.q, span, dfe);
      p.padj = method === 'duncan' ? 1 - Math.pow(1 - p.p, 1 / (span - 1)) : p.p;
      p.sig = !decl(Math.min(pos[p.i], pos[p.j]), Math.max(pos[p.i], pos[p.j]));
    });
    if (seBal) { msd = Array.from({ length: k - 1 }, (_, i) => ({ p: i + 2, value: qcrit(alphaP(i + 2), i + 2, dfe) * seBal / Math.SQRT2 })); msdLabel = T('Least significant range by number of means spanned', 'Rango mínimo significativo según el número de medias abarcadas'); }
    note = method === 'duncan' ? T('Duncan uses a protection level (1 − α)^(p−1) for a range of p means, which makes it liberal.', 'Duncan usa un nivel de protección (1 − α)^(p−1) para un rango de p medias, y por eso resulta liberal.')
         : method === 'snk' ? T('Step-down test: a difference inside a range already declared homogeneous is not tested.', 'Prueba descendente: una diferencia dentro de un rango que ya se declaró homogéneo no se vuelve a probar.')
         : T('REGWQ uses α_p = 1 − (1 − α)^(p/k) for p < k − 1 and α for the two largest ranges.', 'REGWQ usa α_p = 1 − (1 − α)^(p/k) para p < k − 1 y α para los dos rangos más grandes.');
  } else if (method === 'dunnett') {
    const c = o.control != null ? o.control : 0;
    pairs.length = 0;
    for (let i = 0; i < k; i++) if (i !== c) { const diff = groups[i].mean - groups[c].mean, se = seDiff(i, c); pairs.push({ i, j: c, diff, se, t: diff / se, q: Math.abs(diff) / se * Math.SQRT2 }); }
    const nc = groups[c].n, rho = S.mean(pairs.map(p => nc / (nc + groups[p.i].n)));
    const crit = PH.dunnettCrit(alpha, pairs.length, dfe, rho);
    pairs.forEach(p => { p.stat = p.t; p.p = PH.dunnettP(p.t, pairs.length, dfe, rho); p.padj = p.p; p.sig = p.p < alpha; p.crit = crit * p.se; });
    if (seBal) { msd = crit * seBal; msdLabel = T("Dunnett's critical difference", 'Diferencia crítica de Dunnett'); }
    note = T(`Two-sided comparisons with the control (${groups[c].label}); correlation ρ = ${rho.toFixed(2)} used in the multivariate t.`, `Comparaciones de dos colas contra el testigo (${groups[c].label}); en la t multivariante se usó la correlación ρ = ${rho.toFixed(2)}.`);
  } else if (method === 'gameshowell') {
    pairs.forEach(p => {
      const gi = groups[p.i], gj = groups[p.j];
      const vi = gi.sd * gi.sd / gi.n, vj = gj.sd * gj.sd / gj.n;
      p.se = Math.sqrt(vi + vj); p.df = (vi + vj) ** 2 / (vi * vi / (gi.n - 1) + vj * vj / (gj.n - 1));
      p.q = Math.abs(p.diff) / p.se * Math.SQRT2; p.stat = p.q; p.t = p.diff / p.se;
      p.p = 1 - S.ptukey(p.q, k, p.df); p.padj = p.p; p.sig = p.p < alpha; p.crit = qcrit(alpha, k, p.df) * p.se / Math.SQRT2;
    });
    note = T('Each pair uses its own SE and Welch df; no pooled error.', 'Cada par usa su propio error estándar y sus grados de libertad de Welch; no hay error combinado.');
  }
  /* letters */
  const different = (i, j) => { const p = pairs.find(x => (x.i === i && x.j === j) || (x.i === j && x.j === i)); return p ? !!p.sig : false; };
  const letters = method === 'dunnett' ? groups.map((g, i) => i === (o.control || 0) ? 'control' : (different(i, o.control || 0) ? '*' : 'ns')) : NP.letters(groups.map(g => ({ name: g.label, mean: g.mean })), different);
  return { pairs, letters, msd, msdLabel, note, method, alpha, dfe, mse };
};

/* ---------- contrasts ---------- */
/* c: coefficients per group (same order); returns estimate, SE, t, p, SS */
PH.contrast = (groups, c, mse, dfe) => {
  const est = c.reduce((s, ci, i) => s + ci * groups[i].mean, 0);
  const v = c.reduce((s, ci, i) => s + ci * ci / groups[i].n, 0);
  const se = Math.sqrt(mse * v);
  const t = est / se, ss = est * est / v;
  return { est, se, t, p: 2 * (1 - S.pt(Math.abs(t), dfe)), ss, F: ss / mse, pF: 1 - S.pf(ss / mse, 1, dfe) };
};
/* orthogonal polynomial coefficients for (possibly unequally spaced) x with weights n */
PH.orthoPoly = (x, n, maxDeg) => {
  const k = x.length; maxDeg = Math.min(maxDeg || 3, k - 1);
  const w = n || x.map(() => 1);
  const dot = (a, b) => a.reduce((s, v, i) => s + w[i] * v * b[i], 0);
  const polys = [x.map(() => 1)];
  for (let d = 1; d <= maxDeg; d++) {
    let v = x.map(xi => Math.pow(xi, d));
    polys.forEach(p => { const c = dot(v, p) / dot(p, p); v = v.map((vi, i) => vi - c * p[i]); });
    /* scale to "nice" integers when possible */
    const mn = Math.min(...v.map(Math.abs).filter(a => a > 1e-9));
    let s = v.map(vi => vi / mn);
    for (const mult of [1, 2, 3, 4, 5, 6, 8, 10, 12]) { const t = s.map(vi => vi * mult); if (t.every(vi => Math.abs(vi - Math.round(vi)) < 1e-6)) { s = t.map(Math.round); break; } }
    polys.push(s);
  }
  return polys.slice(1);
};
const DEG = () => [T('Linear', 'Lineal'), T('Quadratic', 'Cuadrático'), T('Cubic', 'Cúbico'), T('Quartic', 'Cuártico'), T('Quintic', 'Quíntico')];
PH.polyContrasts = (groups, x, mse, dfe, maxDeg) => {
  const n = groups.map(g => g.n);
  const P = PH.orthoPoly(x, n, maxDeg);
  return P.map((c, d) => Object.assign({ name: DEG()[d] || T('Degree ', 'Grado ') + (d + 1), coef: c }, PH.contrast(groups, c, mse, dfe)));
};
/* least-squares polynomial fit of y on x (raw observations) */
PH.polyFit = (x, y, deg) => {
  const n = x.length, mx = S.mean(x), sx = S.sd(x) || 1;
  const z = x.map(v => (v - mx) / sx);
  const X = z.map(zi => Array.from({ length: deg + 1 }, (_, d) => Math.pow(zi, d)));
  const XtX = Array.from({ length: deg + 1 }, (_, a) => Array.from({ length: deg + 1 }, (_, b) => X.reduce((s, r) => s + r[a] * r[b], 0)));
  const Xty = Array.from({ length: deg + 1 }, (_, a) => X.reduce((s, r, i) => s + r[a] * y[i], 0));
  const bz = S.solve(XtX, Xty);
  if (!bz) return null;
  const pred = X.map(r => r.reduce((s, v, d) => s + v * bz[d], 0));
  const sse = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0), sst = S.sumsq(y);
  /* convert to raw-x coefficients via binomial expansion */
  const b = new Array(deg + 1).fill(0);
  for (let d = 0; d <= deg; d++) for (let j = 0; j <= d; j++) {
    const binom = (nn, kk) => { let r = 1; for (let i = 1; i <= kk; i++) r = r * (nn - kk + i) / i; return r; };
    b[j] += bz[d] * binom(d, j) * Math.pow(-mx, d - j) / Math.pow(sx, d);
  }
  return { coef: b, r2: 1 - sse / sst, pred, fn: v => b.reduce((s, bj, j) => s + bj * Math.pow(v, j), 0) };
};

window.PH = PH;
