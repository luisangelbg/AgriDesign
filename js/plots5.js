/* AgriDesign — Block 5 figures: treatment means with letters, dose–response trend. */

const P5 = {};
const TXT5 = () => [{ key: 'title', label: T('Title', 'Título'), type: 'text' }, { key: 'subtitle', label: T('Subtitle', 'Subtítulo'), type: 'text' }, { key: 'xlab', label: T('X axis label', 'Título del eje X'), type: 'text' }, { key: 'ylab', label: T('Y axis label', 'Título del eje Y'), type: 'text' }];

/* items: [{label, mean, se, letters, group?}] */
P5.meansLetters = (items, o) => ({
  title: o.title, fileName: o.fileName || 'means_letters', width: 860, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', style: 'bars', errorType: 'se', showLetters: true, showValues: false, barWidth: 0.65, letterSize: 13, sortMeans: false, includeZero: true, valueDigits: 2, monochrome: false, fill: '#2f7d4f' }, o.defaults || {}),
  controls: TXT5().concat([
    { key: 'style', label: T('Style', 'Estilo'), type: 'select', options: [['bars', 'Bars'], ['points', 'Points'], ['lollipop', 'Lollipop']] },
    { key: 'errorType', label: T('Error bars', 'Barras de error'), type: 'select', options: [['se', T('Standard error of the mean', 'Error estándar de la media')], ['ci', T('95 % confidence interval', 'Intervalo de confianza del 95 %')], ['none', T('None', 'Ninguna')]] },
    { key: 'palette', label: T('Palette', 'Paleta'), type: 'select', options: Object.entries(Fig.paletteNames) },
    { key: 'monochrome', label: T('Single colour', 'Un solo color'), type: 'checkbox' }, { key: 'fill', label: T('Colour (single)', 'Color (uno solo)'), type: 'color' },
    { key: 'colors', label: T('Colour per level', 'Color por nivel'), type: 'colors', labels: items.map(i => i.label) },
    { key: 'showLetters', label: T('Show letters', 'Mostrar las letras'), type: 'checkbox' }, { key: 'showValues', label: T('Print means', 'Escribir las medias'), type: 'checkbox' },
    { key: 'sortMeans', label: T('Sort by mean (descending)', 'Ordenar por media (de mayor a menor)'), type: 'checkbox' }, { key: 'includeZero', label: T('Y axis from zero', 'Eje Y desde cero'), type: 'checkbox' },
    { key: 'barWidth', label: T('Bar width', 'Ancho de las barras'), type: 'range', min: 0.2, max: 0.95, step: 0.05 },
    { key: 'letterSize', label: T('Letter size', 'Tamaño de las letras'), type: 'range', min: 8, max: 24, step: 1 },
    { key: 'valueDigits', label: T('Decimals', 'Decimales'), type: 'number', min: 0, max: 5, step: 1 },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const it = cfg.sortMeans ? items.slice().sort((a, b) => b.mean - a.mean) : items;
    const err = i => cfg.errorType === 'none' ? 0 : cfg.errorType === 'ci' ? (i.ci || i.se * (i.tq || 1.96)) : i.se;
    let lo = Math.min(...it.map(i => i.mean - err(i))), hi = Math.max(...it.map(i => i.mean + err(i)));
    hi += (hi - lo) * 0.12;
    const yd = Fig.niceDomain(lo, hi, cfg.includeZero || cfg.style === 'bars');
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(it.map(i => i.label), f.x0, f.x1, 1 - +cfg.barWidth);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, it.map(i => i.label), cfg);
    const base = ys(Math.max(yd[0], 0));
    it.forEach((i, k) => {
      const idx = items.indexOf(i);
      const col = cfg.monochrome ? cfg.fill : ((cfg.colors && cfg.colors[idx]) || Fig.color(cfg.palette, i.group != null ? i.group : idx));
      const cx = band.center(k), e = err(i);
      if (cfg.style === 'bars') f.g.appendChild(Fig.el('rect', { x: band(k), y: Math.min(ys(i.mean), base), width: band.bandwidth, height: Math.abs(base - ys(i.mean)), fill: col, stroke: Fig.darken(col, 0.2), 'stroke-width': 0.8, rx: 2 }));
      else if (cfg.style === 'lollipop') f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: base, y2: ys(i.mean), stroke: col, 'stroke-width': 3 }));
      if (e > 0) {
        const cw = band.bandwidth * 0.25;
        f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(i.mean - e), y2: ys(i.mean + e), stroke: f.t.fg, 'stroke-width': 1.5 }));
        f.g.appendChild(Fig.el('line', { x1: cx - cw, x2: cx + cw, y1: ys(i.mean + e), y2: ys(i.mean + e), stroke: f.t.fg, 'stroke-width': 1.5 }));
        f.g.appendChild(Fig.el('line', { x1: cx - cw, x2: cx + cw, y1: ys(i.mean - e), y2: ys(i.mean - e), stroke: f.t.fg, 'stroke-width': 1.5 }));
      }
      if (cfg.style !== 'bars') f.g.appendChild(Fig.marker(cx, ys(i.mean), 5.5 * Fig.fs('label'), 'circle', { fill: col, stroke: f.t.bg, 'stroke-width': 1.2 }));
      let ty = ys(i.mean + e) - 8 * Fig.fs('label');
      if (cfg.showValues) { f.g.appendChild(Fig.text(cx, ty, i.mean.toFixed(+cfg.valueDigits), { size: 10.5, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg })); ty -= 13 * Fig.fs('label'); }
      if (cfg.showLetters && i.letters) f.g.appendChild(Fig.text(cx, ty, i.letters, { size: +cfg.letterSize, weight: 'bold', anchor: 'middle', fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
    });
    const lab = { se: T('Mean ± SE', 'Media ± EE'), ci: T('Mean ± 95 % CI', 'Media ± IC 95 %'), none: T('Mean', 'Media') }[cfg.errorType];
    f.g.appendChild(Fig.text(f.x1, f.y0 - 6, lab + (o.testName ? T(' · letters: ', ' · letras: ') + o.testName : ''), { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
    return svg;
  },
});

/* grouped bars for A × B cell means with letters: cells [{a, b, mean, se, letters}] */
P5.groupedMeans = (cells, aLevels, bLevels, o) => ({
  title: o.title, fileName: o.fileName || 'interaction_means', width: 900, height: 540,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, palette: 'agri', errorType: 'se', showLetters: true, legendPos: 'right', includeZero: true, letterSize: 12 }, o.defaults || {}),
  controls: TXT5().concat([
    { key: 'palette', label: T('Palette', 'Paleta'), type: 'select', options: Object.entries(Fig.paletteNames) },
    { key: 'colors', label: T('Colour per ', 'Color por') + o.bName, type: 'colors', labels: bLevels },
    { key: 'errorType', label: T('Error bars', 'Barras de error'), type: 'select', options: [['se', T('Standard error', 'Error estándar')], ['none', T('None', 'Ninguna')]] },
    { key: 'legendPos', label: T('Legend', 'Leyenda'), type: 'select', options: [['right', 'Top right'], ['left', 'Top left'], ['bottom', 'Below'], ['none', 'Hidden']] },
    { key: 'showLetters', label: T('Show letters', 'Mostrar las letras'), type: 'checkbox' }, { key: 'includeZero', label: T('Y axis from zero', 'Eje Y desde cero'), type: 'checkbox' },
    { key: 'letterSize', label: T('Letter size', 'Tamaño de las letras'), type: 'range', min: 8, max: 22, step: 1 },
  ]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const err = c => cfg.errorType === 'none' ? 0 : c.se;
    let lo = Math.min(...cells.map(c => c.mean - err(c))), hi = Math.max(...cells.map(c => c.mean + err(c))); hi += (hi - lo) * 0.14;
    const yd = Fig.niceDomain(lo, hi, cfg.includeZero);
    const ys = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    const band = Fig.scaleBand(aLevels, f.x0, f.x1, 0.25);
    const inner = Fig.scaleBand(bLevels, 0, band.bandwidth, 0.1);
    Fig.axisY(f, ys, cfg); Fig.axisXBand(f, band, aLevels, cfg);
    const base = ys(Math.max(yd[0], 0));
    cells.forEach(c => {
      const ai = aLevels.indexOf(c.a), bi = bLevels.indexOf(c.b);
      const col = (cfg.colors && cfg.colors[bi]) || Fig.color(cfg.palette, bi);
      const x = band(ai) + inner(bi), w = inner.bandwidth, cx = x + w / 2, e = err(c);
      f.g.appendChild(Fig.el('rect', { x, y: Math.min(ys(c.mean), base), width: w, height: Math.abs(base - ys(c.mean)), fill: col, stroke: Fig.darken(col, 0.2), 'stroke-width': 0.6, rx: 1.5 }));
      if (e > 0) { f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ys(c.mean - e), y2: ys(c.mean + e), stroke: f.t.fg, 'stroke-width': 1.2 })); f.g.appendChild(Fig.el('line', { x1: cx - w * 0.2, x2: cx + w * 0.2, y1: ys(c.mean + e), y2: ys(c.mean + e), stroke: f.t.fg, 'stroke-width': 1.2 })); }
      if (cfg.showLetters && c.letters) f.g.appendChild(Fig.text(cx, ys(c.mean + e) - 6 * Fig.fs('label'), c.letters, { size: +cfg.letterSize, weight: 'bold', anchor: 'middle', fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
    });
    Fig.legend(f, bLevels.map((b, i) => ({ label: o.bName + ' ' + b, color: (cfg.colors && cfg.colors[i]) || Fig.color(cfg.palette, i) })), cfg);
    return svg;
  },
});

