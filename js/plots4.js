/* AgriDesign — Block 4 figures: residual diagnostics, Box–Cox profile, rank means with letters. */

const P4 = {};
const TXT = [{ key: 'title', label: 'Title', type: 'text' }, { key: 'subtitle', label: 'Subtitle', type: 'text' }, { key: 'xlab', label: 'X axis label', type: 'text' }, { key: 'ylab', label: 'Y axis label', type: 'text' }];

/* ---------- normal Q–Q plot with 95 % band (Fox's pointwise approximation) ---------- */
P4.qq = (r, o) => ({
  title: o.title || 'Normal Q–Q plot of residuals', fileName: o.fileName || 'qq_plot', width: 640, height: 560,
  defaults: Object.assign({ title: o.title || 'Normal Q–Q plot of residuals', xlab: 'Theoretical quantiles', ylab: o.ylab || 'Standardized residuals', fill: '#2f7d4f', lineColor: '#c8842a', showBand: true, showLabels: true, pointSize: 4.2 }, o.defaults || {}),
  controls: TXT.concat([
    { key: 'fill', label: 'Point colour', type: 'color' }, { key: 'lineColor', label: 'Line colour', type: 'color' },
    { key: 'showBand', label: '95 % confidence band', type: 'checkbox' }, { key: 'showLabels', label: 'Label extreme points', type: 'checkbox' },
    { key: 'pointSize', label: 'Point size', type: 'range', min: 1.5, max: 9, step: 0.25 },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const n = r.length;
    const idx = r.map((v, i) => i).sort((a, b) => r[a] - r[b]);
    const sorted = idx.map(i => r[i]);
    const th = sorted.map((_, i) => S.qnorm((i + 1 - 0.375) / (n + 0.25)));
    const m = S.mean(r), sd = S.sd(r);
    const lim = Math.max(Math.abs(S.min(th)), Math.abs(S.max(th)), Math.abs((S.min(r) - m) / sd), Math.abs((S.max(r) - m) / sd)) * 1.1;
    const xs = Fig.scaleLinear(-lim, lim, f.x0, f.x1);
    const yd = Fig.niceDomain(Math.min(S.min(r), m - lim * sd), Math.max(S.max(r), m + lim * sd), false);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    Fig.axisY(f, ys, cfg); Fig.axisX(f, xs, cfg);
    if (cfg.showBand) {
      const grid = Array.from({ length: 60 }, (_, i) => -lim + 2 * lim * i / 59);
      const up = [], dn = [];
      grid.forEach(z => { const P = S.pnorm(z); const se = sd / S.dnorm(z) * Math.sqrt(P * (1 - P) / n); up.push(m + sd * z + 1.96 * se); dn.push(m + sd * z - 1.96 * se); });
      let d = grid.map((z, i) => (i ? 'L' : 'M') + xs(z).toFixed(1) + ' ' + ys(Math.min(yd[1], up[i])).toFixed(1)).join(' ');
      for (let i = grid.length - 1; i >= 0; i--) d += ' L' + xs(grid[i]).toFixed(1) + ' ' + ys(Math.max(yd[0], dn[i])).toFixed(1);
      f.g.appendChild(Fig.el('path', { d: d + ' Z', fill: Fig.alpha(cfg.lineColor, 0.15), stroke: 'none' }));
    }
    f.g.appendChild(Fig.el('line', { x1: xs(-lim), x2: xs(lim), y1: ys(m - lim * sd), y2: ys(m + lim * sd), stroke: cfg.lineColor, 'stroke-width': 2 }));
    sorted.forEach((v, i) => f.g.appendChild(Fig.el('circle', { cx: xs(th[i]), cy: ys(v), r: +cfg.pointSize * Fig.fs('label'), fill: Fig.alpha(cfg.fill, 0.8), stroke: f.t.bg, 'stroke-width': 1 })));
    if (cfg.showLabels && o.labels) {
      const ext = [0, 1, n - 2, n - 1].filter(i => i >= 0 && i < n && Math.abs((sorted[i] - m) / sd) > 2);
      ext.forEach(i => f.g.appendChild(Fig.text(xs(th[i]) + 7, ys(sorted[i]) + 4, String(o.labels[idx[i]]), { size: 10, fill: f.t.muted, font: f.font, role: 'label' })));
    }
    return svg;
  },
});

/* ---------- residuals vs fitted (or vs order / vs group centre) with loess-like smoother ---------- */
P4.residScatter = (x, r, o) => ({
  title: o.title, fileName: o.fileName || 'residuals', width: 760, height: 500,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab || 'Residuals', fill: '#2f7d4f', showSmooth: true, showRef: true, pointSize: 4.2, showLabels: true }, o.defaults || {}),
  controls: TXT.concat([
    { key: 'fill', label: 'Point colour', type: 'color' },
    { key: 'showSmooth', label: 'Running-mean smoother', type: 'checkbox' },
    { key: 'showRef', label: 'Reference lines (0, ±2)', type: 'checkbox' },
    { key: 'showLabels', label: 'Label |r| > 2.5', type: 'checkbox' },
    { key: 'pointSize', label: 'Point size', type: 'range', min: 1.5, max: 9, step: 0.25 },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const xd = Fig.niceDomain(S.min(x), S.max(x), false);
    const lim = Math.max(2.6, Math.abs(S.min(r)), Math.abs(S.max(r))) * 1.08;
    const yd = o.symmetric === false ? Fig.niceDomain(S.min(r), S.max(r), true) : [-lim, lim];
    const xs = Fig.scaleLinear(xd[0], xd[1], f.x0, f.x1), ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    Fig.axisY(f, ys, cfg); Fig.axisX(f, xs, cfg, { fmt: o.xfmt });
    if (cfg.showRef) {
      f.g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: ys(0), y2: ys(0), stroke: f.t.fg, 'stroke-width': 1.2 }));
      if (o.symmetric !== false) [-2, 2].forEach(v => { if (v > yd[0] && v < yd[1]) f.g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: ys(v), y2: ys(v), stroke: f.t.muted, 'stroke-width': 1, 'stroke-dasharray': '4 4' })); });
    }
    if (cfg.showSmooth && x.length > 6) {
      const idx = x.map((_, i) => i).sort((a, b) => x[a] - x[b]);
      const w = Math.max(3, Math.round(x.length / 5));
      let d = '';
      idx.forEach((i, k) => { const lo = Math.max(0, k - w), hi = Math.min(idx.length - 1, k + w); const sub = idx.slice(lo, hi + 1); const mx = S.mean(sub.map(j => x[j])), my = S.mean(sub.map(j => r[j])); d += (k ? 'L' : 'M') + xs(mx).toFixed(1) + ' ' + ys(my).toFixed(1) + ' '; });
      f.g.appendChild(Fig.el('path', { d, fill: 'none', stroke: '#c8842a', 'stroke-width': 2.2 }));
    }
    x.forEach((xi, i) => f.g.appendChild(Fig.el('circle', { cx: xs(xi), cy: ys(r[i]), r: +cfg.pointSize * Fig.fs('label'), fill: Fig.alpha(cfg.fill, 0.75), stroke: f.t.bg, 'stroke-width': 1 })));
    if (cfg.showLabels && o.labels) x.forEach((xi, i) => { if (Math.abs(r[i]) > 2.5) f.g.appendChild(Fig.text(xs(xi) + 7, ys(r[i]) + 4, String(o.labels[i]), { size: 10, fill: f.t.muted, font: f.font, role: 'label' })); });
    if (o.connect) { let d = ''; x.forEach((xi, i) => d += (i ? 'L' : 'M') + xs(xi).toFixed(1) + ' ' + ys(r[i]).toFixed(1) + ' '); f.g.insertBefore(Fig.el('path', { d, fill: 'none', stroke: Fig.alpha(cfg.fill, 0.35), 'stroke-width': 1 }), f.g.lastChild); }
    return svg;
  },
});

