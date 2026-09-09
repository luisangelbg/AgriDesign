/* AgriDesign — Block 6 figures: publication graphics built on the ANOVA results. */

const P6 = {};
const TX6 = [{ key: 'title', label: 'Title', type: 'text' }, { key: 'subtitle', label: 'Subtitle', type: 'text' }, { key: 'xlab', label: 'X axis label', type: 'text' }, { key: 'ylab', label: 'Y axis label', type: 'text' }];
const PAL6 = { key: 'palette', label: 'Palette', type: 'select', options: Object.entries(Fig.paletteNames) };
const gcol = (cfg, i) => cfg.monochrome ? cfg.fill : ((cfg.colors && cfg.colors[i]) || Fig.color(cfg.palette, i));

/* ---------- box plots of raw data with letters ---------- */
P6.boxLetters = (groups, o) => ({
  title: o.title, fileName: o.fileName || 'box_letters', width: 860, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', monochrome: false, fill: '#2f7d4f', showPoints: true, showMean: true, showLetters: true, boxWidth: 0.6, letterSize: 13, includeZero: false, orient: 'v' }, o.defaults || {}),
  controls: TX6.concat([PAL6, { key: 'monochrome', label: 'Single colour', type: 'checkbox' }, { key: 'fill', label: 'Colour (single)', type: 'color' }, { key: 'colors', label: 'Colour per level', type: 'colors', labels: groups.map(g => g.label) },
    { key: 'showPoints', label: 'Show observations', type: 'checkbox' }, { key: 'showMean', label: 'Mean marker', type: 'checkbox' }, { key: 'showLetters', label: 'Show letters', type: 'checkbox' }, { key: 'includeZero', label: 'Y axis from zero', type: 'checkbox' },
    { key: 'boxWidth', label: 'Box width', type: 'range', min: 0.2, max: 0.95, step: 0.05 }, { key: 'letterSize', label: 'Letter size', type: 'range', min: 8, max: 24, step: 1 }]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const all = groups.flatMap(g => g.values);
    const yd = Fig.niceDomain(S.min(all), S.max(all) + (S.max(all) - S.min(all)) * 0.12, cfg.includeZero);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(groups.map(g => g.label), f.x0, f.x1, 1 - +cfg.boxWidth);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, groups.map(g => g.label), cfg);
    const jit = S.rng(5);
    groups.forEach((g, i) => {
      const col = gcol(cfg, i), b = S.boxStats(g.values), x = band(i), w = band.bandwidth, cx = x + w / 2;
      if (cfg.showPoints) g.values.forEach(v => f.g.appendChild(Fig.el('circle', { cx: cx + (jit() - 0.5) * w * 0.5, cy: ys(v), r: 2.8 * Fig.fs('label'), fill: Fig.alpha(Fig.darken(col, 0.4), 0.6) })));
      f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(b.whiskerLo), y2: ys(b.q1), stroke: col, 'stroke-width': 1.4 }));
      f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(b.q3), y2: ys(b.whiskerHi), stroke: col, 'stroke-width': 1.4 }));
      [b.whiskerLo, b.whiskerHi].forEach(v => f.g.appendChild(Fig.el('line', { x1: x + w * 0.25, x2: x + w * 0.75, y1: ys(v), y2: ys(v), stroke: col, 'stroke-width': 1.4 })));
      f.g.appendChild(Fig.el('rect', { x, y: ys(b.q3), width: w, height: Math.max(1, ys(b.q1) - ys(b.q3)), fill: Fig.alpha(col, 0.5), stroke: col, 'stroke-width': 1.6, rx: 2 }));
      f.g.appendChild(Fig.el('line', { x1: x, x2: x + w, y1: ys(b.median), y2: ys(b.median), stroke: Fig.darken(col, 0.45), 'stroke-width': 2.4 }));
      if (cfg.showMean) f.g.appendChild(Fig.marker(cx, ys(b.mean), 4.5 * Fig.fs('label'), 'diamond', { fill: f.t.bg, stroke: Fig.darken(col, 0.45), 'stroke-width': 1.5 }));
      b.outliers.forEach(v => f.g.appendChild(Fig.el('circle', { cx, cy: ys(v), r: 3.5, fill: 'none', stroke: col, 'stroke-width': 1.4 })));
      if (cfg.showLetters && g.letters) f.g.appendChild(Fig.text(cx, ys(Math.max(b.whiskerHi, ...b.outliers)) - 8 * Fig.fs('label'), g.letters, { size: +cfg.letterSize, weight: 'bold', anchor: 'middle', fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
    });
    if (o.testName) f.g.appendChild(Fig.text(f.x1, f.y0 - 6, 'Letters: ' + o.testName, { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
    return svg;
  },
});

/* ---------- dot/strip plot with mean ± SE and letters ---------- */
P6.stripLetters = (groups, o) => ({
  title: o.title, fileName: o.fileName || 'strip_letters', width: 860, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', monochrome: false, fill: '#2f7d4f', pointSize: 4.5, spread: 0.5, showLetters: true, errorType: 'se', letterSize: 13, includeZero: false }, o.defaults || {}),
  controls: TX6.concat([PAL6, { key: 'monochrome', label: 'Single colour', type: 'checkbox' }, { key: 'fill', label: 'Colour (single)', type: 'color' }, { key: 'colors', label: 'Colour per level', type: 'colors', labels: groups.map(g => g.label) },
    { key: 'errorType', label: 'Mean bar', type: 'select', options: [['se', 'Mean ± SE'], ['sd', 'Mean ± SD'], ['ci', 'Mean ± 95 % CI'], ['mean', 'Mean only']] },
    { key: 'pointSize', label: 'Point size', type: 'range', min: 1.5, max: 10, step: 0.25 }, { key: 'spread', label: 'Horizontal spread', type: 'range', min: 0, max: 1, step: 0.05 },
    { key: 'showLetters', label: 'Show letters', type: 'checkbox' }, { key: 'includeZero', label: 'Y axis from zero', type: 'checkbox' }, { key: 'letterSize', label: 'Letter size', type: 'range', min: 8, max: 24, step: 1 }]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const all = groups.flatMap(g => g.values);
    const yd = Fig.niceDomain(S.min(all), S.max(all) + (S.max(all) - S.min(all)) * 0.12, cfg.includeZero);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(groups.map(g => g.label), f.x0, f.x1, 0.3);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, groups.map(g => g.label), cfg);
    const jit = S.rng(9);
    groups.forEach((g, i) => {
      const col = gcol(cfg, i), cx = band.center(i), w = band.bandwidth;
      g.values.forEach(v => f.g.appendChild(Fig.marker(cx + (jit() - 0.5) * w * +cfg.spread, ys(v), +cfg.pointSize * Fig.fs('label'), 'circle', { fill: Fig.alpha(col, 0.75), stroke: f.t.bg, 'stroke-width': 1 })));
      const m = S.mean(g.values), n = g.values.length, sd = n > 1 ? S.sd(g.values) : 0, se = sd / Math.sqrt(n);
      const e = cfg.errorType === 'se' ? se : cfg.errorType === 'sd' ? sd : cfg.errorType === 'ci' ? (n > 1 ? S.qt(0.975, n - 1) * se : 0) : 0;
      if (e > 0) f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(m - e), y2: ys(m + e), stroke: f.t.fg, 'stroke-width': 2 }));
      f.g.appendChild(Fig.el('line', { x1: cx - w * 0.3, x2: cx + w * 0.3, y1: ys(m), y2: ys(m), stroke: f.t.fg, 'stroke-width': 2.6 }));
      if (cfg.showLetters && g.letters) f.g.appendChild(Fig.text(cx, ys(S.max(g.values)) - 9 * Fig.fs('label'), g.letters, { size: +cfg.letterSize, weight: 'bold', anchor: 'middle', fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
    });
    return svg;
  },
});