/* dose–response: points = means ± SE at numeric x; curve = fitted polynomial */
P5.trend = (x, means, fitFn, o) => ({
  title: o.title, fileName: o.fileName || 'trend', width: 800, height: 520,
  defaults: Object.assign({ title: o.title, xlab: o.xlab, ylab: o.ylab, fill: '#2f7d4f', lineColor: '#c8842a', showEq: true, pointSize: 5, showOptimum: true }, o.defaults || {}),
  controls: TXT5().concat([{ key: 'fill', label: T('Point colour', 'Color de los puntos'), type: 'color' }, { key: 'lineColor', label: T('Curve colour', 'Color de la curva'), type: 'color' }, { key: 'pointSize', label: T('Point size', 'Tamaño de los puntos'), type: 'range', min: 2, max: 10, step: 0.25 }, { key: 'showEq', label: T('Print equation', 'Escribir la ecuación'), type: 'checkbox' }, { key: 'showOptimum', label: T('Mark the optimum (quadratic)', 'Marcar el óptimo (cuadrática)'), type: 'checkbox' }]),
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const xd = Fig.niceDomain(S.min(x), S.max(x), false);
    const ys0 = means.map(m => m.mean - m.se), ys1 = means.map(m => m.mean + m.se);
    const grid = Array.from({ length: 100 }, (_, i) => xd[0] + (xd[1] - xd[0]) * i / 99);
    const curve = fitFn ? grid.map(fitFn) : [];
    const yd = Fig.niceDomain(Math.min(S.min(ys0), ...(curve.length ? [S.min(curve)] : [])), Math.max(S.max(ys1), ...(curve.length ? [S.max(curve)] : [])), false);
    const xs = Fig.scaleLinear(xd[0], xd[1], f.x0, f.x1), ysc = Fig.scaleLinear(yd[0], yd[1], f.y1, f.y0);
    Fig.axisY(f, ysc, cfg); Fig.axisX(f, xs, cfg, { ticks: x.length <= 8 ? x : null });
    if (fitFn) f.g.appendChild(Fig.el('path', { d: grid.map((g, i) => (i ? 'L' : 'M') + xs(g).toFixed(1) + ' ' + ysc(curve[i]).toFixed(1)).join(' '), fill: 'none', stroke: cfg.lineColor, 'stroke-width': 2.6 }));
    means.forEach((m, i) => {
      const cx = xs(x[i]);
      f.g.appendChild(Fig.el('line', { x1: cx, x2: cx, y1: ysc(m.mean - m.se), y2: ysc(m.mean + m.se), stroke: f.t.fg, 'stroke-width': 1.4 }));
      f.g.appendChild(Fig.marker(cx, ysc(m.mean), +cfg.pointSize * Fig.fs('label'), 'circle', { fill: cfg.fill, stroke: f.t.bg, 'stroke-width': 1.2 }));
      if (m.letters) f.g.appendChild(Fig.text(cx + 9, ysc(m.mean) - 8, m.letters, { size: 12, weight: 'bold', fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
    });
    if (cfg.showOptimum && o.optimum && o.optimum.x >= xd[0] && o.optimum.x <= xd[1]) {
      f.g.appendChild(Fig.el('line', { x1: xs(o.optimum.x), x2: xs(o.optimum.x), y1: ysc(o.optimum.y), y2: f.y1, stroke: f.t.muted, 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
      f.g.appendChild(Fig.text(xs(o.optimum.x), f.y1 - 6, T(`${o.optimum.kind} at x = ${o.optimum.x.toFixed(1)}`, `respuesta ${o.optimum.kind} en x = ${o.optimum.x.toFixed(1)}`), { size: 10, anchor: 'middle', fill: f.t.muted, font: f.font, role: 'label', halo: f.t.bg }));
    }
    if (cfg.showEq && o.equation) f.g.appendChild(Fig.text(f.x0 + 8, f.y0 + 16 * Fig.fs('label'), o.equation, { size: 11, fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
    return svg;
  },
});

window.P5 = P5;
