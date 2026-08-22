/*!
 * charts-theme.js — single source of truth for all visual tokens
 *
 * Every chart engine (line, column/bar, donut/pie, scatter/bubble)
 * reads from Charts.theme at render time. Edit a color in the palette
 * below and every property that references it updates in one shot.
 *
 * Example (dark theme):
 *   Charts.theme.bg = '#1a1a2e';
 *   Charts.theme.titleColor = '#e0e0e0';
 *   Charts.theme.colors = ['#e94560','#0f3460','#533483','#16213e'];
 *   Charts.line('chart', { ... });
 */
(function () {
  window.Charts = window.Charts || {};

  // ── Palette ─────────────────────────────────────────────────────────
  // Neutral scale runs light (n0) → dark (n9). Series scale is the
  // ordered set used for multi-series charts (s1 = primary … s7).
  // Names are role/scale based, not color based — safe to reskin.
  const c = {
    n0: '#f4f3f0',   // page/canvas surface (lightest)
    n1: '#dcdbd7',   // hairlines, gridlines
    n3: '#8f8d87',   // de-emphasised fills — 3.0:1 on n0, the WCAG 1.4.11
    // floor for graphical objects. Lighter than this and
    // the context bars stop being readable as data.
    n2: '#a8a6a0',   // second de-emphasis step, for a muted ramp
    n2a: '#c2c0ba',   // third step (use only where a ramp needs three)
    n4: '#666666',   // secondary text
    n5: '#555555',   // tertiary text, connectors
    n6: '#444444',   // subtitle text
    n7: '#333333',   // body/label text
    n8: '#111111',   // heading / title text
    n9: '#000000',   // spines, ticks, ink
    nInverse: '#FFFFFF',   // text on dark fills

    s1: '#000000',   // series 1 (primary)
    s2: '#2323FF',   // series 2
    s3: '#4949FF',   // series 3
    s4: '#7070FF',   // series 4
    s5: '#9696FF',   // series 5
    s6: '#BCBCFF',   // series 6
    s7: '#DDD0FF',   // se

    accent: '#243E63',   // selection / highlight
    // Two accents that are not part of the series ramp. Named for the job they
    // do on a chart, not for a mood: `annotation` is the ink of things drawn
    // ON the data (callout leaders, threshold rules), `counter` is the hue for
    // the opposite direction of travel from s2 — bars below the threshold, the
    // mirrored half of a pyramid. Neither means "something is wrong".
    annotation: '#B31B38',   // callout leaders, boxes, threshold rules
    counter: '#D1107A'    // the against-the-grain direction, paired with s2
  };

  Charts.palette = c;

  Charts.theme = {
    // ── Surface ─────────────────────────────────────────────────────────
    bg: c.n0,
    grid: c.n1,
    axis: c.n9,

    // ── Text ────────────────────────────────────────────────────────────
    // Five roles, each separated from its neighbours by BOTH weight and
    // color so no two are mistakable at a glance:
    //
    //   title      17 / 700 / n8   the darkest, heaviest thing on the canvas
    //   subtitle   12 / 400 / n4   lightest — it explains, it is not data
    //   category   11.5 / 600 / n8 names of things: bar rows, donut callouts
    //   tick        11 / 400 / n7  the numeric scale, quiet by design
    //   value       11 / 700 / n8  the readout the reader came for
    //
    // Subtitle sits at n4 rather than n6 specifically so it cannot be
    // confused with a category label, which is now both darker and semibold.
    titleColor: c.n8,
    subtitleColor: c.n4,
    labelColor: c.n7,
    secondaryColor: c.n4,
    inverseText: c.nInverse,

    categoryColor: c.n8,   // category / series names
    categoryWeight: 600,
    tickColor: c.n7,   // numeric axis ticks
    tickWeight: 400,
    valueColor: c.n8,   // data value readouts
    valueWeight: 700,

    // ── Accent / semantic ───────────────────────────────────────────────
    // `muted` is the fill for everything that is NOT the point of the chart:
    // the bars outside the top two, the lines behind the focus line. It is a
    // neutral, never a second hue — two hues read as two categories, one hue
    // plus a neutral reads as "these matter, those are context".
    muted: c.n3,
    // Ordered de-emphasis ramp, darkest first. Use when the context itself has
    // internal order worth keeping (a muted cluster, the tail of a donut).
    // Two steps is usually plenty; a long grey ramp is just a palette again.
    mutedScale: [c.n3, c.n2, c.n2a],
    highlight: c.accent,
    callout: c.annotation,
    // A bar or line segment is colored by which side of the series threshold
    // (zero, unless the series sets one) it falls on — so the roles are named
    // for the threshold, not for "good" and "bad". A -3% headcount change and
    // a -3°C temperature are the same geometry and neither is a value
    // judgement. `positive`/`negative` remain as aliases for existing configs.
    aboveThreshold: c.s2,
    belowThreshold: c.counter,
    positive: c.s2,
    negative: c.counter,
    trend: c.s2,
    connectorLabel: c.n5,
    connectorLine: c.n7,   // donut callout rule — darker than the label text it carries
    connectorWidth: 1.4,

    // ── Chrome (interaction surfaces, not data) ─────────────────────────
    // These used to be hex literals inside the engines, which meant a reskin
    // of theme.js left tooltips and dimmed legend keys on the old palette.
    tooltipBorder: c.n1,   // tooltip box hairline
    dimmed: c.n2a,   // legend key for a series toggled off
    hoverInk: c.n9,   // ink of the low-opacity hover/crosshair wash

    // ── Series palette ──────────────────────────────────────────────────
    colors: [c.s1, c.s2, c.s3, c.s4, c.s5, c.s6, c.s7],
    defaultColor: c.s1,

    // ── Gradient endpoints (donut, bubble) ──────────────────────────────
    gradientStart: c.s1,
    gradientEnd: c.s2,

    // ── Typography ──────────────────────────────────────────────────────
    font: "'Inter','Segoe UI',Arial,Helvetica,sans-serif",
    titleSize: 17,
    subtitleSize: 12,
    labelSize: 11.5,
    tickSize: 11,
    inlineSize: 11,
    valueSize: 11,
    centerSize: 14,
    pointLabelSize: 10,
    legendSize: 12,

    // ── Strokes / weights ───────────────────────────────────────────────
    axisWidth: 1.8,
    gridWidth: 0.8,
    lineWidth: 3,
    spineWidth: 1.1,
    tickLength: 6,
    tickWidth: 1.5,

    // ── Legend ──────────────────────────────────────────────────────────
    legendRowHeight: 20,
    legendGap: 18,
    legendIconSize: 12,
    legendIconGap: 6
  };
})();
