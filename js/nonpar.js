/* AgriDesign — non-parametric alternatives to ANOVA and rank-based post-hoc tests,
   plus compact letter display and p-value adjustment (shared with Block 5). */

const NP = {};

/* ---------- p-value adjustment (R p.adjust) ---------- */
NP.adjust = (p, method) => {
  const n = p.length, out = new Array(n);
  const idx = p.map((v, i) => i);
  if (method === 'none') return p.slice();
  if (method === 'bonferroni') return p.map(v => Math.min(1, v * n));
  if (method === 'holm') {
    idx.sort((a, b) => p[a] - p[b]);
    let cum = 0;
    idx.forEach((i, k) => { cum = Math.max(cum, (n - k) * p[i]); out[i] = Math.min(1, cum); });
    return out;
  }
  if (method === 'BH' || method === 'fdr') {
    idx.sort((a, b) => p[b] - p[a]);
    let cum = 1;
    idx.forEach((i, k) => { cum = Math.min(cum, n / (n - k) * p[i]); out[i] = Math.min(1, cum); });
    return out;
  }
  if (method === 'hochberg') {
    idx.sort((a, b) => p[b] - p[a]);
    let cum = 1;
    idx.forEach((i, k) => { cum = Math.min(cum, (k + 1) * p[i]); out[i] = Math.min(1, cum); });
    return out;
  }
  return p.slice();
};
NP.adjustNames = { holm: 'Holm', bonferroni: 'Bonferroni', BH: 'Benjamini–Hochberg (FDR)', hochberg: 'Hochberg', none: 'None' };

/* ---------- compact letter display via maximal cliques (Bron–Kerbosch) ----------
   means: [{name, mean}], different(i, j) → true if significantly different.
   Levels are sorted by mean (descending) so 'a' is the top group. Non-transitive
   results give several letters to a level, as they must. */
NP.letters = (means, different) => {
  const k = means.length;
  const order = means.map((m, i) => i).sort((a, b) => means[b].mean - means[a].mean);
  const adj = Array.from({ length: k }, () => new Set());
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (i !== j && !different(i, j)) adj[i].add(j);
  const cliques = [];
  const bk = (R, P, X) => {
    if (!P.size && !X.size) { cliques.push([...R]); return; }
    for (const v of [...P]) {
      bk(new Set([...R, v]), new Set([...P].filter(u => adj[v].has(u))), new Set([...X].filter(u => adj[v].has(u))));
      P.delete(v); X.add(v);
    }
  };
  bk(new Set(), new Set(order), new Set());
  /* order cliques by the rank of their best member, then size */
  const rank = {}; order.forEach((i, r) => rank[i] = r);
  cliques.sort((a, b) => Math.min(...a.map(i => rank[i])) - Math.min(...b.map(i => rank[i])) || b.length - a.length);
  const letters = means.map(() => '');
  cliques.forEach((c, ci) => { const L = String.fromCharCode(97 + ci); c.forEach(i => letters[i] += L); });
  return letters.map(l => l.split('').sort().join(''));
};

/* ---------- Kruskal–Wallis ---------- */
NP.kruskal = groups => {
  const all = groups.flat(), N = all.length, k = groups.length;
  const rk = S.ranks(all);
  let idx = 0, H = 0;
  const meanRanks = groups.map(g => { const r = rk.slice(idx, idx + g.length); idx += g.length; const mr = S.mean(r); H += g.length * (mr - (N + 1) / 2) ** 2; return mr; });
  H *= 12 / (N * (N + 1));
  /* tie correction */
  const cnt = {}; all.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
  const T = Object.values(cnt).reduce((s, t) => s + t * t * t - t, 0);
  const C = 1 - T / (N * N * N - N);
  H = C > 0 ? H / C : H;
  const p = 1 - S.pchisq(H, k - 1);
  const eps2 = (H - k + 1) / (N - k);            /* epsilon squared */
  return { H, df: k - 1, p, meanRanks, N, eps2: Math.max(0, eps2), ranks: rk };
};
/* Dunn's test (z on mean ranks with tie correction) */
NP.dunn = (groups, kw, method) => {
  const N = kw.N, k = groups.length;
  const all = groups.flat();
  const cnt = {}; all.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
  const T = Object.values(cnt).reduce((s, t) => s + t * t * t - t, 0);
  const pairs = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const se = Math.sqrt((N * (N + 1) / 12 - T / (12 * (N - 1))) * (1 / groups[i].length + 1 / groups[j].length));
    const z = (kw.meanRanks[i] - kw.meanRanks[j]) / se;
    pairs.push({ i, j, z, p: 2 * (1 - S.pnorm(Math.abs(z))) });
  }
  const adj = NP.adjust(pairs.map(p => p.p), method || 'holm');
  pairs.forEach((p, q) => p.padj = adj[q]);
  return pairs;
};
/* Mann–Whitney pairwise (alternative to Dunn) */
NP.wilcoxPair = (a, b) => {
  const all = a.concat(b), rk = S.ranks(all), n1 = a.length, n2 = b.length;
  const R1 = rk.slice(0, n1).reduce((s, v) => s + v, 0);
  const U = R1 - n1 * (n1 + 1) / 2;
  const cnt = {}; all.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
  const N = n1 + n2, T = Object.values(cnt).reduce((s, t) => s + t * t * t - t, 0);
  const sd = Math.sqrt(n1 * n2 / 12 * ((N + 1) - T / (N * (N - 1))));
  const z = (U - n1 * n2 / 2) / sd;
  return { U, z, p: 2 * (1 - S.pnorm(Math.abs(z))) };
};

