/* AgriDesign — Block 3 figures: exploratory graphics.
   Every function returns a Fig.mount spec. groups = [{label, values:[…]}]. */

const P3 = {};

const PALETTE_OPTS = Object.entries(Fig.paletteNames);
const CMAP_OPTS = Object.entries(Fig.colormapNames);
const LEGEND_OPTS = [['right', 'Top right'], ['left', 'Top left'], ['bottom', 'Below the plot'], ['none', 'Hidden']];

function groupColor(cfg, i) { return (cfg.colors && cfg.colors[i]) || Fig.color(cfg.palette, i); }
function allValues(groups) { return groups.flatMap(g => g.values); }
function yDomain(groups, includeZero) {
  const v = allValues(groups);
  return Fig.niceDomain(S.min(v), S.max(v), includeZero);
}
function jitterFn(seed) { const r = S.rng(seed || 11); return () => (r() - 0.5); }
function baseControls(groups, extra) {
  return [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'xlab', label: 'X axis label', type: 'text' },
    { key: 'ylab', label: 'Y axis label', type: 'text' },
    { key: 'palette', label: 'Palette', type: 'select', options: PALETTE_OPTS },
    ...(groups ? [{ key: 'colors', label: 'Colour per group', type: 'colors', labels: groups.map(g => g.label) }] : []),
    ...(extra || []),
  ];
}
function drawBox(g, x, w, b, col, cfg, t) {
  const y = b.y;
  g.appendChild(Fig.el('line', { x1: x + w / 2, x2: x + w / 2, y1: y(b.whiskerLo), y2: y(b.q1), stroke: col, 'stroke-width': 1.4 }));
  g.appendChild(Fig.el('line', { x1: x + w / 2, x2: x + w / 2, y1: y(b.q3), y2: y(b.whiskerHi), stroke: col, 'stroke-width': 1.4 }));
  g.appendChild(Fig.el('line', { x1: x + w * 0.25, x2: x + w * 0.75, y1: y(b.whiskerLo), y2: y(b.whiskerLo), stroke: col, 'stroke-width': 1.4 }));
  g.appendChild(Fig.el('line', { x1: x + w * 0.25, x2: x + w * 0.75, y1: y(b.whiskerHi), y2: y(b.whiskerHi), stroke: col, 'stroke-width': 1.4 }));
  g.appendChild(Fig.el('rect', { x, y: y(b.q3), width: w, height: Math.max(1, y(b.q1) - y(b.q3)), fill: cfg.fillBoxes === false ? t.bg : Fig.alpha(col, cfg.boxOpacity == null ? 0.55 : +cfg.boxOpacity), stroke: col, 'stroke-width': 1.6, rx: 2 }));
  g.appendChild(Fig.el('line', { x1: x, x2: x + w, y1: y(b.median), y2: y(b.median), stroke: Fig.darken(col, 0.45), 'stroke-width': 2.4 }));
  if (cfg.showMean !== false) g.appendChild(Fig.marker(x + w / 2, y(b.mean), 4.5 * Fig.fs('label'), 'diamond', { fill: t.bg, stroke: Fig.darken(col, 0.45), 'stroke-width': 1.5 }));
  if (cfg.showOutliers !== false) b.outliers.forEach(v => g.appendChild(Fig.el('circle', { cx: x + w / 2, cy: y(v), r: 3.5 * Fig.fs('label'), fill: 'none', stroke: col, 'stroke-width': 1.4 })));
}
function drawPoints(g, groups, band, ysc, cfg, o) {
  const jit = jitterFn(7);
  groups.forEach((gr, i) => {
    const col = groupColor(cfg, i);
    gr.values.forEach(v => {
      const x = band.center(i) + jit() * band.bandwidth * (o.spread == null ? 0.7 : o.spread);
      g.appendChild(Fig.marker(x, ysc(v), (cfg.pointSize || 3.2) * Fig.fs('label'), cfg.pointShape || 'circle',
        { fill: Fig.alpha(o.dark ? Fig.darken(col, 0.4) : col, cfg.pointOpacity == null ? 0.75 : +cfg.pointOpacity), stroke: o.stroke || 'none' }));
    });
  });
}
function nText(f, groups, band, cfg) {
  if (!cfg.showN) return;
  groups.forEach((gr, i) => f.g.appendChild(Fig.text(band.center(i), f.y0 + 14 * Fig.fs('label'), 'n = ' + gr.values.length, { size: 10, anchor: 'middle', fill: f.t.muted, font: f.font, role: 'label' })));
}

