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
| A proportion the reader should *feel* ("29 in 100") | waffle | `Charts.waffle` — survey shares, adoption rates; a bar compares lengths, a waffle counts units |
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
| One value per region, reader compares exact values | geofacet bars | `Charts.geofacet` + `chart:{variant:'bar'}` |
| One value per region, the *spatial pattern* is the finding | geofacet heat | `Charts.geofacet` + `chart:{variant:'heat'}`, pin `min`/`max` |
| Per-region attainment against a shared target | geofacet gauges | `Charts.geofacet` + `chart:{variant:'gauge'}`, real `max` |
| One value for a handful of named places | ranked bars | `Charts.barList` / `Charts.bar` — a geofacet of 10 states is 40 empty tiles, and the map shape earns its space only when the geography is the finding |
| 2–4 charts that are one exhibit under one headline | panels | `Charts.panels` (`charts:[{type,…}]`, max 4 per row) |
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
- Dual axes. Split into two panels instead (`Charts.panels` keeps them under
  one headline).
- `Charts.panels` as a second grid. It groups charts that are one exhibit; a
  panel that stands on its own belongs in the dashboard grid, not nested.
- A waffle for anything that isn't a share of a whole — negatives are clamped
  to zero, and comparing two waffles is worse than comparing two bars.
- Truncated y-axis on a column chart (bar length must encode the value).
- Bubbles sized by radius rather than area — charts-lib already scales by area
  via `plotOptions.bubble:{minSize,maxSize}`; don't fight it.

## Emphasis

**If the title names specific bars, those bars must look different from the
rest.** This is the single highest-value thing you can do to a categorical
chart, and it is the thing most often skipped: a title reading "The top two
categories drive 90% of volume" above eight identically-colored bars makes the
reader count bars to find the two you meant. Color them, and the sentence and
the picture agree instantly.

The mechanism is a per-point `color` (see `chart-api.md` § Column & bar):

```js
const T = Charts.theme;
const data = rows.map((r, i) => ({
  name: r.name,
  y: r.value,
  color: i < 2 ? T.colors[1] : T.muted   // the finding · everything else
}));

Charts.bar('c1', {
  title: 'The top two categories drive 90% of volume',
  subtitle: 'Units shipped · FY2026',
  xAxis: { categories: data.map(d => d.name) },
  plotOptions: { series: { dataLabels: { enabled: true } } },
  legend: { enabled: false },
  series: [{ name: 'Units', data }]
});
```

Rules for the emphasis color:

- **Two colors, not a rainbow.** One accent for the subject of the finding, one
  neutral (`Charts.theme.muted`) for the context. `colorByPoint: true` is the
  opposite of emphasis — it says every bar is its own category, so nothing
  stands out.
- **The accent comes from the theme**, so a brand recolour carries it:
  `T.colors[1]` (or `T.positive`) for the highlighted set, `T.muted` for the
  rest. Never a hard-coded hex.
- **Drop the legend** when a chart is one series split by emphasis
  (`legend: { enabled: false }`) — there are no series to name, and a legend
  saying "Units" twice in two colors is worse than none. If the split needs
  naming, say it in the subtitle: "Top two highlighted".
- **Not every chart has a subject.** When the finding is the overall shape
  rather than specific categories, a single color across all bars is correct;
  highlighting an arbitrary pair invents a claim.
- **Alpha is the other way to mute, and often the better one.** Appending an
  alpha pair to the focal hex — `T.colors[1] + 'CC'` for 80%, `'66'` for 40% —
  de-emphasises without needing a second token at all, and it recolours
  correctly with any brand for free. Prefer it over `T.muted` when the context
  items are the *same kind of thing* as the focal item (other regions, other
  months); keep the neutral `T.muted` when they are genuinely background. The
  3:1 floor still applies: `'66'` (40%) on a light canvas is usually the
  lightest you can go, and anything under `'80'` needs checking.
