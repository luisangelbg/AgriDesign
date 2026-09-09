/* AgriDesign — Block 8 figures: field layout map and power curves. */

const P8 = {};

/* L = GEN layout {plots, boxes, nRows, nCols}; o.trts = treatment list for colours */
P8.layout = (L, o) => {
  const trts = o.trts;
  const cellW = Math.max(60, Math.min(110, 900 / L.nCols)), cellH = Math.max(40, Math.min(70, cellW * (o.plotL && o.plotW ? Math.min(2.2, o.plotL / o.plotW) : 0.6)));
  const W = Math.max(600, 80 + L.nCols * cellW + 200), H = 90 + L.nRows * cellH + 60;
  return {
    title: o.title || 'Field layout', fileName: o.fileName || 'field_layout', width: W, height: H,
    defaults: Object.assign({ title: o.title || 'Field layout', palette: 'agri', showNumbers: true, showLabels: true, labelMode: 'label', showBlocks: true, showMain: true, showLegend: true, showDims: true, north: true, cellGap: 3 }, o.defaults || {}),
    controls: [
      { key: 'title', label: 'Title', type: 'text' }, { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'palette', label: 'Palette', type: 'select', options: Object.entries(Fig.paletteNames) },
      { key: 'colors', label: 'Colour per treatment', type: 'colors', labels: trts },
      { key: 'labelMode', label: 'Plot text', type: 'select', options: [['label', 'Treatment'], ['full', 'Full treatment name'], ['none', 'None']] },
      { key: 'showNumbers', label: 'Plot numbers', type: 'checkbox' }, { key: 'showBlocks', label: 'Block outlines', type: 'checkbox' }, { key: 'showMain', label: 'Main-plot / sub-block outlines', type: 'checkbox' },
      { key: 'showLegend', label: 'Legend', type: 'checkbox' }, { key: 'showDims', label: 'Plot dimensions', type: 'checkbox' }, { key: 'north', label: 'North arrow', type: 'checkbox' },
      { key: 'cellGap', label: 'Gap between plots', type: 'range', min: 0, max: 12, step: 1 },
    ],
    render(cfg) {
      const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
      const t = Fig.themes[cfg.theme] || Fig.themes.light, font = Fig.fonts[cfg.font] || Fig.fonts.sans;
      const g = Fig.g({ 'font-family': font }); svg.appendChild(g);
      const x0 = 60, y0 = cfg.title ? 60 : 30;
      if (cfg.title) g.appendChild(Fig.text(cfg.width / 2, 28, cfg.title, { size: 17, weight: 'bold', anchor: 'middle', fill: t.fg, font, role: 'title' }));
      if (cfg.subtitle) g.appendChild(Fig.text(cfg.width / 2, 46, cfg.subtitle, { size: 12, anchor: 'middle', fill: t.muted, font, role: 'subtitle' }));
      const cx = c => x0 + c * cellW, cy = r => y0 + r * cellH, gap = +cfg.cellGap;
      const col = tr => (cfg.colors && cfg.colors[trts.indexOf(tr)]) || Fig.color(cfg.palette, trts.indexOf(tr));
      L.plots.forEach(p => {
        const c = col(p.trt), x = cx(p.col) + gap / 2, y = cy(p.row) + gap / 2, w = cellW - gap, h = cellH - gap;
        g.appendChild(Fig.el('rect', { x, y, width: w, height: h, fill: p.check === false ? Fig.alpha(c, 0.45) : c, stroke: Fig.darken(c, 0.25), 'stroke-width': 1, rx: 3 }));
        const fg = Fig.onColor(c);
        if (cfg.showNumbers) g.appendChild(Fig.text(x + 4, y + 11 * Fig.fs('label'), String(p.plot), { size: 9, fill: fg, font, role: 'label', opacity: 0.85 }));
        if (cfg.labelMode !== 'none') { const txt = cfg.labelMode === 'full' ? p.trt : p.label; const size = Math.min(12, Math.max(7, (w - 6) / (String(txt).length * 0.62))); g.appendChild(Fig.text(x + w / 2, y + h / 2 + 4, String(txt), { size, weight: 'bold', anchor: 'middle', fill: fg, font, role: 'label' })); }
      });
      if (cfg.showMain) L.boxes.filter(b => b.kind !== 'block').forEach(b => { g.appendChild(Fig.el('rect', { x: cx(b.c0) + 1, y: cy(b.r0) + 1, width: (b.c1 - b.c0 + 1) * cellW - 2, height: (b.r1 - b.r0 + 1) * cellH - 2, fill: 'none', stroke: t.fg, 'stroke-width': b.kind === 'main' ? 2 : 1.2, 'stroke-dasharray': b.kind === 'main' ? null : '4 3', rx: 4 })); if (b.kind === 'main') g.appendChild(Fig.text(cx(b.c0) + 4, cy(b.r0) - 3, b.name, { size: 10, fill: t.fg, font, role: 'label', weight: 'bold', halo: t.bg })); });
      if (cfg.showBlocks) L.boxes.filter(b => b.kind === 'block').forEach(b => { g.appendChild(Fig.el('rect', { x: cx(b.c0) - 3, y: cy(b.r0) - 3, width: (b.c1 - b.c0 + 1) * cellW + 6, height: (b.r1 - b.r0 + 1) * cellH + 6, fill: 'none', stroke: t.fg, 'stroke-width': 2.2, rx: 6 })); g.appendChild(Fig.text(cx(b.c0) - 8, cy(b.r0) + ((b.r1 - b.r0 + 1) * cellH) / 2 + 4, b.name, { size: 11, anchor: 'end', fill: t.fg, font, role: 'axis', weight: 'bold', rotate: -90 })); });
      /* column / row indices */
      for (let c = 0; c < L.nCols; c++) g.appendChild(Fig.text(cx(c) + cellW / 2, cy(L.nRows) + 16, String(c + 1), { size: 10, anchor: 'middle', fill: t.muted, font, role: 'tick' }));
      if (cfg.showDims && o.plotW && o.plotL) g.appendChild(Fig.text(x0, cy(L.nRows) + 36, `Plot ${o.plotW} m wide × ${o.plotL} m long · field ≈ ${(L.nCols * o.plotW).toFixed(1)} × ${(L.nRows * o.plotL).toFixed(1)} m (without alleys)`, { size: 11, fill: t.muted, font, role: 'label' }));
      if (cfg.north) { const nx = cfg.width - 30, ny = y0 + 10; g.appendChild(Fig.el('path', { d: `M${nx} ${ny + 26} L${nx - 7} ${ny + 26} L${nx} ${ny} L${nx + 7} ${ny + 26} Z`, fill: t.fg })); g.appendChild(Fig.text(nx, ny + 40, 'N', { size: 11, anchor: 'middle', fill: t.fg, font, role: 'label', weight: 'bold' })); }
      if (cfg.showLegend) {
        const lx = x0 + L.nCols * cellW + 20; let ly = y0 + 8;
        trts.forEach(tr => { g.appendChild(Fig.el('rect', { x: lx, y: ly - 9, width: 12, height: 12, fill: col(tr), rx: 2 })); g.appendChild(Fig.text(lx + 17, ly + 1, tr, { size: 10.5, fill: t.fg, font, role: 'legend' })); ly += 16 * Fig.fs('legend'); if (ly > cfg.height - 20) return; });
      }
      return svg;
    },
  };
};

