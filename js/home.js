/* AgriDesign — Block 1 (home page) wiring and navigation. */

(function () {
const BLOCKS = [
  { n: 1, title: 'Home', tag: 'Overview', text: 'What the platform does, the designs covered and how the workflow is organised.' },
  { n: 2, title: 'Data import & roles', tag: 'Ready', text: 'Excel, CSV, JSON… Tidy-format checks, variable typing, design structure and balance.' },
  { n: 3, title: 'Descriptive statistics', tag: 'Ready', text: 'Summary tables by treatment and block, histograms, box plots, violins, means with error bars — all editable.' },
  { n: 4, title: 'ANOVA assumptions', tag: 'Ready', text: 'Normality, homogeneity of variances, additivity and outliers. Transformations and non-parametric alternatives.' },
  { n: 5, title: 'Designs & ANOVA', tag: 'Ready', text: 'CRD, RCBD, Latin square, factorials, split-plot, strip-plot, lattices, ANCOVA… with Tukey, LSD, Duncan, SNK, Dunnett, Scheffé and contrasts.' },
  { n: 6, title: 'Result graphics', tag: 'Ready', text: 'Bar and dot plots with letters, interaction plots, response curves, residual diagnostics, field heat maps.' },
  { n: 7, title: 'Report & export', tag: 'Ready', text: 'Self-contained HTML/PDF report with methods, tables and figures; ZIP with everything at publication resolution.' },
  { n: 8, title: 'Design generator', tag: 'Ready', text: 'Randomised field layouts and field books for any design, plus sample-size and power calculations.' },
];
const DESIGNS = [
  ['crd', 'Completely randomised', 'one factor, no blocking'],
  ['rcbd', 'Randomised complete block', 'every treatment in every block'],
  ['latin', 'Latin square', 'rows × columns blocking'],
  ['factorial', 'Factorial', 'A × B combinations'],
  ['split', 'Split-plot', 'main plots and sub-plots'],
  ['strip', 'Strip-plot', 'perpendicular strips'],
  ['lattice', 'Lattice / alpha', 'incomplete blocks'],
  ['bibd', 'Balanced incomplete block', 'blocks smaller than t'],
  ['augmented', 'Augmented', 'checks + new genotypes'],
  ['nested', 'Nested (hierarchical)', 'B within A'],
  ['repeated', 'Repeated measures', 'same plot over time'],
];

function init() {
  if (!el('featureGrid')) return;
  el('brandLogo').innerHTML = Art.logo();
  el('heroArt').innerHTML = Art.hero();
  el('dzIcon').innerHTML = Art.upload();
  ['artReplication', 'artRandomization', 'artBlocking'].forEach((id, i) => {
    const h = el(id); if (h) h.innerHTML = Art.principle(['replication', 'randomization', 'blocking'][i]);
  });
  for (let n = 3; n <= 8; n++) { const h = el('soon' + n); if (h) h.innerHTML = Art.soon() + '<div>This block is being built. Blocks are released in order.</div>'; }

  const fg = el('featureGrid');
  BLOCKS.forEach(b => {
    const card = mk('div', { class: 'feature' + '' });
    card.innerHTML = `<div class="f-art">${Art.block(b.n)}</div><div class="f-num">${b.n}</div><span class="f-tag">${b.tag}</span><h3>${b.title}</h3><p>${b.text}</p>`;
    card.addEventListener('click', () => {
      const btn = document.querySelector(`.step-btn[data-step="${b.n}"]`);
      if (btn && !btn.disabled) goStep(b.n);
      else if (b.n === 8) goStep(8);
      else if (b.n >= 3 && !state.ready) { goStep(2); showMessage('dataMessages', 'info', 'Load a dataset first: the following blocks work on your data.'); }
    });
    fg.appendChild(card);
  });
  const dg = el('designGallery');
  DESIGNS.forEach(([id, name, sub]) => dg.appendChild(mk('div', { class: 'design-card' }, `${Art.design(id)}<div class="d-name">${name}</div><div class="d-sub">${sub}</div>`)));

  el('startBtn').addEventListener('click', () => goStep(2));
  el('exampleBtn').addEventListener('click', () => { goStep(2); loadExample('data/rcbd_maize_nitrogen.csv', 'rcbd_maize_nitrogen.csv'); });
  el('brand').addEventListener('click', () => goStep(1));
  els('.step-btn').forEach(b => b.addEventListener('click', () => { if (!b.disabled) goStep(+b.dataset.step); }));
}
document.addEventListener('DOMContentLoaded', init);
})();
