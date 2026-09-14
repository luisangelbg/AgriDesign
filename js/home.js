/* AgriDesign — Block 1: the home page.
   Every card, gallery and illustration of the landing page is built here, so the map of
   the app is one editable list. */

(function () {
const BLOCKS = [
  { n: 2, title: 'Data import & roles', tag: 'import · checks', text: 'Excel, CSV, JSON or the clipboard. Tidy-format diagnostics (merged cells, totals, headers), variable typing, roles for response, factors, blocks, rows, columns and covariates; balance and design structure; wide → long reshaping.' },
  { n: 3, title: 'Descriptive statistics', tag: 'explore', text: 'Summary tables by treatment and block, two-way means, automatic interpretation of the CV and the outliers; histograms, box and violin plots, means with error bars, block profiles, interaction plots.' },
  { n: 4, title: 'ANOVA assumptions', tag: 'diagnose', text: 'Normality, homogeneity of variances, additivity and outliers tested on the residuals of your design; transformation comparison with Box–Cox; Kruskal–Wallis, Friedman, aligned ranks and Welch when the assumptions fail.' },
  { n: 5, title: 'Designs & ANOVA', tag: 'analyse', text: 'CRD, RCBD, Latin square, incomplete blocks, augmented, factorials, split-plot, strip-plot, split-split-plot, nested and ANCOVA with the right error terms; eleven mean-separation tests, simple effects, polynomial trends and custom contrasts.' },
  { n: 6, title: 'Result graphics', tag: 'illustrate', text: 'Means with letters in bars or points, box and strip plots with letters, interaction plots, response curves, difference plots, variance partition, field maps; style presets, batch export and a multi-panel composer.' },
  { n: 7, title: 'Report & export', tag: 'publish', text: 'A self-contained report with an auto-drafted methods paragraph, tables, figures as edited and appendices; print to PDF; ZIP with data, CSV tables and figures at journal resolution.' },
  { n: 8, title: 'Design generator', tag: 'plan', text: 'Seeded randomisation of every design, field map with plot numbers and blocks, field book in CSV or Excel ready to fill, and the number of replicates needed for the difference you want to detect.' },
];
const DESIGNS = [
  ['crd', 'Completely randomised', 'one factor, no blocking'], ['rcbd', 'Randomised complete block', 'every treatment in every block'], ['latin', 'Latin square', 'rows × columns blocking'],
  ['factorial', 'Factorial', 'A × B combinations'], ['split', 'Split-plot', 'main plots and sub-plots'], ['strip', 'Strip-plot', 'perpendicular strips'],
  ['lattice', 'Lattice / alpha', 'incomplete blocks'], ['bibd', 'Balanced incomplete block', 'blocks smaller than t'], ['augmented', 'Augmented', 'checks + new genotypes'],
  ['nested', 'Nested (hierarchical)', 'B within A'], ['repeated', 'Repeated measures', 'same plot over time'],
];
const KINDS = [
  { art: 'field', t: 'Field crops', s: 'Maize, wheat, beans, sorghum: plots in blocks along the fertility gradient; yield in t ha⁻¹, plant height, days to flowering.', k: 'RCBD · Latin square · lattice' },
  { art: 'horti', t: 'Horticulture & greenhouse', s: 'Tomato, chile, cucumber, ornamentals: pots or beds, varieties × nutrition, dose–response curves and optimum doses.', k: 'CRD · factorials · trends' },
  { art: 'perennial', t: 'Perennial crops', s: 'Coffee, cacao, fruit trees: the tree or the row is the plot; several harvests on the same plants become repeated measures.', k: 'split-plot in time · covariates' },
  { art: 'livestock', t: 'Livestock', s: 'Cows, sheep, goats: the animal or the pen is the experimental unit; initial weight as covariate; diets, breeds and periods.', k: 'ANCOVA · Latin square · nested' },
  { art: 'lab', t: 'Germination & laboratory', s: 'Petri dishes, trays and vials: percentages and counts that need an arcsine, square-root or logit transformation, or a rank test.', k: 'CRD · transformations' },
  { art: 'scores', t: 'Scores & scales', s: 'Disease severity 1–9, vigour 1–5, sensory panels: ordinal responses analysed with Friedman, Kruskal–Wallis or aligned ranks.', k: 'non-parametric' },
];
const METHODS = [
  { art: 4, fam: 'assumptions', n: 'Residual diagnostics', s: 'Shapiro–Wilk, Levene, Bartlett, Tukey additivity, Q–Q and residual plots' },
  { art: 4, fam: 'assumptions', n: 'Transformations', s: 'log, √, arcsine, logit, reciprocal; Box–Cox profile' },
  { art: 4, fam: 'non-parametric', n: 'Rank-based ANOVA', s: 'Kruskal–Wallis, Friedman, Scheirer–Ray–Hare, aligned rank transform, Welch' },
  { art: 5, fam: 'anova', n: 'Fourteen designs', s: 'with their error strata and Type I / III sums of squares' },
  { art: 5, fam: 'anova', n: 'Least-squares means', s: 'adjusted for blocks and covariates, back-transformed when needed' },
  { art: 6, fam: 'mean tests', n: 'Eleven procedures', s: 'Tukey, LSD, Bonferroni, Šidák, Holm, Duncan, SNK, REGWQ, Scheffé, Dunnett, Games–Howell' },
  { art: 6, fam: 'mean tests', n: 'Simple effects & contrasts', s: 'slices with pooled errors, orthogonal polynomials, custom contrasts' },
  { art: 8, fam: 'planning', n: 'Randomisation & power', s: 'seeded layouts, field books, replicates for a target difference' },
];
const COMPARE = [
  'Runs in the browser: nothing to install, works offline, data never leave the computer',
  'The whole route in one place: data checks, assumptions, ANOVA, mean tests, figures, report, planning',
  'Every classical agricultural design with the correct error terms, including split, strip and split-split plots',
  'Plain-language theory next to every result, and an automatic interpretation of what the numbers mean',
  'Non-parametric alternatives and transformations offered exactly when the assumptions fail',
  'Editable figures exported at up to 900 dpi in PNG, TIFF and SVG, with multi-panel composites',
  'An auto-drafted methods paragraph and a results section ready to edit into the manuscript',
  'Field layouts and field books generated from a seed, so the randomisation is reproducible',
];

function init() {
  if (!el('featureGrid')) return;
  el('brandLogo').innerHTML = Art.logo();
  el('heroArt').innerHTML = Art.hero();
  if (el('dzIcon')) el('dzIcon').innerHTML = Art.upload();
  ['artReplication', 'artRandomization', 'artBlocking', 'homeArtRep', 'homeArtRand', 'homeArtBlock'].forEach(id => {
    const h = el(id); if (h) h.innerHTML = Art.principle(/Rep/.test(id) ? 'replication' : /Rand/.test(id) ? 'randomization' : 'blocking');
  });

  const fg = el('featureGrid');
  BLOCKS.forEach(b => {
    const card = mk('div', { class: 'feature' });
    card.innerHTML = `<div class="f-art">${Art.block(b.n)}</div><div class="f-num">${b.n}</div><span class="f-tag">${b.tag}</span><h3>${b.title}</h3><p>${b.text}</p>`;
    card.addEventListener('click', () => {
      const btn = document.querySelector(`.step-btn[data-step="${b.n}"]`);
      if (btn && !btn.disabled) goStep(b.n);
      else if (b.n >= 3 && !state.ready) { goStep(2); showMessage('dataMessages', 'info', 'Load a dataset first: the following blocks work on your data.'); }
    });
    fg.appendChild(card);
  });
  const dg = el('designGallery');
  DESIGNS.forEach(([id, name, sub]) => dg.appendChild(mk('div', { class: 'design-card' }, `${Art.design(id)}<div class="d-name">${name}</div><div class="d-sub">${sub}</div>`)));
  const kg = el('kindGrid');
  KINDS.forEach(k => kg.appendChild(mk('div', { class: 'kind-tile' }, `${Art.kind(k.art)}<div class="kt-t">${k.t}</div><div class="kt-s">${k.s}</div><span class="kt-k">${k.k}</span>`)));
  const mg = el('methodGallery');
  METHODS.forEach(m => mg.appendChild(mk('div', { class: 'mcard' }, `${Art.block(m.art)}<div><div class="m-f">${m.fam}</div><div class="m-n">${m.n}</div><div class="m-s">${m.s}</div></div>`)));
  el('compareBody').innerHTML = `<table><thead><tr><th>What the platform brings together</th><th style="text-align:center">AgriDesign</th></tr></thead><tbody>${COMPARE.map(c => `<tr><td>${c}</td><td class="yes">✓</td></tr>`).join('')}</tbody></table>`;

  /* citation card, fed from the single source of truth in report.js (Report.CITE) */
  if (window.Report && Report.CITE) {
    const c = Report.CITE;
    el('citeRef').innerHTML = `${esc(c.author)} (${c.year}). <i>${esc(c.title)}</i> (Version ${esc(c.version)}) [Computer software]. Zenodo. <a href="${c.url}" target="_blank" rel="noopener">${c.url}</a>`;
    const bib = Report.bibtex();
    el('citeBib').textContent = bib;
    el('citeDoi').href = c.url; el('citeRepo').href = c.repo;
    const copy = async (txt, label) => { try { await navigator.clipboard.writeText(txt); el('citeMsg').textContent = `${label} copied to the clipboard.`; } catch (e) { el('citeMsg').textContent = 'Copy blocked by the browser: select the text and copy it.'; } setTimeout(() => { el('citeMsg').textContent = ''; }, 3500); };
    el('citeCopy').addEventListener('click', () => copy(Report.citation(), 'Reference'));
    el('citeCopyBib').addEventListener('click', () => copy(bib, 'BibTeX'));
  }

  const scrollTo = id => { const t = el(id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  el('startBtn').addEventListener('click', () => goStep(2));
  el('simBtn').addEventListener('click', () => scrollTo('simulator'));
  el('theoryBtn').addEventListener('click', () => { scrollTo('theory'); const first = el('theory').nextElementSibling.querySelector('details.acc'); if (first) first.open = true; });
  el('citeBtn').addEventListener('click', () => scrollTo('cite'));
  el('exampleLink').addEventListener('click', e => { e.preventDefault(); goStep(2); loadExample('data/rcbd_maize_nitrogen.csv', 'rcbd_maize_nitrogen.csv'); });
  el('brand').addEventListener('click', () => goStep(1));
  els('.step-btn').forEach(b => b.addEventListener('click', () => { if (!b.disabled) goStep(+b.dataset.step); }));
  els('[data-go]').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.go)));
}
document.addEventListener('DOMContentLoaded', init);
})();
