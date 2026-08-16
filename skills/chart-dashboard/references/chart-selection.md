# Choosing a chart

| The data is… | Use | charts-lib call |
|:--|:--|:--|
| A value over time, 1–4 series | line / spline | `Charts.line` (`type:'spline'` per series to smooth) |
| A value over time, irregular timestamps | datetime line | `Charts.line` + `xAxis:{type:'datetime'}` |
| A level that holds between changes | step line | `Charts.line` + `type:'step'` |
| Comparison across ≤12 named categories | columns | `Charts.column` |
| Comparison across >12 categories, or long labels | horizontal bars | `Charts.bar` |
| A ranked list, or very long category names | bar list (no axis) | `Charts.barList` + `sort:'desc'` |
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
| One value per region of a map | geofacet tiles | `Charts.geofacet` (`chart.variant:'bar'|'heat'|'gauge'`) |
| A rate spanning orders of magnitude | log axis | `Charts.line` + `yAxis:{type:'logarithmic'}` |

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