/* ---------- interaction lines with letters and error bars: series [{label, values[], se[], letters[]}] ---------- */
P6.interactionLetters = (xLabels, series, o) => ({
  title: o.title, fileName: o.fileName || 'interaction_letters', width: 880, height: 540,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', lineWidth: 2.4, markerSize: 5.5, showErr: true, showLetters: true, legendPos: 'right', includeZero: false, letterSize: 12, dashed: false }, o.defaults || {}),
  controls: TX6.concat([PAL6, { key: 'colors', label: 'Colour per series', type: 'colors', labels: series.map(s => s.label) },
    { key: 'legendPos', label: 'Legend', type: 'select', options: [['right', 'Top right'], ['left', 'Top left'], ['bottom', 'Below'], ['none', 'Hidden']] },
    { key: 'lineWidth', label: 'Line width', type: 'range', min: 0.5, max: 6, step: 0.25 }, { key: 'markerSize', label: 'Marker size', type: 'range', min: 2, max: 10, step: 0.25 },
    { key: 'dashed', label: 'Distinct line styles', type: 'checkbox' }, { key: 'showErr', label: 'Error bars (± SE)', type: 'checkbox' }, { key: 'showLetters', label: 'Letters at each point', type: 'checkbox' }, { key: 'includeZero', label: 'Y axis from zero', type: 'checkbox' },
    { key: 'letterSize', label: 'Letter size', type: 'range', min: 8, max: 22, step: 1 }]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    let lo = Infinity, hi = -Infinity;
    series.forEach(s => s.values.forEach((v, i) => { const e = cfg.showErr ? (s.se[i] || 0) : 0; lo = Math.min(lo, v - e); hi = Math.max(hi, v + e); }));
    hi += (hi - lo) * 0.1;
    const yd = Fig.niceDomain(lo, hi, cfg.includeZero);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(xLabels, f.x0, f.x1, 0.6);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, xLabels, cfg);
    const dashes = ['', '8 5', '3 3', '10 4 3 4', '2 3'];
    const k = series.length, off = i => (i - (k - 1) / 2) * 7;
    series.forEach((s, i) => {
      const col = (cfg.colors && cfg.colors[i]) || Fig.color(cfg.palette, i);
      const d = s.values.map((v, j) => (j ? 'L' : 'M') + (band.center(j) + off(i)).toFixed(1) + ' ' + ys(v).toFixed(1)).join(' ');
      f.g.appendChild(Fig.el('path', { d, fill: 'none', stroke: col, 'stroke-width': +cfg.lineWidth, 'stroke-dasharray': cfg.dashed ? dashes[i % dashes.length] || null : null }));
      s.values.forEach((v, j) => {
        const cx = band.center(j) + off(i);
        if (cfg.showErr && s.se[j] > 0) { f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(v - s.se[j]), y2: ys(v + s.se[j]), stroke: col, 'stroke-width': 1.3 })); [v - s.se[j], v + s.se[j]].forEach(e => f.g.appendChild(Fig.el('line', { x1: cx - 4, x2: cx + 4, y1: ys(e), y2: ys(e), stroke: col, 'stroke-width': 1.3 }))); }
        f.g.appendChild(Fig.marker(cx, ys(v), +cfg.markerSize * Fig.fs('label'), Fig.shapes[i % Fig.shapes.length], { fill: col, stroke: f.t.bg, 'stroke-width': 1.2 }));
        if (cfg.showLetters && s.letters && s.letters[j]) f.g.appendChild(Fig.text(cx + 8, ys(v) - 7, s.letters[j], { size: +cfg.letterSize, weight: 'bold', fill: col, font: f.font, role: 'label', halo: f.t.bg }));
      });
    });
    Fig.legend(f, series.map((s, i) => ({ label: s.label, color: (cfg.colors && cfg.colors[i]) || Fig.color(cfg.palette, i), shape: 'line' })), cfg);
    if (o.note) f.g.appendChild(Fig.text(f.x0, f.y0 - 6, o.note, { size: 10, fill: f.t.muted, font: f.font, role: 'label' }));
    return svg;
  },
});