/* ================= histogram + density ================= */
P3.histogram = (values, o) => ({
  title: o.title, fileName: o.fileName || 'histogram', width: 820, height: 500,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: 'Frequency', binRule: 'sturges', bins: 0, fill: '#2f7d4f', showDensity: true, showNormal: true, showRug: false, showMeanLine: true }, o.defaults || {}),
  controls: [
    { key: 'title', label: 'Title', type: 'text' }, { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'xlab', label: 'X axis label', type: 'text' }, { key: 'ylab', label: 'Y axis label', type: 'text' },
    { key: 'fill', label: 'Bar colour', type: 'color' },
    { key: 'binRule', label: 'Bin rule', type: 'select', options: [['sturges', 'Sturges'], ['fd', 'Freedman–Diaconis'], ['sqrt', 'Square root']] },
    { key: 'bins', label: 'Bins (0 = rule)', type: 'number', min: 0, max: 80, step: 1 },
    { key: 'showDensity', label: 'Kernel density curve', type: 'checkbox' },
    { key: 'showNormal', label: 'Normal curve', type: 'checkbox' },
    { key: 'showMeanLine', label: 'Mean and median lines', type: 'checkbox' },
    { key: 'showRug', label: 'Rug of observations', type: 'checkbox' },
  ],
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const k = +cfg.bins > 0 ? +cfg.bins : S.nBins(values, cfg.binRule);
    const h = S.histogram(values, k);
    const n = values.length, bw = h.width;
    const xd = Fig.niceDomain(h.min, h.max, false);
    const xs = Fig.scaleLinear(xd[0], xd[1], f.x0, f.x1);
    let ymax = Math.max(...h.counts);
    const grid = Array.from({ length: 120 }, (_, i) => xd[0] + (xd[1] - xd[0]) * i / 119);
    let dens = null, norm = null;
    if (cfg.showDensity) { dens = S.kde(values, grid).map(d => d * n * bw); ymax = Math.max(ymax, ...dens); }
    if (cfg.showNormal) { const m = S.mean(values), sd = S.sd(values); norm = grid.map(x => S.dnorm(x, m, sd) * n * bw); ymax = Math.max(ymax, ...norm); }
    const ys = Fig.scaleLinear(0, ymax * 1.08, f.y1, f.y0);
    Fig.axisY(f, ys, cfg); Fig.axisX(f, xs, cfg);
    h.counts.forEach((c, i) => {
      const x0 = xs(h.min + i * bw), x1 = xs(h.min + (i + 1) * bw);
      f.g.appendChild(Fig.el('rect', { x: x0, y: ys(c), width: Math.max(0.5, x1 - x0 - 1), height: ys(0) - ys(c), fill: Fig.alpha(cfg.fill, 0.8), stroke: Fig.darken(cfg.fill, 0.2), 'stroke-width': 0.8 }));
    });
    const path = arr => arr.map((v, i) => (i ? 'L' : 'M') + xs(grid[i]).toFixed(1) + ' ' + ys(v).toFixed(1)).join(' ');
    if (dens) f.g.appendChild(Fig.el('path', { d: path(dens), fill: 'none', stroke: '#c8842a', 'stroke-width': 2.4 }));
    if (norm) f.g.appendChild(Fig.el('path', { d: path(norm), fill: 'none', stroke: '#2b7bb9', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
    if (cfg.showMeanLine) {
      const m = S.mean(values), md = S.median(values);
      f.g.appendChild(Fig.el('line', { x1: xs(m), x2: xs(m), y1: f.y0, y2: f.y1, stroke: f.t.fg, 'stroke-width': 1.4 }));
      f.g.appendChild(Fig.el('line', { x1: xs(md), x2: xs(md), y1: f.y0, y2: f.y1, stroke: f.t.fg, 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }));
      f.g.appendChild(Fig.text(xs(m) + 4, f.y0 + 12 * Fig.fs('label'), 'mean', { size: 10, fill: f.t.fg, font: f.font, role: 'label' }));
      f.g.appendChild(Fig.text(xs(md) + 4, f.y0 + 24 * Fig.fs('label'), 'median', { size: 10, fill: f.t.muted, font: f.font, role: 'label' }));
    }
    if (cfg.showRug) values.forEach(v => f.g.appendChild(Fig.el('line', { x1: xs(v), x2: xs(v), y1: f.y1 - 8, y2: f.y1, stroke: f.t.fg, 'stroke-width': 1, opacity: 0.6 })));
    const items = [];
    if (dens) items.push({ label: 'Kernel density', color: '#c8842a', shape: 'line' });
    if (norm) items.push({ label: 'Normal (same mean, SD)', color: '#2b7bb9', shape: 'line' });
    if (items.length) Fig.legend(f, items, cfg);
    return svg;
  },
});