- **Grey belongs to residual categories permanently.** "Other", "Unclassified",
  "Don't know", "No response", the rolled-up tail of a donut — these take
  `T.muted` on *every* chart, whether or not the chart is in emphasis mode.
  They are not a finding and never will be, so they should never hold a
  palette color that a real category could have used. This is the one place
  muting is unconditional.
- **Collapse the context into one class.** When several series are all context,
  give them the *same* muted treatment rather than a graded ramp — six
  historical periods in one identical grey read as a single band of "the past",
  which is the comparison you want; six greys read as six things. Reach for
  `mutedScale` only when the context has order the reader must recover. Label
  the group once ("2019–2024") instead of labelling every member.

### The three heuristics

These decide *whether* to switch a chart into emphasis mode, before you decide
how:

1. **Read your own title.** If the title names specific categories, series, or a
   moment in time — "Direct Sales outperformed Partner", "Enterprise is 70% of
   ARR", "the drop came after the March update" — the chart switches from
   **categorical** mode (multi-hue, every item its own color) to **emphasis**
   mode (accent + muted). The two modes are exclusive: a multi-hue palette *with*
   one item accented reads as eight findings, not one.
2. **Muted must stay legible.** `Charts.theme.muted` is derived to clear 3:1
   against the canvas (WCAG 1.4.11 for graphical objects) precisely because
   context bars are still data — a reader must be able to read their values and
   compare them. "Muted" means recessive, not erased. Don't hand-pick a lighter
   grey because it looks calmer; the extractor already found the lightest step
   that passes.
3. **At most 2–3 accented items.** Emphasis is a ratio. Highlight four of seven
   bars and neither group reads as figure or ground — at that point go back to
   the full categorical palette, or re-cut the data so the finding really is
   about two things. If your title needs to name four categories, it is probably
   two findings and therefore two panels.

### Scenario notation: measured, planned, projected

A recurring collision: actual vs. forecast, or actual vs. budget, is a
*distinction the reader must see* — but if you spend a palette color on it, you
have no color left for emphasis, and if you don't, a projection looks exactly
like a measurement. That is a data-integrity problem, not just a design one.

The business-reporting convention (IBCS) resolves it by encoding data *status*
in the fill style instead of the hue, which frees color entirely for emphasis:

| Fill | Means | `scenario` value |
|:--|:--|:--|
| Solid | Actual — measured, happened | `'actual'` (default) |
| Outlined | Plan, budget, target — agreed, not yet real | `'plan'` (or `'budget'`) |
| Hatched | Forecast, estimate, projection | `'forecast'` (or `'estimate'`) |

Set it per series, or per point when one series turns from actual to forecast
partway along — which is the common case for a year-to-date column chart:

```js
Charts.column('c1', {
  title: 'Q4 is tracking 8% above plan',
  subtitle: 'Revenue · USD m · solid = actual, outlined = plan, hatched = forecast',
  xAxis: { categories: ['Q1','Q2','Q3','Q4'] },
  series: [
    { name: 'Plan',    data: [40, 44, 48, 52], scenario: 'plan' },
    { name: 'Revenue', color: T.colors[1], data: [
        42, 47, 51,
        { y: 56, scenario: 'forecast' }        // Q4 not closed yet
    ]}
  ]
});
```

Rules:

- **Say what the notation means in the subtitle.** It is a convention, not an
  intuition; one clause covers it. The legend swatch renders in its series'
  notation automatically, which handles the series-level case, but a *point*
  that switches mid-series has no legend entry and needs the subtitle.
- **It composes with emphasis, it doesn't replace it.** Fill style carries
  status; color still carries focus. A hatched bar can be accent-colored — that
  is a projection you want the reader to look at.
- **Never hatch something that was measured** to make a chart look busier, and
  never leave a projection solid. This is the same honesty rule as § 1 of the
  workflow, expressed in pixels.
