/* AgriDesign — catalogue of experimental designs: model terms, error strata, applicability,
   full analysis (ANOVA with the right error terms, least-squares means, SEs). */

const DS = {};

/* helper to declare a term */
const T = (name, factors, o) => Object.assign({ name, factors, error: 'Residuals' }, o || {});
const covTerms = d => (d.covariates || []).map(c => ({ name: c, numeric: [c], error: 'Residuals', cov: true }));
const factorialTerms = (F, maxOrder) => {
  const out = [];
  for (let order = 1; order <= Math.min(maxOrder || F.length, F.length); order++) {
    const rec = (start, cur) => { if (cur.length === order) { out.push(T(cur.join(':'), cur.slice())); return; } for (let i = start; i < F.length; i++) { cur.push(F[i]); rec(i + 1, cur); cur.pop(); } };
    rec(0, []);
  }
  return out;
};

DS.catalog = [
  { id: 'crd', name: 'Completely randomised design (CRD)', art: 'crd', factors: [1, 1], blocks: [0, 0],
    model: 'y = μ + τ + ε', desc: 'Treatments assigned at random to homogeneous units (pots, greenhouse benches, laboratory). Unequal replication allowed.',
    build: d => covTerms(d).concat([T(d.factors[0], [d.factors[0]])]) },
  { id: 'rcbd', name: 'Randomised complete block design (RCBD)', art: 'rcbd', factors: [1, 1], blocks: [1, 1],
    model: 'y = μ + β + τ + ε', desc: 'Every treatment once in each block; blocks remove a known gradient. The workhorse of field trials.',
    build: d => covTerms(d).concat([T(d.blocks[0], [d.blocks[0]]), T(d.factors[0], [d.factors[0]])]) },
  { id: 'grcbd', name: 'Generalised RCBD (several plots per block × treatment)', art: 'rcbd', factors: [1, 1], blocks: [1, 1], needReps: true,
    model: 'y = μ + β + τ + (βτ) + ε', desc: 'Each treatment repeated within blocks; the block × treatment interaction is estimable and can serve as the error when blocks are random.',
    options: [{ key: 'blocksRandom', label: 'Blocks are random → test treatments against block × treatment', default: true }],
    build: (d, o) => covTerms(d).concat([T(d.blocks[0], [d.blocks[0]]), T(d.factors[0], [d.factors[0]], { error: o.blocksRandom ? d.blocks[0] + ':' + d.factors[0] : 'Residuals' }), T(d.blocks[0] + ':' + d.factors[0], [d.blocks[0], d.factors[0]], { isError: o.blocksRandom, label: 'Block × treatment' + (o.blocksRandom ? ' (Error a)' : '') })]) },
  { id: 'latin', name: 'Latin square', art: 'latin', factors: [1, 1], blocks: [0, 0], needRowCol: true,
    model: 'y = μ + ρ + γ + τ + ε', desc: 'Two blocking directions (rows and columns); t treatments, t rows, t columns.',
    build: d => covTerms(d).concat([T(d.row, [d.row]), T(d.col, [d.col]), T(d.factors[0], [d.factors[0]])]) },
  { id: 'ibd', name: 'Incomplete block design (lattice, alpha, BIBD) — intra-block analysis', art: 'lattice', factors: [1, 1], blocks: [2, 2],
    model: 'y = μ + ρ + β(ρ) + τ + ε', desc: 'Blocks smaller than the number of treatments, nested in replicates. Treatment effects are adjusted for blocks (Type III); means shown are adjusted means.',
    build: d => covTerms(d).concat([T(d.blocks[0], [d.blocks[0]]), T(d.blocks[1] + '(' + d.blocks[0] + ')', [d.blocks[0], d.blocks[1]]), T(d.factors[0], [d.factors[0]])]) },
  { id: 'augmented', name: 'Augmented design (replicated checks + unreplicated entries)', art: 'augmented', factors: [1, 1], blocks: [1, 1],
    model: 'y = μ + β + τ + ε', desc: 'Checks appear in every block; new entries once. The error comes from the checks; entry means are adjusted for block effects.',
    build: d => covTerms(d).concat([T(d.blocks[0], [d.blocks[0]]), T(d.factors[0], [d.factors[0]])]) },
  { id: 'fact_crd', name: 'Factorial in CRD', art: 'factorial', factors: [2, 4], blocks: [0, 0],
    model: 'y = μ + α + δ + (αδ) + ε', desc: 'Two or more factors, all combinations, completely randomised.',
    build: d => covTerms(d).concat(factorialTerms(d.factors)) },
  { id: 'fact_rcbd', name: 'Factorial in RCBD', art: 'factorial', factors: [2, 4], blocks: [1, 1],
    model: 'y = μ + β + α + δ + (αδ) + ε', desc: 'All factor combinations randomised within each block.',
    build: d => covTerms(d).concat([T(d.blocks[0], [d.blocks[0]])], factorialTerms(d.factors)) },
  { id: 'split_rcbd', name: 'Split-plot in RCBD (main plots in blocks)', art: 'split', factors: [2, 2], blocks: [1, 1],
    model: 'y = μ + β + α + (βα)ₐ + δ + (αδ) + ε_b', desc: 'First factor on main plots (hard to apply on small plots: irrigation, tillage, sowing date); second factor on sub-plots. Two error terms.',
    build: d => { const [A, B] = d.factors, R = d.blocks[0]; return covTerms(d).concat([T(R, [R], { error: R + ':' + A }), T(A, [A], { error: R + ':' + A }), T(R + ':' + A, [R, A], { isError: true, label: 'Error a (main plot)' }), T(B, [B]), T(A + ':' + B, [A, B])]); } },
  { id: 'split_crd', name: 'Split-plot in CRD (main plots completely randomised)', art: 'split', factors: [2, 2], blocks: [1, 1],
    model: 'y = μ + α + ε_a + δ + (αδ) + ε_b', desc: 'Main plots randomised without blocks; the block column identifies the replicate of each main plot.',
    build: d => { const [A, B] = d.factors, R = d.blocks[0]; return covTerms(d).concat([T(A, [A], { error: A + ':' + R }), T(A + ':' + R, [A, R], { isError: true, label: 'Error a (replicates within ' + A + ')' }), T(B, [B]), T(A + ':' + B, [A, B])]); } },
  { id: 'strip_rcbd', name: 'Strip-plot (split-block) in RCBD', art: 'strip', factors: [2, 2], blocks: [1, 1],
    model: 'y = μ + β + α + (βα)ₐ + δ + (βδ)_b + (αδ) + ε_c', desc: 'Both factors applied in perpendicular strips across each block; three error terms.',
    build: d => { const [A, B] = d.factors, R = d.blocks[0]; return covTerms(d).concat([T(R, [R]), T(A, [A], { error: R + ':' + A }), T(R + ':' + A, [R, A], { isError: true, label: 'Error a' }), T(B, [B], { error: R + ':' + B }), T(R + ':' + B, [R, B], { isError: true, label: 'Error b' }), T(A + ':' + B, [A, B])]); } },
  { id: 'splitsplit_rcbd', name: 'Split-split-plot in RCBD', art: 'split', factors: [3, 3], blocks: [1, 1],
    model: 'y = μ + β + α + ε_a + δ + (αδ) + ε_b + γ + (αγ) + (δγ) + (αδγ) + ε_c', desc: 'Three factors in nested plots: main, sub and sub-sub plots. Three error terms.',
    build: d => { const [A, B, C] = d.factors, R = d.blocks[0]; return covTerms(d).concat([T(R, [R], { error: R + ':' + A }), T(A, [A], { error: R + ':' + A }), T(R + ':' + A, [R, A], { isError: true, label: 'Error a' }), T(B, [B], { error: R + ':' + A + ':' + B }), T(A + ':' + B, [A, B], { error: R + ':' + A + ':' + B }), T(R + ':' + A + ':' + B, [R, A, B], { isError: true, label: 'Error b' }), T(C, [C]), T(A + ':' + C, [A, C]), T(B + ':' + C, [B, C]), T(A + ':' + B + ':' + C, [A, B, C])]); } },
  { id: 'nested', name: 'Nested (hierarchical): second factor within the first', art: 'nested', factors: [2, 2], blocks: [0, 0],
    model: 'y = μ + α + δ(α) + ε', desc: 'Levels of B are different inside each level of A (e.g. trees within orchards, plants within plots).',
    options: [{ key: 'bRandom', label: 'B(A) is random → test A against B(A)', default: true }],
    build: (d, o) => { const [A, B] = d.factors; return covTerms(d).concat([T(A, [A], { error: o.bRandom ? B + '(' + A + ')' : 'Residuals' }), T(B + '(' + A + ')', [A, B], { isError: o.bRandom, label: B + ' within ' + A })]); } },
];
DS.byId = id => DS.catalog.find(c => c.id === id);