/* ================= box plot ================= */
P3.boxplot = (groups, o) => ({
  title: o.title, fileName: o.fileName || 'boxplot', width: 860, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', showPoints: true, showMean: true, showOutliers: true, showN: true, boxWidth: 0.6, boxOpacity: 0.55, pointSize: 3.2, pointOpacity: 0.7, legendPos: 'none', includeZero: false }, o.defaults || {}),
  controls: baseControls(groups, [
    { key: 'showPoints', label: 'Show observations (jittered)', type: 'checkbox' },
    { key: 'showMean', label: 'Mean marker (◆)', type: 'checkbox' },
    { key: 'showOutliers', label: 'Mark outliers', type: 'checkbox' },
    { key: 'showN', label: 'Show n per group', type: 'checkbox' },
    { key: 'includeZero', label: 'Y axis from zero', type: 'checkbox' },
    { key: 'boxWidth', label: 'Box width', type: 'range', min: 0.2, max: 0.95, step: 0.05 },
    { key: 'boxOpacity', label: 'Box fill opacity', type: 'range', min: 0, max: 1, step: 0.05 },
    { key: 'pointSize', label: 'Point size', type: 'range', min: 1, max: 8, step: 0.2 },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const yd = yDomain(groups, cfg.includeZero);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(groups.map(g => g.label), f.x0, f.x1, 1 - +cfg.boxWidth);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, groups.map(g => g.label), cfg);
    const g = Fig.g(); f.g.appendChild(g);
    groups.forEach((gr, i) => {
      if (!gr.values.length) return;
      const b = S.boxStats(gr.values); b.y = ys;
      const col = groupColor(cfg, i);
      if (cfg.showPoints) { const gp = Fig.g(); g.appendChild(gp); drawPoints(gp, [gr], { center: () => band.center(i), bandwidth: band.bandwidth }, ys, Object.assign({}, cfg, { colors: [col] }), { spread: 0.5, dark: true }); }
      drawBox(g, band(i), band.bandwidth, b, col, cfg, f.t);
    });
    nText(f, groups, band, cfg);
    return svg;
  },
});