- Available on `Charts.column` and `Charts.bar`. For lines, the equivalent is
  `dashStyle: 'ShortDash'` on the projected series — same idea, same subtitle
  obligation.

### Grouped columns and bars

Two different findings live in a grouped chart, and they take opposite
treatments. Decide which one the title is making.

**Series-level focus** — *"Direct Sales outperformed Partner channels"*. The
comparison runs across groups, so one series is the subject everywhere:

```js
const T = Charts.theme;
series: [
  { name: 'Direct',   data: [...], color: T.colors[1] },
  { name: 'Partner',  data: [...], color: T.muted, legendColor: T.secondaryColor },
  { name: 'Reseller', data: [...], color: T.mutedScale[1], legendColor: T.secondaryColor }
]
```

Keep the legend — the series still need naming — but subdue the non-focal
entries with `legendColor: T.secondaryColor`. Their swatch already carries the
muted fill, and dropping the label to secondary text stops the legend from
presenting three equal choices when the chart is making one point.

**Cluster focus** — *"West led in every channel"*. Now the subject is one group
on the x-axis, and the series distinction still matters *inside* it. So the
focal cluster keeps the real categorical palette and every other cluster
collapses to the muted ramp:

```js
series: channels.map((ch, si) => ({
  name: ch.name,
  legendColor: T.secondaryColor,
  data: regions.map(r => ({
    y: r[ch.key],
    // Inside West: true series colors. Everywhere else: ordered greys, so the
    // series stay distinguishable without competing for attention.
    color: r.name === 'West' ? T.colors[si] : T.mutedScale[si % T.mutedScale.length]
  }))
}));
```

Here the multi-hue legend actively misleads — it promises colors that only one
cluster uses — so turn it off (`legend: { enabled: false }`) and name the series
inline, in the subtitle ("Direct · Partner · Reseller, left to right"), with the
focal cluster called out by a `callout` or simply named in the title.

### Line charts

**One series among many** — *"Mobile retention diverged from Desktop"*:

```js
series: [
  { name: 'Mobile',  data: [...], color: T.colors[1], lineWidth: 3 },
  { name: 'Desktop', data: [...], color: T.muted, lineWidth: 1.5, dashStyle: 'ShortDash' },
  { name: 'Tablet',  data: [...], color: T.muted, lineWidth: 1.5, dashStyle: 'ShortDash' }
]
```

Weight carries as much of the emphasis as color does — the focal line at the
theme's full `lineWidth` (3) against context lines at 1.5 reads correctly even
in grayscale or for a color-blind reader, which color alone does not. Dashing
the context lines adds a third redundant channel; use it when the muted lines
still crowd the focal one.

Then **replace the legend with end-of-line labels**: `lineLabels: 'inline'`
draws each series name at the end of its own line, tinted to that line's color,
so the muted series get muted labels for free and the reader never traces a
swatch back to a stroke. This is the one sanctioned alternative to the top
legend (see SKILL.md § Legends go in one place) — use it on every line panel of
the page or none.

**A moment, not a series** — *"The drop came after the March update"*. The line
itself is not the subject, so leave it in the neutral default and let the accent
mark the moment:

```js
xAxis: { plotBands: [{ from: 2, to: 3, color: T.highlight, alpha: 0.12,
                       label: { text: 'v4.2 rollout' } }] },
callouts: [{ x: 3, text: 'Retention −12% the week after release' }]
```

`plotBands` for a window, `plotLines` for a single instant or a target, and a
`callout` for the sentence. Don't also recolor the line — two emphases on one
chart is none.

### Pie and donut

- **Dominant share** — *"Enterprise is 70% of ARR"*: the focal wedge takes solid
  accent, the rest take successive `mutedScale` steps. Better still, when the
  tail is genuinely not the point, merge it into one `Remaining` wedge in
  `T.muted` — two wedges make the 70/30 split instant, where six wedges make the
  reader add up five of them.
