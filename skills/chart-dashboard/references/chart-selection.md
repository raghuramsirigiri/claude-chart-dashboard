# Choosing a chart

| The data is… | Use | charts-lib call |
|:--|:--|:--|
| A value over time, 1–4 series | line / spline | `Charts.line` (`type:'spline'` per series to smooth) |
| A value over time, irregular timestamps | datetime line | `Charts.line` + `xAxis:{type:'datetime'}` |
| A level that holds between changes | step line | `Charts.line` + `type:'step'` |
| Comparison across ≤12 named categories | columns | `Charts.column` |
| Comparison across >12 categories, or long labels | horizontal bars | `Charts.bar` |
| A ranked list, or very long category names | bar list (no axis) | `Charts.barList` + `sort:'desc'` |
| Each row needs a comparison **and** a sentence **and** a headline number | bar insight table | `Charts.barInsightTable` |
| Composition over time | stacked columns | `Charts.column` + `plotOptions.column.stacking:'normal'` |
| Share-of-total over time | 100% stacked | `stacking:'percent'` |
| Share of a single total, ≤6 parts | donut | `Charts.donut` (add `centerText`) |
| Share where each part also has a size | variable-radius donut | `Charts.donut` + `variableRadius:true` |
| Relationship between two measures | scatter | `Charts.scatter` (`regression:true` for a trend line) |
| Two measures plus a magnitude | bubble | `Charts.bubble` |
| Many items, only relative size matters | packed bubbles | `Charts.packedBubble` |
| A min–max span per category | column range | `Charts.column` + `type:'columnrange'`, `data:[[low,high],…]` |
| Two mirrored populations | population pyramid | `Charts.bar`, one series all-negative, `tooltip.absoluteX:true` |
| Values that cross zero | column with `negativeColor` | `Charts.column` |
| One value per region, most of the map covered | geofacet tiles | `Charts.geofacet` (`chart.variant:'bar'|'heat'|'gauge'`) |
| One value for a handful of named places | ranked bars | `Charts.barList` / `Charts.bar` — a geofacet of 10 states is 40 empty tiles, and the map shape earns its space only when the geography is the finding |
| A rate spanning orders of magnitude | log axis | `Charts.line` + `yAxis:{type:'logarithmic'}` |

## Choosing between the three bar treatments

They look similar in a list and are not interchangeable. Pick by how much each
row has to say:

| The row carries… | Use | Because |
|:--|:--|:--|
| A length, nothing else | `Charts.bar` / `Charts.column` | An axis and gridlines let the reader compare precisely across many categories |
| A length and a long name | `Charts.barList` | The name sits above its own bar at full width instead of being squeezed into a left gutter |
| A length, a sentence, and a headline number | `Charts.barInsightTable` | All three sit in one row, so the reader gets the comparison, the meaning, and the takeaway without looking anywhere else |

`barInsightTable` is the one to reach for on **income statements, KPI reviews,
before/after comparisons, and scorecards** — anywhere you would otherwise build a
chart, a table, and a paragraph of commentary and hope the reader connects them.
Two telling signs you want it: you are about to write a caption that explains
each bar individually, or the user gave you a metric *and* a note about each
metric.

It also solves a specific problem the action-title rule can't. A title states one
finding for the whole chart; when every row has its own finding, they belong in
the insight column, one per row, rather than crammed into a single headline or
scattered into cards below the chart.

Keep it to roughly 4–8 rows. Each row is bar-height plus up to two lines of text,
so a long table stops being a chart and becomes a wall — split it, or drop to a
plain ranked bar list and put the commentary in prose.

Skip it when the rows have nothing to say: with no `insight` or `stat`, the
columns collapse and you have a slower `barList`. Never use it for a time series —
rows are categories, not periods.

## Anti-patterns

- Pie/donut for time, for >6 wedges, or for parts that don't sum to a whole.
- More than 4 lines on one chart — split it, or highlight one and gray the rest.
- Stacked columns when the reader needs to compare the *middle* bands; only the
  bottom band and the total are readable.
- Dual axes. Split into two panels instead.
- Truncated y-axis on a column chart (bar length must encode the value).
- Bubbles sized by radius rather than area — charts-lib already scales by area
  via `plotOptions.bubble:{minSize,maxSize}`; don't fight it.

## Emphasis

- Highlight one series by giving the others a muted color and leaving the focus
  series at `Charts.theme.colors[0]`.
- Use `plotBands` for context regions (recession, promo window) and `plotLines`
  for targets and thresholds.
- Use `callouts:[{x, series, text}]` to say *why* a spike happened; a chart
  without a labeled anomaly makes the reader do the work.
