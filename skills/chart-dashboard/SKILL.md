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
   hard-coded home path:
   ```bash
   cp -r "<skill-dir>/assets/charts-lib" ./charts-lib
   cp "<skill-dir>/templates/dashboard.html" ./index.html
   ```
   Keep the template's `<script src="charts-lib/theme.js">` before
   `charts-lib/charts.js` — theme must load first.
4. **Choose a chart per panel** using `references/chart-selection.md`, then write
   the config against `references/chart-api.md` (the full charts-lib API: every
   factory, option, and theme token). Read that file before writing chart code —
   don't guess option names.
5. **Verify in the browser.** `preview_start` on the file, then
   `read_console_messages` for errors and a screenshot to confirm layout. Fix any
   panel that renders empty or overflows its cell before reporting done.

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
- Keep the default theme unless the user asks otherwise. To reskin, override
  `Charts.theme.*` once before the first factory call — never per chart.

## Output

Write the page to the working directory (or where the user asked), then send it
with `SendUserFile` (`display: "render"`). State which figures came from the
user's data and which, if any, were illustrative.
