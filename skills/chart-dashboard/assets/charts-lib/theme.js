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
    n0:       '#f4f3f0',   // page/canvas surface (lightest)
    n1:       '#dcdbd7',   // hairlines, gridlines
    n4:       '#666666',   // secondary text
    n5:       '#555555',   // tertiary text, connectors
    n6:       '#444444',   // subtitle text
    n7:       '#333333',   // body/label text
    n8:       '#111111',   // heading / title text
    n9:       '#000000',   // spines, ticks, ink
    nInverse: '#FFFFFF',   // text on dark fills

    s1:       '#000000',   // series 1 (primary)
    s2:       '#2323FF',   // series 2
    s3:       '#4949FF',   // series 3
    s4:       '#7070FF',   // series 4
    s5:       '#9696FF',   // series 5
    s6:       '#BCBCFF',   // series 6
    s7:       '#DDD0FF',   // series 7

    accent:   '#1f77b4',   // selection / highlight
    danger:   '#e3120b',   // callout / alert
    warning:  '#D1107A'    // negative bar accent
  };

  Charts.palette = c;

  Charts.theme = {
    // ── Surface ─────────────────────────────────────────────────────────
    bg:             c.n0,
    grid:           c.n1,
    axis:           c.n9,

    // ── Text ────────────────────────────────────────────────────────────
    titleColor:     c.n8,
    subtitleColor:  c.n6,
    labelColor:     c.n7,
    secondaryColor: c.n4,
    inverseText:    c.nInverse,

    // ── Accent / semantic ───────────────────────────────────────────────
    highlight:      c.accent,
    callout:        c.danger,
    positive:       c.s2,
    negative:       c.warning,
    trend:          c.s2,
    connectorLabel: c.n5,

    // ── Series palette ──────────────────────────────────────────────────
    colors:         [c.s1, c.s2, c.s3, c.s4, c.s5, c.s6, c.s7],
    defaultColor:   c.s1,

    // ── Gradient endpoints (donut, bubble) ──────────────────────────────
    gradientStart:  c.s1,
    gradientEnd:    c.s2,

    // ── Typography ──────────────────────────────────────────────────────
    font:           "'Inter','Segoe UI',Arial,Helvetica,sans-serif",
    titleSize:      17,
    subtitleSize:   12,
    labelSize:      11.5,
    tickSize:       11,
    inlineSize:     11,
    valueSize:      11,
    centerSize:     14,
    pointLabelSize: 10,
    legendSize:     12,

    // ── Strokes / weights ───────────────────────────────────────────────
    axisWidth:      1.8,
    gridWidth:      0.8,
    lineWidth:      3,
    spineWidth:     1.1,
    tickLength:     6,
    tickWidth:      1.5,

    // ── Legend ──────────────────────────────────────────────────────────
    legendRowHeight: 20,
    legendGap:       18,
    legendIconSize:  12,
    legendIconGap:   6
  };
})();
