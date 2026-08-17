---
name: chart-dashboard
description: Build a self-contained HTML dashboard or data-story report from supplied information (metrics, tables, notes, pasted data, a topic), rendered with the bundled zero-dependency charts-lib SVG chart library. Use whenever the user asks for a dashboard, analytics page, KPI/bento view, chart deck, or illustrated report built from data they provide or describe.
---

# Chart dashboard

Turn whatever information the user gives — a table, pasted numbers, a set of
metrics, notes, or just a topic and some facts — into a single self-contained
HTML page of SVG charts rendered with `charts-lib`.

## Workflow

1. **Extract the data.** Pull every number, category, and time series out of the
   user's input into a short plan: for each planned panel note *title, chart
   type, categories, series*. If the user gave a topic with no numbers, say
   plainly that figures are illustrative and label them as such on the page.
   Never silently invent numbers that read as real measurements.

   Three things count as invention, and the last two are easy to miss:
   - **Filling a gap.** A missing week is a gap (`null`), not a zero — a zero
     draws a collapse that never happened.
   - **Estimating onto a real chart.** If you interpolate or model a value, it
     does not belong as another point on the primary trend, however carefully you
     dash the line or footnote it. Readers remember the shape, not the caveat.
     Put estimates in their own panel, or leave the hole visible.
   - **Rescaling stale numbers.** When you're updating an existing page and the
     user gave you new figures for only some panels, label the rest as carried
     forward. Nudging last quarter's numbers so they look current is fabrication
     even though every individual figure came from somewhere real.
2. **Pick the format by what the data has to say** (see `references/layout.md`).
   The question is whether the page states a conclusion or lets the reader draw
   their own:
   - **Dashboard** — a monitoring surface. Panels stand on their own, the reader
     scans for what changed, and no prose tells them what to think. Use
     `templates/dashboard.html`. This is the right default when the user hands
     you metrics without an argument attached.
   - **Report** — an argument with evidence. Reach for it when the user is trying
     to convince someone ("write up", "for the board", "retrospective",
     "analysis"), or when they told you the conclusion themselves and the page
     exists to support it. Use `templates/report.html`.

   When it's genuinely ambiguous, ask yourself who reads it and whether you will
   be in the room. Nobody presents a bento grid to a board, and nobody watches a
   five-section narrative to see if last night's numbers moved.
3. **Copy the library** next to the output file, then copy the template. Both
   live in this skill's own directory — resolve `assets/charts-lib/` and
   `templates/` relative to the directory containing this SKILL.md, never from a
   hard-coded home path. Use whatever file-copy method your environment provides
   (`cp -r` on POSIX, `Copy-Item -Recurse` on PowerShell, or a file-write tool):
   ```
   <skill-dir>/assets/charts-lib   →  ./charts-lib
   <skill-dir>/templates/dashboard.html  →  ./index.html
   ```
   Keep the template's `<script src="charts-lib/theme.js">` before
   `charts-lib/charts.js` — theme must load first.
4. **Choose a chart per panel** using `references/chart-selection.md`, then write
   the config against `references/chart-api.md` (the full charts-lib API: every
   factory, option, and theme token). Read that file before writing chart code —
   don't guess option names.
5. **If the user pointed at a brand** — their site, a stylesheet, a screenshot, a
   set of hex codes — recolor to match, and change nothing else. Read
   `references/theming.md` and run the bundled extractor:
   ```bash
   node <skill-dir>/scripts/extract-theme.js <their-css-or-html>
   ```
   It maps their palette onto charts-lib's color roles, builds a series ramp from
   their accent, and reports contrast failures. Paste its `Charts.theme` block in
   once, before the first chart call. Fix anything it marks FAIL rather than
   shipping it.
6. **Verify before reporting done.** Use the strongest check your environment
   supports:
   - *Browser tooling available* — open the file, read the console for errors,
     and screenshot it to confirm layout. (In Claude Code: `preview_start`, then
     `read_console_messages` and a screenshot. Serve over a local HTTP server
     rather than `file://` so the scripts execute.)
   - *No browser tooling* — run this static check and fix anything it reports:
     ```bash
     node -e "const h=require('fs').readFileSync('index.html','utf8');
     const ids=[...h.matchAll(/id=\"(c\d+|f\d+)\"/g)].map(m=>m[1]);
     const calls=[...h.matchAll(/Charts\.\w+\(\s*'([^']+)'/g)].map(m=>m[1]);
     const orphan=ids.filter(i=>!calls.includes(i));
     const ghost=calls.filter(c=>!ids.includes(c));
     console.log(orphan.length||ghost.length
       ? 'MISMATCH panels without charts: '+orphan+' | charts without panels: '+ghost
       : 'OK '+ids.length+' panels, all wired');"
     ```
   Either way, fix any panel that renders empty or overflows its cell first.

