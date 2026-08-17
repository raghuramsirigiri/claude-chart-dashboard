# Matching a reference brand

The default charts-lib look — cream canvas, ink text, black→blue series ramp — is
a complete design system: type scale, weights, spacing, stroke widths, legend
position, chart geometry. **Only the colors are yours to change.** Everything
else stays put, because those proportions are what make eight different chart
types read as one family. A page that borrows a brand's palette but keeps the
library's structure looks designed; one that also borrows the brand's type scale
and spacing usually looks like two design systems fighting.

So the job is narrow and mechanical: pull the reference's colors, map them onto
charts-lib's color roles, check they still contrast, apply them once.

## 1. Get the source

| The user gave you… | Do this |
|:--|:--|
| Local files (`site/index.html`, `styles.css`) | Read them directly |
| A URL | Fetch the page, then fetch every same-origin `<link rel=stylesheet>` it references — the colors are almost never in the HTML |
| A screenshot only | You cannot sample pixels reliably; ask for the CSS or a hex list, and say why |
| A few hex codes in chat | Use them as-is; skip to step 3 |

## 2. Harvest the candidates

Run the bundled extractor, which does the parsing and the contrast maths:

```bash
node <skill-dir>/scripts/extract-theme.js <file-or-dir> [more files…]
```

It prints a ready-to-paste `Charts.theme` override block plus a contrast report.
Read its output before pasting — it proposes, you decide.

What it looks for, in priority order, and why:

1. **CSS custom properties** (`--ink: #0B1220`). These are the jackpot: the brand
   has already done the role-naming for you. A variable called `--surface` or
   `--accent` tells you what the color is *for*, which is exactly the mapping
   problem you would otherwise be guessing at.
2. **Declared colors by frequency and context** — `background`/`background-color`
   values are canvas candidates, `color` values are text candidates, `border`
   values are hairline candidates. Frequency matters: the color used 40 times is
   structural, the one used once is an accident.
3. **Whether the design is light or dark**, decided by the luminance of the most
   common background. This flips the whole mapping, so get it right.

## 3. Map onto the color roles

charts-lib has six color jobs. Fill each one:

| Role | Theme tokens | Take it from |
|:--|:--|:--|
| Canvas | `bg` | The brand's card/panel surface — the thing charts will sit on, not the page ground behind it |
| Ink | `titleColor`, `categoryColor`, `valueColor` | Primary text color |
| Quiet text | `subtitleColor`, `labelColor`, `tickColor`, `secondaryColor` | Secondary/muted text |
| Structure | `grid`, `axis`, `connectorLine` | Border/divider color; `axis` may be the ink color if the brand draws hard rules |
| Series | `colors[]`, `defaultColor`, `gradientStart`, `gradientEnd` | The brand accent(s) — see below |
| Semantic | `positive`, `negative`, `callout`, `highlight`, `trend` | Brand success/danger colors if it has them; otherwise leave the defaults |

**Building the series ramp from one accent.** Most brands have a single accent,
and charts-lib wants seven ordered colors. Don't invent six more hues — that
produces the fruit-salad look the default palette deliberately avoids. Instead
keep the default's *structure*: one dark anchor stepping toward the accent, then
the accent fading toward the canvas. On a dark UI the anchor is the lightest
text color; on a light UI it's the darkest ink. The extractor generates this ramp
for you and you can adjust the endpoints.

Two accents (say mint and amber) are better spent as accent-plus-semantic —
mint for series, amber for `callout` — than as the first two series colors,
where they will read as a category distinction that doesn't exist.

## 4. Check contrast before you commit

A palette that looks right in a swatch grid can be unreadable in a chart, because
chart text is small and sits on colored fills. The extractor reports these; fix
anything it flags:

- Title and value text vs. canvas: **at least 4.5:1**. These are the numbers the
  reader came for.
- Tick and subtitle text vs. canvas: **at least 3:1**. Quiet is fine, invisible is not.
- Gridlines vs. canvas: **between about 1.1:1 and 1.6:1** — present but never
  competing with the data. This is the single most common mistake when porting a
  dark brand: a border color chosen for 1px card edges becomes a loud grid.
- Adjacent series colors: distinguishable from each other, and each readable
  against the canvas.
- Bar labels sit *on* their bars, so the darkest series color must still take
  white text (charts-lib picks the contrast text color automatically, but a
  mid-tone series defeats it either way).

## 5. Apply it in exactly one place

Override `Charts.theme` once, after `theme.js` loads and **before the first chart
factory call**. Never set colors per chart — that is how a page ends up with six
slightly different blues.

```html
<script src="charts-lib/theme.js"></script>
<script src="charts-lib/charts.js"></script>
<script>
  // Northwind brand — derived from styles.css custom properties
  Object.assign(Charts.theme, {
    bg:            '#131C2E',   // --surface
    grid:          '#24324D',   // --line
    axis:          '#63708A',   // --text-dim, softened from pure ink
    titleColor:    '#E8EDF7',   // --text
    categoryColor: '#E8EDF7',
    valueColor:    '#E8EDF7',
    subtitleColor: '#93A0B8',   // --text-muted
    labelColor:    '#93A0B8',
    tickColor:     '#93A0B8',
    secondaryColor:'#93A0B8',
    inverseText:   '#0B1220',   // dark text on light fills - flipped for a dark UI
    colors:        ['#34E5B4','#00B389','#1E9C7F','#93A0B8','#63708A','#4A5878','#2E3A54'],
    defaultColor:  '#34E5B4',
    gradientStart: '#34E5B4',
    gradientEnd:   '#1B2740',
    positive:      '#34E5B4',
    negative:      '#FF5D5D',   // --bad
    callout:       '#FFB020',   // --warn
    highlight:     '#34E5B4',
    trend:         '#34E5B4'
  });
</script>
```

Note `inverseText`: on a dark theme it must become *dark*, since it is the text
drawn on top of light fills. Leaving it white is the classic dark-mode bug that
makes data labels vanish inside bars.

## 6. Keep the page and the charts in one palette

The page chrome reads its colors from the same theme object, so a single
override reskins both. The templates already carry this sync block — leave it in:

```js
// Page chrome follows the chart theme, so there is one source of colour truth.
(function () {
  const t = Charts.theme, s = document.documentElement.style;
  s.setProperty('--card',  t.bg);
  s.setProperty('--ink',   t.titleColor);
  s.setProperty('--muted', t.secondaryColor);
  s.setProperty('--hair',  t.grid);
  s.setProperty('--font',  t.font);
})();
```

Two page-level values have no chart equivalent and are set by hand in the
template's `:root`:

- `--page-bg` — the ground *behind* the cards. Keep it a small step away from
  `Charts.theme.bg` (darker on a dark UI, slightly darker on a light one) so
  cards read as raised without a heavy border.
- `--radius` — corner rounding. This one genuinely belongs to the brand: match
  the reference's button/card radius (Northwind's 2px, say, instead of the
  default 14px). It is the one structural token worth borrowing, because square
  vs. rounded corners is a brand signature that costs nothing to honor.

## What never changes

Font stack is a judgment call: keep charts-lib's stack unless the brand's face is
actually available as a local/system font — a `font-family` naming a webfont you
cannot load silently falls back and looks worse than the default. Never change
the type *scale* (`titleSize`, `tickSize`, …), the weights, stroke widths, legend
position, or chart geometry. Those are load-bearing.