/* which designs fit the current roles; returns [{design, ok, why}] and a suggestion */
DS.applicable = (d, recs) => {
  const nf = d.factors.length, nb = d.blocks.length;
  const out = DS.catalog.map(c => {
    let ok = true, why = [];
    if (nf < c.factors[0] || nf > c.factors[1]) { ok = false; why.push(`needs ${c.factors[0] === c.factors[1] ? c.factors[0] : c.factors[0] + '–' + c.factors[1]} treatment factor${c.factors[1] > 1 ? 's' : ''}`); }
    if (nb < c.blocks[0]) { ok = false; why.push(`needs ${c.blocks[0]} block column${c.blocks[0] > 1 ? 's' : ''}`); }
    if (c.needRowCol && !(d.row && d.col)) { ok = false; why.push('needs row and column roles'); }
    if (!c.needRowCol && d.row && d.col && c.id !== 'latin') why.push('row/column roles ignored');
    return { design: c, ok, why: why.join('; ') };
  });
  /* suggestion */
  let sug = null;
  const cnt = {};
  if (recs && nf && nb) recs.forEach(r => { const k = r.f[d.blocks[0]] + '|' + d.factors.map(f => r.f[f]).join('|'); cnt[k] = (cnt[k] || 0) + 1; });
  const multi = Object.values(cnt).some(v => v > 1);
  if (d.row && d.col && nf === 1) sug = 'latin';
  else if (nf === 1) sug = nb === 0 ? 'crd' : nb >= 2 ? 'ibd' : multi ? 'grcbd' : 'rcbd';
  else if (nf === 2) sug = nb ? 'fact_rcbd' : 'fact_crd';
  else if (nf >= 3) sug = nb ? 'fact_rcbd' : 'fact_crd';
  return { list: out, suggested: sug };
};

