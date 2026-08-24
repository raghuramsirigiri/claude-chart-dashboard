# Copilot instructions — chart-dashboard

This repository provides a reusable capability: turn supplied data into a single
self-contained HTML dashboard or report with interactive SVG charts. No CDN, no
npm install, no build step, no runtime dependencies.

Shared cross-tool instructions live in [`AGENTS.md`](../AGENTS.md); the canonical
workflow is [`skills/chart-dashboard/SKILL.md`](../skills/chart-dashboard/SKILL.md).
Read both before building a dashboard, analytics page, KPI view, or data report.

Before writing chart code, consult:

- `skills/chart-dashboard/references/chart-api.md` — every factory and option
- `skills/chart-dashboard/references/chart-selection.md` — data shape → chart type
- `skills/chart-dashboard/references/layout.md` — deriving the grid from the findings; spans and page structure
- `skills/chart-dashboard/references/annotation.md` — callouts, plot bands, forecast notation
- `skills/chart-dashboard/references/theming.md` — brand recolour and the generator scripts

Non-negotiables:

- Load `theme.js` before `charts.js`.
- Donut and pie options (`centerText`, `valueSuffix`, `variableRadius`,
  `startAngle`/`endAngle`, `showPercentages`) belong under `plotOptions.pie`.
- Never invent numbers that read as real measurements.
- No CDN links, npm dependencies, or build steps — output must open offline.
- Derive the grid from the analysis; a hero cell goes to a finding that leads.
- A line chart needs an ordered x — `'Jan 2025'`, not bare `'Jan'`.
- Any control must be fully wired: filtered data, every dependent panel redrawn,
  action titles recomputed.
