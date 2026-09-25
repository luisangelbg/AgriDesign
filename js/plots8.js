/* AgriDesign — Block 8 figures: field layout map and power curves. */

const P8 = {};

/* L = GEN layout {plots, boxes, nRows, nCols}; o.trts = treatment list for colours */
P8.layout = (L, o) => {
  const trts = o.trts;
  const cellW = Math.max(60, Math.min(110, 900 / L.nCols)), cellH = Math.max(40, Math.min(70, cellW * (o.plotL && o.plotW ? Math.min(2.2, o.plotL / o.plotW) : 0.6)));
  const W = Math.max(600, 80 + L.nCols * cellW + 200), H = 90 + L.nRows * cellH + 60;
  return {
    title: o.title || T('Field layout', 'Croquis del terreno'), fileName: o.fileName || 'field_layout', width: W, height: H,
    defaults: Object.assign({ title: o.title || T('Field layout', 'Croquis del terreno'), palette: 'agri', showNumbers: true, showLabels: true, labelMode: 'label', showBlocks: true, showMain: true, showLegend: true, showDims: true, north: true, cellGap: 3 }, o.defaults || {}),
    controls: [
      { key: 'title', label: T('Title', 'Título'), type: 'text' }, { key: 'subtitle', label: T('Subtitle', 'Subtítulo'), type: 'text' },
      { key: 'palette', label: T('Palette', 'Paleta'), type: 'select', options: Object.entries(Fig.paletteNames) },
      { key: 'colors', label: T('Colour per treatment', 'Color por tratamiento'), type: 'colors', labels: trts },
      { key: 'labelMode', label: T('Plot text', 'Texto de la parcela'), type: 'select', options: [['label', 'Treatment'], ['full', 'Full treatment name'], ['none', 'None']] },
      { key: 'showNumbers', label: T('Plot numbers', 'Número de parcela'), type: 'checkbox' }, { key: 'showBlocks', label: T('Block outlines', 'Contornos de los bloques'), type: 'checkbox' }, { key: 'showMain', label: T('Main-plot / sub-block outlines', 'Contornos de parcela grande y subbloque'), type: 'checkbox' },
      { key: 'showLegend', label: T('Legend', 'Leyenda'), type: 'checkbox' }, { key: 'showDims', label: T('Plot dimensions', 'Medidas de la parcela'), type: 'checkbox' }, { key: 'north', label: T('North arrow', 'Flecha del norte'), type: 'checkbox' },
      { key: 'cellGap', label: T('Gap between plots', 'Separación entre parcelas'), type: 'range', min: 0, max: 12, step: 1 },
    ],
    render(cfg) {
      const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
      const t = Fig.themes[cfg.theme] || Fig.themes.light, font = Fig.fonts[cfg.font] || Fig.fonts.sans;
      const g = Fig.g({ 'font-family': font }); svg.appendChild(g);
      const x0 = 60, y0 = cfg.title ? 60 : 30;
      if (cfg.title) g.appendChild(Fig.text(cfg.width / 2, 28, cfg.title, { size: 17, weight: 'bold', anchor: 'middle', fill: t.fg, font, role: 'title' }));
      if (cfg.subtitle) g.appendChild(Fig.text(cfg.width / 2, 46, cfg.subtitle, { size: 12, anchor: 'middle', fill: t.muted, font, role: 'subtitle' }));
      const cx = c => x0 + c * cellW, cy = r => y0 + r * cellH, gap = +cfg.cellGap;
      /* augmented designs: the checks get the palette colours and all unreplicated entries share one neutral
         colour (with many entries the palette repeats and an entry would look like a check) */
      const isEntry = new Set(L.plots.filter(p => p.check === false).map(p => p.trt));
      const ENTRY = '#dfe3e8';
      const checkList = trts.filter(tr => !isEntry.has(tr));
      const col = tr => (cfg.colors && cfg.colors[trts.indexOf(tr)]) || (isEntry.has(tr) ? ENTRY : Fig.color(cfg.palette, checkList.indexOf(tr)));
      L.plots.forEach(p => {
        const c = col(p.trt), x = cx(p.col) + gap / 2, y = cy(p.row) + gap / 2, w = cellW - gap, h = cellH - gap;
        g.appendChild(Fig.el('rect', { x, y, width: w, height: h, fill: c, stroke: Fig.darken(c, 0.25), 'stroke-width': 1, rx: 3 }));
        const fg = Fig.onColor(c);
        if (cfg.showNumbers) g.appendChild(Fig.text(x + 4, y + 11 * Fig.fs('label'), String(p.plot), { size: 9, fill: fg, font, role: 'label', opacity: 0.85 }));
        if (cfg.labelMode !== 'none') { const txt = cfg.labelMode === 'full' ? p.trt : p.label; const size = Math.min(12, Math.max(7, (w - 6) / (String(txt).length * 0.62))); g.appendChild(Fig.text(x + w / 2, y + h / 2 + 4, String(txt), { size, weight: 'bold', anchor: 'middle', fill: fg, font, role: 'label' })); }
      });
      if (cfg.showMain) L.boxes.filter(b => b.kind !== 'block').forEach(b => { g.appendChild(Fig.el('rect', { x: cx(b.c0) + 1, y: cy(b.r0) + 1, width: (b.c1 - b.c0 + 1) * cellW - 2, height: (b.r1 - b.r0 + 1) * cellH - 2, fill: 'none', stroke: t.fg, 'stroke-width': b.kind === 'main' ? 2 : 1.2, 'stroke-dasharray': b.kind === 'main' ? null : '4 3', rx: 4 })); if (b.kind === 'main') g.appendChild(Fig.text(cx(b.c0) + 4, cy(b.r0) - 3, b.name, { size: 10, fill: t.fg, font, role: 'label', weight: 'bold', halo: t.bg })); });
      if (cfg.showBlocks) L.boxes.filter(b => b.kind === 'block').forEach(b => { g.appendChild(Fig.el('rect', { x: cx(b.c0) - 3, y: cy(b.r0) - 3, width: (b.c1 - b.c0 + 1) * cellW + 6, height: (b.r1 - b.r0 + 1) * cellH + 6, fill: 'none', stroke: t.fg, 'stroke-width': 2.2, rx: 6 })); g.appendChild(Fig.text(cx(b.c0) - 8, cy(b.r0) + ((b.r1 - b.r0 + 1) * cellH) / 2 + 4, b.name, { size: 11, anchor: 'end', fill: t.fg, font, role: 'axis', weight: 'bold', rotate: -90 })); });
      /* column / row indices */
      for (let c = 0; c < L.nCols; c++) g.appendChild(Fig.text(cx(c) + cellW / 2, cy(L.nRows) + 16, String(c + 1), { size: 10, anchor: 'middle', fill: t.muted, font, role: 'tick' }));
      if (cfg.showDims && o.plotW && o.plotL) {
        /* empty rows or columns in the grid are alleys: say whether the field size includes them */
        const alleys = new Set(L.plots.map(p => p.col)).size < L.nCols || new Set(L.plots.map(p => p.row)).size < L.nRows;
        g.appendChild(Fig.text(x0, cy(L.nRows) + 36, T(`Plot ${o.plotW} m wide × ${o.plotL} m long · field ≈ ${(L.nCols * o.plotW).toFixed(1)} × ${(L.nRows * o.plotL).toFixed(1)} m (${alleys ? 'alleys one plot wide included' : 'without alleys or borders'})`,
  `Parcela de ${o.plotW} m de ancho × ${o.plotL} m de largo · terreno ≈ ${(L.nCols * o.plotW).toFixed(1)} × ${(L.nRows * o.plotL).toFixed(1)} m (${alleys ? 'incluye pasillos de una parcela de ancho' : 'sin pasillos ni orillas'})`), { size: 11, fill: t.muted, font, role: 'label' }));
      }
      if (cfg.north) { const nx = cfg.width - 30, ny = y0 + 10; g.appendChild(Fig.el('path', { d: `M${nx} ${ny + 26} L${nx - 7} ${ny + 26} L${nx} ${ny} L${nx + 7} ${ny + 26} Z`, fill: t.fg })); g.appendChild(Fig.text(nx, ny + 40, 'N', { size: 11, anchor: 'middle', fill: t.fg, font, role: 'label', weight: 'bold' })); }
      if (cfg.showLegend) {
        const lx = x0 + L.nCols * cellW + 20; let ly = y0 + 8;
        const legendItems = isEntry.size ? checkList.concat(['__entries__']) : trts;
        legendItems.forEach(tr => { if (tr === '__entries__') { g.appendChild(Fig.el('rect', { x: lx, y: ly - 9, width: 12, height: 12, fill: ENTRY, stroke: Fig.darken(ENTRY, 0.25), rx: 2 })); g.appendChild(Fig.text(lx + 17, ly + 1, T(`New entries (${isEntry.size}, unreplicated)`, `Entradas nuevas (${isEntry.size}, sin repetir)`), { size: 10.5, fill: t.fg, font, role: 'legend' })); ly += 16 * Fig.fs('legend'); return; } g.appendChild(Fig.el('rect', { x: lx, y: ly - 9, width: 12, height: 12, fill: col(tr), rx: 2 })); g.appendChild(Fig.text(lx + 17, ly + 1, tr, { size: 10.5, fill: t.fg, font, role: 'legend' })); ly += 16 * Fig.fs('legend'); if (ly > cfg.height - 20) return; });
      }
      return svg;
    },
  };
};

