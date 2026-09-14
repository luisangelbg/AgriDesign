# Changelog

## Unreleased

- Block 5: switching to another dataset kept the design chosen for the previous one whenever it was still enabled (a CRD picked for the bean trial was silently used for the Latin square); a new table or new roles now start again from the suggested design, and the user choice is kept only while data and roles are unchanged.
- Block 5: when an analysis fails, the results card of the previous analysis is hidden instead of staying on screen.
- Block 5: the generalised RCBD is disabled unless some block × treatment cell has more than one plot (the requirement was declared in the catalogue but never checked, so selecting it gave a saturated model).
- Block 4: the model line now follows the response that is analysed (it kept the previous name after "Use"); the verdict names the transformed scale instead of saying "original scale"; the suggested transformation is the conventional power closest to the Box–Cox estimate when it passes the tests (the tomato example suggested ln(y + 1) for yields without zeros, now ln(y)).
- Theory cards: tables inside the collapsible sections wrap their text instead of overflowing the card.
- Block 2: the "local control" illustration of the theory card did not render (its gradient shared a fixed id with the copy on the home page); each copy now gets its own id.
- Home simulator: the vertical label of the field now reads "poor → fertile" (the fertility gradient runs from the top row to the bottom row, as the values show).
- Spanish user manual in progress under manual/ (cover, introduction and chapters for Blocks 1 to 5).

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