## Rules that keep output good

- One idea per panel. A panel whose title needs "and" is two panels.
- Lead with the finding that matters most: if one trend is the reason the page
  exists, give it the wide top-left cell (`w8 h2`). If nothing dominates — three
  equally important measures, say — don't manufacture a hero; equal panels are
  the honest layout.
- Every panel gets a `title` and a `subtitle` that states units and scope
  ("USD thousands · Q4 2025"). Put units in `yAxis.suffix` and
  `tooltip.valueSuffix` too.
- Order categorical bars by value, not alphabetically. Keep time on the x-axis
  left-to-right.
- Donuts stop being readable somewhere around six wedges — below a few percent
  the angles are indistinguishable and the reader is just reading the legend.
  Roll the tail into "Other", or use a ranked bar list if the tail is the point.
- Don't restate a series in two panels unless the second adds a new cut.
- Annotate what matters: `callouts: [{ x, text }]` on line charts for spikes,
  launches, and anomalies mentioned by the user.

### How many charts? One per finding — no quota, no padding

The page is not a container to fill up. Each panel should answer a question the
reader actually has, and the count falls out of the data rather than out of a
target. Ask of every panel: *what would the reader do differently after seeing
this?* If the answer is nothing, it isn't a panel.

That cuts both ways, and both failures are common:

- **Padding.** Given four numbers from an A/B test, the honest page is two or
  three panels and a plain statement of the lift. Filling a twelve-cell grid
  means inventing a donut of two nearly-identical sample sizes, a fabricated
  daily time series, a "by segment" split nobody measured. The moment you are
  reaching for something to chart, you have run past the end of the data — stop
  there. A small page that answers the question is a better deliverable than a
  full grid that pads it, even though the full grid looks more impressive at a
  glance.
- **Compression.** Given twenty measures that each carry a finding, don't force
  them into eight panels by stacking unrelated series onto shared axes. Let the
  page be long.

When there are only a few panels, widen them (`w6`/`w8`/`w12`) so the grid still
reads as a designed page rather than a half-empty one — a two-panel dashboard is
two big panels, not two small panels marooned top-left.

Reports work the same way: a figure exists because a claim in the prose needs
evidence. A section that states no claim needs no chart, and a claim the reader
will accept without proof doesn't need one either.

### Fit the page to how it will be read

The templates are tuned for someone reading at a desk. When the user tells you
otherwise — and they usually do, in passing — adapt, because the same page fails
badly in a different context:

- **"Behind me on screen", "for the all-hands", "I'm presenting this"** — a
  projector is read from ten feet away by someone who gets thirty seconds per
  slide. Use few panels, give each a lot of room, and scale the type up
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

### Legends go in one place

charts-lib puts the legend at the top, under the subtitle, and shows it
automatically once a chart has two or more series or wedges. Leave it there. A
reader scanning a grid of panels learns the legend's location once; a page where
it sits above one chart, beside another and below a third makes them re-hunt for
it every time, and that hunting is the entire cost of an inconsistent layout.

So: don't pass `legend` position options per chart, don't build legends in HTML
next to the chart, and don't hand-place colored dots in a panel's corner. If a
legend genuinely doesn't earn its space — single-series panels, or a donut whose
wedges are already labelled by callouts — turn it off with
`legend: { enabled: false }` **for every panel in that situation**, not just the
cramped one. The only sanctioned alternative is charts-lib's own
`lineLabels: 'inline'`, and if you use it on one line chart, use it on all of
them.

### Put the finding in the title, not in a quote box

A chart titled "Weekly throughput by site" makes the reader do the work of
finding the point. A chart titled "Throughput fell 12% the week of the WMS
cutover" hands it to them and then proves it underneath. That is an **action
title**: the headline states what the data shows, and the chart is the evidence.
The insight lives in the chart's own hierarchy, so it travels with the figure
into a screenshot, a slide, or an email.

The title-subtitle pair splits cleanly:

```
title:    'Throughput fell 12% the week of the WMS cutover'   ← the finding
subtitle: 'Units picked per week by site · W01–W04 2026'      ← units, scope, window
```

The subtitle keeps doing its old job. What changes is that the title is allowed —
preferred — to say what happened, when the data supports a specific claim.

**This is not licence to editorialize.** The line is whether the chart proves the
sentence:

| Write this | Not this | Why |
|:--|:--|:--|
| "Throughput fell 12% the week of the cutover" | "Concerning dip in throughput" | The first is measurable off the chart; the second is a verdict the reader should reach themselves |
| "Billing drives 27% of all tickets" | "Billing is a serious problem" | Same fact, but the second adds an opinion the data doesn't contain |
| "Weekly throughput by site" | "Throughput improving steadily" | When no single finding dominates, a plain descriptive title is the honest choice — don't manufacture a headline |

