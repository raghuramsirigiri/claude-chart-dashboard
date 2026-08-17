# Page layouts

Two formats. Pick one; don't blend prose-heavy narrative into a bento grid.

## Dashboard (`templates/dashboard.html`)

A 12-column CSS grid with `grid-auto-rows: 340px`. Panels are `.cell` divs with
span classes: `.w4 .w6 .w8 .w12` (columns) and `.h2` (double height). Each cell
holds one `<div class="chart" id="cN">`.

Reading order top-to-bottom, so sequence panels by how the reader thinks:
headline finding → what it's made of → what drove it → who it happened to →
operational detail → full-width summary.

A rhythm that works when you have a dozen-ish findings — a starting point, not a
shape to fill:

```
w8 h2 (hero line)   | w4 (donut) / w4 (pie)
w6 (columns)        | w6 (stacked columns)
w4 | w4 | w4        (three small comparisons)
w8 (bar ranking)    | w4 (scatter)
w12 (full-width timeline or 100% stacked)
```

With fewer findings, use fewer, wider cells rather than leaving the grid sparse:
three panels read well as `w12` over `w6 + w6`, and two as a pair of `w6`. The
row height (`grid-auto-rows: 340px`) is a desk-reading default — raise it, and
the type scale with it, for anything projected.

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

That relationship also decides how many figures a report gets: one per claim that
needs proving. A section whose argument the reader will accept on its own reads
better without a chart than with a decorative one, and a claim with no figure
behind it is the one to either cut or go find evidence for.

## Both

- Colors come from `Charts.theme`. Both templates carry a sync block that copies
  the theme's canvas, ink, muted and hairline values into the page's CSS
  variables at load, so charts sit flush with their card and one override
  reskins everything. Don't hand-edit the color literals in `:root` — change the
  theme. Method in `references/theming.md`.
- `--bg` (the ground behind cards/paper) and `--radius` are the only page-level
  color/shape choices. Keep `--bg` a small step from `Charts.theme.bg`.
- **Legend position is fixed**: charts-lib draws it at the top under the
  subtitle, on every chart type. Never reposition it per panel or rebuild it in
  HTML — a legend that moves between panels makes the reader search for it each
  time. Suppressing it is a per-*situation* decision applied consistently, not a
  per-panel fix for one cramped cell.
- Header carries title, one-line scope, and the reporting window — nothing else.
  No self-authored summary banner, insight strip, or editorial adjectives; see
  the copy rules in SKILL.md.
- Footer carries sources, definitions, and a note if any figure is illustrative.
- Everything stays in one HTML file plus the local `charts-lib/` folder — no CDN,
  no build step.