/* ================= violin plot ================= */
P3.violin = (groups, o) => ({
  title: o.title, fileName: o.fileName || 'violin', width: 860, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', innerBox: true, showPoints: false, showN: true, violinWidth: 0.8, bandwidthMult: 1, fillOpacity: 0.55, pointSize: 2.6, legendPos: 'none', includeZero: false }, o.defaults || {}),
  controls: baseControls(groups, [
    { key: 'innerBox', label: 'Inner box plot', type: 'checkbox' },
    { key: 'showPoints', label: 'Show observations', type: 'checkbox' },
    { key: 'showN', label: 'Show n per group', type: 'checkbox' },
    { key: 'includeZero', label: 'Y axis from zero', type: 'checkbox' },
    { key: 'violinWidth', label: 'Violin width', type: 'range', min: 0.3, max: 1, step: 0.05 },
    { key: 'bandwidthMult', label: 'Smoothing (bandwidth ×)', type: 'range', min: 0.3, max: 3, step: 0.1 },
    { key: 'fillOpacity', label: 'Fill opacity', type: 'range', min: 0.1, max: 1, step: 0.05 },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const all = allValues(groups);
    const pad = S.sd(all) * 0.6;
    const yd = Fig.niceDomain(S.min(all) - pad, S.max(all) + pad, cfg.includeZero);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(groups.map(g => g.label), f.x0, f.x1, 1 - +cfg.violinWidth);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, groups.map(g => g.label), cfg);
    const grid = Array.from({ length: 80 }, (_, i) => yd[0] + (yd[1] - yd[0]) * i / 79);
    const dens = groups.map(gr => {
      if (gr.values.length < 2) return grid.map(() => 0);
      const v = gr.values, sd = S.sd(v), iq = S.iqr(v) / 1.34;
      const bw = 0.9 * Math.min(sd, iq || sd) * Math.pow(v.length, -0.2) * (+cfg.bandwidthMult || 1) || 1;
      const lo = S.min(v) - bw * 1.2, hi = S.max(v) + bw * 1.2;
      return S.kde(v, grid, bw).map((d, i) => (grid[i] < lo || grid[i] > hi) ? 0 : d);
    });
    const dmax = Math.max(...dens.flat()) || 1;
    groups.forEach((gr, i) => {
      const col = groupColor(cfg, i), cx = band.center(i), half = band.bandwidth / 2;
      const d = dens[i];
      let path = '';
      grid.forEach((y, k) => { path += (k ? 'L' : 'M') + (cx + d[k] / dmax * half).toFixed(1) + ' ' + ys(y).toFixed(1) + ' '; });
      for (let k = grid.length - 1; k >= 0; k--) path += 'L' + (cx - d[k] / dmax * half).toFixed(1) + ' ' + ys(grid[k]).toFixed(1) + ' ';
      f.g.appendChild(Fig.el('path', { d: path + 'Z', fill: Fig.alpha(col, +cfg.fillOpacity), stroke: col, 'stroke-width': 1.5 }));
      if (cfg.showPoints) { const gp = Fig.g(); f.g.appendChild(gp); drawPoints(gp, [gr], { center: () => cx, bandwidth: band.bandwidth }, ys, Object.assign({}, cfg, { colors: [col] }), { spread: 0.3, dark: true }); }
      if (cfg.innerBox && gr.values.length) {
        const b = S.boxStats(gr.values);
        const w = Math.max(6, band.bandwidth * 0.12);
        f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(b.whiskerLo), y2: ys(b.whiskerHi), stroke: Fig.darken(col, 0.5), 'stroke-width': 1.5 }));
        f.g.appendChild(Fig.el('rect', { x: cx - w / 2, y: ys(b.q3), width: w, height: Math.max(1, ys(b.q1) - ys(b.q3)), fill: Fig.darken(col, 0.5), rx: 2 }));
        f.g.appendChild(Fig.el('circle', { cx, cy: ys(b.median), r: 3.2 * Fig.fs('label'), fill: f.t.bg, stroke: Fig.darken(col, 0.5), 'stroke-width': 1.5 }));
      }
    });
    nText(f, groups, band, cfg);
    return svg;
  },
});

