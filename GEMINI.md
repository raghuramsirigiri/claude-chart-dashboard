# GEMINI.md — chart-dashboard

This repository provides a reusable capability: **turn supplied data into a
single self-contained HTML dashboard or report with interactive SVG charts** —
no CDN, no npm install, no build step.

Instructions are shared across all AI tools and live in
[`AGENTS.md`](AGENTS.md), which routes to the canonical
[`skills/chart-dashboard/SKILL.md`](skills/chart-dashboard/SKILL.md).

**Read `AGENTS.md` first, then `skills/chart-dashboard/SKILL.md`, and follow
that workflow** whenever the user asks for a dashboard, analytics page, KPI
view, chart deck, or illustrated data report.

Three rules that break the output if missed:

1. `theme.js` must load before `charts.js`.
2. Donut and pie options go under `plotOptions.pie`, never at the top level.
3. Never invent numbers that read as real measurements — label illustrative
   figures as illustrative, on the page.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
