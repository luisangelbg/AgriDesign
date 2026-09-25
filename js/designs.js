/* AgriDesign — catalogue of experimental designs: model terms, error strata, applicability,
   full analysis (ANOVA with the right error terms, least-squares means, SEs). */

const DS = {};

/* helper to declare a term */
const term = (name, factors, o) => Object.assign({ name, factors, error: 'Residuals' }, o || {});
const covTerms = d => (d.covariates || []).map(c => ({ name: c, numeric: [c], error: 'Residuals', cov: true }));
const factorialTerms = (F, maxOrder) => {
  const out = [];
  for (let order = 1; order <= Math.min(maxOrder || F.length, F.length); order++) {
    const rec = (start, cur) => { if (cur.length === order) { out.push(term(cur.join(':'), cur.slice())); return; } for (let i = start; i < F.length; i++) { cur.push(F[i]); rec(i + 1, cur); cur.pop(); } };
    rec(0, []);
  }
  return out;
};

/* The name and the description of every design travel in both languages ({en, es});
   whoever shows them passes them through T(). */
DS.catalog = [
  { id: 'crd', name: { en: 'Completely randomised design (CRD)', es: 'Diseño completamente al azar (DCA)' }, art: 'crd', factors: [1, 1], blocks: [0, 0],
    model: 'y = μ + τ + ε', desc: { en: 'Treatments assigned at random to homogeneous units (pots, greenhouse benches, laboratory). Unequal replication allowed.', es: 'Los tratamientos se asignan al azar a unidades homogéneas (macetas, mesas de invernadero, laboratorio). Admite repetición desigual.' },
    build: d => covTerms(d).concat([term(d.factors[0], [d.factors[0]])]) },
  { id: 'rcbd', name: { en: 'Randomised complete block design (RCBD)', es: 'Diseño de bloques completos al azar (DBCA)' }, art: 'rcbd', factors: [1, 1], blocks: [1, 1],
    model: 'y = μ + β + τ + ε', desc: { en: 'Every treatment once in each block; blocks remove a known gradient. The workhorse of field trials.', es: 'Cada tratamiento una vez en cada bloque; los bloques retiran un gradiente conocido. Es el caballito de batalla de los ensayos de campo.' },
    build: d => covTerms(d).concat([term(d.blocks[0], [d.blocks[0]]), term(d.factors[0], [d.factors[0]])]) },
  { id: 'grcbd', name: { en: 'Generalised RCBD (several plots per block × treatment)', es: 'Bloques completos al azar generalizado (varias parcelas por bloque × tratamiento)' }, art: 'rcbd', factors: [1, 1], blocks: [1, 1], needReps: true,
    model: 'y = μ + β + τ + (βτ) + ε', desc: { en: 'Each treatment repeated within blocks; the block × treatment interaction is estimable and can serve as the error when blocks are random.', es: 'Cada tratamiento se repite dentro de los bloques; la interacción bloque × tratamiento se puede estimar y sirve como error cuando los bloques son aleatorios.' },
    options: [{ key: 'blocksRandom', get label() { return T('Blocks are random → test treatments against block × treatment', 'Los bloques son aleatorios → probar los tratamientos contra bloque × tratamiento'); }, default: true }],
    build: (d, o) => covTerms(d).concat([term(d.blocks[0], [d.blocks[0]]), term(d.factors[0], [d.factors[0]], { error: o.blocksRandom ? d.blocks[0] + ':' + d.factors[0] : 'Residuals' }), term(d.blocks[0] + ':' + d.factors[0], [d.blocks[0], d.factors[0]], { isError: o.blocksRandom, label: T('Block × treatment', 'Bloque × tratamiento') + (o.blocksRandom ? ' (Error a)' : '') })]) },
  { id: 'latin', name: { en: 'Latin square', es: 'Cuadro latino' }, art: 'latin', factors: [1, 1], blocks: [0, 0], needRowCol: true,
    model: 'y = μ + ρ + γ + τ + ε', desc: { en: 'Two blocking directions (rows and columns); t treatments, t rows, t columns.', es: 'Dos direcciones de bloqueo (hileras y columnas); t tratamientos, t hileras, t columnas.' },
    build: d => covTerms(d).concat([term(d.row, [d.row]), term(d.col, [d.col]), term(d.factors[0], [d.factors[0]])]) },
  { id: 'ibd', name: { en: 'Incomplete block design (lattice, alpha, BIBD) — intra-block analysis', es: 'Diseño de bloques incompletos (látice, alfa, BIBD): análisis intrabloque' }, art: 'lattice', factors: [1, 1], blocks: [2, 2],
    model: 'y = μ + ρ + β(ρ) + τ + ε', desc: { en: 'Blocks smaller than the number of treatments, nested in replicates. Treatment effects are adjusted for blocks (Type III); means shown are adjusted means.', es: 'Bloques más chicos que el número de tratamientos, anidados en repeticiones. Los efectos de tratamiento se ajustan por bloques (tipo III); las medias que se muestran son medias ajustadas.' },
    build: d => covTerms(d).concat([term(d.blocks[0], [d.blocks[0]]), term(d.blocks[1] + '(' + d.blocks[0] + ')', [d.blocks[0], d.blocks[1]]), term(d.factors[0], [d.factors[0]])]) },
  { id: 'augmented', name: { en: 'Augmented design (replicated checks + unreplicated entries)', es: 'Diseño aumentado (testigos repetidos + entradas sin repetir)' }, art: 'augmented', factors: [1, 1], blocks: [1, 1],
    model: 'y = μ + β + τ + ε', desc: { en: 'Checks appear in every block; new entries once. The error comes from the checks; entry means are adjusted for block effects.', es: 'Los testigos aparecen en cada bloque; las entradas nuevas una sola vez. El error sale de los testigos; las medias de las entradas se ajustan por el efecto de bloque.' },
    build: d => covTerms(d).concat([term(d.blocks[0], [d.blocks[0]]), term(d.factors[0], [d.factors[0]])]) },
  { id: 'fact_crd', name: { en: 'Factorial in CRD', es: 'Factorial completamente al azar' }, art: 'factorial', factors: [2, 4], blocks: [0, 0],
    model: 'y = μ + α + δ + (αδ) + ε', desc: { en: 'Two or more factors, all combinations, completely randomised.', es: 'Dos o más factores, todas las combinaciones, completamente al azar.' },
    build: d => covTerms(d).concat(factorialTerms(d.factors)) },
  { id: 'fact_rcbd', name: { en: 'Factorial in RCBD', es: 'Factorial en bloques completos al azar' }, art: 'factorial', factors: [2, 4], blocks: [1, 1],
    model: 'y = μ + β + α + δ + (αδ) + ε', desc: { en: 'All factor combinations randomised within each block.', es: 'Todas las combinaciones de los factores se aleatorizan dentro de cada bloque.' },
    build: d => covTerms(d).concat([term(d.blocks[0], [d.blocks[0]])], factorialTerms(d.factors)) },
  { id: 'split_rcbd', name: { en: 'Split-plot in RCBD (main plots in blocks)', es: 'Parcelas divididas en bloques al azar (parcelas grandes dentro de bloques)' }, art: 'split', factors: [2, 2], blocks: [1, 1],
    model: 'y = μ + β + α + (βα)ₐ + δ + (αδ) + ε_b', desc: { en: 'First factor on main plots (hard to apply on small plots: irrigation, tillage, sowing date); second factor on sub-plots. Two error terms.', es: 'El primer factor va en las parcelas grandes (lo difícil de aplicar en parcelas chicas: riego, labranza, fecha de siembra); el segundo, en las subparcelas. Dos términos de error.' },
    build: d => { const [A, B] = d.factors, R = d.blocks[0]; return covTerms(d).concat([term(R, [R], { error: R + ':' + A }), term(A, [A], { error: R + ':' + A }), term(R + ':' + A, [R, A], { isError: true, label: T('Error a (main plot)', 'Error a (parcela grande)') }), term(B, [B]), term(A + ':' + B, [A, B])]); } },
  { id: 'split_crd', name: { en: 'Split-plot in CRD (main plots completely randomised)', es: 'Parcelas divididas completamente al azar (parcelas grandes al azar)' }, art: 'split', factors: [2, 2], blocks: [1, 1],
    model: 'y = μ + α + ε_a + δ + (αδ) + ε_b', desc: { en: 'Main plots randomised without blocks; the block column identifies the replicate of each main plot.', es: 'Las parcelas grandes se aleatorizan sin bloques; la columna de bloque identifica la repetición de cada parcela grande.' },
    build: d => { const [A, B] = d.factors, R = d.blocks[0]; return covTerms(d).concat([term(A, [A], { error: A + ':' + R }), term(A + ':' + R, [A, R], { isError: true, label: T('Error a (replicates within ', 'Error a (repeticiones dentro de ') + A + ')' }), term(B, [B]), term(A + ':' + B, [A, B])]); } },
  { id: 'strip_rcbd', name: { en: 'Strip-plot (split-block) in RCBD', es: 'Franjas divididas (bloques divididos) en bloques al azar' }, art: 'strip', factors: [2, 2], blocks: [1, 1],
    model: 'y = μ + β + α + (βα)ₐ + δ + (βδ)_b + (αδ) + ε_c', desc: { en: 'Both factors applied in perpendicular strips across each block; three error terms.', es: 'Los dos factores se aplican en franjas perpendiculares a lo ancho de cada bloque; tres términos de error.' },
    build: d => { const [A, B] = d.factors, R = d.blocks[0]; return covTerms(d).concat([term(R, [R]), term(A, [A], { error: R + ':' + A }), term(R + ':' + A, [R, A], { isError: true, label: 'Error a' }), term(B, [B], { error: R + ':' + B }), term(R + ':' + B, [R, B], { isError: true, label: 'Error b' }), term(A + ':' + B, [A, B])]); } },
  { id: 'splitsplit_rcbd', name: { en: 'Split-split-plot in RCBD', es: 'Parcelas subdivididas en bloques al azar' }, art: 'split', factors: [3, 3], blocks: [1, 1],
    model: 'y = μ + β + α + ε_a + δ + (αδ) + ε_b + γ + (αγ) + (δγ) + (αδγ) + ε_c', desc: { en: 'Three factors in nested plots: main, sub and sub-sub plots. Three error terms.', es: 'Tres factores en parcelas anidadas: grande, subparcela y sub-subparcela. Tres términos de error.' },
    build: d => { const [A, B, C] = d.factors, R = d.blocks[0]; return covTerms(d).concat([term(R, [R], { error: R + ':' + A }), term(A, [A], { error: R + ':' + A }), term(R + ':' + A, [R, A], { isError: true, label: 'Error a' }), term(B, [B], { error: R + ':' + A + ':' + B }), term(A + ':' + B, [A, B], { error: R + ':' + A + ':' + B }), term(R + ':' + A + ':' + B, [R, A, B], { isError: true, label: 'Error b' }), term(C, [C]), term(A + ':' + C, [A, C]), term(B + ':' + C, [B, C]), term(A + ':' + B + ':' + C, [A, B, C])]); } },
  { id: 'nested', name: { en: 'Nested (hierarchical): second factor within the first', es: 'Anidado (jerárquico): el segundo factor dentro del primero' }, art: 'nested', factors: [2, 2], blocks: [0, 0],
    model: 'y = μ + α + δ(α) + ε', desc: { en: 'Levels of B are different inside each level of A (e.g. trees within orchards, plants within plots).', es: 'Los niveles de B son distintos dentro de cada nivel de A (por ejemplo, árboles dentro de huertas o plantas dentro de parcelas).' },
    options: [{ key: 'bRandom', get label() { return T('B(A) is random → test A against B(A)', 'B(A) es aleatorio → probar A contra B(A)'); }, default: true }],
    build: (d, o) => { const [A, B] = d.factors; return covTerms(d).concat([term(A, [A], { error: o.bRandom ? B + '(' + A + ')' : 'Residuals' }), term(B + '(' + A + ')', [A, B], { isError: o.bRandom, label: B + T(' within ', ' dentro de ') + A })]); } },
];
DS.byId = id => DS.catalog.find(c => c.id === id);

