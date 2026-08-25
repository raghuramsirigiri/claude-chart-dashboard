# Page layouts

Two formats. Pick one; don't blend prose-heavy narrative into a bento grid.

## Dashboard (`templates/dashboard.html`)

A 12-column CSS grid with `grid-auto-rows: 340px`. Panels are `.cell` divs with
span classes: `.w4 .w6 .w8 .w12` (columns) and `.h2` (double height). Each cell
holds one `<div class="chart" id="cN">`.

## Compose the grid from the findings — there is no house shape

The single most common failure of this skill is that every page it produces
opens the same way: a wide hero line chart with a donut and a small panel beside
it, then two halves, then a full-width strip. That shape is not wrong — it is
just one answer, and it gets reused because it is the first thing that comes to
mind, not because the data asked for it.

So the grid is **derived**, not recalled. Before writing any HTML, take the
panel plan from step 1 and answer three questions in order:

1. **What is the dominant shape of the analysis?** One trend that everything
   else explains? A comparison between two named things? A ranked list? A
   process that loses volume at each step? A distribution? A set of parallel,
   equally-weighted measures? A geography?
2. **Which single panel is the reason the page exists** — and is there one?
   Often there isn't, and a page with a manufactured hero misleads by layout
   before a single number is read.
3. **What does the reader need second** — the breakdown of the hero, its driver,
   or a different measure entirely?

The answer to (1) picks an opening; (2) and (3) size it. Below are seven
openings that fall out of common shapes. They are worked examples of the
derivation, **not a menu to pick from at random and not a set to cycle
through** — if your data's shape isn't here, build the row that fits it.

| Dominant shape of the analysis | Opening row that fits it |
|:--|:--|
| One trend dominates; the rest explains it | `w8 h2` hero line, `w4` + `w4` stacked beside it |
| Two things being compared head-to-head | `w6` + `w6` — the comparison is the top row, symmetric because neither side leads |
| A ranking is the finding | `w12` bar ranking (or `barInsightTable`) across the top; the cuts of it come after |
| A funnel / sequence with drop-off | `w12` funnel or waterfall first — the sequence needs the width to stay legible |
| Parallel measures, none dominant | `w4 · w4 · w4` (or `w6 · w6`) of equal weight — the honest layout when nothing leads |
| Distribution or spread is the point | `w6` histogram/box + `w6` scatter; the shape and the relationship together |
| Geography leads | `w8` geofacet + `w4 h2` ranked list of the same measure |
| A few big findings, long tail of detail | one `w12` statement panel, then `w4`s — decreasing weight down the page |

Two rules constrain whatever you build:

- **A hero must be earned.** Give a panel `w8 h2` only when one finding is
  genuinely the reason the page exists. Three co-equal measures get three equal
  cells; promoting one of them is an editorial claim the data doesn't make.
- **Don't repeat last page's opening by reflex.** If the row you just wrote is
  hero-line + donut + small panel, stop and check that it came from question (1)
  rather than from habit. If a donut is in the top row, it should be there
  because composition is the second thing the reader needs — not because the
  hero left a `w4` hole and a donut fits a `w4` hole.

Reading order is top-to-bottom, so sequence panels by how the reader thinks:
whatever leads → what it's made of → what drove it → who it happened to →
operational detail → summary. The *content* of that sequence changes completely
with the analysis; only the direction of travel is fixed.

With fewer findings, use fewer, wider cells rather than leaving the grid sparse:
three panels read well as `w12` over `w6 + w6`, and two as a pair of `w6`. The
row height (`grid-auto-rows: 340px`) is a desk-reading default — raise it, and
the type scale with it, for anything projected.

The KPI row and the filter bar are optional in the same way: a KPI row earns its
place when there are headline figures a reader quotes ("we did 1.2M, up from
980k"), and is padding when the page's numbers are all relational. Delete the
block rather than filling it with the first three numbers you have.

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

- Colors come from `Charts.theme`, which is derived from `Charts.palette`. Both
  templates carry a sync block that copies the theme's canvas, ink, muted,
  hairline and panel-surface values into the page's CSS variables at load, so
  charts sit flush with their card and one `Charts.applyPalette` call reskins
  everything. Don't hand-edit the color literals in `:root` — change the
  palette. Method in `references/theming.md`.
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