/* ================= means with error bars (bars or points) ================= */
P3.means = (groups, o) => ({
  title: o.title, fileName: o.fileName || 'means', width: 860, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', style: 'bars', errorType: 'se', showValues: true, showPoints: false, barWidth: 0.65, capWidth: 0.3, valueDigits: 2, legendPos: 'none', includeZero: true }, o.defaults || {}),
  controls: baseControls(groups, [
    { key: 'style', label: 'Style', type: 'select', options: [['bars', 'Bars'], ['points', 'Points'], ['lollipop', 'Lollipop']] },
    { key: 'errorType', label: 'Error bars', type: 'select', options: [['se', 'Standard error'], ['sd', 'Standard deviation'], ['ci', '95 % confidence interval'], ['none', 'None']] },
    { key: 'showValues', label: 'Print mean values', type: 'checkbox' },
    { key: 'showPoints', label: 'Overlay observations', type: 'checkbox' },
    { key: 'includeZero', label: 'Y axis from zero', type: 'checkbox' },
    { key: 'barWidth', label: 'Bar width', type: 'range', min: 0.2, max: 0.95, step: 0.05 },
    { key: 'valueDigits', label: 'Decimals', type: 'number', min: 0, max: 5, step: 1 },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const st = groups.map(gr => {
      const v = gr.values, n = v.length, m = S.mean(v), sd = n > 1 ? S.sd(v) : 0, se = n > 1 ? sd / Math.sqrt(n) : 0;
      const err = cfg.errorType === 'sd' ? sd : cfg.errorType === 'se' ? se : cfg.errorType === 'ci' ? (n > 1 ? S.qt(0.975, n - 1) * se : 0) : 0;
      return { m, err, n };
    });
    let lo = Math.min(...st.map(s => s.m - s.err)), hi = Math.max(...st.map(s => s.m + s.err));
    if (cfg.showPoints) { const all = allValues(groups); lo = Math.min(lo, S.min(all)); hi = Math.max(hi, S.max(all)); }
    const yd = Fig.niceDomain(lo, hi, cfg.includeZero || cfg.style === 'bars');
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(groups.map(g => g.label), f.x0, f.x1, 1 - +cfg.barWidth);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, groups.map(g => g.label), cfg);
    const base = ys(Math.max(yd[0], 0));
    st.forEach((s, i) => {
      const col = groupColor(cfg, i), cx = band.center(i);
      if (cfg.style === 'bars') f.g.appendChild(Fig.el('rect', { x: band(i), y: Math.min(ys(s.m), base), width: band.bandwidth, height: Math.abs(base - ys(s.m)), fill: col, stroke: Fig.darken(col, 0.2), 'stroke-width': 0.8, rx: 2 }));
      else if (cfg.style === 'lollipop') f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: base, y2: ys(s.m), stroke: col, 'stroke-width': 3 }));
      if (cfg.showPoints) { const gp = Fig.g(); f.g.appendChild(gp); drawPoints(gp, [groups[i]], { center: () => cx, bandwidth: band.bandwidth }, ys, Object.assign({}, cfg, { colors: [col], pointSize: 2.8, pointOpacity: 0.6 }), { spread: 0.5, dark: true, stroke: f.t.bg }); }
      if (s.err > 0) {
        const cw = band.bandwidth * +cfg.capWidth;
        f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(s.m - s.err), y2: ys(s.m + s.err), stroke: f.t.fg, 'stroke-width': 1.5 }));
        f.g.appendChild(Fig.el('line', { x1: cx - cw, x2: cx + cw, y1: ys(s.m + s.err), y2: ys(s.m + s.err), stroke: f.t.fg, 'stroke-width': 1.5 }));
        f.g.appendChild(Fig.el('line', { x1: cx - cw, x2: cx + cw, y1: ys(s.m - s.err), y2: ys(s.m - s.err), stroke: f.t.fg, 'stroke-width': 1.5 }));
      }
      if (cfg.style !== 'bars') f.g.appendChild(Fig.marker(cx, ys(s.m), 5 * Fig.fs('label'), 'circle', { fill: col, stroke: f.t.bg, 'stroke-width': 1.2 }));
      if (cfg.showValues) f.g.appendChild(Fig.text(cx, ys(s.m + s.err) - 7 * Fig.fs('label'), s.m.toFixed(+cfg.valueDigits), { size: 11, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
    });
    const errLab = { se: '± SE', sd: '± SD', ci: '± 95 % CI', none: '' }[cfg.errorType];
    if (errLab) f.g.appendChild(Fig.text(f.x1, f.y0 - 6, 'Mean ' + errLab, { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
    return svg;
  },
});

/* ================= strip / dot plot ================= */
P3.strip = (groups, o) => ({
  title: o.title, fileName: o.fileName || 'stripplot', width: 860, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', pointSize: 4.5, pointOpacity: 0.8, pointShape: 'circle', spread: 0.6, showMean: true, showMedian: false, showN: true, legendPos: 'none', includeZero: false }, o.defaults || {}),
  controls: baseControls(groups, [
    { key: 'pointShape', label: 'Point shape', type: 'select', options: Fig.shapes.map(s => [s, s]) },
    { key: 'pointSize', label: 'Point size', type: 'range', min: 1.5, max: 10, step: 0.25 },
    { key: 'pointOpacity', label: 'Point opacity', type: 'range', min: 0.1, max: 1, step: 0.05 },
    { key: 'spread', label: 'Horizontal spread', type: 'range', min: 0, max: 1, step: 0.05 },
    { key: 'showMean', label: 'Mean ± SE bar', type: 'checkbox' },
    { key: 'showMedian', label: 'Median line', type: 'checkbox' },
    { key: 'showN', label: 'Show n per group', type: 'checkbox' },
    { key: 'includeZero', label: 'Y axis from zero', type: 'checkbox' },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const yd = yDomain(groups, cfg.includeZero);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(groups.map(g => g.label), f.x0, f.x1, 0.3);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, groups.map(g => g.label), cfg);
    const gp = Fig.g(); f.g.appendChild(gp);
    drawPoints(gp, groups, band, ys, cfg, { spread: +cfg.spread, stroke: f.t.bg });
    groups.forEach((gr, i) => {
      if (!gr.values.length) return;
      const cx = band.center(i), w = band.bandwidth * 0.5, m = S.mean(gr.values);
      if (cfg.showMean) {
        const se = gr.values.length > 1 ? S.se(gr.values) : 0;
        f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(m - se), y2: ys(m + se), stroke: f.t.fg, 'stroke-width': 2 }));
        f.g.appendChild(Fig.el('line', { x1: cx - w / 2, x2: cx + w / 2, y1: ys(m), y2: ys(m), stroke: f.t.fg, 'stroke-width': 2.6 }));
      }
      if (cfg.showMedian) f.g.appendChild(Fig.el('line', { x1: cx - w / 2, x2: cx + w / 2, y1: ys(S.median(gr.values)), y2: ys(S.median(gr.values)), stroke: f.t.fg, 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }));
    });
    nText(f, groups, band, cfg);
    return svg;
  },
});

