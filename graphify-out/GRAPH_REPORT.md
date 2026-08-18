# Graph Report - claude-chart-dashboard  (2026-08-18)

## Corpus Check
- 31 files · ~182,871 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 390 nodes · 781 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 93% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.79)
- Token cost: 199,995 input · 0 output

## Community Hubs (Navigation)
- Charts-Lib Skill Asset Source
- EV Retrospective Charts Copy
- Q4 Ecommerce Charts Copy
- Theme Extraction Tool
- Chart API and Selection Docs
- Dashboard Screenshot Panels (docs)
- Dashboard Screenshot Panels (examples)
- Agent Instructions and Landing Page
- Emphasis and Color Token System
- Report Paper-Column Layout
- KPI Row Component
- Font Stack Rule

## God Nodes (most connected - your core abstractions)
1. `Chart()` - 57 edges
2. `Chart()` - 44 edges
3. `Chart()` - 44 edges
4. `render()` - 36 edges
5. `render()` - 35 edges
6. `render()` - 35 edges
7. `Q4 2025 E-commerce Analytics Dashboard Screenshot` - 24 edges
8. `Q4 2025 E-commerce Analytics Dashboard Screenshot` - 24 edges
9. `el()` - 13 edges
10. `push()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `SoftwareApplication and FAQPage JSON-LD` --semantically_similar_to--> `chart-dashboard Claude Agent Skill`  [INFERRED] [semantically similar]
  docs/index.html → README.md
- `Copilot Instructions — chart-dashboard` --semantically_similar_to--> `GEMINI.md — Gemini CLI instructions`  [INFERRED] [semantically similar]
  .github/copilot-instructions.md → GEMINI.md
- `theme.js must load before charts.js` --conceptually_related_to--> `Charts.theme token object`  [INFERRED]
  AGENTS.md → README.md
- `Never invent numbers that read as real measurements` --conceptually_related_to--> `Chart selection guidance and anti-patterns`  [INFERRED]
  AGENTS.md → README.md
- `Cream-and-ink print theme tokens` --shares_data_with--> `Charts.theme token object`  [INFERRED]
  examples/q4-ecommerce/index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Per-tool instruction files all route to SKILL.md** — _github_copilot_instructions_copilot_instructions, gemini_gemini_md, agents_agents_md, readme_chart_dashboard_skill [EXTRACTED 1.00]
- **Non-negotiable output rules repeated across all agent files** — agents_theme_before_charts_rule, agents_plotoptions_pie_nesting, agents_no_invented_numbers, agents_zero_dependency_offline_output [EXTRACTED 1.00]
- **Self-contained example outputs sharing library and theme** — examples_q4_ecommerce_index_dashboard, examples_ev_retrospective_index_report, readme_charts_lib, examples_q4_ecommerce_index_cream_ink_theme [INFERRED 0.85]
- **charts-lib factory functions** — skills_chart_dashboard_references_chart_api_charts_line, skills_chart_dashboard_references_chart_api_charts_column, skills_chart_dashboard_references_chart_api_charts_bar, skills_chart_dashboard_references_chart_api_charts_barlist, skills_chart_dashboard_references_chart_api_charts_donut, skills_chart_dashboard_references_chart_api_charts_pie, skills_chart_dashboard_references_chart_api_charts_scatter, skills_chart_dashboard_references_chart_api_charts_bubble, skills_chart_dashboard_references_chart_api_charts_packedbubble, skills_chart_dashboard_references_chart_api_charts_geofacet [EXTRACTED 1.00]
- **Emphasis system (accent + muted, status, annotation)** — skills_chart_dashboard_references_chart_selection_emphasis, skills_chart_dashboard_references_chart_selection_three_heuristics, skills_chart_dashboard_references_chart_selection_scenario_notation, skills_chart_dashboard_references_chart_selection_grouped_focus, skills_chart_dashboard_references_chart_selection_annotation_emphasis, skills_chart_dashboard_references_chart_api_per_point_color, skills_chart_dashboard_references_chart_api_muted_token [EXTRACTED 1.00]
- **One source of colour truth: theme → charts → page chrome** — skills_chart_dashboard_references_theming_extract_theme_js, skills_chart_dashboard_references_chart_api_charts_theme, skills_chart_dashboard_references_layout_theme_sync_block, skills_chart_dashboard_templates_dashboard_surface_soft, skills_chart_dashboard_skill_one_design_system [EXTRACTED 1.00]
- **Weekly W40-W52 Time Series Chart Family** — docs_screenshot_weekly_gross_revenue, docs_screenshot_orders_by_customer_type, docs_screenshot_purchase_funnel, docs_screenshot_warehouse_stock, docs_screenshot_weekly_temperature_range [INFERRED 0.85]
- **Part-to-Whole Share Chart Pattern** — docs_screenshot_revenue_by_channel, docs_screenshot_sessions_by_device, docs_screenshot_csat_distribution, docs_screenshot_marketing_roi, docs_screenshot_refunds_by_category, docs_screenshot_payment_method_share [INFERRED 0.85]
- **Charts-Lib Chart Type Coverage Showcase** — docs_screenshot_charts_lib_gallery, docs_screenshot_buyer_age_distribution, docs_screenshot_product_landscape, docs_screenshot_warehouse_stock, docs_screenshot_weekly_temperature_range, docs_screenshot_category_share [INFERRED 0.75]
- **Sessions-to-Purchase Conversion Narrative** — examples_screenshot_sessions_by_device, examples_screenshot_purchase_funnel, examples_screenshot_orders_by_customer_type, examples_screenshot_payment_method_share [INFERRED 0.85]
- **Marketing Spend Efficiency Analysis** — examples_screenshot_marketing_roi, examples_screenshot_campaign_spend_vs_revenue, examples_screenshot_diminishing_returns, examples_screenshot_revenue_by_channel [INFERRED 0.85]
- **Part-to-Whole Chart Family (Donut, Pie, Gauge, Stacked)** — examples_screenshot_revenue_by_channel, examples_screenshot_sessions_by_device, examples_screenshot_csat_distribution, examples_screenshot_refunds_by_category, examples_screenshot_payment_method_share [INFERRED 0.75]

## Communities (15 total, 2 thin omitted)

### Community 0 - "Charts-Lib Skill Asset Source"
Cohesion: 0.07
Nodes (68): addCommas(), applyTheme(), applyThemeColors(), arcSegment(), Chart(), angleRad(), catCenterX(), catCenterY() (+60 more)

### Community 1 - "EV Retrospective Charts Copy"
Cohesion: 0.08
Nodes (60): addCommas(), applyTheme(), applyThemeColors(), arcSegment(), Chart(), angleRad(), catCenterX(), catCenterY() (+52 more)

### Community 2 - "Q4 Ecommerce Charts Copy"
Cohesion: 0.08
Nodes (60): addCommas(), applyTheme(), applyThemeColors(), arcSegment(), Chart(), angleRad(), catCenterX(), catCenterY() (+52 more)

### Community 3 - "Theme Extraction Tool"
Cohesion: 0.07
Nodes (34): accentPool, all, bgs, borders, byCount(), check(), contrast(), css (+26 more)

### Community 4 - "Chart API and Selection Docs"
Cohesion: 0.07
Nodes (35): Charts.bar, Charts.barList, Charts.bubble, Charts.column, Charts.donut, Charts.geofacet, charts-lib API, Charts.line (+27 more)

### Community 5 - "Dashboard Screenshot Panels (docs)"
Cohesion: 0.10
Nodes (28): Point Annotation Callouts (Black Friday, Cyber Monday), Insight: Black Friday / Cyber Monday Drive Q4 Revenue Peak, Buyer Age Distribution Population Pyramid, Campaign Spend vs Revenue Scatter with Trendline, Multi-Column Card Grid Layout, Category Revenue by Month Grouped Columns, Category Share Packed Bubbles (Empty Render), Charts-Lib Capability Gallery (Chart Type Showcase) (+20 more)

### Community 6 - "Dashboard Screenshot Panels (examples)"
Cohesion: 0.10
Nodes (27): Annotation Callouts (Black Friday, Cyber Monday), Bento Grid Card Layout Pattern, Buyer Age Distribution Population Pyramid, Campaign Spend vs Revenue Scatter with Trend, Category Revenue by Month Grouped Columns, Category Share Packed Bubbles (empty render), Charts-Lib Chart Type Gallery / Regression Showcase, CSAT Distribution Semi-Circle Donut (+19 more)

### Community 7 - "Agent Instructions and Landing Page"
Cohesion: 0.11
Nodes (23): Copilot Instructions — chart-dashboard, AGENTS.md — vendor-neutral agent instructions, Never invent numbers that read as real measurements, Donut/pie options nest under plotOptions.pie, theme.js must load before charts.js, Zero-dependency self-contained offline output, GitHub Pages landing page, SoftwareApplication and FAQPage JSON-LD (+15 more)

### Community 8 - "Emphasis and Color Token System"
Cohesion: 0.12
Nodes (17): muted / mutedScale tokens, Per-point color override, Re-call factory on same container id (update path), Annotation as the emphasis, Emphasis mode, Grouped chart series-vs-cluster focus, Three emphasis heuristics, Threshold colouring against a target line (+9 more)

### Community 9 - "Report Paper-Column Layout"
Cohesion: 0.67
Nodes (3): 880px report paper column, One finding per panel (no quota, no padding), figure.fig + figcaption pattern

## Ambiguous Edges - Review These
- `Category Share Packed Bubbles (empty render)` → `Charts-Lib Chart Type Gallery / Regression Showcase`  [AMBIGUOUS]
  docs/screenshot.png · relation: references
- `Category Share Packed Bubbles (Empty Render)` → `Charts-Lib Capability Gallery (Chart Type Showcase)`  [AMBIGUOUS]
  examples/screenshot.png · relation: conceptually_related_to

## Knowledge Gaps
- **53 isolated node(s):** `fs`, `path`, `NAMED`, `inputs`, `files` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Category Share Packed Bubbles (empty render)` and `Charts-Lib Chart Type Gallery / Regression Showcase`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Category Share Packed Bubbles (Empty Render)` and `Charts-Lib Capability Gallery (Chart Type Showcase)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Are the 3 inferred relationships involving `Chart()` (e.g. with `enter()` and `hideTooltip()`) actually correct?**
  _`Chart()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Chart()` (e.g. with `hideTooltip()` and `onMove()`) actually correct?**
  _`Chart()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Chart()` (e.g. with `hideTooltip()` and `onMove()`) actually correct?**
  _`Chart()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `path`, `NAMED` to the rest of the system?**
  _53 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Charts-Lib Skill Asset Source` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._