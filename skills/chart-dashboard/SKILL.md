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
2. **Pick the format** (see `references/layout.md`):
   - **Dashboard** (default) — bento grid of many panels, no prose. Use
     `templates/dashboard.html`.
   - **Report** — narrative sections with figures and captions, for "write up",
     "retrospective", "analysis". Use `templates/report.html`.
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
- 8–20 panels for a dashboard; fewer, larger figures for a report.
- Lead with the hero metric: the most important trend goes in the wide top-left
  cell (`w8 h2` in the template).
- Every panel gets a `title` and a `subtitle` that states units and scope
  ("USD thousands · Q4 2025"). Put units in `yAxis.suffix` and
  `tooltip.valueSuffix` too.
- Order categorical bars by value, not alphabetically. Keep time on the x-axis
  left-to-right.
- Cap donuts at ~6 wedges; roll the tail into "Other".
- Don't restate a series in two panels unless the second adds a new cut.
- Annotate what matters: `callouts: [{ x, text }]` on line charts for spikes,
  launches, and anomalies mentioned by the user.

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

### Say what the data says, and stop

Chart titles, subtitles, the header scope line and the footer are labelling, not
copywriting. The reader is an adult looking at their own numbers.

- Title names the thing measured. Subtitle carries units, scope and window. That
  is the whole job.
- No editorial adjectives — "impressive growth", "concerning dip", "strong
  performance". If March is up 24%, the chart already says so, and the callout
  can say "+24% vs Feb, billing launch 3 March" without an opinion attached.
- No invented narrative furniture: no "Key insight" banners, no "Executive
  summary" block you wrote yourself, no highlighted takeaway strip across the
  top, no emoji, no "🚀". A dashboard is not a slide deck.
- The header is title, one line of scope, and the reporting window. The footer is
  sources, definitions, and any honesty notes (illustrative figures, carried-
  forward panels, data-quality caveats). Nothing else belongs in either.
- Conclusions the user themselves stated ("the March spike is the thing I need to
  explain") belong on the relevant chart as a callout, in their framing, not
  restated as your own analysis in a banner.

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
doesn't already have, no font pairing the brand didn't ask for. Full method in
`references/theming.md`.

The page has exactly four kinds of component, all already in the template:
**header**, optional **KPI row**, **chart panels**, **footer**. The KPI row
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