/* ---------- Friedman (one observation per block × treatment) ----------
   table: rows = blocks, columns = treatments */
NP.friedman = table => {
  const b = table.length, k = table[0].length;
  const R = new Array(k).fill(0);
  let A = 0;                                    /* sum of squared ranks (Conover) */
  table.forEach(row => { const rk = S.ranks(row); rk.forEach((r, j) => { R[j] += r; A += r * r; }); });
  const B = R.reduce((s, r) => s + r * r, 0) / b;
  const Cf = b * k * (k + 1) * (k + 1) / 4;
  const Fr = (k - 1) * b * (B - Cf) / (A - Cf);  /* tie-corrected statistic (Conover); equals the classic Friedman χ² without ties */
  const p = 1 - S.pchisq(Fr, k - 1);
  const W = Fr / (b * (k - 1));                 /* Kendall's W */
  /* Iman–Davenport F approximation */
  const Ff = (b - 1) * Fr / (b * (k - 1) - Fr);
  const pF = 1 - S.pf(Ff, k - 1, (b - 1) * (k - 1));
  return { Fr, df: k - 1, p, W, Ff, pF, df1: k - 1, df2: (b - 1) * (k - 1), rankSums: R, meanRanks: R.map(r => r / b), A, B, b, k };
};
/* Conover post-hoc for Friedman (t distribution, df = (b-1)(k-1)) */
NP.conover = (fr, method) => {
  const { A, B, b, k, rankSums } = fr;
  const se = Math.sqrt(2 * b * (A - B) / ((b - 1) * (k - 1)));
  const df = (b - 1) * (k - 1);
  const pairs = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const t = Math.abs(rankSums[i] - rankSums[j]) / se;
    pairs.push({ i, j, t, p: 2 * (1 - S.pt(t, df)) });
  }
  const adj = NP.adjust(pairs.map(p => p.p), method || 'holm');
  pairs.forEach((p, q) => p.padj = adj[q]);
  return pairs;
};
/* Nemenyi post-hoc for Friedman (studentized range, no adjustment needed) */
NP.nemenyi = fr => {
  const { b, k, meanRanks } = fr;
  const se = Math.sqrt(k * (k + 1) / (6 * b));
  const pairs = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const q = Math.abs(meanRanks[i] - meanRanks[j]) / se * Math.SQRT2;
    pairs.push({ i, j, q, p: 1 - S.ptukey(q, k, Infinity), padj: 1 - S.ptukey(q, k, Infinity) });
  }
  return pairs;
};

/* ---------- Aligned Rank Transform ANOVA (Wobbrock et al. 2011) ----------
   recs/terms as in LM; for each term: align, rank, fit full model on ranks, report F of that term. */
NP.art = (recs, terms, levelsMap) => {
  const y = recs.map(r => r.y);
  const M = LM.modelMatrix(recs, terms, levelsMap);
  const full = LM.fit(M, y);
  const rows = [];
  terms.forEach((t, ti) => {
    /* estimated effect of term t = fitted(full) − fitted(model without t and its higher-order relatives) …
       standard ART uses cell-mean inclusion–exclusion; the equivalent least-squares form is
       fitted(full) − fitted(full minus the columns of t) for balanced data. */
    const keep = M.cols.map((_, j) => j).filter(j => M.colTerm[j] !== ti);
    const red = LM.fit(M, y, keep);
    const aligned = recs.map((r, i) => full.resid[i] + (full.fitted[i] - red.fitted[i]));
    const rk = S.ranks(aligned);
    const an = LM.anova(M, rk, terms, 3);
    const row = an.rows[ti];
    rows.push({ term: t.name, df: row.df, dfRes: an.residual.df, F: row.F, p: row.p, ss: row.ss, ms: row.ms, sumAligned: aligned.reduce((s, v) => s + v, 0) });
  });
  return { rows, n: y.length };
};

/* ---------- Scheirer–Ray–Hare (two-way on ranks) ---------- */
NP.srh = (recs, terms, levelsMap) => {
  const y = recs.map(r => r.y), rk = S.ranks(y), N = y.length;
  const M = LM.modelMatrix(recs, terms, levelsMap);
  const an = LM.anova(M, rk, terms, 1);
  const ms = (N * (N + 1)) / 12;                /* total MS of ranks (with ties: use actual) */
  const msTot = S.sumsq(rk) / (N - 1);
  return { rows: an.rows.map(r => ({ term: r.term, df: r.df, ss: r.ss, H: r.ss / msTot, p: 1 - S.pchisq(r.ss / msTot, r.df) })), msTot, ms };
};

/* ---------- Welch one-way ANOVA (unequal variances) ---------- */
NP.welch = groups => {
  const k = groups.length;
  const n = groups.map(g => g.length), m = groups.map(S.mean), v = groups.map(S.variance);
  const w = n.map((ni, i) => ni / v[i]);
  const W = w.reduce((s, x) => s + x, 0);
  const mw = w.reduce((s, x, i) => s + x * m[i], 0) / W;
  const A = w.reduce((s, x, i) => s + x * (m[i] - mw) ** 2, 0) / (k - 1);
  const B = w.reduce((s, x, i) => s + (1 - x / W) ** 2 / (n[i] - 1), 0) * 3 / (k * k - 1);
  const F = A / (1 + 2 * (k - 2) / (k * k - 1) * w.reduce((s, x, i) => s + (1 - x / W) ** 2 / (n[i] - 1), 0));
  const df2 = 1 / B;
  return { F, df1: k - 1, df2, p: 1 - S.pf(F, k - 1, df2) };
};

window.NP = NP;