/* ================= lines: interaction / block profiles =================
   xLabels: categories on X; series: [{label, values:[…], se?:[…]}] */
P3.lines = (xLabels, series, o) => ({
  title: o.title, fileName: o.fileName || 'lines', width: 860, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', lineWidth: 2.4, markerSize: 5, markerShape: 'circle', showErr: false, legendPos: 'right', includeZero: false, labelEnds: false }, o.defaults || {}),
  controls: baseControls(series, [
    { key: 'legendPos', label: 'Legend', type: 'select', options: LEGEND_OPTS },
    { key: 'lineWidth', label: 'Line width', type: 'range', min: 0.5, max: 6, step: 0.25 },
    { key: 'markerShape', label: 'Marker shape', type: 'select', options: [['none', 'none']].concat(Fig.shapes.map(s => [s, s])) },
    { key: 'markerSize', label: 'Marker size', type: 'range', min: 2, max: 10, step: 0.25 },
    ...(series.some(s => s.se) ? [{ key: 'showErr', label: 'Error bars (± SE)', type: 'checkbox' }] : []),
    { key: 'labelEnds', label: 'Label lines at the right end', type: 'checkbox' },
    { key: 'includeZero', label: 'Y axis from zero', type: 'checkbox' },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, { margin: cfg.labelEnds ? { right: 110 } : {} });
    const all = series.flatMap(s => s.values.filter(v => v != null && isFinite(v)));
    let lo = S.min(all), hi = S.max(all);
    if (cfg.showErr) series.forEach(s => (s.se || []).forEach((e, i) => { if (s.values[i] != null) { lo = Math.min(lo, s.values[i] - e); hi = Math.max(hi, s.values[i] + e); } }));
    const yd = Fig.niceDomain(lo, hi, cfg.includeZero);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(xLabels, f.x0, f.x1, 0.6);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, xLabels, cfg);
    series.forEach((s, i) => {
      const col = groupColor(cfg, i);
      let d = '', started = false;
      s.values.forEach((v, k) => { if (v == null || !isFinite(v)) { started = false; return; } d += (started ? 'L' : 'M') + band.center(k).toFixed(1) + ' ' + ys(v).toFixed(1) + ' '; started = true; });
      f.g.appendChild(Fig.el('path', { d, fill: 'none', stroke: col, 'stroke-width': +cfg.lineWidth, 'stroke-linejoin': 'round' }));
      s.values.forEach((v, k) => {
        if (v == null || !isFinite(v)) return;
        const cx = band.center(k);
        if (cfg.showErr && s.se && s.se[k] > 0) {
          f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(v - s.se[k]), y2: ys(v + s.se[k]), stroke: col, 'stroke-width': 1.3 }));
          f.g.appendChild(Fig.el('line', { x1: cx - 5, x2: cx + 5, y1: ys(v - s.se[k]), y2: ys(v - s.se[k]), stroke: col, 'stroke-width': 1.3 }));
          f.g.appendChild(Fig.el('line', { x1: cx - 5, x2: cx + 5, y1: ys(v + s.se[k]), y2: ys(v + s.se[k]), stroke: col, 'stroke-width': 1.3 }));
        }
        if (cfg.markerShape !== 'none') f.g.appendChild(Fig.marker(cx, ys(v), +cfg.markerSize * Fig.fs('label'), cfg.markerShape, { fill: col, stroke: f.t.bg, 'stroke-width': 1.2 }));
      });
      if (cfg.labelEnds) { const last = s.values.length - 1; if (s.values[last] != null) f.g.appendChild(Fig.text(band.center(last) + 10, ys(s.values[last]) + 4, s.label, { size: 11, fill: col, font: f.font, role: 'label', weight: 'bold' })); }
    });
    if (!cfg.labelEnds) Fig.legend(f, series.map((s, i) => ({ label: s.label, color: groupColor(cfg, i), shape: 'line' })), cfg);
    return svg;
  },
});

