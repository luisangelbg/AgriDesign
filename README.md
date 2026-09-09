# AgriDesign

**Design and analysis of agricultural experiments, without writing code.** All eight blocks are complete.

A local web platform (HTML + JavaScript, no installation, no internet) that guides the user from the
field book to publication-ready results: data import and tidy checks, descriptive statistics, ANOVA
assumptions, the classical experimental designs with their mean-separation tests, editable figures and
an automatic report.

Developed as a teaching and research tool for agronomy and related sciences.

## How to use

**Online (any computer, nothing to install):** open <https://luisangelbg.github.io/AgriDesign/>.
Everything still runs in your browser; no data are uploaded anywhere.

**Offline (download the repository as ZIP and unpack it):**

1. Right-click **`server.ps1`** → *Run with PowerShell*. The browser opens at `http://localhost:8800`.
   If the port is busy: `powershell -ExecutionPolicy Bypass -File server.ps1 -Port 9001`
2. Double-clicking `index.html` also works, but then the **example datasets cannot be loaded**
   (browsers block reading local files from `file://`). Your own files load fine either way.
3. To use it from a tablet on the same Wi-Fi network, run the script *as administrator*; it prints the address.

## Status of the blocks

| Block | Content | Status |
|---|---|---|
| 1 | Home page: overview, workflow, designs covered | ✅ ready |
| 2 | Data import (xlsx, xls, xlsm, xlsb, ods, csv, tsv, txt, json, clipboard), tidy-format diagnostics, variable roles, design structure and balance, wide→long reshaping | ✅ ready |
| 3 | Descriptive statistics by treatment / block / combination, two-way means table, automatic interpretation (CV benchmarks, skewness, outliers, variance heterogeneity), editable figures: histogram + density, box, violin, means ± SE/SD/CI, strip, block profiles, interaction, covariate scatter, correlation heat map | ✅ ready |
| 4 | Residual diagnostics on the fitted design model (Shapiro–Wilk, Anderson–Darling, Jarque–Bera, Levene, Bartlett, Fligner–Killeen, Fmax, Tukey additivity, Durbin–Watson, studentized residuals), residual plots, transformation comparison + Box–Cox with "Use" (creates a new column), non-parametric route: Kruskal–Wallis + Dunn / Mann–Whitney, Friedman + Conover / Nemenyi, Scheirer–Ray–Hare, Aligned Rank Transform ANOVA + Tukey on aligned ranks, Welch + Games–Howell, compact letters | ✅ ready |
| 5 | Design catalogue (CRD, RCBD, generalised RCBD, Latin square, incomplete blocks, augmented, factorial CRD/RCBD, split-plot RCBD/CRD, strip-plot, split-split-plot, nested; ANCOVA via covariates) with correct error strata; Type I/III ANOVA, partial η², CV, LS means with SE, back-transformed means; Tukey, LSD, Bonferroni, Šidák, Holm, Duncan, SNK, REGWQ, Scheffé, Dunnett (multivariate t), Games–Howell; letters; simple effects with pooled Satterthwaite errors for split designs; orthogonal polynomial trend + fitted curve + optimum; custom contrasts; results narrative | ✅ ready |
| 6 | Figure gallery from the Block 5 results: means with letters (bars, points), box and strip plots with letters, pairwise differences with CIs, response curves, interaction plots with letters (both orientations), grouped bars, cell heat maps, SS partition, field maps (response and residuals); style presets (journal, serif, greyscale, slides, dark), batch ZIP export at chosen dpi, multi-panel composer with (a)(b) labels | ✅ ready |
| 7 | Self-contained HTML report (title page, auto-drafted methods, data summary, assumption tests, ANOVA with narrative, means with letters, polynomial contrasts, interaction cell tables, figures from Blocks 3–6 as edited, pairwise and raw-data appendices, references), print-to-PDF, methods paragraph to clipboard, ZIP package with data, CSV tables, SVG + raster figures at chosen dpi | ✅ ready |
| 8 | Design generator (no data needed): seeded randomisation of CRD, RCBD, Latin square, factorial CRD/RCBD, split-plot, strip-plot, split-split-plot, resolvable incomplete blocks, augmented; field map (editable, exportable) with blocks, main plots, plot numbers (serpentine, block×100), north arrow and plot dimensions; skeleton ANOVA df; field book CSV/XLSX with empty response columns and "open as template in Block 2"; replicates & power calculator with power and detectable-difference curves | ✅ ready |