/* power vs replicates for several detectable differences */
P8.power = (o, mk) => ({
  title: T('Power of the comparison between two treatment means', 'Potencia de la comparación entre dos medias de tratamiento'), fileName: 'power_curves', width: 820, height: 500,
  defaults: { title: T('Power vs number of replicates', 'Potencia contra número de repeticiones'), xlab: T('Replicates (r)', 'Repeticiones (r)'), ylab: T('Power (1 − β)', 'Potencia (1 − β)'), palette: 'agri', target: o.power },
  controls: [{ key: 'title', label: T('Title', 'Título'), type: 'text' }, { key: 'xlab', label: T('X axis label', 'Título del eje X'), type: 'text' }, { key: 'ylab', label: T('Y axis label', 'Título del eje Y'), type: 'text' }, { key: 'palette', label: T('Palette', 'Paleta'), type: 'select', options: Object.entries(Fig.paletteNames) }],
  render(cfg) {
    const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
    const f = Fig.frame(svg, cfg, {});
    const rs = Array.from({ length: 29 }, (_, i) => i + 2);
    const ds = mk.ds;
    const xs = Fig.scaleLinear(2, 30, f.x0, f.x1), ys = Fig.scaleLinear(0, 1, f.y1, f.y0);
    Fig.axisY(f, ys, cfg, { count: 5 }); Fig.axisX(f, xs, cfg, { count: 7 });
    f.g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: ys(o.power), y2: ys(o.power), stroke: f.t.muted, 'stroke-width': 1, 'stroke-dasharray': '5 4' }));
    f.g.appendChild(Fig.text(f.x1 - 4, ys(o.power) - 5, T(`target power ${o.power}`, `potencia buscada ${o.power}`), { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
    ds.forEach((d, i) => {
      const col = Fig.color(cfg.palette, i);
      const pts = rs.map(r => [xs(r), ys(GEN.powerFor(r, Object.assign({}, o, { d })).power)]);
      f.g.appendChild(Fig.el('path', { d: pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '), fill: 'none', stroke: col, 'stroke-width': d === o.d ? 3.2 : 1.8 }));
    });
    Fig.legend(f, ds.map((d, i) => ({ label: T(`difference ${d} % of the mean${d === o.d ? ' (chosen)' : ''}`, `diferencia de ${d} % de la media${d === o.d ? ' (la elegida)' : ''}`), color: Fig.color(cfg.palette, i), shape: 'line' })), Object.assign({}, cfg, { legendPos: 'right' }));
    f.g.appendChild(Fig.text(f.x0 + 8, f.y0 + 14, T(`CV = ${o.cv} %, α = ${o.alpha}, ${o.t} treatments, ${o.design.toUpperCase()}`, `CV = ${o.cv} %, α = ${o.alpha}, ${o.t} tratamientos, ${o.design === 'rcbd' ? 'bloques al azar' : 'completamente al azar'}`), { size: 10.5, fill: f.t.muted, font: f.font, role: 'label' }));
    return svg;
  },
});
/* detectable difference vs r (Petersen-style curves for several CVs) */
P8.detectable = (o, mk) => ({
  title: T('Detectable difference vs number of replicates', 'Diferencia detectable contra número de repeticiones'), fileName: 'detectable_difference', width: 820, height: 500,
  defaults: { title: T('Smallest detectable difference (% of the mean)', 'Diferencia más chica que se detecta (% de la media)'), xlab: T('Replicates (r)', 'Repeticiones (r)'), ylab: T('Detectable difference (% of mean)', 'Diferencia detectable (% de la media)'), palette: 'agri' },
  controls: [{ key: 'title', label: T('Title', 'Título'), type: 'text' }, { key: 'xlab', label: T('X axis label', 'Título del eje X'), type: 'text' }, { key: 'ylab', label: T('Y axis label', 'Título del eje Y'), type: 'text' }, { key: 'palette', label: T('Palette', 'Paleta'), type: 'select', options: Object.entries(Fig.paletteNames) }],
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
    f.g.appendChild(Fig.text(f.x1 - 4, ys(o.d) - 5, T(`difference of interest ${o.d} %`, `diferencia de interés ${o.d} %`), { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
    Fig.legend(f, cvs.map((cv, i) => ({ label: T(`CV ${cv} %${cv === o.cv ? ' (chosen)' : ''}`, `CV ${cv} %${cv === o.cv ? ' (el elegido)' : ''}`), color: Fig.color(cfg.palette, i), shape: 'line' })), Object.assign({}, cfg, { legendPos: 'right' }));
    f.g.appendChild(Fig.text(f.x0 + 8, f.y0 + 14, T(`α = ${o.alpha}, power = ${o.power}, ${o.t} treatments, ${o.design.toUpperCase()}`, `α = ${o.alpha}, potencia = ${o.power}, ${o.t} tratamientos, ${o.design === 'rcbd' ? 'bloques al azar' : 'completamente al azar'}`), { size: 10.5, fill: f.t.muted, font: f.font, role: 'label' }));
    return svg;
  },
});

window.P8 = P8;
