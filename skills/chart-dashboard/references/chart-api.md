# charts-lib

A tiny, self-contained SVG chart library styled to the clean-charts theme
(cream background, Inter typography, black + blue gradient palette,
top-left title, thin dark spines).

Zero dependencies. Drop `charts.js` into your page and call one of eleven
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
    // Line x-labels must parse as dates — 'Jan' alone does not, 'Jan 2025' does.
    xAxis: { categories: ['Jan 2025','Feb 2025','Mar 2025','Apr 2025','May 2025','Jun 2025'] },
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
| `Charts.line`         | Line / spline / step chart. **Ordered x only** — linear, datetime, or parseable date labels; never named categories. |
| `Charts.column`       | Vertical columns: grouped, stacked, percent-stacked, range, pyramid, 3D.    |
| `Charts.bar`          | Horizontal bars — same options as `column`, including population pyramid.   |
| `Charts.barList`      | Axis-free horizontal bars; category label sits above each bar.              |
| `Charts.barInsightTable` | One row per category: label · bars · insight headline + description · a large stat. |
| `Charts.waffle`       | Part-of-whole dot grids; one panel per statistic, headline stat + caption.  |
| `Charts.panels`       | Compositor: up to 4 charts of any type side by side under one shared title. |
| `Charts.donut`        | Donut (default 60% hole) — variable radius, semi-circle, gradient, sliced. |
| `Charts.pie`          | Full pie (donut with `innerSize:0`).                                        |
| `Charts.scatter`      | 2D scatter + optional linear regression + point labels.                     |
| `Charts.bubble`       | Scatter with third dimension mapped to bubble radius (and color gradient).  |
| `Charts.packedBubble` | Bubbles clustered via physics relaxation; per-series clusters when >1.      |
| `Charts.geofacet`     | Small multiples on a geographic grid — bar, heat, or gauge tiles.           |

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
- **X must be continuous or temporal.** The engine *refuses to draw* a line
  over named categories and renders an error panel instead — see `chart-selection.md`
  § Input contract. Valid axes:
  - Linear (default): numeric `x`, or `data: [[x, y], …]`
  - Datetime: `xAxis: { type: 'datetime', tickInterval: 'year'|'quarter'|'month'|'week'|'day'|'hour'|'minute'|'second' }` with epoch-ms `x` values
  - Date-labelled categories: `xAxis: { categories: [...] }` where **every**
    label parses as a date. It must contain a 4-digit year or a `d/d` pair *and*
    survive `Date.parse`, so `'2019'`, `'Jan 2025'`, `'2024-01-01'`, `'3/14'`
    all work — while `'Jan'`, `'Q1'`, `'Q1 2024'`, `'Week 1'`, `'Mon'` do not.
    For quarters, pass the quarter's start date (`'2024-01-01'`) or its year
    when one point per year (`'2024'`).
  - Logarithmic Y: `yAxis: { type: 'logarithmic' }` — **strictly positive
    values only.** A zero or negative point is clamped to the axis floor and
    plots as a flat line along the bottom; the axis silently starts at 1 when
    the data minimum is ≤ 0.
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
- **Data labels**: `plotOptions.series.dataLabels.enabled` — placed above (column) or
  inside/outside right end (bar) with automatic contrast text color. **Off by
  default; turn them on for most categorical charts.** `format: '{y}%'` templates
  the label. Per-series override with `series[i].dataLabels`.
- **Per-point color**: any data point may be written as an object with its own
  `color`, which wins over the series color and over `negativeColor`:
  ```js
  series: [{ name: 'Revenue', data: [
    { y: 4200, color: T.colors[1] },   // emphasised
    { y: 3900, color: T.colors[1] },   // emphasised
    { y: 610,  color: T.muted },       // context
    { y: 480,  color: T.muted }
  ]}]
  ```
  Points may still be plain numbers in the same array; mix freely. This is the
  mechanism behind every "highlight the bars the finding is about" chart — see
  `chart-selection.md` § Emphasis.
- **Re-rendering with new data**: call the same factory again on the same
  container id. Each engine clears the container first, so re-calling is the
  supported update path for filters and dropdowns — build a `render(state)`
  function and call it from your control's `change` handler. Don't mutate the
  returned object's internals; `redraw()` only re-paints the *existing* config.