## Architecture

```
index.html        page structure, theory text (Block 2 accordion), panels for every block
css/style.css     single stylesheet, light and dark themes
js/core.js        global state, DOM helpers, number formatting, downloads, step navigation
js/stats.js       descriptive statistics, special functions, distributions (normal, t, χ², F,
                  studentized range), small linear algebra, seedable RNG
js/figure.js      SVG figure engine: palettes, themes, axes, legends, editor panel, export to
                  PNG (with DPI), TIFF (with DPI), SVG, JPG, WEBP at 2×–12×
js/art.js         SVG illustrations (home page, design layouts, principles)
js/data.js        Block 2
js/home.js        Block 1
js/plots3.js      Block 3 figure constructors (P3.*)
js/block3.js      Block 3 UI, tables and interpretation
js/lm.js          linear-model engine: effect-coded model matrix, MGS-QR fit with aliasing, leverage, Type I / III ANOVA
js/assump.js      assumption tests (Royston Shapiro–Wilk, AD, JB, Levene, Bartlett, Fligner, Tukey 1-df, DW), transformations, Box–Cox
js/nonpar.js      p-adjustment, compact letters (Bron–Kerbosch), Kruskal–Wallis, Dunn, Friedman, Conover, Nemenyi, ART, SRH, Welch
js/plots4.js      Block 4 figures (Q–Q with band, residual plots, Box–Cox profile, medians with letters)
js/block4.js      Block 4 UI
js/posthoc.js     mean separation (11 procedures), Dunnett integral, contrasts, orthogonal polynomials, polynomial fit
js/designs.js     design catalogue: model terms + error strata, applicability, DS.analyze, LS means, SE of differences
js/plots5.js      Block 5 figures (means with letters, grouped cell means, dose–response trend)
js/block5.js      Block 5 UI
js/zip.js         ZIP writer (store) for batch export and the report
js/plots6.js      Block 6 figures (box/strip with letters, interaction with letters, cell heat map, differences CI, SS partition, field map, multi-panel composer)
js/block6.js      Block 6 gallery, presets, batch export
js/report.js      Block 7 report builder (HTML), ZIP package, print
js/gen.js         Block 8 algorithms: randomisation per design, layout geometry, numbering, field book, power
js/plots8.js      Block 8 figures (field layout, power curves, detectable difference)
js/block8.js      Block 8 UI
vendor/           SheetJS (spreadsheet reader), bundled so the app works offline
data/             example datasets (CSV)
```

Rules followed by every block:

- All computation happens in the browser in plain JavaScript; numerical routines are checked against R.
- Every figure is built through `Fig.mount(host, spec)` so it gets the editor (titles, palette, fonts,
  sizes, theme) and the export bar for free. Every `Fig.text` call carries a `role` so the font-size
  sliders work.
- Figures are pure SVG with inline styles: what you see is exactly what is exported.
- Style preferences (theme, font, sizes, resolution) persist in `localStorage` and are inherited by later figures.

## Example datasets

| File | Design |
|---|---|
| `rcbd_maize_nitrogen.csv` | RCBD, 4 nitrogen doses × 4 blocks |
| `crd_bean_varieties.csv` | CRD, 5 bean varieties × 4 replicates |
| `latin_square_wheat.csv` | 4 × 4 Latin square |
| `factorial_tomato_rcbd.csv` | 3 × 3 factorial in RCBD, two responses |
| `split_plot_irrigation.csv` | Split-plot, irrigation (main) × variety (sub), 3 blocks |
| `disease_scores_rcbd.csv` | Ordinal 1–9 scores, RCBD (non-parametric case) |
| `wide_format_example.csv` | Wide table to demonstrate the reshape tool |


## How to cite

If you use AgriDesign in a publication, please cite the software (a citable DOI is provided by Zenodo for every release):

> Barrera-Guzmán, L. Á. (2026). *AgriDesign: a browser-based platform for the design and analysis of agricultural experiments* (Version 1.0.0) [Computer software]. https://github.com/luisangelbg/AgriDesign

The `CITATION.cff` file contains the same information in machine-readable form (GitHub shows a "Cite this repository" button).

## License

AgriDesign is free software released under the **GNU General Public License v3.0** (see `LICENSE`).
It bundles [SheetJS Community Edition](https://sheetjs.com/) (`vendor/xlsx.full.min.js`, Apache-2.0) for reading spreadsheets.
