# Page layouts

Three formats. Pick one; don't blend prose-heavy narrative into a bento grid,
and don't turn a deck into a report by filling its slides with paragraphs.

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

## Deck (`templates/slides.html`)

A scrolling column of 16:9 slides — the deck reads like a PDF open in a browser
tab: no ground colour, no progress bar, no next/back controls, nothing to click.
Each slide is authored at 1280x720 and scaled to the column with a transform, so
every slide is exactly 16:9 at any window size and nothing reflows. Print →
Save as PDF gives A4 landscape, one slide per sheet.

Markup is one `<div class="page">` per slide wrapping one
`<section class="slide l-…" data-title="…">`. The footer strip (deck name,
context, slide title, number) is generated from `data-title` and the slide's
position — don't write it by hand. Charts sit unframed on the slide, as figures
do in the report; the only filled surfaces are `.note`, the emphasised table
rows and the matrix quadrants.

Eighteen layout classes, grouped by the job the slide does:

| | |
|---|---|
| **Structure** | `l-cover` `l-agenda` `l-section` `l-statement` `l-quote` |
| **Evidence** | `l-split` `l-media` `l-full` `l-kpi` `l-compare` |
| **Analysis** | `l-three` `l-grid` `l-table` `l-matrix` |
| **Argument** | `l-list` `l-steps` `l-timeline` `l-stat` |

One layout per slide; don't blend two. A slide that seems to need a nineteenth
layout is usually two slides. `l-grid` uses the dashboard's own span classes
(`.w4 .w6 .w8 .w12 .h2`), so an overview slide and a dashboard panel stay one
system.

### Compose the sequence from the argument

The template ships one example of each layout so the markup is visible in one
place. That order is a catalogue, not a running order — a deck built by keeping
all nineteen example slides is a deck that argues nothing.

Write the claims first, one sentence each, in the order you would say them out
loud. That list *is* the deck: each claim becomes a slide's `h2`, and the layout
follows from what the claim needs to be believed — a chart and its reading
(`l-split`), a chart that carries the whole point (`l-full`, `l-media`), a
number (`l-stat`), a comparison on identical terms (`l-compare`), a sequence
(`l-steps`, `l-timeline`), a verbatim (`l-quote`). A claim needing no evidence
is an `l-statement`, and there should be only three or four of those in a deck
or the emphasis stops meaning anything.

Then: a cover, an `l-agenda` if the deck runs past a dozen slides, and an
`l-section` divider at each turn in the argument.

### Deck charts are not dashboard charts

Same library, different reading distance — someone is looking at this from
across a room, for about thirty seconds:

- Two or three series, never a legend of eight. A cut that needs more series is
  a cut that needs its own slide.
- Data labels on, so a value can be read without squinting at an axis.
- The chart's own `title` carries the claim and complements the slide's `h2`
  rather than repeating it word for word.
- A chart appears once in a deck. If the same series answers a second question,
  that is a second chart of the same data, cut differently.
- Two charts read as a comparison must share a y scale — set the same `max` on
  both. Left to themselves each fits its own data and the smaller option looks
  taller than it is.

## All three

- Colors come from `Charts.theme`, which is derived from `Charts.palette`. All
  three templates carry the same sync block, copying the theme's canvas, ink,
  muted, hairline and panel-surface values into the page's CSS variables at
  load, so charts sit flush with their surface and one `Charts.applyPalette`
  call reskins everything. Don't hand-edit the color literals in `:root` —
  change the palette. Method in `theming.md`.
- The page-level choices the theme does not set are `--radius`, and `--bg` — the
  ground behind the cards or the paper. Keep `--bg` a small step from
  `Charts.theme.bg`. The deck has no `--bg` at all: its ground is the slide
  colour itself, which is what makes it read as a document rather than a
  viewer.
- **Legend position is fixed**: charts-lib draws it at the top under the
  subtitle, on every chart type. Never reposition it per panel or rebuild it in
  HTML — a legend that moves between panels makes the reader search for it each
  time. Suppressing it is a per-*situation* decision applied consistently, not a
  per-panel fix for one cramped cell.
- Header carries title, one-line scope, and the reporting window — nothing else.
  No self-authored summary banner, insight strip, or editorial adjectives; see
  the copy rules in SKILL.md. (In a deck the cover does this job, and the
  generated per-slide footer carries the running context.)
- Footer carries sources, definitions, and a note if any figure is illustrative.
  A deck has no room for that strip on every slide: put it on a closing slide.
- Everything ships as **one** HTML file with the library inlined — no sibling
  folder, no CDN, no build step. See SKILL.md step 8.

## Fit the page to how it will be read

The templates are tuned for someone reading at a desk. When the user tells you
otherwise — and they usually do, in passing — adapt, because the same page fails
badly in a different context:

- **"Behind me on screen", "for the all-hands", "I'm presenting this"** — this
  is the deck's case, not a dashboard with bigger type: use
  `templates/slides.html` and give each claim its own slide. Where a deck is
  genuinely wrong — a live monitoring screen on a wall, say — keep the panels
  few, give each a lot of room, and scale the type up
  (`Charts.theme.titleSize`, `tickSize`, `valueSize`, and a larger `--kpi-value`
  step). A dense grid that works on a laptop is unreadable in a room.
- **"Send it round", "paste into the weekly update", "for the board pack"** — it
  will be read alone, without you narrating. Lean on subtitles and callouts to
  carry the context you would otherwise say out loud.
- **"Print it", "PDF"** — one column, no reliance on hover; tooltips don't exist
  on paper, so anything only visible on hover must also be a label.

None of this changes the design system — same palette, same type scale
relationships, same components. It changes how much you put on the page and at
what size.