- **Legend**: auto-shown at the top below the subtitle whenever there are 2+ series, wraps to multiple rows. Force off with `legend: { enabled: false }`.
- **Scenario notation**: `series[i].scenario` or `point.scenario` —
  `'actual'` (solid, default), `'plan'`/`'budget'` (outlined), or
  `'forecast'`/`'estimate'` (hatched). Encodes whether a number was measured,
  agreed, or projected in the *fill style*, leaving color free for emphasis.
  Legend swatches render in the series' own notation. Value labels move outside
  the bar automatically on outlined bars, which have no fill to sit on. See
  `chart-selection.md` § Scenario notation.
- **Subdued legend entry**: `series[i].legendColor` overrides that entry's label
  color (the swatch always follows the series color). Set it to
  `Charts.theme.secondaryColor` on de-emphasised series so a legend on an
  emphasis chart doesn't present every series as equally important. Supported on
  line, column/bar, and scatter/bubble.
- **Category wrapping**: long category names auto-wrap to two lines below the bar
- **Column range**: `type:'columnrange'` with `data: [[low, high], …]`

### Bar list (`Charts.barList`)

Horizontal bars stripped to the two things that carry meaning — the category and
the length of its bar. **No axis, no gridlines, no ticks, no spine.** The
category label sits directly *above* its own bar at full width, and the value
sits at the bar's end.

Reach for it over `Charts.bar` when the category names are long (here they cost
nothing, instead of squeezing every row into a left gutter sized for the worst
one), or when the chart is a ranked list rather than a measurement against a
scale.

```js
Charts.barList('container', {
  title: 'Most-used editors',
  plotOptions: { barList: { sort: 'desc', colorByPoint: true, valueSuffix: '%' } },
  series: [{ name: 'Share', data: [{ name: 'Visual Studio Code', y: 73.6 }] }]
});
```

- **Sorting**: `sort: 'desc' | 'asc'` — off by default, so source order is kept
- **Bar metrics**: `barHeight` (26), `rowGap` (22) — the label→bar gap is deliberately tighter than the row→row gap, which is what lets the pairs read without a separating rule
- **Height**: the container **grows to fit the rows** by default. Pass `autoHeight: false` to fit the rows into the container's own height instead (bars shrink).
- **Color**: one theme color for all bars by default; `colorByPoint: true` walks the series palette; `color` on any point overrides
- **Value labels**: always outside the bar end. `valueSuffix`, `format: '{y}%'`, `valueColor: 'series'` to tint each value to its bar.
- **Negative values**: fully supported — bars run left from a shared zero baseline in the theme's negative color, with gutter space reserved on both ends so a negative label can't clip
- **Long names**: truncated with an ellipsis rather than wrapped, keeping rows equal height
- Hover highlight + shared tooltip, same as the other engines

### Bar insight table (`Charts.barInsightTable`)

One row per category, read left to right as a sentence:

```
Gross Revenue │ ▇▇▇▇▇▇   FY22   │ Topline Growth               │ +30%
              │ ▇▇▇▇▇▇▇▇ FY23   │ Year-over-year expansion     │
 [row label]    [single or grouped bars]  [insight headline     [big stat]
                                           + description]
```

Reach for it when a bar alone under-sells the story and every row has to carry
three things at once: the comparison, what it means, and the one number the
reader should walk away with.

```js
Charts.barInsightTable('container', {
  title: 'Fiscal Year Income Statement',
  subtitle: 'FY23 vs FY22 · $ millions',
  xAxis: { categories: ['Gross Revenue', 'Cost of Goods Sold', 'Gross Profit'] },
  rows: [                                   // parallel to xAxis.categories
    { insight: 'Topline Growth', description: 'Year-over-year revenue expansion' },
    { insight: 'COGS',           description: 'Direct production costs' },
    { insight: 'Margin',         description: 'Gross profit generated' }
  ],
  plotOptions: { barInsightTable: { valueSuffix: 'M', statColorBySign: true } },
  series: [
    { name: 'FY 2022', data: [1000, 400, 600] },
    { name: 'FY 2023', data: [1300, 500, 800] }
  ]
});
```

- **Row extras**: `rows: [{ label, insight, description, stat, statNote, statColor }, …]`
  runs parallel to `xAxis.categories`. The same keys can hang off a data point
  instead (`data: [{ name, y, insight, description, stat, statNote }]`), which is
  the shape for a single-series table.
- **The stat writes itself.** With 2+ series and no `stat`, each row shows the
  percent change from the first series to the last — the question a two-column
  comparison is already asking. Disable with `autoStat: false`; tint negatives
  with `statColorBySign: true`.
- **Columns collapse when empty**: no insight text → no insight column; no stats
  → no stat column, with the bars absorbing the freed width. Override with
  `columns: { label, bars, insight, stat }` as a fraction (`0.25`) or px (`180`).