/* which designs fit the current roles; returns [{design, ok, why}] and a suggestion */
DS.applicable = (d, recs) => {
  const nf = d.factors.length, nb = d.blocks.length;
  const cnt = {};
  if (recs && nf && nb) recs.forEach(r => { const k = r.f[d.blocks[0]] + '|' + d.factors.map(f => r.f[f]).join('|'); cnt[k] = (cnt[k] || 0) + 1; });
  const multi = Object.values(cnt).some(v => v > 1);
  const out = DS.catalog.map(c => {
    let ok = true, why = [];
    if (nf < c.factors[0] || nf > c.factors[1]) { ok = false; why.push(T(`needs ${c.factors[0] === c.factors[1] ? c.factors[0] : c.factors[0] + '–' + c.factors[1]} treatment factor${c.factors[1] > 1 ? 's' : ''}`, `necesita ${c.factors[0] === c.factors[1] ? c.factors[0] : c.factors[0] + ' a ' + c.factors[1]} ${c.factors[1] > 1 ? 'factores de tratamiento' : 'factor de tratamiento'}`)); }
    if (nb < c.blocks[0]) { ok = false; why.push(T(`needs ${c.blocks[0]} block column${c.blocks[0] > 1 ? 's' : ''}`, `necesita ${c.blocks[0]} ${c.blocks[0] > 1 ? 'columnas de bloque' : 'columna de bloque'}`)); }
    if (c.needRowCol && !(d.row && d.col)) { ok = false; why.push(T('needs row and column roles', 'necesita papeles de hilera y de columna')); }
    if (c.needReps && nb >= c.blocks[0] && !multi) { ok = false; why.push(T('needs several plots per block × treatment', 'necesita varias parcelas por bloque × tratamiento')); }
    if (!c.needRowCol && d.row && d.col && c.id !== 'latin') why.push(T('row/column roles ignored', 'no toma en cuenta los papeles de hilera y columna'));
    return { design: c, ok, why: why.join('; ') };
  });
  /* suggestion */
  let sug = null;
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
  res.strata.Residuals = { ms: an.residual.ms, df: an.residual.df, label: T('Residual error', 'Error residual') + (Object.keys(res.strata).length ? T(' (last stratum)', ' (último estrato)') : '') };
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