So: adjectives and verdicts stay out, quantified findings come in. If you cannot
put a number or a specific comparison in the title, you probably don't have a
finding, and a descriptive title is right.

- No invented narrative furniture that repeats what a chart already says: no
  "Key insight" banners, no "Executive summary" you wrote yourself, no
  highlighted takeaway strip across the top, no emoji, no "🚀".
- The header is title, one line of scope, and the reporting window. The footer is
  sources, definitions, and any honesty notes (illustrative figures, carried-
  forward panels, data-quality caveats). Nothing else belongs in either.
- Conclusions the user themselves stated ("the March spike is the thing I need to
  explain") belong on the relevant chart — as its title or a callout, in their
  framing — not restated as your own analysis in a banner.

### Where a finding goes: action title, or soft surface card

Two containers, and the choice between them is almost mechanical. Ask: **can one
chart prove this sentence on its own?**

**Yes → action title.** It belongs in that chart's `title`, with the descriptive
detail moving to `subtitle`. The finding and its evidence stay welded together,
which is what makes the figure survive being screenshotted out of context.

**No → soft surface card** (`.note` in both templates). Use it for text that no
single figure carries:

- a caveat that changes how several figures should be read ("labor hours don't
  reconcile with the stated total; site rows used")
- an honesty note (illustrative figures, carried-forward panels)
- a method or definition the reader needs up front
- the ask, in a report — what you want the reader to do

The card is a low-contrast fill, not a bordered pull-quote. A `border-left` bar
or a big italic quote is decoration borrowed from editorial layout: it shouts
without adding information, and on a dark theme the coloured bar becomes the
loudest thing on the page. The soft fill does the same separating job by sitting
a few percent off the canvas, so the text is set apart and nothing competes with
the data. `--surface-soft` is computed from the theme, so it inverts correctly on
dark brands.

**Never both for the same sentence.** A card restating a title that already says
it is the "AI slop" failure in a new costume — the reader reads the same finding
twice and trusts the page less. If you catch yourself writing a card that
paraphrases a chart, delete the card; the title is doing the work.

Pull quotes are out entirely. A quote needs a speaker, and in a data page there
isn't one — you are quoting yourself, which is why it reads as filler. If a
number deserves that much emphasis, it is a KPI tile or a chart of its own.

When a page needs argument and prose, that is the report format — where the
narrative is the point and every claim is tied to a figure. Don't smuggle
report-style commentary into a dashboard.

### One design system, only the colors change

Every visible component follows charts-lib's design language: its type scale,
weights, spacing rhythm, stroke widths, hairlines, legend position and chart
geometry. Those proportions are what make ten different chart types read as one
family, and the page chrome inherits them so the cards don't look bolted on.

The colors are the exception, and the only exception. When a user supplies a
brand, recolor via `Charts.theme` — once, before the first factory call, never
per chart — and let the page chrome pick those same values up from the sync
block in the template. Corner radius may follow the brand too, since square vs.
rounded is a brand signature the charts themselves don't express.

Do not introduce a second visual system on top: no custom card headers with
their own type scale, no gradient hero panels, no shadows or borders the template
doesn't already have.

Type is the one place where copying the brand usually backfires. Most brand faces
are licensed webfonts you cannot load into a local file, and naming one in
`font-family` just falls through to a system fallback you didn't choose — worse
than keeping charts-lib's stack, which was picked to work at 11px in a chart.
Match the brand's font only when the face is genuinely available (a system font,
or a file the user supplied). Full method in `references/theming.md`.

The page has exactly five kinds of component, all already in the template:
**header**, optional **KPI row**, **chart panels**, optional **soft surface
card** (`.note`), **footer**. The KPI row
exists because headline figures genuinely help — use the template's `.kpi`
markup, which is sized off the chart type scale so the tiles look like they
belong to the same page. Writing your own KPI strip with new CSS is the most
common way this page ends up looking like two designs stapled together, and it
is the thing to resist even though it feels helpful. A KPI tile is a label, a
number, and at most one line of plain context — no arrows, no red/green verdicts,
no "▲ 12% vs LY" badges.

If you find yourself writing new CSS classes, stop and ask whether a chart panel
would carry the information better. Usually it would.

## Output

Write the page to the working directory (or where the user asked). Then surface
it however your environment does that — attach or render the file if you can (in
Claude Code: `SendUserFile` with `display: "render"`); otherwise print the
absolute path and tell the user to open it in a browser. Either way, state which
figures came from the user's data and which, if any, were illustrative.

## Environment notes

Nothing in this skill requires a specific agent or vendor. It needs only the
ability to read files from this directory, write an HTML file, and copy a
folder. Browser preview, screenshots, and file attachment are used when
available and degrade gracefully when not.