- **One shared scale** across all rows, so rows stay comparable.
- **Bar metrics**: `barHeight` (20), `barGap` (4), `rowPadding` (18), `columnGap` (22).
- **Long text wraps**: row labels up to `labelLines` (2), insight headlines 2,
  descriptions `descriptionLines` (2); only the last line is ellipsized, and the
  row grows to its tallest column so nothing overlaps.
- **Type follows the theme**: insight headline is `labelSize + 1.5`, description
  `tickSize`, stat `round(titleSize × 1.5)`. Per-chart overrides: `insightSize`,
  `descriptionSize`, `statSize`.
- **Colors** as in `column`/`bar`: one series takes `defaultColor`, two or more
  walk `theme.colors`; `statColor` tints an individual stat.
- **Value labels** off by default — the stat is the readout that matters. Turn on
  with `dataLabels: true`.
- **Dividers** are hairlines between rows only; `dividers: false` removes them.
- **Height**: the container grows to fit the rows; `autoHeight: false` keeps the
  container's own height.

### Waffle (`Charts.waffle`)

One panel per statistic — headline stat, dot grid, label, description — split
evenly across the content width. Reach for it when the reader has to *feel* a
proportion rather than compare magnitudes: survey shares, adoption rates, "x in
100" facts. A bar compares lengths; a waffle counts units.

```js
Charts.waffle('chart', {
  title: 'Key Strategic Priorities',
  subtitle: 'Percentage of surveyed organizations reporting on key focus areas',
  series: [{ name: 'Share of organizations', data: [
    { name: 'Growth Focus',        y: 29, description: 'Organizations focusing 30% or more of their time on long-term growth' },
    { name: 'Resource Allocation', y: 30, description: 'Companies that increase resourcing during market volatility' },
    { name: 'Customer Centricity', y: 15, description: 'Firms that incorporate direct customer input into decisions' }
  ] }]
});
```

- **Data**: same shapes as `barList` — `[{name, y, description, color}]`, `[name, y]` pairs, or bare numbers with `xAxis.categories` (descriptions via a parallel `rows: [{description}]`).
- **Grid**: `rows` / `cols` (default `10 × 10`); `total` (default `100`) is what the value is a share *of*, so `total: 500` with `y: 430` fills 86 dots. Values round to whole dots.
- **Fill**: bottom-up by default so the block reads as a level; `fillDirection: 'top'` fills downward.
- **Dots**: `dotSize` caps the diameter, `dotGap` is the gap as a share of it, `emptyColor` / `emptyOpacity` style the remainder.
- **Text**: `statSize`, `nameSize`, `descriptionSize`, `descriptionLines`; the headline uses `format: '{y}'` / `valueSuffix` (default `'%'`). Panels size to the tallest description so baselines line up.
- **Color**: walks the series palette per panel; `series.color` or a point `color` overrides, `colorByPoint: false` gives every panel one color.
- **Negative values are clamped to zero** — a part-of-whole grid can't show them honestly, same rule as the donut.
- **Other**: `dividers: false` drops the vertical rules, `panelPadding` sets the gutter inside each panel.

### Panels (`Charts.panels`)

Not an engine — a compositor. One shared title/subtitle, the width split into up
to four panels per line, each handed to whichever factory you name. Use it when
a bar and a donut are **one** exhibit with one headline, not two panels in the
dashboard grid.

```js
Charts.panels('chart', {
  title: 'Q3 commercial review',
  subtitle: 'Bookings trajectory, where the revenue came from, and the accounts driving it',
  plotOptions: { panels: { columns: 3, separators: true, panelHeight: 300 } },
  charts: [
    { type: 'column', title: 'Bookings by month',
      xAxis: { categories: ['Jul','Aug','Sep'] },
      series: [{ name: 'Bookings', data: [42, 51, 68] }] },
    { type: 'donut', title: 'Revenue mix',
      series: [{ name: 'Revenue', data: [['New business',48],['Expansion',31],['Renewal',21]] }] },
    { type: 'barList', title: 'Top accounts',
      plotOptions: { barList: { valueSuffix: 'k', sort: 'desc' } },
      series: [{ name: 'ARR', data: [['Northwind',210],['Acme',184],['Globex',121]] }] }
  ]
});
```