/* power vs replicates for several detectable differences */
P8.power = (o, mk) => ({
  title: 'Power of the comparison between two treatment means', fileName: 'power_curves', width: 820, height: 500,
  defaults: { title: 'Power vs number of replicates', xlab: 'Replicates (r)', ylab: 'Power (1 − β)', palette: 'agri', target: o.power },
  controls: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'xlab', label: 'X axis label', type: 'text' }, { key: 'ylab', label: 'Y axis label', type: 'text' }, { key: 'palette', label: 'Palette', type: 'select', options: Object.entries(Fig.paletteNames) }],
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const rs = Array.from({ length: 29 }, (_, i) => i + 2);
    const ds = mk.ds;
    const xs = Fig.scaleLinear(2, 30, f.x0, f.x1), ys = Fig.scaleLinear(0, 1, f.y1, f.y0);
    Fig.axisY(f, ys, cfg, { count: 5 }); Fig.axisX(f, xs, cfg, { count: 7 });
    f.g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: ys(o.power), y2: ys(o.power), stroke: f.t.muted, 'stroke-width': 1, 'stroke-dasharray': '5 4' }));
    f.g.appendChild(Fig.text(f.x1 - 4, ys(o.power) - 5, `target power ${o.power}`, { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
    ds.forEach((d, i) => {
      const col = Fig.color(cfg.palette, i);
      const pts = rs.map(r => [xs(r), ys(GEN.powerFor(r, Object.assign({}, o, { d })).power)]);
      f.g.appendChild(Fig.el('path', { d: pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '), fill: 'none', stroke: col, 'stroke-width': d === o.d ? 3.2 : 1.8 }));
    });
    Fig.legend(f, ds.map((d, i) => ({ label: `difference ${d} % of the mean${d === o.d ? ' (chosen)' : ''}`, color: Fig.color(cfg.palette, i), shape: 'line' })), Object.assign({}, cfg, { legendPos: 'right' }));
    f.g.appendChild(Fig.text(f.x0 + 8, f.y0 + 14, `CV = ${o.cv} %, α = ${o.alpha}, ${o.t} treatments, ${o.design.toUpperCase()}`, { size: 10.5, fill: f.t.muted, font: f.font, role: 'label' }));
    return svg;
  },
});
/* detectable difference vs r (Petersen-style curves for several CVs) */
P8.detectable = (o, mk) => ({
  title: 'Detectable difference vs number of replicates', fileName: 'detectable_difference', width: 820, height: 500,
  defaults: { title: 'Smallest detectable difference (% of the mean)', xlab: 'Replicates (r)', ylab: 'Detectable difference (% of mean)', palette: 'agri' },
  controls: [{ key: 'title', label: 'Title', type: 'text' }, { key: 'xlab', label: 'X axis label', type: 'text' }, { key: 'ylab', label: 'Y axis label', type: 'text' }, { key: 'palette', label: 'Palette', type: 'select', options: Object.entries(Fig.paletteNames) }],
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const rs = Array.from({ length: 29 }, (_, i) => i + 2);
    const cvs = mk.cvs;
    const allY = cvs.flatMap(cv => rs.map(r => GEN.detectable(r, Object.assign({}, o, { cv }))));
    const xs = Fig.scaleLinear(2, 30, f.x0, f.x1), ys = Fig.scaleLinear(0, Math.ceil(S.max(allY.filter(isFinite)) / 10) * 10, f.y1, f.y0);
    Fig.axisY(f, ys, cfg); Fig.axisX(f, xs, cfg, { count: 7 });
    cvs.forEach((cv, i) => {
      const col = Fig.color(cfg.palette, i);
      const pts = rs.map(r => [xs(r), ys(GEN.detectable(r, Object.assign({}, o, { cv })))]);
      f.g.appendChild(Fig.el('path', { d: pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '), fill: 'none', stroke: col, 'stroke-width': cv === o.cv ? 3.2 : 1.8 }));
    });
    f.g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: ys(o.d), y2: ys(o.d), stroke: f.t.muted, 'stroke-width': 1, 'stroke-dasharray': '5 4' }));
    f.g.appendChild(Fig.text(f.x1 - 4, ys(o.d) - 5, `difference of interest ${o.d} %`, { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
    Fig.legend(f, cvs.map((cv, i) => ({ label: `CV ${cv} %${cv === o.cv ? ' (chosen)' : ''}`, color: Fig.color(cfg.palette, i), shape: 'line' })), Object.assign({}, cfg, { legendPos: 'right' }));
    f.g.appendChild(Fig.text(f.x0 + 8, f.y0 + 14, `α = ${o.alpha}, power = ${o.power}, ${o.t} treatments, ${o.design.toUpperCase()}`, { size: 10.5, fill: f.t.muted, font: f.font, role: 'label' }));
    return svg;
  },
});

window.P8 = P8;