/* ---------- full analysis ---------- */
DS.analyze = (designId, resp, d, opts) => {
  opts = opts || {};
  const c = DS.byId(designId);
  const terms = c.build(d, Object.assign({}, ...(c.options || []).map(o => ({ [o.key]: o.default })), opts.designOpts || {}));
  const { recs, levelsMap } = LM.records(resp, d);
  const y = recs.map(r => r.y);
  const M = LM.modelMatrix(recs, terms, levelsMap);
  const an = LM.anova(M, y, terms, opts.ssType === 1 ? 1 : 3);
  const fit = an.fit;
  /* error strata */
  const msOf = name => name === 'Residuals' ? { ms: an.residual.ms, df: an.residual.df } : (() => { const r = an.rows.find(x => x.term === name); return r ? { ms: r.ms, df: r.df } : { ms: an.residual.ms, df: an.residual.df }; })();
  an.rows.forEach((r, i) => {
    const t = terms[i];
    r.errorTerm = t.error || 'Residuals';
    r.isError = !!t.isError;
    r.label = t.label || t.name;
    const e = msOf(r.errorTerm);
    r.dfErr = e.df; r.msErr = e.ms;
    r.F = r.df > 0 && e.df > 0 ? r.ms / e.ms : NaN;
    r.p = isFinite(r.F) ? 1 - S.pf(r.F, r.df, e.df) : NaN;
    if (r.isError && r.errorTerm === 'Residuals' && !(t.error && t.error !== 'Residuals')) { /* error strata are usually not tested; keep F vs residual for information */ }
  });
  const gm = S.mean(y), sst = an.total.ss;
  const modelSS = an.rows.reduce((s, r) => s + r.ss, 0);
  const res = {
    design: c, terms, recs, levelsMap, M, fit, anova: an, y, resp, d,
    grandMean: gm, cv: Math.sqrt(an.residual.ms) / gm * 100, r2: 1 - an.residual.ss / sst, rmse: Math.sqrt(an.residual.ms), n: y.length,
    strata: {},
  };
  terms.forEach(t => { if (t.isError) { const r = an.rows.find(x => x.term === t.name); res.strata[t.name] = { ms: r.ms, df: r.df, label: t.label || t.name }; } });
  res.strata.Residuals = { ms: an.residual.ms, df: an.residual.df, label: 'Residual error' + (Object.keys(res.strata).length ? ' (last stratum)' : '') };
  return res;
};

/* least-squares means for a set of factors (equal weights over the other model factors, covariates at their mean) */
DS.lsmeans = (res, factors) => {
  const allF = Object.keys(res.levelsMap);
  const others = allF.filter(f => !factors.includes(f));
  const grid = fs => fs.reduce((acc, f) => acc.flatMap(a => res.levelsMap[f].map(l => Object.assign({}, a, { [f]: l }))), [{}]);
  const target = grid(factors), rest = grid(others);
  const covs = {}; (res.d.covariates || []).forEach(cv => covs[cv] = 0);
  const inv = LM.xtxInv(res.fit);
  return target.map(tc => {
    const newRecs = rest.map(rc => ({ f: Object.assign({}, rc, tc), x: covs }));
    const Mn = LM.modelMatrix(newRecs, res.terms, res.levelsMap);
    const xbar = res.fit.used.map(j => S.mean(Mn.cols[j]));
    let yhat = 0; for (let k = 0; k < xbar.length; k++) yhat += xbar[k] * res.fit.beta[k];
    let q = 0; for (let a = 0; a < xbar.length; a++) for (let b = 0; b < xbar.length; b++) q += xbar[a] * inv[a][b] * xbar[b];
    const n = res.recs.filter(r => factors.every(f => r.f[f] === tc[f])).length;
    const obs = res.recs.filter(r => factors.every(f => r.f[f] === tc[f])).map(r => r.y);
    return { levels: tc, label: factors.map(f => tc[f]).join(' × '), mean: yhat, se: Math.sqrt(Math.max(0, q) * res.fit.mse), qform: q, xbar, n, rawMean: obs.length ? S.mean(obs) : NaN, sd: obs.length > 1 ? S.sd(obs) : NaN };
  });
};