- **Panels**: `charts: [...]` (alias `panels:`). Each entry is an ordinary chart config plus `type` — any factory on the namespace (`line`, `column`, `bar`, `barList`, `barInsightTable`, `waffle`, `donut`, `pie`, `scatter`, `bubble`, `packedBubble`, `geofacet`) — and an optional per-panel `height`. Everything else passes through untouched, so a panel is configured exactly as it would be standalone, keeping its own title, legend and tooltip.
- **Columns**: `columns` (default: the number of charts, capped at **4** — past four a panel is too narrow to read). Extra charts wrap onto further rows, so a 2×2 is just `columns: 2`.
- **Separators**: hairlines between panels, on by default; `separators: false` turns them off.
- **Heading**: the group title is a size up from a panel's own title (`titleSize`, `subtitleSize` override).
- **Sizing**: `panelHeight` (default 320) applies to every panel except the self-sizing types (`barList`, `barInsightTable`, `waffle`), which grow to their content. `gap` between panels, `rowGap` between rows.
- **Returns**: `{ charts: [...], panels: [...] }` — each engine's handle, and the panel `<div>`s.

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
- **Center text**: `centerText: { value, label, valueFontSize, color }` — `color`
  tints the center value; set it to the focal wedge's color so the number and
  the wedge read as one statement (see `chart-selection.md` § Pie and donut)
- **Legend**: auto-shown at the top below the subtitle whenever there are 2+ wedges, wraps to multiple rows for many categories. Force off with `legend: { enabled: false }` to fall back to connector labels around the donut.
- **Value suffix**: `valueSuffix: '%'`
- **Show percentages instead of raw values**: `showPercentages: true`
- **Negative values are dropped.** A donut shows parts of a whole, so a negative part can't be drawn. Points with a negative or non-finite `y` are excluded from the ring, the total, and the legend, warned once on the console, and named in a footnote at the bottom-left (*"Not shown: North (-10M) — negative values can't be part of a whole"*), which falls back to a count when the list is too long. Suppress with `plotOptions.pie.droppedNote: false`. If nothing positive is left, the chart draws *"No positive values to chart"*. Use a bar chart for data that goes below zero.
- **Every wedge always gets a callout.** What adapts is the detail it carries. The engine takes the first layout that fits: two-line (name over value) → one-line → drop the legend and retry → name-only (or value-only when a legend is showing) → shrink the type down to a 0.72× floor. Turn callouts off with `plotOptions.pie.dataLabels: { enabled: false }`.

### Scatter / bubble / packed (`Charts.scatter`, `Charts.bubble`, `Charts.packedBubble`)

- **Series type per series**: `type: 'scatter' | 'bubble' | 'packedbubble'`
- **Marker symbol**: `marker: { symbol: 'circle'|'square'|'diamond'|'triangle', radius }`
- **Trend line**: `series[i].regression: true` — dashed blue linear least-squares
- **Point labels**: `series[i].showLabels: true` — draws `point.name` above each marker
- **Bubble size scale (area)**: `plotOptions.bubble: { minSize, maxSize }` — area in "points²", radius derived
- **Bubble color gradient**: automatically applied when there's only one bubble series (larger bubbles → bluer)
- **Packed clusters**: with N series → N separate clusters; with 1 series → single cluster and color-by-size gradient
- **Both axes are numeric measures.** `xAxis.categories` is *ignored* by these
  engines: a `[name, value]` pair plots at `x = index`, so a categorical scatter
  silently draws its points against a meaningless 0,1,2… axis. If one dimension
  is a category, the chart is a bar/column, not a scatter.
- **`bubble` needs three numbers per point** — `[x, y, z]` or `{x, y, z}`; a
  point with no `z` has no size to encode. `packedBubble` is the one that takes
  `[name, value]`, because it drops the axes entirely.
- **Axis limits & suffix**: `xAxis: { min, max, suffix, title }`, `yAxis: { … }`

### Geofacet (`Charts.geofacet`)

One tile per region, positioned by `(row, col)` on a grid that approximates the
real map. Pick the tile style with `chart.variant`:

- **`'bar'`** (default) — code + value on one line, mini progress bar below
- **`'heat'`** — solid choropleth tile, color scaled across the value range
- **`'gauge'`** — radial progress ring with the value in the middle

**The default is a default, not a recommendation.** `'bar'` gets used for every
geofacet on the page because it is what you get by typing nothing, and that is
the wrong reason to pick it. The variant encodes the value differently, so it
should follow what the reader is meant to do with the number:

