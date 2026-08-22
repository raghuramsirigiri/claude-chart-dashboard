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

Either way you end up in the same place. Both scripts run **one recipe** — the
OKLCH derivation described in
[The recipe](#the-recipe-both-scripts-run) at the end of this file. The
extractor does not map a site's colors onto the roles one-for-one; it harvests
what the design has, hands that to the recipe as observations, and lets the
recipe derive everything the design could not supply. If all you have is a
single hex, skip to the generator — it is the same code with nothing observed.

## 2. Harvest the candidates

Run the bundled extractor, which does the parsing and the contrast maths:

```bash
node <skill-dir>/scripts/extract-theme.js <file-or-dir> [more files…]
```

It prints what it found in the design, the palette the recipe built from it, a
ready-to-paste `Charts.theme` override block, and a contrast report. Read its
output before pasting — it proposes, you decide.

Its first job is to find the **canvas**, the **series hue**, and any color the
design already reserves for a utility role. What it looks for, in priority
order, and why:

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

## 3. What comes from the design, and what gets derived

Three things are taken from the site as-is, because the design already decided
them and the recipe has no better answer:

- **the canvas** — whatever surface the charts will sit on. Its own hue and
  chroma then drive the paper ramp, so the greys stay in the brand's tint.
- **light or dark** — which flips the entire recipe: the paper goes dark, the
  ink ladder climbs instead of descending, the series ramp fades *down* toward
  the paper, and every contrast solve looks for a lighter color instead of a
  darker one.
- **the series hue** — the brand accent, which becomes `s2` and the reference
  the whole ramp is built from.

The three utility accents are taken from the design **when the design has a
color that can actually do the job**, and derived by hue rotation when it does
not. The test is geometric, because these roles are defined by their angular
distance from the series hue, not by their name:

| Role | Taken from the design when… | Otherwise |
|:--|:--|:--|
| `accent` → `highlight` | A second brand color sits within 40° of the series hue, and was *not* named as a danger/warning color — emphasis borrowed from the error palette makes every highlighted bar look like a problem | Series hue, 20% darker and 30% duller |
| `annotation` → `callout` | A color sits at least 90–100° round the wheel (a named `--danger`/`--warn` is the strongest signal a design gives about what it reserves for "look here") | The complement, 165° off |
| `counter` → `negative` | A color sits 40–130° from the series hue and at least 45° from whatever annotation ended up being | 75° off, on whichever side lands furthest from annotation |

Whatever the source, **the lightness is checked here**: an observed color that
already reads well against the canvas is used untouched, and one that falls
short is walked along its own hue until it clears its target. That is what makes
a harvested color safe to paste — the site picks the hue, the math keeps it
readable. It also means the extractor never dims a brand color that had contrast
to spare.

Everything else — the paper ramp, the greyscale ink ladder, the seven-step
series ramp — is generated, not harvested, including on a site whose own text
colors were readable. Text is inked in pure greyscale on purpose; the extractor
prints the design's observed ink alongside so you can override it by hand if the
brand's text color is genuinely load-bearing.

### The role table, if you are doing it manually

charts-lib has six color jobs:

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
produces the fruit-salad look the default palette deliberately avoids. Keep one
hue and step it, which is exactly what the recipe does; the extractor builds
this ramp for you and you can adjust the endpoints.

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


## The recipe (both scripts run it)

When there is no CSS to harvest — the user gave you a brand hex, or picked a
color they like — don't hand-pick six more shades around it. Run the generator:

```bash
node <skill-dir>/scripts/generate-theme.js '#2323FF'
```

It prints the full `n*`/`s*` palette, a ready-to-paste `Charts.theme` block, and
the same contrast report the extractor gives you. `--json` emits just the hexes
if you want to build the block yourself.

It also takes what the extractor feeds it, so you can drive any part of the
recipe by hand: `--canvas '#131C2E'` and `--dark` for an observed surface, and
`--accent` / `--annotation` / `--counter` to pin a utility role to a color you
already have. Each pinned color keeps its hue and chroma; only its lightness is
adjusted, and only if it needs it.

### The math it runs, and why

Everything happens in **OKLCH**, not RGB or HSL. OKLCH lightness is perceptually
uniform, so evenly spaced L values produce steps that actually *look* evenly
spaced; the same arithmetic in RGB bunches up the dark end and washes out the
light one. Anywhere a step has to hit a specific contrast ratio, the generator
bisects on lightness — holding hue and chroma — rather than guessing a shade.

**1. The paper (`n0` … `n3`).** `n0` takes the reference's hue at ~4% saturation
and 96% lightness, so a cool brand gets a cool grey and a warm brand a warm one —
the greys agree with the brand instead of sitting next to it. `n3` is solved to
land on exactly **3.0:1 against `n0`**: de-emphasised fills are graphical objects
under WCAG 1.4.11, and below that floor the context bars stop reading as data.
`n1`, `n2a`, `n2` divide the lightness between `n0` and `n3` evenly.

**2. The ink (`n9` … `n4`).** Pure greyscale, no hue at all. Text stays crisp
without chroma, and tinted ink fights the tinted paper. `n9` is black, `n8`→`n4`
step L 10/20/30/40/50%, `nInverse` is white.

**3. The series ramp (`s1` … `s7`).** `s1` is a near-black shade of the reference
rather than flat black, so the anchor belongs to the same family. `s2` is the
reference itself, darkened if needed to clear **4.5:1 on `n0`** — series colors
carry meaning and a pastel brand color can't. `s3`–`s6` hold the hue, ease the
chroma off, and step lightness toward ~0.85. `s7` goes one step further with the
hue nudged ~12°, which keeps the lightest pastel alive instead of grey-dead.

The whole tail is capped so no tint drops below **1.5:1** on the canvas — the
spec's "~85–90% lightness" is a target, not a license to fade a series into the
paper. On a light brand the cap binds first, and that's correct.

**4. The utility accents.** Three, each with a different job. When a color was
observed in a design, the observation supplies the hue and chroma and only the
rotation is skipped — the contrast solve still runs:

| Token | How it's derived | What it's for |
|:--|:--|:--|
| `accent` → `highlight` | Reference, ~20% darker (lighter on a dark design) and ~30% duller | Selection and emphasis — a muted sibling of the brand color, not a rival to it |
| `annotation` → `callout` | Hue rotated 165° (complement), lightness solved to 4.5:1 on `n0` | The ink layer that sits *over* the data — reference lines, callouts, notes |
| `counter` → `negative` | Hue rotated 75°, in whichever direction lands furthest from `annotation` | The opposite side of diverging data. A distinct hue that doesn't trigger "error" psychology the way red does |

`counter` pairs with `positive: s2` for diverging series.

**Dark designs.** The whole recipe mirrors: paper at L 0.18 instead of 0.96, the
ink ladder running 90/80/70/60/50% instead of 10/20/30/40/50, `s1` a near-white
tint instead of a near-black shade, the series ramp fading down toward the paper,
and `nInverse` flipping to black — it is the text drawn on *light* fills, and
leaving it white is the classic vanishing-bar-label bug.

### Before you paste it

Read the contrast report. Every row should say `ok` — the generator solves for
its targets, so a `FAIL` means the reference color is pathological (near-white,
or so vivid the sRGB gamut clipped it) and the offending token needs a hand
adjustment. And look at the rendered page: a palette that passes every ratio can
still be wrong for the story the charts are telling.
