# Changelog

## Unreleased

- Block 8: augmented layouts draw the checks in palette colours and every unreplicated entry in one neutral colour, with a single legend entry; before, the palette repeated and entries looked like checks.
- Block 8: the Latin square reports its real number of replicates (rows = columns = treatments) instead of the hidden replicates box; a failed generation hides the previous layout; the field-size note says whether alleys are included.
- Theory texts (Home, Block 8): replicate numbers corrected to what the calculator gives (CV 8 %, 15 % difference: 6 replicates, not 5; CV 10–15 % and a 10–15 % difference: 8 to 17, not 4–6).
- Block 7: the report no longer mixes datasets. Figures from Blocks 3, 4 and 6 of a previous table stayed on the page and were embedded in the report of the new one; loading data or changing roles now clears them in every block.
- Block 7: the methods paragraph only states that residuals were checked when Block 4 was run on the same response, and the assumptions section is omitted otherwise (before, the sentence was always written).
- Block 7: the suggested title follows the current analysis until the user types one; the results paragraph keeps the subscript degrees of freedom (F<sub>3,9</sub>); section headings stay on the same printed page as their first figure.
- Blocks 4 to 7: loading another table or changing roles now discards the previous analysis. Before, Block 6 kept showing the gallery of the former dataset (the Latin square figures stayed on screen after loading the maize trial), Block 7 could report it, and Blocks 4 and 5 only recomputed when the response name or the number of rows changed, so two files with the same column name and size shared stale results.
- Block 6: the residual field map centres its diverging colour scale at zero (new option "Centre the colour scale at zero"); before, the neutral colour sat at the midpoint of the range and small negative residuals were drawn as positive.
- Block 6: the "Colour (screen)" preset restores the colour palette after "Greyscale print"; batch export offers the 450 dpi resolution available in each figure.
- Block 5: switching to another dataset kept the design chosen for the previous one whenever it was still enabled (a CRD picked for the bean trial was silently used for the Latin square); a new table or new roles now start again from the suggested design, and the user choice is kept only while data and roles are unchanged.
- Block 5: when an analysis fails, the results card of the previous analysis is hidden instead of staying on screen.
- Block 5: the generalised RCBD is disabled unless some block × treatment cell has more than one plot (the requirement was declared in the catalogue but never checked, so selecting it gave a saturated model).
- Block 4: the model line now follows the response that is analysed (it kept the previous name after "Use"); the verdict names the transformed scale instead of saying "original scale"; the suggested transformation is the conventional power closest to the Box–Cox estimate when it passes the tests (the tomato example suggested ln(y + 1) for yields without zeros, now ln(y)).
- Theory cards: tables inside the collapsible sections wrap their text instead of overflowing the card.
- Block 2: the "local control" illustration of the theory card did not render (its gradient shared a fixed id with the copy on the home page); each copy now gets its own id.
- Home simulator: the vertical label of the field now reads "poor → fertile" (the fertility gradient runs from the top row to the bottom row, as the values show).
- Spanish user manual in progress under manual/ (cover, introduction and chapters for Blocks 1 to 8).

## 1.0 — 2026-09-10 · DOI 10.5281/zenodo.22683047

First public release.

- Block 1: home page with the workflow and the catalogue of designs.
- Block 2: data import (xlsx, xls, xlsm, xlsb, ods, csv, tsv, txt, json, clipboard), tidy-format diagnostics, variable roles, design structure and balance, wide-to-long reshaping.
- Block 3: descriptive statistics by treatment and block with editable exploratory figures.
- Block 4: residual diagnostics of the design model, transformations with Box–Cox, non-parametric alternatives (Kruskal–Wallis, Friedman, Scheirer–Ray–Hare, aligned rank transform, Welch) with post-hoc tests and compact letters.
- Block 5: fourteen experimental designs with their error strata, Type I/III ANOVA, least-squares means, eleven mean-separation procedures, simple effects, orthogonal polynomial trends and custom contrasts.
- Block 6: publication figure gallery, style presets, batch export and multi-panel composer.
- Block 7: self-contained HTML report, print to PDF and ZIP package.
- Block 8: seeded randomisation, field layout, field book and replicate/power calculator.