/* ================= scatter with fitted line ================= */
P3.scatter = (x, y, o) => ({
  title: o.title, fileName: o.fileName || 'scatter', width: 780, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', fill: '#2f7d4f', pointSize: 4.5, pointOpacity: 0.75, pointShape: 'circle', showFit: true, showStats: true, showCI: true, legendPos: 'right' }, o.defaults || {}),
  controls: [
    { key: 'title', label: 'Title', type: 'text' }, { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'xlab', label: 'X axis label', type: 'text' }, { key: 'ylab', label: 'Y axis label', type: 'text' },
    ...(o.groups ? [{ key: 'palette', label: 'Palette', type: 'select', options: PALETTE_OPTS }, { key: 'colors', label: 'Colour per group', type: 'colors', labels: o.groups.levels }, { key: 'legendPos', label: 'Legend', type: 'select', options: LEGEND_OPTS }] : [{ key: 'fill', label: 'Point colour', type: 'color' }]),
    { key: 'pointShape', label: 'Point shape', type: 'select', options: Fig.shapes.map(s => [s, s]) },
    { key: 'pointSize', label: 'Point size', type: 'range', min: 1.5, max: 10, step: 0.25 },
    { key: 'showFit', label: 'Least-squares line', type: 'checkbox' },
    { key: 'showCI', label: '95 % confidence band', type: 'checkbox' },
    { key: 'showStats', label: 'Print r, R² and equation', type: 'checkbox' },
  ],
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const xd = Fig.niceDomain(S.min(x), S.max(x), false), yd = Fig.niceDomain(S.min(y), S.max(y), false);
    const xs = Fig.scaleLinear(xd[0], xd[1], f.x0, f.x1), ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    Fig.axisY(f, ys, cfg); Fig.axisX(f, xs, cfg);
    const n = x.length, mx = S.mean(x), my = S.mean(y);
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); syy += (y[i] - my) ** 2; }
    const b = sxy / sxx, a = my - b * mx, r = sxy / Math.sqrt(sxx * syy);
    if (cfg.showFit && n > 2 && sxx > 0) {
      const sse = syy - b * sxy, mse = sse / (n - 2), tq = S.qt(0.975, n - 2);
      if (cfg.showCI) {
        const grid = Array.from({ length: 60 }, (_, i) => xd[0] + (xd[1] - xd[0]) * i / 59);
        const up = grid.map(gx => a + b * gx + tq * Math.sqrt(mse * (1 / n + (gx - mx) ** 2 / sxx)));
        const dn = grid.map(gx => a + b * gx - tq * Math.sqrt(mse * (1 / n + (gx - mx) ** 2 / sxx)));
        let d = grid.map((gx, i) => (i ? 'L' : 'M') + xs(gx).toFixed(1) + ' ' + ys(up[i]).toFixed(1)).join(' ');
        for (let i = grid.length - 1; i >= 0; i--) d += ' L' + xs(grid[i]).toFixed(1) + ' ' + ys(dn[i]).toFixed(1);
        f.g.appendChild(Fig.el('path', { d: d + ' Z', fill: Fig.alpha('#c8842a', 0.18), stroke: 'none' }));
      }
      f.g.appendChild(Fig.el('line', { x1: xs(xd[0]), x2: xs(xd[1]), y1: ys(a + b * xd[0]), y2: ys(a + b * xd[1]), stroke: '#c8842a', 'stroke-width': 2.4 }));
    }
    const lv = o.groups ? o.groups.levels : null;
    x.forEach((xi, i) => {
      const col = lv ? groupColor(cfg, lv.indexOf(o.groups.values[i])) : cfg.fill;
      f.g.appendChild(Fig.marker(xs(xi), ys(y[i]), +cfg.pointSize * Fig.fs('label'), cfg.pointShape, { fill: Fig.alpha(col, +cfg.pointOpacity), stroke: f.t.bg, 'stroke-width': 1 }));
    });
    if (cfg.showStats && n > 2) {
      const txt = `y = ${a.toFixed(3)} ${b < 0 ? '−' : '+'} ${Math.abs(b).toFixed(3)}·x   r = ${r.toFixed(3)}   R² = ${(r * r).toFixed(3)}   n = ${n}`;
      f.g.appendChild(Fig.text(f.x0 + 8, f.y0 + 16 * Fig.fs('label'), txt, { size: 11, fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
    }
    if (lv) Fig.legend(f, lv.map((l, i) => ({ label: l, color: groupColor(cfg, i), shape: 'circle' })), cfg);
    return svg;
  },
});