/* ---------- heat map of A × B cell means with letters ---------- */
P6.cellHeat = (aLevels, bLevels, cells, o) => ({
  title: o.title, fileName: o.fileName || 'cell_heatmap', width: 760, height: 560,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, colormap: 'ylgn', showValues: true, showLetters: true, digits: 2, cellGap: 3 }, o.defaults || {}),
  controls: TX6.concat([{ key: 'colormap', label: 'Colour map', type: 'select', options: Object.entries(Fig.colormapNames) }, { key: 'showValues', label: 'Print means', type: 'checkbox' }, { key: 'showLetters', label: 'Print letters', type: 'checkbox' }, { key: 'digits', label: 'Decimals', type: 'number', min: 0, max: 4, step: 1 }]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, { margin: { left: 110, bottom: 90, right: 80 } });
    const cmap = Fig.colormaps[cfg.colormap];
    const vals = cells.map(c => c.mean), mn = S.min(vals), mx = S.max(vals), span = (mx - mn) || 1;
    const cw = (f.x1 - f.x0) / bLevels.length, ch = (f.y1 - f.y0) / aLevels.length;
    cells.forEach(c => {
      const ai = aLevels.indexOf(c.a), bi = bLevels.indexOf(c.b), col = cmap((c.mean - mn) / span);
      f.g.appendChild(Fig.el('rect', { x: f.x0 + bi * cw + +cfg.cellGap / 2, y: f.y0 + ai * ch + +cfg.cellGap / 2, width: cw - +cfg.cellGap, height: ch - +cfg.cellGap, fill: col, rx: 4 }));
      const tc = Fig.onColor(col);
      if (cfg.showValues) f.g.appendChild(Fig.text(f.x0 + bi * cw + cw / 2, f.y0 + ai * ch + ch / 2 + (cfg.showLetters ? -2 : 5), c.mean.toFixed(+cfg.digits), { size: 13, anchor: 'middle', fill: tc, font: f.font, role: 'label', weight: 'bold' }));
      if (cfg.showLetters && c.letters) f.g.appendChild(Fig.text(f.x0 + bi * cw + cw / 2, f.y0 + ai * ch + ch / 2 + 15, c.letters, { size: 11, anchor: 'middle', fill: tc, font: f.font, role: 'label' }));
    });
    aLevels.forEach((a, i) => f.g.appendChild(Fig.text(f.x0 - 8, f.y0 + i * ch + ch / 2 + 4, a, { size: 11, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' })));
    bLevels.forEach((b, i) => f.g.appendChild(Fig.text(f.x0 + i * cw + cw / 2, f.y1 + 18, b, { size: 11, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'tick' })));
    if (cfg.xlab) f.g.appendChild(Fig.text((f.x0 + f.x1) / 2, f.y1 + 44, cfg.xlab, { size: 13, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'axis' }));
    if (cfg.ylab) f.g.appendChild(Fig.text(22, (f.y0 + f.y1) / 2, cfg.ylab, { size: 13, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'axis', rotate: -90 }));
    const bx = f.x1 + 18, bh = f.y1 - f.y0;
    for (let k = 0; k < 40; k++) f.g.appendChild(Fig.el('rect', { x: bx, y: f.y0 + bh * (1 - (k + 1) / 40), width: 14, height: bh / 40 + 0.5, fill: cmap(k / 39) }));
    [0, 0.5, 1].forEach(t => f.g.appendChild(Fig.text(bx + 19, f.y0 + bh * (1 - t) + 4, (mn + t * span).toFixed(+cfg.digits), { size: 10, fill: f.t.muted, font: f.font, role: 'tick' })));
    return svg;
  },
});

/* ---------- pairwise differences with confidence intervals (Tukey-style) ---------- */
P6.diffCI = (pairs, o) => ({
  title: o.title, fileName: o.fileName || 'differences_ci', width: 820, height: Math.max(360, 120 + pairs.length * 28),
  defaults: Object.assign({ title: o.title, xlab: o.xlab || 'Difference between means', ylab: '', fill: '#2f7d4f', sigColor: '#b5432f', sortDiff: true, showValues: true }, o.defaults || {}),
  controls: TX6.concat([{ key: 'fill', label: 'Colour (not significant)', type: 'color' }, { key: 'sigColor', label: 'Colour (significant)', type: 'color' }, { key: 'sortDiff', label: 'Sort by difference', type: 'checkbox' }, { key: 'showValues', label: 'Print differences', type: 'checkbox' }]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, { margin: { left: 190, bottom: 60 } });
    const pr = cfg.sortDiff ? pairs.slice().sort((a, b) => b.diff - a.diff) : pairs;
    const lo = Math.min(0, ...pr.map(p => p.lo)), hi = Math.max(0, ...pr.map(p => p.hi));
    const xd = Fig.niceDomain(lo, hi, true);
    const xs = Fig.scaleLinear(xd[0], xd[1], f.x0, f.x1);
    const step = (f.y1 - f.y0) / pr.length;
    Fig.axisX(f, xs, cfg);
    f.g.appendChild(Fig.el('line', { x1: xs(0), x2: xs(0), y1: f.y0, y2: f.y1, stroke: f.t.fg, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }));
    pr.forEach((p, i) => {
      const y = f.y0 + step * (i + 0.5), col = p.sig ? cfg.sigColor : cfg.fill;
      f.g.appendChild(Fig.el('line', { x1: xs(p.lo), x2: xs(p.hi), y1: y, y2: y, stroke: col, 'stroke-width': 2.2 }));
      [p.lo, p.hi].forEach(v => f.g.appendChild(Fig.el('line', { x1: xs(v), x2: xs(v), y1: y - 5, y2: y + 5, stroke: col, 'stroke-width': 2 })));
      f.g.appendChild(Fig.el('circle', { cx: xs(p.diff), cy: y, r: 4.5 * Fig.fs('label'), fill: col }));
      f.g.appendChild(Fig.text(f.x0 - 10, y + 4, p.label, { size: 11, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' }));
      if (cfg.showValues) f.g.appendChild(Fig.text(xs(p.hi) + 8, y + 4, p.diff.toFixed(2) + (p.sig ? ' *' : ''), { size: 10, fill: f.t.muted, font: f.font, role: 'label' }));
    });
    f.g.appendChild(Fig.text(f.x1, f.y0 - 6, o.note || '', { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
    return svg;
  },
});

/* ---------- sums-of-squares partition ---------- */
P6.ssPartition = (rows, o) => ({
  title: o.title || 'Partition of the total sum of squares', fileName: o.fileName || 'ss_partition', width: 820, height: 300 + rows.length * 8,
  defaults: Object.assign({ title: o.title || 'Partition of the total sum of squares', xlab: '% of total SS', palette: 'agri', showPct: true }, o.defaults || {}),
  controls: TX6.concat([PAL6, { key: 'colors', label: 'Colour per source', type: 'colors', labels: rows.map(r => r.label) }, { key: 'showPct', label: 'Print percentages', type: 'checkbox' }]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, { margin: { left: 40, bottom: 60, top: 60 } });
    const total = rows.reduce((s, r) => s + r.ss, 0);
    const xs = Fig.scaleLinear(0, 100, f.x0, f.x1);
    Fig.axisX(f, xs, cfg, { fmt: v => v + ' %' });
    let x = 0; const barY = f.y0 + 20, barH = 56;
    rows.forEach((r, i) => {
      const pct = r.ss / total * 100, col = (cfg.colors && cfg.colors[i]) || Fig.color(cfg.palette, i);
      f.g.appendChild(Fig.el('rect', { x: xs(x), y: barY, width: Math.max(0, xs(x + pct) - xs(x)), height: barH, fill: col, stroke: f.t.bg, 'stroke-width': 1 }));
      if (cfg.showPct && pct > 4) f.g.appendChild(Fig.text(xs(x + pct / 2), barY + barH / 2 + 4, pct.toFixed(1) + ' %', { size: 11, anchor: 'middle', fill: Fig.onColor(col), font: f.font, role: 'label', weight: 'bold' }));
      x += pct;
    });
    /* legend rows below the bar */
    rows.forEach((r, i) => {
      const col = (cfg.colors && cfg.colors[i]) || Fig.color(cfg.palette, i), y = barY + barH + 30 + i * 20 * Fig.fs('legend');
      f.g.appendChild(Fig.el('rect', { x: f.x0, y: y - 10, width: 12, height: 12, fill: col, rx: 2 }));
      f.g.appendChild(Fig.text(f.x0 + 18, y, `${r.label}: SS = ${r.ss.toFixed(3)} (${(r.ss / total * 100).toFixed(1)} %), df = ${r.df}${r.p != null && isFinite(r.p) ? ', ' + fmtPLabel(r.p) : ''}`, { size: 11, fill: f.t.fg, font: f.font, role: 'legend' }));
    });
    return svg;
  },
});

/* ---------- field map: rows × columns coloured by a value, labelled by treatment ---------- */
P6.fieldMap = (rows, cols, plots, o) => ({
  title: o.title, fileName: o.fileName || 'field_map', width: 820, height: 560,
  defaults: Object.assign({ title: o.title, xlab: o.xlab || 'Column', ylab: o.ylab || 'Row', colormap: 'ylgn', showLabels: true, showValues: true, cellGap: 4, digits: 2 }, o.defaults || {}),
  controls: TX6.concat([{ key: 'colormap', label: 'Colour map', type: 'select', options: Object.entries(Fig.colormapNames) }, { key: 'showLabels', label: 'Treatment labels', type: 'checkbox' }, { key: 'showValues', label: 'Print values', type: 'checkbox' }, { key: 'digits', label: 'Decimals', type: 'number', min: 0, max: 4, step: 1 }]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, { margin: { left: 80, bottom: 70, right: 80 } });
    const cmap = Fig.colormaps[cfg.colormap];
    const vals = plots.map(p => p.value).filter(v => isFinite(v)), mn = S.min(vals), mx = S.max(vals), span = (mx - mn) || 1;
    const cw = (f.x1 - f.x0) / cols.length, ch = (f.y1 - f.y0) / rows.length;
    plots.forEach(p => {
      const ri = rows.indexOf(p.row), ci = cols.indexOf(p.col); if (ri < 0 || ci < 0) return;
      const col = isFinite(p.value) ? cmap((p.value - mn) / span) : f.t.grid;
      f.g.appendChild(Fig.el('rect', { x: f.x0 + ci * cw + +cfg.cellGap / 2, y: f.y0 + ri * ch + +cfg.cellGap / 2, width: cw - +cfg.cellGap, height: ch - +cfg.cellGap, fill: col, rx: 4 }));
      const tc = Fig.onColor(col);
      if (cfg.showLabels) f.g.appendChild(Fig.text(f.x0 + ci * cw + cw / 2, f.y0 + ri * ch + ch / 2 - (cfg.showValues ? 3 : -4), p.label, { size: 12, anchor: 'middle', fill: tc, font: f.font, role: 'label', weight: 'bold' }));
      if (cfg.showValues && isFinite(p.value)) f.g.appendChild(Fig.text(f.x0 + ci * cw + cw / 2, f.y0 + ri * ch + ch / 2 + 13, p.value.toFixed(+cfg.digits), { size: 10, anchor: 'middle', fill: tc, font: f.font, role: 'label' }));
    });
    rows.forEach((r, i) => f.g.appendChild(Fig.text(f.x0 - 8, f.y0 + i * ch + ch / 2 + 4, String(r), { size: 11, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' })));
    cols.forEach((c, i) => f.g.appendChild(Fig.text(f.x0 + i * cw + cw / 2, f.y1 + 18, String(c), { size: 11, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'tick' })));
    if (cfg.xlab) f.g.appendChild(Fig.text((f.x0 + f.x1) / 2, f.y1 + 44, cfg.xlab, { size: 13, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'axis' }));
    if (cfg.ylab) f.g.appendChild(Fig.text(22, (f.y0 + f.y1) / 2, cfg.ylab, { size: 13, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'axis', rotate: -90 }));
    const bx = f.x1 + 18, bh = f.y1 - f.y0;
    for (let k = 0; k < 40; k++) f.g.appendChild(Fig.el('rect', { x: bx, y: f.y0 + bh * (1 - (k + 1) / 40), width: 14, height: bh / 40 + 0.5, fill: cmap(k / 39) }));
    [0, 0.5, 1].forEach(t => f.g.appendChild(Fig.text(bx + 19, f.y0 + bh * (1 - t) + 4, (mn + t * span).toFixed(+cfg.digits), { size: 10, fill: f.t.muted, font: f.font, role: 'tick' })));
    return svg;
  },
});

/* ---------- multi-panel composer: specs rendered as nested <svg> with (a), (b)… labels ---------- */
P6.panel = (specs, o) => ({
  title: o.title || 'Multi-panel figure', fileName: o.fileName || 'panel', width: o.width || 1400, height: o.height || 900,
  defaults: Object.assign({ cols: Math.min(2, specs.length), labelStyle: 'paren', labelSize: 18, gap: 16, panelTitles: true }, o.defaults || {}),
  controls: [
    { key: 'cols', label: 'Columns', type: 'number', min: 1, max: 4, step: 1 },
    { key: 'labelStyle', label: 'Panel labels', type: 'select', options: [['paren', '(a) (b) (c)'], ['upper', 'A B C'], ['lower', 'a b c'], ['none', 'none']] },
    { key: 'labelSize', label: 'Label size', type: 'range', min: 10, max: 30, step: 1 },
    { key: 'gap', label: 'Gap between panels', type: 'range', min: 0, max: 60, step: 2 },
    { key: 'panelTitles', label: 'Keep panel titles', type: 'checkbox' },
  ],
  render(cfg) {
    const cols = Math.max(1, Math.min(4, +cfg.cols || 1)), rows = Math.ceil(specs.length / cols), gap = +cfg.gap;
    const W = cfg.width, H = cfg.height;
    const pw = (W - gap * (cols + 1)) / cols, ph = (H - gap * (rows + 1)) / rows;
    const svg = Fig.svg(W, H, cfg.theme);
    specs.forEach((sp, i) => {
      const c = Object.assign({}, sp.api.cfg, { theme: cfg.theme, font: cfg.font, fontScale: cfg.fontScale, fsTitle: cfg.fsTitle, fsAxis: cfg.fsAxis, fsLabel: cfg.fsLabel, axisBold: cfg.axisBold, grid: cfg.grid, gridDash: cfg.gridDash });
      if (!cfg.panelTitles) { c.title = ''; c.subtitle = ''; }
      const inner = sp.spec.render(c);
      const iw = +inner.dataset.w, ih = +inner.dataset.h;
      const x = gap + (i % cols) * (pw + gap), y = gap + Math.floor(i / cols) * (ph + gap);
      inner.setAttribute('x', x); inner.setAttribute('y', y); inner.setAttribute('width', pw); inner.setAttribute('height', ph);
      inner.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      inner.setAttribute('viewBox', `0 0 ${iw} ${ih}`);
      svg.appendChild(inner);
      if (cfg.labelStyle !== 'none') {
        const L = String.fromCharCode(97 + i);
        const lab = cfg.labelStyle === 'paren' ? `(${L})` : cfg.labelStyle === 'upper' ? L.toUpperCase() : L;
        svg.appendChild(Fig.text(x + 6, y + +cfg.labelSize + 2, lab, { size: +cfg.labelSize, weight: 'bold', fill: (Fig.themes[cfg.theme] || Fig.themes.light).fg, font: Fig.fonts[cfg.font] || Fig.fonts.sans, role: 'title' }));
      }
    });
    return svg;
  },
});

window.P6 = P6;