/* ---------- Box–Cox profile likelihood ---------- */
P4.boxcox = (bc, o) => ({
  title: 'Box–Cox profile log-likelihood', fileName: 'boxcox', width: 700, height: 460,
  defaults: Object.assign({ title: 'Box–Cox profile log-likelihood', xlab: 'λ', ylab: 'log-likelihood', lineColor: '#2f7d4f' }, o && o.defaults || {}),
  controls: TXT.concat([{ key: 'lineColor', label: 'Line colour', type: 'color' }]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const L = bc.profile.map(p => p.lambda), ll = bc.profile.map(p => p.ll);
    const lo = Math.max(S.min(ll), bc.cut - (S.max(ll) - bc.cut) * 6);
    const xs = Fig.scaleLinear(S.min(L), S.max(L), f.x0, f.x1);
    const yd = Fig.niceDomain(lo, S.max(ll), false);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    Fig.axisY(f, ys, cfg); Fig.axisX(f, xs, cfg);
    f.g.appendChild(Fig.el('rect', { x: xs(bc.ciLow), y: f.y0, width: Math.max(1, xs(bc.ciHigh) - xs(bc.ciLow)), height: f.y1 - f.y0, fill: Fig.alpha(cfg.lineColor, 0.12) }));
    f.g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: ys(bc.cut), y2: ys(bc.cut), stroke: f.t.muted, 'stroke-width': 1, 'stroke-dasharray': '5 4' }));
    let d = ''; L.forEach((l, i) => { const y = Math.max(yd[0], ll[i]); d += (i ? 'L' : 'M') + xs(l).toFixed(1) + ' ' + ys(y).toFixed(1) + ' '; });
    f.g.appendChild(Fig.el('path', { d, fill: 'none', stroke: cfg.lineColor, 'stroke-width': 2.4 }));
    f.g.appendChild(Fig.el('line', { x1: xs(bc.lambda), x2: xs(bc.lambda), y1: f.y0, y2: f.y1, stroke: '#c8842a', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
    [[-1, '1/y'], [-0.5, '1/√y'], [0, 'ln y'], [0.5, '√y'], [1, 'y'], [2, 'y²']].forEach(([l, t]) => { if (l >= S.min(L) && l <= S.max(L)) f.g.appendChild(Fig.text(xs(l), f.y0 - 6, t, { size: 10, anchor: 'middle', fill: f.t.muted, font: f.font, role: 'label' })); });
    f.g.appendChild(Fig.text(xs(bc.lambda) + 6, f.y0 + 16 * Fig.fs('label'), `λ̂ = ${bc.lambda.toFixed(2)}  (95 % CI ${bc.ciLow.toFixed(1)} to ${bc.ciHigh.toFixed(1)})`, { size: 11, fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
    return svg;
  },
});

/* ---------- mean ranks / medians with letters ---------- */
P4.rankMeans = (items, o) => ({
  title: o.title, fileName: o.fileName || 'rank_means', width: 820, height: 500,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', showLetters: true, barWidth: 0.6 }, o.defaults || {}),
  controls: TXT.concat([
    { key: 'palette', label: 'Palette', type: 'select', options: Object.entries(Fig.paletteNames) },
    { key: 'colors', label: 'Colour per group', type: 'colors', labels: items.map(i => i.label) },
    { key: 'showLetters', label: 'Show letters', type: 'checkbox' },
    { key: 'barWidth', label: 'Bar width', type: 'range', min: 0.2, max: 0.95, step: 0.05 },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const yd = Fig.niceDomain(0, S.max(items.map(i => i.value)) * 1.15, true);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(items.map(i => i.label), f.x0, f.x1, 1 - +cfg.barWidth);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, items.map(i => i.label), cfg);
    items.forEach((it, i) => {
      const col = (cfg.colors && cfg.colors[i]) || Fig.color(cfg.palette, i);
      f.g.appendChild(Fig.el('rect', { x: band(i), y: ys(it.value), width: band.bandwidth, height: ys(0) - ys(it.value), fill: col, rx: 2 }));
      if (cfg.showLetters) f.g.appendChild(Fig.text(band.center(i), ys(it.value) - 8 * Fig.fs('label'), it.letters, { size: 13, weight: 'bold', anchor: 'middle', fill: f.t.fg, font: f.font, role: 'label' }));
    });
    return svg;
  },
});

window.P4 = P4;