/* ================= correlation heat map ================= */
P3.corrHeat = (names, M, o) => ({
  title: o.title, fileName: o.fileName || 'correlation', width: 700, height: 600,
  defaults: Object.assign({ title: o.title, colormap: 'rdbu', showValues: true, digits: 2, cellGap: 2 }, o.defaults || {}),
  controls: [
    { key: 'title', label: 'Title', type: 'text' }, { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'colormap', label: 'Colour map', type: 'select', options: CMAP_OPTS },
    { key: 'showValues', label: 'Print coefficients', type: 'checkbox' },
    { key: 'digits', label: 'Decimals', type: 'number', min: 0, max: 4, step: 1 },
  ],
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, { margin: { left: 130, bottom: 120, right: 70 } });
    const p = names.length, cw = (f.x1 - f.x0) / p, ch = (f.y1 - f.y0) / p, cmap = Fig.colormaps[cfg.colormap];
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
      const v = M[i][j], col = cmap((v + 1) / 2);
      f.g.appendChild(Fig.el('rect', { x: f.x0 + j * cw + +cfg.cellGap / 2, y: f.y0 + i * ch + +cfg.cellGap / 2, width: cw - +cfg.cellGap, height: ch - +cfg.cellGap, fill: col, rx: 3 }));
      if (cfg.showValues) f.g.appendChild(Fig.text(f.x0 + j * cw + cw / 2, f.y0 + i * ch + ch / 2 + 4, v.toFixed(+cfg.digits), { size: Math.min(13, cw / 4), anchor: 'middle', fill: Fig.onColor(col), font: f.font, role: 'label' }));
    }
    names.forEach((nm, i) => {
      f.g.appendChild(Fig.text(f.x0 - 8, f.y0 + i * ch + ch / 2 + 4, nm, { size: 11, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' }));
      f.g.appendChild(Fig.text(f.x0 + i * cw + cw / 2, f.y1 + 14, nm, { size: 11, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick', rotate: -40 }));
    });
    /* colour bar */
    const bx = f.x1 + 18, bh = f.y1 - f.y0;
    for (let k = 0; k < 40; k++) f.g.appendChild(Fig.el('rect', { x: bx, y: f.y0 + bh * (1 - (k + 1) / 40), width: 14, height: bh / 40 + 0.5, fill: cmap(k / 39) }));
    [-1, -0.5, 0, 0.5, 1].forEach(v => f.g.appendChild(Fig.text(bx + 19, f.y0 + bh * (1 - (v + 1) / 2) + 4, String(v), { size: 10, fill: f.t.muted, font: f.font, role: 'tick' })));
    return svg;
  },
});

window.P3 = P3;