- **Link the center to the focus.** A donut's `centerText` should carry the
  focal wedge's color, not the default ink:
  ```js
  plotOptions: { pie: { centerText: { value: '70%', label: 'Enterprise', color: T.colors[1] } } }
  ```
  The tinted number and the solid wedge then read as one statement. Only do this
  when the center stat *is* the focal wedge's value — coloring a grand total in
  the accent implies a link that isn't there.
- Emphasis does not rescue a bad donut. More than six wedges, or parts that
  don't sum to a whole, is still the wrong chart.

## Data labels

Turn `dataLabels` on for bar, column, and bar-list charts by default. They are
off in the library and the resulting chart makes the reader trace a bar back to
a gridline to recover a number that would have fit above it.

```js
plotOptions: { series: { dataLabels: { enabled: true, format: '{y}%' } } }
```

- **Label, or keep the axis — rarely both.** Once every bar carries its value,
  the y-axis ticks are redundant scaffolding. Labels + a light grid is fine;
  labels + heavy ticks + gridlines is three renderings of one number.
- **Turn them off when they'd collide**: more than ~15 bars, or grouped columns
  with 3+ series where the labels overlap. The axis does the job there.
- **Stacked columns**: label the segments only if each is wide enough; otherwise
  label nothing and let the tooltip carry it.
- **Format them like the subtitle promises** — `format: '{y}%'`, or round in the
  data. A label reading `0.4729331` is worse than no label.
- **Line charts stay unlabelled** unless there are few points; a labelled line
  becomes a wall of text. Use `callouts` for the points that matter.

## Reference marks

- Use `plotBands` for context regions (recession, promo window) and `plotLines`
  for targets and thresholds.
- Use `callouts:[{x, series, text}]` to say *why* a spike happened; a chart
  without a labeled anomaly makes the reader do the work.

### Target lines, and colouring against a threshold

When the finding is *attainment* — who cleared the bar and who didn't — draw the
target as a labelled `plotLine` and colour each bar by which side of it the
value falls:

```js
yAxis: { plotLines: [{ value: 100, dashStyle: 'ShortDash', width: 1.5,
                       color: T.axis, label: { text: 'Target 100' } }] },
series: [{ name: 'Attainment', data: rows.map(r => ({
  y: r.value, color: r.value >= 100 ? T.colors[1] : T.muted
})) }]
```

**This is the one exception to the 2–3 accent cap.** That cap protects emphasis,
where accent means "this is what the sentence is about" and a fourth accent
dilutes the first three. Threshold colouring is *evaluative*, not emphatic — the
colour is a second reading of the value, so seven bars above target may all be
accented without ambiguity. The reader learns one rule and applies it across the
whole chart.

Two cautions that keep it honest:

- **Name the rule in the subtitle** ("Bars at or above the 100 target in blue").
  A colour split the reader has to reverse-engineer is worse than no split.
- **Don't stack it with emphasis.** A chart that is both threshold-coloured and
  has two highlighted categories has two colour systems fighting; pick the one
  the title is making.

`plotLines` also carry prior-year, budget, and break-even in exactly this way.
A target that only appears in the subtitle is a target the reader can't check.

### Annotation as the emphasis

Recolouring is not the only way to point. Often the strongest treatment leaves
every mark in the chart identical and adds a single annotation — a `callout`
with a connector, or a `plotBand` around the moment — because the annotation
says *what* is interesting and *why*, where colour only says *that* something
is.

Prefer annotation-only when:

- the finding is about **one point or one window**, not a category or series
  (see the milestone pattern above)
- the chart is a **scatter or a dense cloud**, where recolouring a few markers
  reads as a new category rather than a highlight
- the reason matters more than the magnitude — "the WMS cutover" tells the
  reader something the accent colour never could

And the rule that keeps this from doubling up: **one emphasis per chart.** If
the annotation is doing the pointing, leave the marks in the neutral default —
an accented bar *and* a callout on the same bar is not twice the emphasis, it
is two competing signals plus a reader wondering what they missed.
