/* AgriDesign — home-page simulator: why blocking works.
   A field with a fertility gradient is laid out twice with the same treatments and the same noise:
   completely at random (CRD) and in randomised complete blocks (RCBD). Both are analysed with the
   linear-model engine of the app, so the F-tests are the real ones. A batch of randomisations
   estimates the power of each design. */

(function () {
  const T = 4, TRT = ['T1', 'T2', 'T3', 'T4'];
  let seed = 2026, last = null;

  function params() {
    return { r: +el('pgR').value, delta: +el('pgDelta').value, grad: +el('pgGrad').value, sd: 1, seed };
  }
  /* one field: rows = r (the gradient runs across rows), cols = T */
  function simulate(p, rng) {
    const trt = Array.from({ length: T }, (_, i) => i * p.delta / (T - 1));          /* effects 0 … δ */
    const fert = Array.from({ length: p.r }, (_, i) => p.grad * (i / Math.max(1, p.r - 1) - 0.5)); /* gradient across rows */
    const noise = Array.from({ length: p.r }, () => Array.from({ length: T }, () => rng.normal(0, p.sd)));
    /* CRD: treatments shuffled over all plots */
    const all = rng.shuffle(TRT.flatMap((t, i) => Array(p.r).fill(i)));
    const crd = [], rcbd = [];
    for (let i = 0; i < p.r; i++) {
      const perm = rng.shuffle([0, 1, 2, 3]);
      for (let j = 0; j < T; j++) {
        const tc = all[i * T + j], tb = perm[j];
        crd.push({ row: i, col: j, t: tc, y: 10 + trt[tc] + fert[i] + noise[i][j] });
        rcbd.push({ row: i, col: j, t: tb, y: 10 + trt[tb] + fert[i] + noise[i][j] });
      }
    }
    return { crd, rcbd, fert };
  }
  function anova(plots, blocked) {
    const recs = plots.map(p => ({ y: p.y, f: { Block: 'B' + (p.row + 1), Trt: TRT[p.t] }, x: {} }));
    const terms = blocked ? [{ name: 'Block', factors: ['Block'] }, { name: 'Trt', factors: ['Trt'] }] : [{ name: 'Trt', factors: ['Trt'] }];
    const lv = { Block: [...new Set(recs.map(r => r.f.Block))], Trt: TRT.slice() };
    const M = LM.modelMatrix(recs, terms, lv);
    const an = LM.anova(M, recs.map(r => r.y), terms, 3);
    const tr = an.rows.find(x => x.term === 'Trt');
    const gm = S.mean(recs.map(r => r.y));
    return { F: tr.F, p: tr.p, df: [tr.df, an.residual.df], mse: an.residual.ms, cv: Math.sqrt(an.residual.ms) / gm * 100, blockPct: blocked ? an.rows.find(x => x.term === 'Block').ss / an.total.ss * 100 : 0 };
  }
  function run() {
    const p = params();
    const rng = S.rng(p.seed);
    const sim = simulate(p, rng);
    const a1 = anova(sim.crd, false), a2 = anova(sim.rcbd, true);
    last = { p, sim, a1, a2 };
    draw('pgFieldCRD', sim.crd, sim.fert, p, 'Completely randomised');
    draw('pgFieldRCBD', sim.rcbd, sim.fert, p, 'Randomised complete blocks');
    readout('CRD', a1); readout('RCBD', a2);
    const better = a2.p < a1.p ? 'RCBD' : a1.p < a2.p ? 'CRD' : 'neither';
    el('pgStatus').innerHTML = `Same treatments, same noise, same gradient. ${p.grad > 0 ? `The gradient adds ${(p.grad).toFixed(1)} SD of fertility from the top row to the bottom row: in the CRD it inflates the error (MSE ${a1.mse.toFixed(2)}), in the RCBD the blocks absorb it (MSE ${a2.mse.toFixed(2)}, ${a2.blockPct.toFixed(0)} % of the total SS).` : 'Without a gradient, blocking only costs degrees of freedom: compare the error df.'} <b>${better === 'neither' ? 'Both designs give the same p-value here.' : better + ' gives the smaller p-value in this randomisation.'}</b> Press <b>Run 300 randomisations</b> to see how often each design detects the differences.`;
    el('pgPower').innerHTML = '';
  }
  function batch() {
    const p = params();
    let n1 = 0, n2 = 0, N = 300;
    const rng = S.rng(p.seed + 7);
    for (let b = 0; b < N; b++) { const sim = simulate(p, rng); if (anova(sim.crd, false).p < 0.05) n1++; if (anova(sim.rcbd, true).p < 0.05) n2++; }
    const pw1 = n1 / N, pw2 = n2 / N;
    const bar = (label, v, col) => `<div class="pg-power-row"><span>${label}</span><div class="pg-power-bar"><div style="width:${(v * 100).toFixed(0)}%;background:${col}"></div></div><b>${(v * 100).toFixed(0)} %</b></div>`;
    el('pgPower').innerHTML = `<div class="pg-title">Power: share of ${N} randomisations with p &lt; 0.05 for the treatment effect</div>${bar('CRD', pw1, '#c8842a')}${bar('RCBD', pw2, '#2f7d4f')}<p class="hint" style="margin:6px 0 0">${p.delta === 0 ? 'With δ = 0 both rates estimate the type I error, which should stay near 5 %.' : pw2 > pw1 + 0.05 ? 'Blocking pays: the gradient that the CRD leaves in the error is removed by the blocks. Halve the CV and you need a quarter of the replicates.' : pw1 > pw2 + 0.05 ? 'Here the CRD wins: with no gradient the blocks only spend degrees of freedom on nothing.' : 'Both designs perform alike: the gradient is too small to matter or the effect is too large to miss.'}</p>`;
  }
  function readout(which, a) {
    el('pg' + which + 'F').textContent = a.F.toFixed(2);
    el('pg' + which + 'P').textContent = a.p < 0.001 ? '< 0.001' : a.p.toFixed(3);
    el('pg' + which + 'P').parentElement.classList.toggle('sig', a.p < 0.05);
    el('pg' + which + 'CV').textContent = a.cv.toFixed(1) + ' %';
    el('pg' + which + 'DF').textContent = a.df.join(', ');
  }
  function draw(id, plots, fert, p, title) {
    const svg = el(id);
    const W = 300, H = 40 + p.r * 34;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const cw = 56, chh = 30, x0 = 58, y0 = 30;
    let s = `<text x="${x0}" y="14" font-size="9" font-weight="700" letter-spacing="1" fill="var(--text-muted)" font-family="Segoe UI, Helvetica, Arial, sans-serif">${title.toUpperCase()}</text>`;
    const fmin = Math.min(...fert), fmax = Math.max(...fert), span = (fmax - fmin) || 1;
    for (let i = 0; i < p.r; i++) {
      const t = (fert[i] - fmin) / span;
      s += `<rect x="${x0 - 4}" y="${y0 + i * 34 - 2}" width="${T * cw + 8}" height="${34}" fill="rgb(${Math.round(120 + 60 * (1 - t))},${Math.round(80 + 40 * (1 - t))},${Math.round(50 + 20 * (1 - t))})" opacity="${(0.25 + 0.55 * (1 - t)).toFixed(2)}"/>`;
      s += `<text x="${x0 - 8}" y="${y0 + i * 34 + 19}" text-anchor="end" font-size="9" fill="var(--text-muted)" font-family="Segoe UI, Helvetica, Arial, sans-serif">${id.endsWith('RCBD') ? 'Block ' + (i + 1) : 'row ' + (i + 1)}</text>`;
    }
    plots.forEach(q => { s += `<rect x="${x0 + q.col * cw + 2}" y="${y0 + q.row * 34 + 2}" width="${cw - 4}" height="${chh - 4}" rx="4" fill="${['#2f7d4f', '#c8842a', '#2b7bb9', '#b5432f'][q.t]}"/><text x="${x0 + q.col * cw + cw / 2}" y="${y0 + q.row * 34 + 13}" text-anchor="middle" font-size="9" font-weight="700" fill="#fff" font-family="Segoe UI, Helvetica, Arial, sans-serif">${TRT[q.t]}</text><text x="${x0 + q.col * cw + cw / 2}" y="${y0 + q.row * 34 + 24}" text-anchor="middle" font-size="8.5" fill="#fff" opacity=".9" font-family="Segoe UI, Helvetica, Arial, sans-serif">${q.y.toFixed(1)}</text>`; });
    s += `<text x="${x0 + T * cw + 6}" y="${y0 + 10}" font-size="8" fill="var(--text-muted)" font-family="Segoe UI, Helvetica, Arial, sans-serif" transform="rotate(90 ${x0 + T * cw + 6} ${y0 + 10})">poor → fertile</text>`;
    svg.innerHTML = s;
  }
  function init() {
    if (!el('pgRun')) return;
    const sync = (id, out, f) => { el(id).addEventListener('input', () => { el(out).textContent = f(el(id).value); }); el(out).textContent = f(el(id).value); };
    sync('pgR', 'pgRVal', v => v); sync('pgDelta', 'pgDeltaVal', v => (+v).toFixed(1) + ' SD'); sync('pgGrad', 'pgGradVal', v => (+v).toFixed(1) + ' SD');
    el('pgRun').addEventListener('click', run);
    el('pgNew').addEventListener('click', () => { seed = Math.floor(Math.random() * 1e6); run(); });
    el('pgBatch').addEventListener('click', batch);
    ['pgR', 'pgDelta', 'pgGrad'].forEach(id => el(id).addEventListener('change', run));
    run();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
