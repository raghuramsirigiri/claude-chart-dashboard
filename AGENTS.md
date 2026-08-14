# AGENTS.md — chart-dashboard

Instructions for any AI coding agent working in or with this repository.
Vendor-neutral: no Claude-specific tools, formats, or APIs are required.

## What this repo provides

A reusable capability: **turn supplied data into a single self-contained HTML
dashboard or report with interactive SVG charts.** No CDN, no npm install, no
build step, no runtime dependencies.

The canonical instructions live in
[`skills/chart-dashboard/SKILL.md`](skills/chart-dashboard/SKILL.md). That file
is the source of truth — this one only routes you to it.

## When to use it

Any request to build a dashboard, analytics page, KPI view, chart deck, or
illustrated data report from data the user provides or describes — a table, CSV,
pasted numbers, metrics, notes, or a topic with figures in it.

## How to use it

1. Read [`skills/chart-dashboard/SKILL.md`](skills/chart-dashboard/SKILL.md) and
   follow its workflow.
2. Read these before writing chart code — do not guess option names:
   - [`references/chart-api.md`](skills/chart-dashboard/references/chart-api.md) — every factory and option
   - [`references/chart-selection.md`](skills/chart-dashboard/references/chart-selection.md) — data shape → chart type
   - [`references/layout.md`](skills/chart-dashboard/references/layout.md) — grid spans and page structure
3. Start from a template in `skills/chart-dashboard/templates/`.
4. Copy `skills/chart-dashboard/assets/charts-lib/` next to your output HTML.

## Non-negotiables

- `theme.js` must load **before** `charts.js`. Reversed, nothing renders.
- Donut and pie options (`centerText`, `valueSuffix`, `variableRadius`,
  `startAngle`/`endAngle`, `showPercentages`) live under `plotOptions.pie`, not
  at the top level. At the top level they are silently ignored.
- Never invent numbers that read as real measurements. If the user gave a topic
  with no data, say so and label the figures illustrative on the page itself.
- Do not add a CDN link, npm dependency, or build step. The output must open
  offline by double-click.

## Using this skill in a different project

Copy the skill folder into the target project and point your agent at it:

```bash
cp -r skills/chart-dashboard /path/to/your-project/.agent-skills/chart-dashboard
```

Then add to that project's `AGENTS.md` (or `GEMINI.md`, `CLAUDE.md`,
`.github/copilot-instructions.md` — whichever your tool reads):

```markdown
## Dashboards
When asked to build a dashboard, analytics page, or data report, follow
`.agent-skills/chart-dashboard/SKILL.md`.
```

## Repo layout

```
skills/chart-dashboard/   the skill: SKILL.md, references/, templates/, assets/
examples/                 two finished outputs, open index.html directly
docs/                     GitHub Pages landing page
.claude-plugin/           Claude Code plugin manifests (ignore for other tools)
```

## Contributing

New chart types need an entry in `references/chart-selection.md` — when to use
it and when not to — alongside the engine code. The selection guidance is what
makes the output good, not the renderer.