| The reader needs to… | Variant | Why |
|:--|:--|:--|
| Read the exact value per region and compare a few | `'bar'` | The number is printed at full weight and the bar gives a rough rank next to it |
| See the *spatial pattern* — where the high band is, whether it clusters | `'heat'` | Color fills the whole tile, so the map reads as a shape at a glance; individual values recede |
| Judge each region against a shared target or capacity | `'gauge'` | The ring encodes fraction-of-max, so "80% of quota" reads as a ring position without arithmetic |

Two consequences worth stating plainly:

- **`'heat'` needs `min`/`max` pinned** when the page has more than one heat
  facet, or each one auto-scales to its own range and the colors stop being
  comparable between them.
- **`'gauge'` needs a meaningful `max`.** A ring against the data's own maximum
  says only "biggest region", which the bar variant says better. Pass the real
  ceiling — quota, capacity, 100% — or use a different variant.

A page with three geofacets that are all `'bar'` is usually three panels that
should have been one; a page with a `'heat'` for the pattern and a `'gauge'`
for attainment is two panels answering two questions.

```js
Charts.geofacet('chart', {
  title: 'Electric Vehicle Adoption',
  subtitle: 'Percentage of total vehicle sales in %',
  chart: { variant: 'heat' },              // 'bar' | 'heat' | 'gauge'
  plotOptions: { geofacet: {
    max: 100,                              // scale ceiling (default: data max)
    min: 0,                                // bar/gauge start at 0; heat starts at data min
    valueSuffix: '%',
    format: v => v.toFixed(0),             // value formatter
    showEmpty: true,                       // faint labels for regions with no data
    borderRadius: 6                        // tile corner radius
  } },
  series: [{ data: { CA: 98, TX: 78, NY: 96 } }]
});
```

- **Data shapes**: `{CODE: value}`, `[['CA', 98], …]`, or `[{code:'CA', value:98, name:'California'}]`
- **Grid**: `chart.grid` accepts `'us'` (default, 50 states + DC) or an array of `{code, row, col, name?}` for any other geography. Registered grids live in `Charts.geofacet.grids`.
- **Partial data**: regions in the grid but missing from the data render as faint placeholder labels, so the map keeps its shape
- **Spacing is not configurable**: cells are always square with a derived gap, so the tiles stay one block at any container aspect ratio
- Hover a tile for a tooltip with the region name and value

## Titles and subtitles wrap

Every engine measures the heading against the container width and wraps it:
**titles up to 2 lines, subtitles up to 3**, with the plot area shrinking to make
room so a longer heading never overlaps the chart. Anything past the line limit
is clipped with an ellipsis, so length still has a ceiling — it just isn't a
single-line ceiling any more.

Roughly what fits, measured at the template's cell widths:

| Cell | Title chars per line | Comfortable title length |
|:--|:--|:--|
| `w4` (~500px) | ~35 | up to ~70 (uses both lines) |
| `w6` (~750px) | ~72 | up to ~140 |
| `w8` (~1000px) | ~95 | up to ~190 |
| `w12` (~1520px) | ~145 | plenty |

So a finding-style title — "Carrier no-shows and late trailers cause 27% of
delay events" — fits on one line from `w6` up and wraps to two in a `w4`. Aim
under ~70 characters and it works in any cell; past ~90 in a narrow cell you
risk the ellipsis. Nothing needs configuring; there are no wrap options to pass.

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
| `subtitleColor` | `#666666` | Subtitle text |
| `labelColor` | `#333333` | Axis / tick label text |
| `secondaryColor` | `#666666` | Secondary text |
| `categoryColor` / `categoryWeight` | `#111111` / `600` | Category & series names |
| `tickColor` / `tickWeight` | `#333333` / `400` | Numeric axis ticks |
| `valueColor` / `valueWeight` | `#111111` / `700` | Data value readouts |
| `inverseText` | `#FFFFFF` | White-on-dark text |
| `muted` | `#8f8d87` | De-emphasised fill — the bars/lines that are context, not the finding. Derived to clear 3:1 on the canvas |
| `mutedScale` | `['#8f8d87','#a8a6a0','#c2c0ba']` | Ordered de-emphasis ramp, darkest first — for muted groups that keep internal order |
| `highlight` | `#1f77b4` | Zoom / plot-band accent |
| `callout` | `#e3120b` | Callout dot default |
| `positive` | `#2323FF` | Positive bar accent |
| `negative` | `#D1107A` | Negative bar accent |
| `trend` | `#2323FF` | Regression line color |
| `connectorLabel` | `#555555` | Donut connector label text |
| `connectorLine` / `connectorWidth` | `#333333` / `1.4` | Donut callout rule |
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
