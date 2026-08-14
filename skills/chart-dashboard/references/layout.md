# Page layouts

Two formats. Pick one; don't blend prose-heavy narrative into a bento grid.

## Dashboard (`templates/dashboard.html`)

A 12-column CSS grid with `grid-auto-rows: 340px`. Panels are `.cell` divs with
span classes: `.w4 .w6 .w8 .w12` (columns) and `.h2` (double height). Each cell
holds one `<div class="chart" id="cN">`.

Reading order top-to-bottom, so sequence panels as: hero trend → composition →
drivers → segments → operational detail → full-width summary table/chart.

Proven rhythm for ~14 panels:

```
w8 h2 (hero line)   | w4 (donut) / w4 (pie)
w6 (columns)        | w6 (stacked columns)
w4 | w4 | w4        (three small comparisons)
w8 (bar ranking)    | w4 (scatter)
w12 (full-width timeline or 100% stacked)
```

Breakpoints already in the template: at 1100px everything collapses to 6
columns, at 700px to a single column. Don't add fixed pixel widths to cells.

Charts fill their cell (`.chart {width:100%;height:100%}`) and charts-lib
re-reads the container size on render, so a panel that looks cramped needs a
bigger span, not a chart-level width.

## Report (`templates/report.html`)

An 880px "paper" column: kicker, h1, deck, byline, abstract, then numbered `h2`
sections of prose with `<figure class="fig">` charts and captions. Figures are
380px tall full-width, or paired in `.grid2` at 340px.

Each figure needs a `<figcaption>` with a bolded figure number and one sentence
of interpretation — not a repeat of the title. Prose states the claim; the chart
is evidence for it.

## Both

- Background `--bg: #efece6`, panels/paper `--paper: #f4f3f0` — this matches
  `Charts.theme.bg`, so charts sit flush with their card. If you change one,
  change `Charts.theme.bg` to match.
- Header carries title, one-line scope, and the reporting window.
- Footer carries sources, definitions, and a note if any figure is illustrative.
- Everything stays in one HTML file plus the local `charts-lib/` folder — no CDN,
  no build step.
