/* AgriDesign — Block 1: the home page.
   Every card, gallery and illustration of the landing page is built here, so the map of
   the app is one editable list. The lists are functions because they carry both
   languages: T('English', 'Español') picks the one in use, and the page is painted
   again whenever the reader changes language. */

(function () {
const BLOCKS = () => [
  { n: 2, title: T('Data import & roles', 'Datos: importar y papeles'), tag: T('import · checks', 'importar · revisiones'), text: T('Excel, CSV, JSON or the clipboard. Tidy-format diagnostics (merged cells, totals, headers), variable typing, roles for response, factors, blocks, rows, columns and covariates; balance and design structure; wide → long reshaping.', 'Excel, CSV, JSON o el portapapeles. Diagnóstico del formato ordenado (celdas combinadas, totales, encabezados), tipo de cada variable, papeles de respuesta, factores, bloques, hileras, columnas y covariables; balance y estructura del diseño; conversión de ancho a largo.') },
  { n: 3, title: T('Descriptive statistics', 'Estadística descriptiva'), tag: T('explore', 'explorar'), text: T('Summary tables by treatment and block, two-way means, automatic interpretation of the CV and the outliers; histograms, box and violin plots, means with error bars, block profiles, interaction plots.', 'Cuadros de resumen por tratamiento y por bloque, medias de dos vías, interpretación automática del CV y de los valores atípicos; histogramas, cajas y violines, medias con barras de error, perfiles de bloque y gráficas de interacción.') },
  { n: 4, title: T('ANOVA assumptions', 'Supuestos del análisis de varianza'), tag: T('diagnose', 'diagnosticar'), text: T('Normality, homogeneity of variances, additivity and outliers tested on the residuals of your design; transformation comparison with Box–Cox; Kruskal–Wallis, Friedman, aligned ranks and Welch when the assumptions fail.', 'Normalidad, homogeneidad de varianzas, aditividad y valores atípicos probados en los residuales de tu diseño; comparación de transformaciones con Box–Cox; Kruskal–Wallis, Friedman, rangos alineados y Welch cuando los supuestos fallan.') },
  { n: 5, title: T('Designs & ANOVA', 'Diseños y análisis de varianza'), tag: T('analyse', 'analizar'), text: T('CRD, RCBD, Latin square, incomplete blocks, augmented, factorials, split-plot, strip-plot, split-split-plot, nested and ANCOVA with the right error terms; eleven mean-separation tests, simple effects, polynomial trends and custom contrasts.', 'Completamente al azar, bloques completos al azar, cuadro latino, bloques incompletos, aumentado, factoriales, parcelas divididas, franjas, parcelas subdivididas, anidado y ANCOVA con el error correcto; once pruebas de comparación de medias, efectos simples, tendencias polinomiales y contrastes a la medida.') },
  { n: 6, title: T('Result graphics', 'Gráficas de resultados'), tag: T('illustrate', 'ilustrar'), text: T('Means with letters in bars or points, box and strip plots with letters, interaction plots, response curves, difference plots, variance partition, field maps; style presets, batch export and a multi-panel composer.', 'Medias con letras en barras o en puntos, cajas y puntos con letras, gráficas de interacción, curvas de respuesta, gráficas de diferencias, reparto de la varianza y croquis del terreno; estilos predefinidos, exportación en lote y armador de figuras de varios paneles.') },
  { n: 7, title: T('Report & export', 'Informe y exportación'), tag: T('publish', 'publicar'), text: T('A self-contained report with an auto-drafted methods paragraph, tables, figures as edited and appendices; print to PDF; ZIP with data, CSV tables and figures at journal resolution.', 'Un informe que se basta solo, con el párrafo de métodos redactado por la plataforma, cuadros, figuras tal como quedaron y apéndices; impresión a PDF; paquete ZIP con los datos, los cuadros en CSV y las figuras a resolución de revista.') },
  { n: 8, title: T('Design generator', 'Generador de diseños'), tag: T('plan', 'planear'), text: T('Seeded randomisation of every design, field map with plot numbers and blocks, field book in CSV or Excel ready to fill, and the number of replicates needed for the difference you want to detect.', 'Aleatorización con semilla de todos los diseños, croquis del terreno con número de parcela y bloques, libreta de campo en CSV o Excel lista para llenar, y las repeticiones que hacen falta para la diferencia que quieres detectar.') },
];
const DESIGNS = () => [
  ['crd', T('Completely randomised', 'Completamente al azar'), T('one factor, no blocking', 'un factor, sin bloques')],
  ['rcbd', T('Randomised complete block', 'Bloques completos al azar'), T('every treatment in every block', 'cada tratamiento en cada bloque')],
  ['latin', T('Latin square', 'Cuadro latino'), T('rows × columns blocking', 'bloqueo por hileras × columnas')],
  ['factorial', T('Factorial', 'Factorial'), T('A × B combinations', 'combinaciones A × B')],
  ['split', T('Split-plot', 'Parcelas divididas'), T('main plots and sub-plots', 'parcelas grandes y subparcelas')],
  ['strip', T('Strip-plot', 'Franjas divididas'), T('perpendicular strips', 'franjas perpendiculares')],
  ['lattice', T('Lattice / alpha', 'Látice / alfa'), T('incomplete blocks', 'bloques incompletos')],
  ['bibd', T('Balanced incomplete block', 'Bloques incompletos balanceados'), T('blocks smaller than t', 'bloques más chicos que t')],
  ['augmented', T('Augmented', 'Aumentado'), T('checks + new genotypes', 'testigos + genotipos nuevos')],
  ['nested', T('Nested (hierarchical)', 'Anidado (jerárquico)'), T('B within A', 'B dentro de A')],
  ['repeated', T('Repeated measures', 'Medidas repetidas'), T('same plot over time', 'la misma parcela en el tiempo')],
];
const KINDS = () => [
  { art: 'field', t: T('Field crops', 'Cultivos de campo'), s: T('Maize, wheat, beans, sorghum: plots in blocks along the fertility gradient; yield in t ha⁻¹, plant height, days to flowering.', 'Maíz, trigo, frijol, sorgo: parcelas en bloques a lo largo del gradiente de fertilidad; rendimiento en t ha⁻¹, altura de planta, días a floración.'), k: T('RCBD · Latin square · lattice', 'bloques al azar · cuadro latino · látice') },
  { art: 'horti', t: T('Horticulture & greenhouse', 'Horticultura e invernadero'), s: T('Tomato, chile, cucumber, ornamentals: pots or beds, varieties × nutrition, dose–response curves and optimum doses.', 'Jitomate, chile, pepino, ornamentales: macetas o camas, variedades × nutrición, curvas de dosis–respuesta y dosis óptimas.'), k: T('CRD · factorials · trends', 'completamente al azar · factoriales · tendencias') },
  { art: 'perennial', t: T('Perennial crops', 'Cultivos perennes'), s: T('Coffee, cacao, fruit trees: the tree or the row is the plot; several harvests on the same plants become repeated measures.', 'Café, cacao, frutales: el árbol o la hilera es la parcela; varias cosechas en las mismas plantas se vuelven medidas repetidas.'), k: T('split-plot in time · covariates', 'parcelas divididas en el tiempo · covariables') },
  { art: 'livestock', t: T('Livestock', 'Ganado'), s: T('Cows, sheep, goats: the animal or the pen is the experimental unit; initial weight as covariate; diets, breeds and periods.', 'Vacas, borregos, cabras: el animal o el corral es la unidad experimental; el peso inicial como covariable; dietas, razas y periodos.'), k: T('ANCOVA · Latin square · nested', 'ANCOVA · cuadro latino · anidado') },
  { art: 'lab', t: T('Germination & laboratory', 'Germinación y laboratorio'), s: T('Petri dishes, trays and vials: percentages and counts that need an arcsine, square-root or logit transformation, or a rank test.', 'Cajas de Petri, charolas y frascos: porcentajes y conteos que piden transformación de arcoseno, raíz cuadrada o logit, o una prueba de rangos.'), k: T('CRD · transformations', 'completamente al azar · transformaciones') },
  { art: 'scores', t: T('Scores & scales', 'Escalas y calificaciones'), s: T('Disease severity 1–9, vigour 1–5, sensory panels: ordinal responses analysed with Friedman, Kruskal–Wallis or aligned ranks.', 'Severidad de enfermedad de 1 a 9, vigor de 1 a 5, paneles sensoriales: respuestas ordinales analizadas con Friedman, Kruskal–Wallis o rangos alineados.'), k: T('non-parametric', 'no paramétrico') },
];
const METHODS = () => [
  { art: 4, fam: T('assumptions', 'supuestos'), n: T('Residual diagnostics', 'Diagnóstico de residuales'), s: T('Shapiro–Wilk, Levene, Bartlett, Tukey additivity, Q–Q and residual plots', 'Shapiro–Wilk, Levene, Bartlett, aditividad de Tukey, gráficas Q–Q y de residuales') },
  { art: 4, fam: T('assumptions', 'supuestos'), n: T('Transformations', 'Transformaciones'), s: T('log, √, arcsine, logit, reciprocal; Box–Cox profile', 'logaritmo, √, arcoseno, logit, recíproco; perfil de Box–Cox') },
  { art: 4, fam: T('non-parametric', 'no paramétrico'), n: T('Rank-based ANOVA', 'Análisis por rangos'), s: T('Kruskal–Wallis, Friedman, Scheirer–Ray–Hare, aligned rank transform, Welch', 'Kruskal–Wallis, Friedman, Scheirer–Ray–Hare, rangos alineados, Welch') },
  { art: 5, fam: T('anova', 'análisis de varianza'), n: T('Fourteen designs', 'Catorce diseños'), s: T('with their error strata and Type I / III sums of squares', 'con sus estratos de error y sumas de cuadrados de tipo I y III') },
  { art: 5, fam: T('anova', 'análisis de varianza'), n: T('Least-squares means', 'Medias de mínimos cuadrados'), s: T('adjusted for blocks and covariates, back-transformed when needed', 'ajustadas por bloques y covariables, regresadas a la escala original cuando hace falta') },
  { art: 6, fam: T('mean tests', 'pruebas de medias'), n: T('Eleven procedures', 'Once procedimientos'), s: T('Tukey, LSD, Bonferroni, Šidák, Holm, Duncan, SNK, REGWQ, Scheffé, Dunnett, Games–Howell', 'Tukey, DMS, Bonferroni, Šidák, Holm, Duncan, SNK, REGWQ, Scheffé, Dunnett, Games–Howell') },
  { art: 6, fam: T('mean tests', 'pruebas de medias'), n: T('Simple effects & contrasts', 'Efectos simples y contrastes'), s: T('slices with pooled errors, orthogonal polynomials, custom contrasts', 'cortes con errores combinados, polinomios ortogonales, contrastes a la medida') },
  { art: 8, fam: T('planning', 'planeación'), n: T('Randomisation & power', 'Aleatorización y potencia'), s: T('seeded layouts, field books, replicates for a target difference', 'croquis con semilla, libretas de campo, repeticiones para una diferencia buscada') },
];
const COMPARE = () => [
  T('Runs in the browser: nothing to install, works offline, data never leave the computer', 'Corre en el navegador: nada que instalar, funciona sin internet y los datos nunca salen de la computadora'),
  T('The whole route in one place: data checks, assumptions, ANOVA, mean tests, figures, report, planning', 'Toda la ruta en un solo lugar: revisión de datos, supuestos, análisis de varianza, pruebas de medias, figuras, informe y planeación'),
  T('Every classical agricultural design with the correct error terms, including split, strip and split-split plots', 'Todos los diseños agrícolas clásicos con el error correcto, incluidas parcelas divididas, franjas y parcelas subdivididas'),
  T('Plain-language theory next to every result, and an automatic interpretation of what the numbers mean', 'La teoría en palabras llanas junto a cada resultado, y una interpretación automática de lo que dicen los números'),
  T('Non-parametric alternatives and transformations offered exactly when the assumptions fail', 'Alternativas no paramétricas y transformaciones ofrecidas justo cuando los supuestos fallan'),
  T('Editable figures exported at up to 900 dpi in PNG, TIFF and SVG, with multi-panel composites', 'Figuras editables exportadas hasta a 900 ppp en PNG, TIFF y SVG, con composiciones de varios paneles'),
  T('An auto-drafted methods paragraph and a results section ready to edit into the manuscript', 'Un párrafo de métodos ya redactado y una sección de resultados lista para editar en el manuscrito'),
  T('Field layouts and field books generated from a seed, so the randomisation is reproducible', 'Croquis y libretas de campo generados a partir de una semilla, para que la aleatorización sea reproducible'),
];

/* everything that carries words is painted here, so a change of language repaints it */
function paint() {
  if (!el('featureGrid')) return;
  el('heroArt').innerHTML = Art.hero();
  ['artReplication', 'artRandomization', 'artBlocking', 'homeArtRep', 'homeArtRand', 'homeArtBlock'].forEach(id => {
    const h = el(id); if (h) h.innerHTML = Art.principle(/Rep/.test(id) ? 'replication' : /Rand/.test(id) ? 'randomization' : 'blocking');
  });
  const fg = el('featureGrid'); fg.innerHTML = '';
  BLOCKS().forEach(b => {
    const card = mk('div', { class: 'feature' });
    card.innerHTML = `<div class="f-art">${Art.block(b.n)}</div><div class="f-num">${b.n}</div><span class="f-tag">${b.tag}</span><h3>${b.title}</h3><p>${b.text}</p>`;
    card.addEventListener('click', () => {
      const btn = document.querySelector(`.step-btn[data-step="${b.n}"]`);
      if (btn && !btn.disabled) goStep(b.n);
      else if (b.n >= 3 && !state.ready) { goStep(2); showMessage('dataMessages', 'info', T('Load a dataset first: the following blocks work on your data.', 'Carga primero un conjunto de datos: los bloques siguientes trabajan sobre ellos.')); }
    });
    fg.appendChild(card);
  });
  const dg = el('designGallery'); dg.innerHTML = '';
  DESIGNS().forEach(([id, name, sub]) => dg.appendChild(mk('div', { class: 'design-card' }, `${Art.design(id)}<div class="d-name">${name}</div><div class="d-sub">${sub}</div>`)));
  const kg = el('kindGrid'); kg.innerHTML = '';
  KINDS().forEach(k => kg.appendChild(mk('div', { class: 'kind-tile' }, `${Art.kind(k.art)}<div class="kt-t">${k.t}</div><div class="kt-s">${k.s}</div><span class="kt-k">${k.k}</span>`)));
  const mg = el('methodGallery'); mg.innerHTML = '';
  METHODS().forEach(m => mg.appendChild(mk('div', { class: 'mcard' }, `${Art.block(m.art)}<div><div class="m-f">${m.fam}</div><div class="m-n">${m.n}</div><div class="m-s">${m.s}</div></div>`)));
  el('compareBody').innerHTML = `<table><thead><tr><th>${T('What the platform brings together', 'Lo que la plataforma reúne')}</th><th style="text-align:center">AgriDesign</th></tr></thead><tbody>${COMPARE().map(c => `<tr><td>${c}</td><td class="yes">✓</td></tr>`).join('')}</tbody></table>`;

  /* citation card, fed from the single source of truth in report.js (Report.CITE) */
  if (window.Report && Report.CITE) {
    const c = Report.CITE;
    el('citeRef').innerHTML = `${esc(c.author)} (${c.year}). <i>${esc(c.title)}</i> (${T('Version', 'Versión')} ${esc(c.version)}) [${T('Computer software', 'Programa de cómputo')}]. Zenodo. <a href="${c.url}" target="_blank" rel="noopener">${c.url}</a>`;
    el('citeBib').textContent = Report.bibtex();
    el('citeDoi').href = c.url; el('citeRepo').href = c.repo;
  }
}

function init() {
  if (!el('featureGrid')) return;
  el('brandLogo').innerHTML = Art.logo();
  el('heroArt').innerHTML = Art.hero();
  if (el('dzIcon')) el('dzIcon').innerHTML = Art.upload();
  ['artReplication', 'artRandomization', 'artBlocking', 'homeArtRep', 'homeArtRand', 'homeArtBlock'].forEach(id => {
    const h = el(id); if (h) h.innerHTML = Art.principle(/Rep/.test(id) ? 'replication' : /Rand/.test(id) ? 'randomization' : 'blocking');
  });

  paint();

  if (window.Report && Report.CITE) {
    const copy = async (txt, label) => {
      try { await navigator.clipboard.writeText(txt); el('citeMsg').textContent = T(`${label.en} copied to the clipboard.`, `${label.es} se copió al portapapeles.`); }
      catch (e) { el('citeMsg').textContent = T('Copy blocked by the browser: select the text and copy it.', 'El navegador bloqueó la copia: selecciona el texto y cópialo.'); }
      setTimeout(() => { el('citeMsg').textContent = ''; }, 3500);
    };
    el('citeCopy').addEventListener('click', () => copy(Report.citation(), { en: 'Reference', es: 'La referencia' }));
    el('citeCopyBib').addEventListener('click', () => copy(Report.bibtex(), { en: 'BibTeX', es: 'El BibTeX' }));
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

  document.addEventListener('langchange', paint);
}
document.addEventListener('DOMContentLoaded', init);
})();