/* error stratum used to compare the means of a term (by name) */
DS.errorFor = (res, termName) => {
  const r = res.anova.rows.find(x => x.term === termName);
  const e = r ? r.errorTerm : 'Residuals';
  return Object.assign({ name: e }, res.strata[e] || res.strata.Residuals);
};
/* SE of the difference between two LS means: general covariance form when the error is the residual,
   balanced formula MS_e (1/n_i + 1/n_j) for higher strata (split-plot main plots etc.) */
DS.seDiffFn = (res, means, err, cellSpec) => {
  if (err.name === 'Residuals' && !cellSpec) {
    const inv = LM.xtxInv(res.fit);
    const covs = {}; (res.d.covariates || []).forEach(cv => covs[cv] = 0);
    return (i, j) => {
      /* difference of averaged design rows */
      const xi = means[i].xbar, xj = means[j].xbar;
      const dx = xi.map((v, k) => v - xj[k]);
      let q = 0; for (let a = 0; a < dx.length; a++) for (let b = 0; b < dx.length; b++) q += dx[a] * inv[a][b] * dx[b];
      return Math.sqrt(Math.max(0, q) * res.fit.mse);
    };
  }
  if (cellSpec) {
    /* split-plot cells: same main-plot level → Error b; different → pooled Satterthwaite */
    const { mainFactor, ea, eb, bLevels, reps } = cellSpec;
    return (i, j) => {
      const same = means[i].levels[mainFactor] === means[j].levels[mainFactor];
      if (same) return Math.sqrt(2 * eb.ms / reps);
      return Math.sqrt(2 * ((bLevels - 1) * eb.ms + ea.ms) / (reps * bLevels));
    };
  }
  return (i, j) => Math.sqrt(err.ms * (1 / means[i].n + 1 / means[j].n));
};

/* ---------- convenience for Blocks 6–7: comparisons ready to plot ---------- */
DS.factorComparison = (R, f, o) => {
  o = o || {};
  const method = o.method || R.method || 'tukey', alpha = o.alpha || R.alpha || 0.05;
  const means = DS.lsmeans(R, [f]);
  const err = DS.errorFor(R, f);
  if (err.name !== 'Residuals') means.forEach(m => m.se = Math.sqrt(err.ms / m.n));
  const seDiff = DS.seDiffFn(R, means, err);
  const control = Math.max(0, means.findIndex(m => m.label === (o.control || R.control)));
  const cmp = PH.compare({ groups: means.map(m => ({ label: m.label, mean: m.mean, n: m.n, sd: m.sd })), mse: err.ms, dfe: err.df, alpha, method, control, seDiff });
  const raw = means.map(m => R.recs.filter(r => r.f[f] === m.levels[f]).map(r => r.y));
  return { means, cmp, err, raw, method, alpha };
};
/* letters for cmpF within each level of byF (residual / sub-plot error) */
DS.sliceLetters = (R, byF, cmpF, o) => {
  o = o || {};
  const method = o.method || R.method || 'tukey', alpha = o.alpha || R.alpha || 0.05;
  const cells = DS.lsmeans(R, [byF, cmpF]);
  const err = R.strata.Residuals;
  const out = {};
  R.levelsMap[byF].forEach(bl => {
    const sub = cells.filter(c => c.levels[byF] === bl);
    const seDiff = DS.seDiffFn(R, sub, err);
    const cmp = PH.compare({ groups: sub.map(m => ({ label: m.label, mean: m.mean, n: m.n, sd: m.sd })), mse: err.ms, dfe: err.df, alpha, method, seDiff });
    sub.forEach((m, i) => out[bl + '|' + m.levels[cmpF]] = { mean: m.mean, se: m.se, letters: cmp.letters[i] });
  });
  return { cells, byLevel: out };
};
DS.cellComparison = (R, A, B, o) => {
  o = o || {};
  const method = o.method || R.method || 'tukey', alpha = o.alpha || R.alpha || 0.05;
  const cells = DS.lsmeans(R, [A, B]);
  const err = R.strata.Residuals;
  const seDiff = DS.seDiffFn(R, cells, err);
  const cmp = PH.compare({ groups: cells.map(m => ({ label: m.label, mean: m.mean, n: m.n, sd: m.sd })), mse: err.ms, dfe: err.df, alpha, method, seDiff });
  return { cells, cmp };
};

window.DS = DS;
