# Graph Report - claude-chart-dashboard  (2026-09-18)

## Corpus Check
- 38 files · ~352,457 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 840 nodes · 1792 edges · 42 communities (39 shown, 3 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ea33e63d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- render
- Chart
- Chart
- extract-theme.js
- chart-dashboard skill
- Q4 2025 E-commerce Analytics Dashboard Screenshot
- Q4 2025 E-commerce Analytics Dashboard Screenshot
- AGENTS.md — vendor-neutral agent instructions
- Emphasis mode
- 880px report paper column
- KPI row component
- Keep charts-lib font stack unless face is local
- page-editor.js
- chart-convert.js
- assets/charts-lib/charts.js
- check-page.js
- Chart
- page-runtime.js
- el
- generate-theme.js
- addCommas
- finalize.js
- renderPacked
- Intervention and forecast
- Chart selection matrix
- Editable pages
- renderGrid
- fetch-design.js
- chart-convert.test.js
- 1. Packed bubbles honour a point's own `color`
- Scenario notation (IBCS actual/plan/forecast)
- chromaOf
- inline-lib.js
- extract-theme.js extractor
- Dashboard build workflow (6 steps)
- contrast
- Where the words go
- toRgb
- controls.md

## God Nodes (most connected - your core abstractions)
1. `Chart()` - 127 edges
2. `Chart()` - 55 edges
3. `Chart()` - 55 edges
4. `render()` - 52 edges
5. `render()` - 37 edges
6. `render()` - 37 edges
7. `el()` - 27 edges
8. `Q4 2025 E-commerce Analytics Dashboard Screenshot` - 24 edges
9. `Q4 2025 E-commerce Analytics Dashboard Screenshot` - 24 edges
10. `el()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `SoftwareApplication and FAQPage JSON-LD` --semantically_similar_to--> `chart-dashboard Claude Agent Skill`  [INFERRED] [semantically similar]
  docs/index.html → README.md
- `Copilot Instructions — chart-dashboard` --semantically_similar_to--> `GEMINI.md — Gemini CLI instructions`  [INFERRED] [semantically similar]
  .github/copilot-instructions.md → GEMINI.md
- `enter()` --indirect_call--> `cell()`  [INFERRED]
  examples/ev-retrospective/charts-lib/charts.js → skills/chart-dashboard/assets/page-editor.js
- `enter()` --indirect_call--> `cell()`  [INFERRED]
  examples/q4-ecommerce/charts-lib/charts.js → skills/chart-dashboard/assets/page-editor.js
- `Paper-column narrative layout` --implements--> `Dashboard vs Report output formats`  [INFERRED]
  examples/ev-retrospective/index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **charts-lib factory functions** — skills_chart_dashboard_references_chart_api_charts_line, skills_chart_dashboard_references_chart_api_charts_column, skills_chart_dashboard_references_chart_api_charts_bar, skills_chart_dashboard_references_chart_api_charts_barlist, skills_chart_dashboard_references_chart_api_charts_donut, skills_chart_dashboard_references_chart_api_charts_pie, skills_chart_dashboard_references_chart_api_charts_scatter, skills_chart_dashboard_references_chart_api_charts_bubble, skills_chart_dashboard_references_chart_api_charts_packedbubble, skills_chart_dashboard_references_chart_api_charts_geofacet [EXTRACTED 1.00]
- **Emphasis system (accent + muted, status, annotation)** — skills_chart_dashboard_references_chart_selection_emphasis, skills_chart_dashboard_references_chart_selection_three_heuristics, skills_chart_dashboard_references_chart_selection_scenario_notation, skills_chart_dashboard_references_chart_selection_grouped_focus, skills_chart_dashboard_references_chart_selection_annotation_emphasis, skills_chart_dashboard_references_chart_api_per_point_color, skills_chart_dashboard_references_chart_api_muted_token [EXTRACTED 1.00]
- **Non-negotiable output rules repeated across all agent files** — agents_theme_before_charts_rule, agents_plotoptions_pie_nesting, agents_no_invented_numbers, agents_zero_dependency_offline_output [EXTRACTED 1.00]
- **One source of colour truth: theme → charts → page chrome** — skills_chart_dashboard_references_theming_extract_theme_js, skills_chart_dashboard_references_chart_api_charts_theme, skills_chart_dashboard_references_layout_theme_sync_block, skills_chart_dashboard_templates_dashboard_surface_soft, skills_chart_dashboard_skill_one_design_system [EXTRACTED 1.00]
- **Per-tool instruction files all route to SKILL.md** — _github_copilot_instructions_copilot_instructions, gemini_gemini_md, agents_agents_md, readme_chart_dashboard_skill [EXTRACTED 1.00]
- **Charts-Lib Chart Type Coverage Showcase** — docs_screenshot_charts_lib_gallery, docs_screenshot_buyer_age_distribution, docs_screenshot_product_landscape, docs_screenshot_warehouse_stock, docs_screenshot_weekly_temperature_range, docs_screenshot_category_share [INFERRED 0.75]
- **Part-to-Whole Chart Family (Donut, Pie, Gauge, Stacked)** — examples_screenshot_revenue_by_channel, examples_screenshot_sessions_by_device, examples_screenshot_csat_distribution, examples_screenshot_refunds_by_category, examples_screenshot_payment_method_share [INFERRED 0.75]
- **Sessions-to-Purchase Conversion Narrative** — examples_screenshot_sessions_by_device, examples_screenshot_purchase_funnel, examples_screenshot_orders_by_customer_type, examples_screenshot_payment_method_share [INFERRED 0.85]
- **Self-contained example outputs sharing library and theme** — examples_q4_ecommerce_index_dashboard, examples_ev_retrospective_index_report, readme_charts_lib, examples_q4_ecommerce_index_cream_ink_theme [INFERRED 0.85]
- **Marketing Spend Efficiency Analysis** — examples_screenshot_marketing_roi, examples_screenshot_campaign_spend_vs_revenue, examples_screenshot_diminishing_returns, examples_screenshot_revenue_by_channel [INFERRED 0.85]
- **Part-to-Whole Share Chart Pattern** — docs_screenshot_revenue_by_channel, docs_screenshot_sessions_by_device, docs_screenshot_csat_distribution, docs_screenshot_marketing_roi, docs_screenshot_refunds_by_category, docs_screenshot_payment_method_share [INFERRED 0.85]
- **Weekly W40-W52 Time Series Chart Family** — docs_screenshot_weekly_gross_revenue, docs_screenshot_orders_by_customer_type, docs_screenshot_purchase_funnel, docs_screenshot_warehouse_stock, docs_screenshot_weekly_temperature_range [INFERRED 0.85]

## Communities (42 total, 3 thin omitted)

### Community 0 - "render"
Cohesion: 0.10
Nodes (33): arcSegment(), calloutInBounds(), calloutKey(), calloutOverlap(), calloutTheme(), angleRad(), catCenterX(), catCenterY() (+25 more)

### Community 1 - "Chart"
Cohesion: 0.07
Nodes (68): addCommas(), applyTheme(), applyThemeColors(), arcSegment(), Chart(), angleRad(), catCenterX(), catCenterY() (+60 more)

### Community 2 - "Chart"
Cohesion: 0.07
Nodes (68): addCommas(), applyTheme(), applyThemeColors(), arcSegment(), Chart(), angleRad(), catCenterX(), catCenterY() (+60 more)

### Community 3 - "extract-theme.js"
Cohesion: 0.04
Nodes (34): all, argv, bgs, bodyBgs, borders, css, ctx, { execFileSync } (+26 more)

### Community 4 - "chart-dashboard skill"
Cohesion: 0.23
Nodes (12): charts-lib API, Charts.theme tokens, lineLabels inline end-of-line labels, Page layouts, Theme → CSS variable sync block, Matching a reference brand, chart-dashboard skill, Legends go in one place (+4 more)

### Community 5 - "Q4 2025 E-commerce Analytics Dashboard Screenshot"
Cohesion: 0.10
Nodes (28): Point Annotation Callouts (Black Friday, Cyber Monday), Insight: Black Friday / Cyber Monday Drive Q4 Revenue Peak, Buyer Age Distribution Population Pyramid, Campaign Spend vs Revenue Scatter with Trendline, Multi-Column Card Grid Layout, Category Revenue by Month Grouped Columns, Category Share Packed Bubbles (Empty Render), Charts-Lib Capability Gallery (Chart Type Showcase) (+20 more)

### Community 6 - "Q4 2025 E-commerce Analytics Dashboard Screenshot"
Cohesion: 0.10
Nodes (27): Annotation Callouts (Black Friday, Cyber Monday), Bento Grid Card Layout Pattern, Buyer Age Distribution Population Pyramid, Campaign Spend vs Revenue Scatter with Trend, Category Revenue by Month Grouped Columns, Category Share Packed Bubbles (empty render), Charts-Lib Chart Type Gallery / Regression Showcase, CSAT Distribution Semi-Circle Donut (+19 more)

### Community 7 - "AGENTS.md — vendor-neutral agent instructions"
Cohesion: 0.11
Nodes (23): Copilot Instructions — chart-dashboard, AGENTS.md — vendor-neutral agent instructions, Never invent numbers that read as real measurements, Donut/pie options nest under plotOptions.pie, theme.js must load before charts.js, Zero-dependency self-contained offline output, GitHub Pages landing page, SoftwareApplication and FAQPage JSON-LD (+15 more)

### Community 8 - "Emphasis mode"
Cohesion: 0.18
Nodes (11): Per-point color override, Re-call factory on same container id (update path), Annotation as the emphasis, Emphasis mode, Three emphasis heuristics, Threshold colouring against a target line, Action title, render(state) filter wiring pattern (+3 more)

### Community 9 - "880px report paper column"
Cohesion: 0.67
Nodes (3): 880px report paper column, One finding per panel (no quota, no padding), figure.fig + figcaption pattern

### Community 15 - "page-editor.js"
Cohesion: 0.06
Nodes (98): addTabStops(), afterHistory(), applyConfig(), applyStyle(), box(), calloutsTab(), apply(), change() (+90 more)

### Community 16 - "chart-convert.js"
Cohesion: 0.10
Nodes (47): anchorOf(), build(), calloutAnchors(), calloutList(), carry(), cellConfig(), clearWidths(), clone() (+39 more)

### Community 17 - "assets/charts-lib/charts.js"
Cohesion: 0.08
Nodes (37): carryStateForward(), formatHeader(), planCatAxis(), composeCenters(), dashArrayFor(), dateBoundaries(), build(), fits() (+29 more)

### Community 18 - "check-page.js"
Cohesion: 0.07
Nodes (30): argv, badAxes, boxed, calls, code, codeCalls, DAYS, editTags (+22 more)

### Community 19 - "Chart"
Cohesion: 0.10
Nodes (19): allocateWidths(), canvasColor(), Chart(), applyExtraTheme(), applyRadarTheme(), applyTheme(), applyThemeColors(), calloutBandPx() (+11 more)

### Community 20 - "page-runtime.js"
Cohesion: 0.12
Nodes (21): clone(), draw(), drawPercentTable(), contentWidth(), render(), errorOf(), getEntry(), grids() (+13 more)

### Community 21 - "el"
Cohesion: 0.14
Nodes (23): contrastText(), dash(), drawBar(), drawCell(), drawFill(), drawValueAxisMarks(), errorChart(), hatchFor() (+15 more)

### Community 22 - "generate-theme.js"
Cohesion: 0.24
Nodes (18): clamp01(), contrast(), generatePalette(), hex(), hexOf(), hslToRgb(), hueDist(), inGamut() (+10 more)

### Community 23 - "addCommas"
Cohesion: 0.16
Nodes (18): addCommas(), axisLabel(), enter(), fmt(), fmtY(), formatY(), readCell(), showResetBtn() (+10 more)

### Community 24 - "finalize.js"
Cohesion: 0.13
Nodes (13): argv, built, EDITABLE_FILES, fs, LIB, LIB_FILES, path, shipped (+5 more)

### Community 25 - "renderPacked"
Cohesion: 0.23
Nodes (14): fillOf(), rampAt(), renderPacked(), scaleFill(), contrast(), darken(), gradientColors(), hex2rgb() (+6 more)

### Community 26 - "Intervention and forecast"
Cohesion: 0.14
Nodes (13): Annotation instead of recolouring, Colour and stroke are per-series — so a switch means two series, Interior gaps need `type:'line'`, Intervention and forecast, Marking up a chart, Reference marks, Saying what the notation means, The two guardrails (+5 more)

### Community 27 - "Chart selection matrix"
Cohesion: 0.18
Nodes (11): Charts.bubble, Charts.donut, Charts.geofacet, Charts.line, Charts.packedBubble, Charts.pie, Charts.scatter, Geofacet variant (bar/heat/gauge) (+3 more)

### Community 28 - "Editable pages"
Cohesion: 0.18
Nodes (10): A working copy says so wherever it goes, Authoring rules, Build and verify, Editable pages, Saving, Switching a chart's type, The editor, The format (+2 more)

### Community 29 - "renderGrid"
Cohesion: 0.27
Nodes (10): angleOf(), layoutCell(), pointAt(), radiusOf(), renderGrid(), renderHover(), ringPath(), _clipLine() (+2 more)

### Community 30 - "fetch-design.js"
Cohesion: 0.24
Nodes (8): fetchDesign(), fs, get(), http, https, path, slug(), { URL }

### Community 31 - "chart-convert.test.js"
Cohesion: 0.20
Nodes (7): assert, ASSETS, CC, FIXTURES, MORE, path, test

### Community 32 - "1. Packed bubbles honour a point's own `color`"
Cohesion: 0.25
Nodes (7): 1. Packed bubbles honour a point's own `color`, Apply and verify, Change, charts-lib: changes to apply upstream, Current state, Problem, Why the skill needs it

### Community 33 - "Scenario notation (IBCS actual/plan/forecast)"
Cohesion: 0.29
Nodes (7): Charts.bar, Charts.barList, Charts.column, Data labels defaults, IBCS business-reporting convention, Scenario notation (IBCS actual/plan/forecast), inverseText dark-mode flip

### Community 34 - "chromaOf"
Cohesion: 0.33
Nodes (7): byPresence(), candidates, chromaOf(), danger, rankBrand(), useOf(), warn

### Community 35 - "inline-lib.js"
Cohesion: 0.29
Nodes (6): ASSETS, files, fs, LIB, path, TARGETS

### Community 36 - "extract-theme.js extractor"
Cohesion: 0.33
Nodes (6): muted / mutedScale tokens, Grouped chart series-vs-cluster focus, Six charts-lib color roles, Contrast thresholds (4.5:1 / 3:1 / grid 1.1-1.6:1), extract-theme.js extractor, Series ramp from one accent

### Community 37 - "Dashboard build workflow (6 steps)"
Cohesion: 0.40
Nodes (5): 12-column bento grid, Data invention prohibition, Static panel/chart wiring check, Dashboard build workflow (6 steps), .bento grid CSS

### Community 38 - "contrast"
Cohesion: 0.40
Nodes (5): brandPool, contrast(), inkCandidates, luminance(), saturation()

### Community 39 - "Where the words go"
Cohesion: 0.50
Nodes (3): Put the finding in the title, not in a quote box, Where a finding goes: action title, insight column, or soft surface card, Where the words go

### Community 40 - "toRgb"
Cohesion: 0.67
Nodes (3): byCount(), hslToRgb(), toRgb()

## Ambiguous Edges - Review These
- `Charts-Lib Capability Gallery (Chart Type Showcase)` → `Category Share Packed Bubbles (Empty Render)`  [AMBIGUOUS]
  examples/screenshot.png · relation: conceptually_related_to
- `Category Share Packed Bubbles (empty render)` → `Charts-Lib Chart Type Gallery / Regression Showcase`  [AMBIGUOUS]
  docs/screenshot.png · relation: references

## Knowledge Gaps
- **149 isolated node(s):** `fs`, `argv`, `isFinal`, `target`, `html` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Charts-Lib Capability Gallery (Chart Type Showcase)` and `Category Share Packed Bubbles (Empty Render)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Category Share Packed Bubbles (empty render)` and `Charts-Lib Chart Type Gallery / Regression Showcase`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `cell()` connect `page-editor.js` to `Chart`, `Chart`, `addCommas`?**
  _High betweenness centrality (0.251) - this node is a cross-community bridge._
- **Why does `Chart()` connect `Chart` to `render`, `chart-convert.js`, `assets/charts-lib/charts.js`, `el`, `addCommas`, `renderPacked`, `renderGrid`?**
  _High betweenness centrality (0.222) - this node is a cross-community bridge._
- **Why does `enter()` connect `addCommas` to `Chart`, `page-editor.js`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Chart()` (e.g. with `valueOf()` and `enter()`) actually correct?**
  _`Chart()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Chart()` (e.g. with `enter()` and `hideTooltip()`) actually correct?**
  _`Chart()` has 3 INFERRED edges - model-reasoned connections that need verification._