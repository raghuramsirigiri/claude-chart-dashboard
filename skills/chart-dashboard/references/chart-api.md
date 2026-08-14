# charts-lib

A tiny, self-contained SVG chart library styled to the clean-charts theme
(cream background, Inter typography, black + blue gradient palette,
top-left title, thin dark spines).

Zero dependencies. Drop `charts.js` into your page and call one of eight
factory functions. Every chart is inline SVG with native tooltip, hover, and
legend interactions — no canvas, no external framework.

```html
<link rel="stylesheet" href="charts.css">
<div id="chart" style="width:800px;height:500px"></div>
<script src="charts.js"></script>
<script>
  Charts.line('chart', {
    title: 'Monthly Average Temperature',
    subtitle: 'Source: WorldClimate.com',
    xAxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun'] },
    yAxis: { suffix: '°C' },
    series: [
      { name: 'Tokyo',   data: [7, 6.9, 9.5, 14.5, 18.4, 21.5] },
      { name: 'London',  data: [3.9, 4.2, 5.7, 8.5, 11.9, 15.2] }
    ]
  });
</script>
```

## API

| Function              | Purpose                                                                     |
| :-------------------- | :-------------------------------------------------------------------------- |
| `Charts.line`         | Line / spline / step chart with linear, datetime, category, or log axes.    |
| `Charts.column`       | Vertical columns: grouped, stacked, percent-stacked, range, pyramid, 3D.    |
| `Charts.bar`          | Horizontal bars — same options as `column`, including population pyramid.   |
| `Charts.donut`        | Donut (default 60% hole) — variable radius, semi-circle, gradient, sliced. |
| `Charts.pie`          | Full pie (donut with `innerSize:0`).                                        |
| `Charts.scatter`      | 2D scatter + optional linear regression + point labels.                     |
| `Charts.bubble`       | Scatter with third dimension mapped to bubble radius (and color gradient).  |
| `Charts.packedBubble` | Bubbles clustered via physics relaxation; per-series clusters when >1.      |

All functions take `(container, config)` where `container` is a DOM element
or its id, and `config` is a Highcharts-compatible options object.

## Variations catalog

Every option below is optional; the library picks sensible defaults.

### Line (`Charts.line`)

- **Series type per series**: `type: 'line' | 'spline' | 'step'`
- **Step alignment**: `step: 'left' | 'center' | 'right'` (for step series)
- **Dash style**: `dashStyle: 'Solid'|'ShortDash'|'ShortDot'|'Dot'|'Dash'|'LongDash'|'DashDot'`
- **Markers**: `marker: { enabled, symbol: 'circle'|'square'|'diamond'|'triangle', radius }`
- **Data labels**: `dataLabels: { enabled, format }`
- **Axis types**:
  - Linear (default)
  - Datetime: `xAxis: { type: 'datetime', tickInterval: 'year'|'quarter'|'month'|'week'|'day'|'hour'|'minute'|'second' }`
  - Categorical: `xAxis: { categories: [...] }`
  - Logarithmic Y: `yAxis: { type: 'logarithmic' }`
- **Reference regions & lines**:
  - `xAxis.plotBands` / `yAxis.plotBands`: `[{ from, to, color, alpha, label:{text}, paragraph }]`
  - `xAxis.plotLines` / `yAxis.plotLines`: `[{ value, color, width, dashStyle, label:{text} }]`
- **Callouts (annotations)**: `callouts: [{ x, series, text, color, dx, dy }]`
- **Negative color**: `series[i].negativeColor` + `threshold`
- **Zoom**: `chart: { zoomType: 'x' }` — drag to zoom, "Reset zoom" button appears
- **Legend**: auto-shown at the top below the subtitle whenever there are 2+ series, wraps to multiple rows. Opt in to inline line-end labels instead with `lineLabels: 'inline' | 'name' | 'value' | 'both'`.
- **Value suffix / prefix / decimals**: `tooltip: { valueSuffix, valuePrefix, valueDecimals }`
- **Live update**: returned `{ addPoint(seriesIdx, x, y), shift(seriesIdx), redraw() }`

### Column & bar (`Charts.column`, `Charts.bar`)

- **Series type**: `type: 'column' | 'bar' | 'columnrange' | 'columnpyramid'`
- **Stacking**: `plotOptions.column.stacking: 'normal' | 'percent'`
- **Padding**: `pointPadding`, `groupPadding`
- **3D effect**: `chart: { options3d: { enabled: true, depth: 40 } }`
- **Negative values**: bars flip below zero baseline; `negativeColor` overrides bar color for negatives
- **Population pyramid**: horizontal bar + a series with all-negative values + `tooltip.absoluteX:true`
- **Data labels**: `plotOptions.series.dataLabels.enabled` — placed above (column) or inside/outside right end (bar) with automatic contrast text color
- **Legend**: auto-shown at the top below the subtitle whenever there are 2+ series, wraps to multiple rows. Force off with `legend: { enabled: false }`.
- **Category wrapping**: long category names auto-wrap to two lines below the bar
- **Column range**: `type:'columnrange'` with `data: [[low, high], …]`

### Donut & pie (`Charts.donut`, `Charts.pie`)

> **Nesting:** every donut option below except `startColor`/`endColor` is read
> from `plotOptions.pie`, even where the shorthand lines below omit it. Write
> `plotOptions: { pie: { centerText: {…}, valueSuffix: '%', variableRadius: true,
> startAngle: -90, endAngle: 90, showPercentages: true } }` — at the top level
> they are silently ignored.

- **Hole**: `plotOptions.pie.innerSize` — fraction of outer radius (`'50%'`, `'80%'`) or px. `0` = full pie.
- **Semi-circle**: `startAngle: -90, endAngle: 90` (top half; use other angles for other slices)
- **Variable radius**: `variableRadius: true` + data with `z` values + `minPointSize`
- **Gradient palette**: `startColor`, `endColor` (defaults black → blue)
- **Sliced / exploded**: `{ sliced: true }` on any data point; click any wedge to toggle
- **Center text**: `centerText: { value, label, valueFontSize }`
- **Legend**: auto-shown at the top below the subtitle whenever there are 2+ wedges, wraps to multiple rows for many categories. Force off with `legend: { enabled: false }` to fall back to connector labels around the donut.
- **Value suffix**: `valueSuffix: '%'`
- **Show percentages instead of raw values**: `showPercentages: true`

### Scatter / bubble / packed (`Charts.scatter`, `Charts.bubble`, `Charts.packedBubble`)

- **Series type per series**: `type: 'scatter' | 'bubble' | 'packedbubble'`
- **Marker symbol**: `marker: { symbol: 'circle'|'square'|'diamond'|'triangle', radius }`
- **Trend line**: `series[i].regression: true` — dashed blue linear least-squares
- **Point labels**: `series[i].showLabels: true` — draws `point.name` above each marker
- **Bubble size scale (area)**: `plotOptions.bubble: { minSize, maxSize }` — area in "points²", radius derived
- **Bubble color gradient**: automatically applied when there's only one bubble series (larger bubbles → bluer)
- **Packed clusters**: with N series → N separate clusters; with 1 series → single cluster and color-by-size gradient
- **Axis limits & suffix**: `xAxis: { min, max, suffix, title }`, `yAxis: { … }`

## Theming

All visual tokens (colors, fonts, sizes, weights) are stored in a single
`Charts.theme` object. Override any property **before** calling a chart
factory to re-skin every chart type at once:

```html
<script src="charts.js"></script>
<script>
  // Dark theme override
  Charts.theme.bg         = '#1a1a2e';
  Charts.theme.grid       = '#2a2a4a';
  Charts.theme.axis       = '#e0e0e0';
  Charts.theme.titleColor = '#ffffff';
  Charts.theme.subtitleColor = '#aaaaaa';
  Charts.theme.labelColor = '#cccccc';
  Charts.theme.colors     = ['#e94560','#0f3460','#533483','#16213e','#ff6b6b','#48dbfb'];

  Charts.line('chart', { ... }); // uses the dark theme
</script>
```

The full list of theme tokens lives in
[theme.js](theme.js) and includes:

| Token | Default | Purpose |
|:------|:--------|:--------|
| `bg` | `#f4f3f0` | Chart background |
| `grid` | `#dcdbd7` | Gridline color |
| `axis` | `#000000` | Primary spine / tick color |
| `titleColor` | `#111111` | Title text |
| `subtitleColor` | `#444444` | Subtitle text |
| `labelColor` | `#333333` | Axis / tick label text |
| `secondaryColor` | `#666666` | Secondary text |
| `inverseText` | `#FFFFFF` | White-on-dark text |
| `highlight` | `#1f77b4` | Zoom / plot-band accent |
| `callout` | `#e3120b` | Callout dot default |
| `positive` | `#2323FF` | Positive bar accent |
| `negative` | `#D1107A` | Negative bar accent |
| `trend` | `#2323FF` | Regression line color |
| `connectorLabel` | `#555555` | Donut connector lines |
| `colors` | `['#000000',…]` | Series palette (7 colors) |
| `defaultColor` | `#000000` | Single-series default |
| `gradientStart` | `#000000` | Donut/bubble gradient start |
| `gradientEnd` | `#2323FF` | Donut/bubble gradient end |
| `font` | `'Inter',…` | Font stack |
| `titleSize` | `17` | Title font size (px) |
| `subtitleSize` | `12` | Subtitle font size |
| `labelSize` | `11.5` | Label font size |
| `tickSize` | `11` | Tick font size |
| `lineWidth` | `3` | Default line series width |
| `axisWidth` | `1.8` | Spine stroke width |
| `gridWidth` | `0.8` | Gridline stroke width |

## Interactions (all charts)

- Hover a marker/wedge/bar → tooltip with all series values at that x/category, plus a hover highlight
- Click a legend item (when the legend is shown) → toggle series visibility
- Click a donut wedge → explode / restore
- Drag horizontally on a `chart.zoomType:'x'` line → zoom into the range; a "Reset zoom" button appears

## Live examples

Open the skill's `templates/dashboard.html` and `templates/report.html` for working starting points.
