/*!
 * charts.js — unified chart library (clean-charts theme)
 *
 * Combines four chart engines under a single Charts namespace:
 *   Charts.line(container, config)              — line, spline, step
 *   Charts.column(container, config)            — vertical columns; grouped, stacked, range, pyramid, 3D
 *   Charts.bar(container, config)               — horizontal bars; groups + stacks + population pyramid
 *   Charts.barList(container, config)           — axis-free horizontal bars, category label above each bar
 *   Charts.barInsightTable(container, config)   — rows of bars + insight text + a large change/summary stat
 *   Charts.waffle(container, config)            — part-of-whole dot-grid panels with headline stat + caption
 *   Charts.panels(container, config)            — up to 4 charts of any type side by side under one shared title
 *   Charts.donut(container, config)             — donut, semi-circle, variable-radius, gradient, sliced
 *   Charts.pie(container, config)               — alias of donut with innerSize:0 (full pie)
 *   Charts.scatter(container, config)           — 2D scatter + regression + labels
 *   Charts.bubble(container, config)            — third dim = bubble radius + color gradient
 *   Charts.packedBubble(container, config)      — physics-packed clusters
 *
 * All engines share the clean-charts visual theme (cream bg, Inter, top-left title).
 * Override Charts.theme properties before calling a chart factory to re-skin all charts.
 * See ../charts-lib-demo/index.html for a live catalog of every variation.
 *
 * Load theme.js BEFORE this file in the page so Charts.theme exists.
 * Edits to theme.js take effect on next page load — no rebuild needed.
 */
// ─── line / spline / step ────────────────────────────────────────────

/*
 * Clean-charts-styled line chart engine.
 * Match tokens from clean_charts.config: cream bg, Inter, black+blue palette,
 * top-left title, y-axis on the right, only-bottom spine, x-ticks at boundaries
 * with labels centered between, inline line-end labels, no legend by default.
 * Interactive: crosshair, shared tooltip, marker hover, zoom.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // --- theme tokens (populated from window.Charts.theme at render time) ---
  let BG, GRID, AXIS, TITLE_COL, SUB_COL, LABEL_COL, SEC_COL, HIGHLIGHT, CALLOUT_C, INV_TEXT, COLORS;
  let CAT_COL, CAT_FW, TICK_COL, TICK_FW, VAL_COL, VAL_FW;
  let FONT, F_TITLE, F_SUB, F_LABEL, F_TICK, F_INLINE;
  let AXIS_W, GRID_W, LINE_W, TICK_L, TICK_W;
  function applyTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    BG = t.bg || '#f4f3f0';
    GRID = t.grid || '#dcdbd7';
    AXIS = t.axis || '#000000';
    TITLE_COL = t.titleColor || '#111111';
    SUB_COL = t.subtitleColor || '#666666';
    LABEL_COL = t.labelColor || '#333333';
    SEC_COL = t.secondaryColor || '#666666';
    HIGHLIGHT = t.highlight || '#1f77b4';
    CALLOUT_C = t.callout || '#e3120b';
    INV_TEXT = t.inverseText || '#FFFFFF';
    COLORS = t.colors || ['#000000','#2323FF','#4949FF','#7070FF','#9696FF','#BCBCFF','#DDD0FF'];
    // Shared text roles â€” see the hierarchy comment in theme.js.
    CAT_COL = t.categoryColor || TITLE_COL;
    CAT_FW = t.categoryWeight != null ? t.categoryWeight : 600;
    TICK_COL = t.tickColor || LABEL_COL;
    TICK_FW = t.tickWeight != null ? t.tickWeight : 400;
    VAL_COL = t.valueColor || TITLE_COL;
    VAL_FW = t.valueWeight != null ? t.valueWeight : 700;
    FONT = t.font || "'Inter','Segoe UI',Arial,Helvetica,sans-serif";
    F_TITLE = t.titleSize != null ? t.titleSize : 17;
    F_SUB = t.subtitleSize != null ? t.subtitleSize : 12;
    F_LABEL = t.labelSize != null ? t.labelSize : 11.5;
    F_TICK = t.tickSize != null ? t.tickSize : 11;
    F_INLINE = t.inlineSize != null ? t.inlineSize : 11;
    AXIS_W = t.axisWidth != null ? t.axisWidth : 1.8;
    GRID_W = t.gridWidth != null ? t.gridWidth : 0.8;
    LINE_W = t.lineWidth != null ? t.lineWidth : 3;
    TICK_L = t.tickLength != null ? t.tickLength : 6;
    TICK_W = t.tickWidth != null ? t.tickWidth : 1.5;
  }

  // Resolve a dataLabels option to a boolean. Accepts `true`/`false` directly or
  // an `{enabled}` object, and falls back to the engine's default when the
  // option says nothing.
  function dlEnabled(opt, dflt) {
    if (opt === false) return false;
    if (opt === true) return true;
    if (opt && opt.enabled != null) return !!opt.enabled;
    return dflt;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, attrs, parent) {
    const e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }

  // â”€â”€ Heading wrapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Titles wrap to at most 2 lines, subtitles to at most 3; whatever does
  // not fit is clipped with an ellipsis. Widths are estimated (not measured)
  // so the whole layout can be decided before anything hits the DOM.
  function _headW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.58 : 0.53);
  }
  function _clipLine(str, fontSize, maxW, bold) {
    let s = String(str);
    if (_headW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && _headW(s + 'â€¦', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s.,;:]+$/, '') + 'â€¦';
  }
  function wrapHeading(str, fontSize, maxW, maxLines, bold) {
    const words = String(str == null ? '' : str).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i];
      if (_headW(next, fontSize, bold) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    lines.push(cur);
    if (lines.length > maxLines) {
      const tail = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(_clipLine(tail, fontSize, maxW, bold));
    }
    return lines.map(l => _clipLine(l, fontSize, maxW, bold));
  }
  const TITLE_LINES = 2, SUB_LINES = 3, TITLE_LH = 21, SUB_LH = 16;
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function niceTicks(min, max, count) {
    count = count || 5;
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;
    const step0 = Math.pow(10, Math.floor(Math.log10(range / count)));
    const err = (count / range) * step0;
    let step = step0;
    if (err <= 0.15) step *= 10;
    else if (err <= 0.35) step *= 5;
    else if (err <= 0.75) step *= 2;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(12));
    return out;
  }

  function logTicks(min, max) {
    const lo = Math.floor(Math.log10(min));
    const hi = Math.ceil(Math.log10(max));
    const out = [];
    for (let e = lo; e <= hi; e++) out.push(Math.pow(10, e));
    return out;
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDateFull(ms) {
    const d = new Date(ms);
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear()
      + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  }


  // â”€â”€ dense-axis tick thinning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // With many categories every label would be drawn, so they collide and the
  // axis looks squeezed. When the labels parse as dates we keep only the ones
  // that open a calendar period (hour â†’ day â†’ week â†’ month â†’ quarter â†’ year),
  // stepping up to a coarser period until the kept labels fit the available
  // pixels; otherwise we fall back to an even stride. Called from render(), so
  // a chart whose data keeps growing re-thins itself on every update.
  const TMONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function tpad(n) { return n < 10 ? '0' + n : '' + n; }

  function parseAxisDate(v) {
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v > 1e11 ? v : null;
    if (typeof v !== 'string') return null;
    if (!/\d{4}|\d{1,2}[\/-]\d{1,2}/.test(v)) return null;
    const t = Date.parse(v);
    return isNaN(t) ? null : t;
  }

  // Coarsest-last ladder of calendar periods.
  const AXIS_PERIODS = [
    { key: ms => Math.floor(ms / 3600000),
      fmt: (d) => tpad(d.getUTCHours()) + ':' + tpad(d.getUTCMinutes()) },
    { key: ms => Math.floor(ms / 86400000),
      fmt: (d, first) => TMONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + (first ? ' ' + d.getUTCFullYear() : '') },
    { key: ms => Math.floor((ms / 86400000 - 4) / 7),
      fmt: (d, first) => TMONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + (first ? ' ' + d.getUTCFullYear() : '') },
    { key: ms => { const d = new Date(ms); return d.getUTCFullYear() * 12 + d.getUTCMonth(); },
      fmt: (d, first) => TMONTHS[d.getUTCMonth()] + (first || d.getUTCMonth() === 0 ? " '" + tpad(d.getUTCFullYear() % 100) : '') },
    { key: ms => { const d = new Date(ms); return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3); },
      fmt: (d, first) => 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1) + (first || d.getUTCMonth() < 3 ? " '" + tpad(d.getUTCFullYear() % 100) : '') },
    { key: ms => new Date(ms).getUTCFullYear(),
      fmt: (d) => String(d.getUTCFullYear()) }
  ];

  // Does this label set fit in `avail` px of axis length? Only x-axes need this:
  // their labels sit side by side and collide, whereas a y-axis (horizontal bar)
  // gives every category its own row and can carry the full-length label, so
  // y-axis labels are never thinned.
  function labelsFit(items, avail, fontSize) {
    if (items.length <= 1) return true;
    const per = items.reduce((a, it) => Math.max(a, it.label.length), 0) * fontSize * 0.62 + 12;
    return items.length * per <= avail;
  }

  // Plan the x-axis category labels for `avail` px of axis.
  // Temporal categories collapse to a coarser calendar period (see above) â€”
  // dropping "Feb 3" from a run of days still leaves a readable time axis.
  // Named categories cannot be dropped that way: "Chrome, ?, ?, Safari" is
  // worse than no axis at all. So for them nothing is ever dropped; instead the
  // labels are given more room, in order â€” full width, smaller type, two
  // wrapped lines, two staggered rows, 45Â° slant, then 90Â° vertical. An
  // ellipsis is the last resort, used only after wrapping has been tried.
  // Returns { ticks:[{i, lines:[...]}], font, rotate, stagger, lines, height }.
  function layoutCategoryAxis(cats, avail, baseFont, maxBand) {
    const n = cats.length;
    const CW = 0.62;                       // avg glyph width / font-size
    const base = baseFont || 11;
    maxBand = maxBand || 96;
    const FONTS = [base, base - 1, base - 2].filter(f => f >= 9);
    const upright = (ticks, font, lines, stagger) => ({
      ticks, font, rotate: 0, stagger: !!stagger, lines, count: n,
      height: Math.round(font * 1.25 * lines * (stagger ? 2 : 1)) + 20
    });
    const one = items => items.map(it => ({ i: it.i, lines: [it.label] }));
    if (!n) return upright([], base, 1);

    const all = cats.map((c, i) => ({ i, label: c == null ? String(i) : String(c) }));
    const widest = all.reduce((a, it) => Math.max(a, it.label.length), 0) * CW * base;
    const slot = avail / n;
    if (widest + 10 <= slot) return upright(one(all), base, 1);

    // Temporal: step up the calendar ladder instead of crowding.
    const times = cats.map(parseAxisDate);
    if (times.every(t => t !== null)) {
      for (let p = 0; p < AXIS_PERIODS.length; p++) {
        const period = AXIS_PERIODS[p];
        const picked = [];
        let prev = null;
        for (let i = 0; i < n; i++) {
          const k = period.key(times[i]);
          if (prev === null || k !== prev) {
            picked.push({ i, label: period.fmt(new Date(times[i]), picked.length === 0) });
            prev = k;
          }
        }
        if (picked.length < n && picked.length > 1 && labelsFit(picked, avail, base)) {
          return upright(one(picked), base, 1);
        }
      }
    }

    // Named categories: keep every label, find a presentation that fits.
    // 1) upright â€” shrink the type a little, wrapping onto two lines if it helps
    for (const font of FONTS) {
      if (widest * (font / base) + 10 <= slot) return upright(one(all), font, 1);
      const wrapped = all.map(it => ({ i: it.i, lines: wrapAxisLabel(it.label, 2) }));
      if (maxLineChars(wrapped) * CW * font + 8 <= slot) return upright(wrapped, font, 2);
    }
    // 2) stagger onto two baselines â€” each label gets two slots of width
    for (const font of FONTS) {
      if (widest * (font / base) + 8 <= slot * 2) return upright(one(all), font, 1, true);
    }
    // 3) slant 45Â°, then 4) stand labels vertically. Spacing now costs about a
    // glyph height per wrapped line, and length is bounded by the band depth â€”
    // so try a second line before giving up any characters.
    const slanted = (ticks, font, rotate, lines, proj) => ({
      ticks, font, rotate, stagger: false, lines, count: n,
      height: Math.round(Math.min(maxBand, maxLineChars(ticks) * CW * font / proj + 16)) + 6
    });
    for (const rotate of [45, 90]) {
      const proj = rotate === 45 ? Math.SQRT2 : 1;      // band px per text px
      const thin = rotate === 45 ? base * 0.95 : base * 1.05;
      for (const font of FONTS) {
        const maxChars = Math.max(4, Math.floor((maxBand - 16) * proj / (CW * font)));
        for (const lines of [1, 2]) {
          if (thin * (font / base) * lines > slot) break;
          const ticks = all.map(it => ({ i: it.i, lines: wrapAxisLabel(it.label, lines) }));
          if (maxLineChars(ticks) <= maxChars) return slanted(ticks, font, rotate, lines, proj);
        }
      }
      // Wrapping was not enough for this angle: truncate to the band depth.
      for (const font of FONTS) {
        const maxChars = Math.max(4, Math.floor((maxBand - 16) * proj / (CW * font)));
        for (const lines of [2, 1]) {
          if (thin * (font / base) * lines > slot) continue;
          const ticks = all.map(it => ({
            i: it.i, lines: wrapAxisLabel(it.label, lines).map(l => ellipsize(l, maxChars))
          }));
          return slanted(ticks, font, rotate, lines, proj);
        }
      }
    }
    // Slots too narrow for any legible text â€” the tooltip carries the names.
    return upright([], base, 1);
  }

  function maxLineChars(ticks) {
    return ticks.reduce((a, t) => Math.max(a, t.lines.reduce((b, l) => Math.max(b, l.length), 0)), 0);
  }
  function ellipsize(s, maxChars) {
    s = String(s);
    return s.length <= maxChars ? s : s.slice(0, Math.max(1, maxChars - 1)) + 'â€¦';
  }
  // Word wrap into at most `lines` lines, split where the longest line comes
  // out shortest — a balanced wrap fits a narrow slot that a greedy one misses.
  function wrapAxisLabel(label, lines) {
    const s = String(label);
    const words = s.split(/\s+/);
    if (lines < 2 || words.length <= 1) return [s];
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const score = Math.max(a.length, b.length);
      if (!best || score < best.score) best = { score, out: [a, b] };
    }
    if (lines <= 2 || words.length === 2) return best.out;
    return [best.out[0]].concat(wrapAxisLabel(best.out[1], lines - 1));
  }

  // Draw one planned axis label. `x` is the slot centre, `yTop` the first
  // baseline. Rotated labels hang from the axis anchored at their end, with
  // wrapped lines stepping along the rotated frame's own y so they stay
  // perpendicular to the axis.
  function drawCategoryLabel(g, layout, tick, k, x, yTop, color, weight) {
    const a = { 'font-size': layout.font, 'font-weight': weight, fill: color, 'font-family': FONT };
    const lh = layout.font * 1.25;
    const y0 = yTop + (layout.stagger && k % 2 ? lh : 0);
    tick.lines.forEach((ln, li) => {
      const t = txt(ln, Object.assign({ x, y: y0 + li * lh,
        'text-anchor': layout.rotate ? 'end' : 'middle' }, a), g);
      if (layout.rotate) t.setAttribute('transform', `rotate(-${layout.rotate} ${x} ${yTop})`);
    });
  }

  const UNIT_MS = { second: 1000, minute: 60000, hour: 3600000, day: 86400000,
    week: 604800000, month: 2629800000, quarter: 7889400000, year: 31557600000 };

  // Ladder of (unit, multiple) tick intervals, finest first. `auto` walks it
  // from the top and stops at the first interval whose labels fit the axis, so
  // a denser dataset simply lands on a coarser rung instead of cramming ticks.
  const DATE_LADDER = [
    ['second', 1], ['second', 5], ['second', 15], ['second', 30],
    ['minute', 1], ['minute', 5], ['minute', 15], ['minute', 30],
    ['hour', 1], ['hour', 3], ['hour', 6], ['hour', 12],
    ['day', 1], ['day', 2], ['week', 1], ['week', 2],
    ['month', 1], ['quarter', 1], ['month', 6],
    ['year', 1], ['year', 2], ['year', 5], ['year', 10], ['year', 25],
    ['year', 50], ['year', 100]
  ];

  // Period-start boundaries at `mult` Ã— unit, covering [minMs, maxMs].
  function genBoundaries(freq, mult, minMs, maxMs) {
    mult = mult || 1;
    const out = [];
    const first = new Date(minMs);
    const LIMIT = 4000;
    if (freq === 'year') {
      let y = Math.floor(first.getUTCFullYear() / mult) * mult;
      while (out.length < LIMIT) {
        const t = Date.UTC(y, 0, 1);
        out.push(t);
        if (t > maxMs) break;
        y += mult;
      }
    } else if (freq === 'quarter' || freq === 'month') {
      const step = freq === 'quarter' ? 3 * mult : mult;
      let idx = Math.floor((first.getUTCFullYear() * 12 + first.getUTCMonth()) / step) * step;
      while (out.length < LIMIT) {
        const t = Date.UTC(Math.floor(idx / 12), idx % 12, 1);
        out.push(t);
        if (t > maxMs) break;
        idx += step;
      }
    } else {
      let step, t;
      if (freq === 'week') {
        step = 7 * 86400000 * mult;
        const dow = (first.getUTCDay() + 6) % 7; // 0 = Mon
        t = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate()) - dow * 86400000;
      } else {
        step = (UNIT_MS[freq] || 86400000) * mult;
        t = Math.floor(minMs / step) * step;
      }
      while (out.length < LIMIT) { out.push(t); if (t > maxMs) break; t += step; }
    }
    return out;
  }

  // Midpoint label per boundary span; the year/date part is repeated only when
  // it changes, matching the clean_charts axis style.
  function composeCenters(boundaries, freq) {
    const centers = [];
    let prev = null;
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i], end = boundaries[i + 1];
      const mid = start + (end - start) / 2;
      const s = new Date(start);
      let label = '';
      if (freq === 'year') label = (i === 0) ? String(s.getUTCFullYear()) : String(s.getUTCFullYear()).slice(2);
      else if (freq === 'quarter') {
        const q = Math.floor(s.getUTCMonth() / 3) + 1;
        label = (i === 0 || !prev || s.getUTCFullYear() !== prev.getUTCFullYear())
          ? `${s.getUTCFullYear()} Q${q}` : `Q${q}`;
      } else if (freq === 'month') {
        label = (i === 0 || !prev || s.getUTCFullYear() !== prev.getUTCFullYear())
          ? `${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}` : MONTHS[s.getUTCMonth()];
      } else if (freq === 'week' || freq === 'day') {
        label = (i === 0 || !prev || s.getUTCFullYear() !== prev.getUTCFullYear())
          ? `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}, ${s.getUTCFullYear()}`
          : (s.getUTCMonth() !== prev.getUTCMonth() ? `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}` : String(s.getUTCDate()));
      } else if (freq === 'hour') {
        label = (i === 0 || !prev || s.getUTCDate() !== prev.getUTCDate())
          ? `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}, ${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`
          : `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`;
      } else if (freq === 'minute') {
        label = (i === 0 || !prev || s.getUTCHours() !== prev.getUTCHours())
          ? `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}` : `:${pad(s.getUTCMinutes())}`;
      } else {
        label = `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}:${pad(s.getUTCSeconds())}`;
      }
      centers.push({ ms: mid, label });
      prev = s;
    }
    return centers;
  }

  // Boundary + midpoint tick generator for datetime axes.
  // `avail` is the plot width in px; the interval is coarsened until the labels
  // fit it, so the axis stays readable as the number of datapoints grows.
  // Returns { boundaries: [ms...], centers: [{ms, label}] }
  function dateBoundaries(minMs, maxMs, freq, avail, fontSize) {
    freq = (freq || 'auto').toLowerCase();
    const span = Math.max(1, maxMs - minMs);
    const fs = fontSize || 11;

    function build(f, mult) {
      const bs = genBoundaries(f, mult, minMs, maxMs);
      return { boundaries: bs, centers: composeCenters(bs, f) };
    }
    function fits(r) {
      if (r.centers.length < 2) return r.centers.length === 1;
      return avail ? labelsFit(r.centers, avail, fs, false) : r.centers.length <= 12;
    }

    let start = 0;
    if (freq !== 'auto') {
      const idx = DATE_LADDER.findIndex(l => l[0] === freq);
      if (idx < 0) return build(freq, 1);   // unknown interval: honour as-is
      start = idx;
    }
    let last = null;
    for (let i = start; i < DATE_LADDER.length; i++) {
      const [f, mult] = DATE_LADDER[i];
      if (span / (UNIT_MS[f] * mult) > 500) continue;   // way too fine to bother building
      last = build(f, mult);
      if (fits(last)) return last;
    }
    return last || build('year', 100);
  }


  // --- paths ---
  function linePath(pts) {
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      if (pts[i] === null) continue;
      d += (d && pts[i - 1] !== null ? 'L' : 'M') + pts[i][0] + ' ' + pts[i][1] + ' ';
    }
    return d.trim();
  }
  // Monotone cubic (PCHIP-like) for smooth curves without overshoot.
  function pchipPath(pts) {
    const P = pts.filter(p => p !== null);
    const n = P.length;
    if (n < 2) return linePath(pts);
    const xs = P.map(p => p[0]);
    const ys = P.map(p => p[1]);
    const h = [], delta = [], m = [];
    for (let i = 0; i < n - 1; i++) {
      h[i] = xs[i + 1] - xs[i];
      delta[i] = (ys[i + 1] - ys[i]) / (h[i] || 1);
    }
    m[0] = delta[0];
    for (let i = 1; i < n - 1; i++) {
      if (delta[i - 1] * delta[i] <= 0) m[i] = 0;
      else {
        const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
      }
    }
    m[n - 1] = delta[n - 2];
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 0; i < n - 1; i++) {
      const c1x = xs[i] + h[i] / 3;
      const c1y = ys[i] + m[i] * h[i] / 3;
      const c2x = xs[i + 1] - h[i] / 3;
      const c2y = ys[i + 1] - m[i + 1] * h[i] / 3;
      d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${xs[i + 1]} ${ys[i + 1]}`;
    }
    return d;
  }
  function stepPath(pts, mode) {
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      if (pts[i] === null) continue;
      const [x, y] = pts[i];
      if (!d) { d = 'M ' + x + ' ' + y; continue; }
      const [px, py] = pts[i - 1] || [x, y];
      if (mode === 'center') { const mx = (px + x) / 2; d += ` L ${mx} ${py} L ${mx} ${y} L ${x} ${y}`; }
      else if (mode === 'right') { d += ` L ${x} ${py} L ${x} ${y}`; }
      else { d += ` L ${px} ${y} L ${x} ${y}`; }
    }
    return d;
  }

  function symbolPath(kind, cx, cy, r) {
    switch (kind) {
      case 'square':   return `M ${cx-r} ${cy-r} h ${r*2} v ${r*2} h ${-r*2} Z`;
      case 'diamond':  return `M ${cx} ${cy-r} L ${cx+r} ${cy} L ${cx} ${cy+r} L ${cx-r} ${cy} Z`;
      case 'triangle': return `M ${cx} ${cy-r} L ${cx+r} ${cy+r} L ${cx-r} ${cy+r} Z`;
      case 'triangle-down': return `M ${cx-r} ${cy-r} L ${cx+r} ${cy-r} L ${cx} ${cy+r} Z`;
      default: return null;
    }
  }

  function normalizePoints(data, xType, categories) {
    return data.map((d, i) => {
      if (d === null || d === undefined) return null;
      if (typeof d === 'number') return { x: i, y: d, name: categories ? categories[i] : String(i) };
      if (Array.isArray(d)) return { x: d[0], y: d[1] };
      return { x: d.x !== undefined ? d.x : i, y: d.y, name: d.name, marker: d.marker };
    });
  }

  function dashArray(style) {
    switch (style) {
      case 'Dash': return '6 4';
      case 'ShortDash': return '4 2';
      case 'ShortDot': return '1 3';
      case 'Dot': return '2 4';
      case 'LongDash': return '10 4';
      case 'DashDot': return '6 3 2 3';
      default: return '';
    }
  }

  // Refusal panel: drawn in place of the chart when the options describe
  // something a line chart cannot honestly show. Returns the same stub API
  // shape as Chart() so callers do not blow up on .redraw().
  function errorChart(container, W, H, opts, headline, detail) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[charts-lib line] ' + headline + ' ' + detail);
    }
    const svg = el('svg', { xmlns: NS, width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.background = BG;
    svg.style.display = 'block';
    container.appendChild(svg);
    let y = 34;
    if (opts.title) {
      wrapHeading(opts.title, F_TITLE, W - 40, TITLE_LINES, true).forEach(l => {
        txt(l, { x: 20, y, 'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL,
          'font-family': FONT }, svg);
        y += TITLE_LH;
      });
      y += 10;
    }
    const cy = Math.max(y + 20, H / 2 - 10);
    wrapHeading(headline, 13, W - 40, 2, true).forEach((l, i) => {
      txt(l, { x: 20, y: cy + i * 18, 'font-size': 13, 'font-weight': 700,
        fill: TITLE_COL, 'font-family': FONT }, svg);
    });
    wrapHeading(detail, F_SUB, W - 40, 4, false).forEach((l, i) => {
      txt(l, { x: 20, y: cy + 26 + i * (SUB_LH || 16), 'font-size': F_SUB,
        'font-weight': 400, fill: SUB_COL, 'font-family': FONT }, svg);
    });
    return {
      redraw() {}, addPoint() {}, shift() {}, getSeries() { return []; },
      error: headline
    };
  }

  // ── callouts ────────────────────────────────────────────────────────────
  // A callout is an anchor dot on the mark, a leader, and a paragraph box.
  // The block is shared by every engine (each is its own IIFE) so a note reads
  // the same everywhere, but *where* the box goes is the engine's call: a
  // column chart puts its notes in a band above the bars, a horizontal bar
  // chart in the gutter past the bar ends, a scatter in the emptiest corner
  // near the point. Passing the marks in as `obstacles` is what keeps a box
  // off the data instead of merely off the other boxes.
  //
  //   drawCallouts(g, items, bounds, {
  //     mode: 'above' | 'right' | 'radial' | 'auto',
  //     obstacles: [{ x, y, w, h }],   // rects the box must not cover
  //     center: { x, y },              // radial mode: what to push away from
  //     gutter: 12                     // band/gutter thickness for above/right
  //   })
  //
  // Placement stays deterministic — candidates are tried in a fixed order —
  // so re-rendering the same data puts every box back where it was.
  const CALLOUT_PAD = 6;          // clearance between a box and anything else
  const CALLOUT_LEAD = 14;        // shortest leader worth drawing

  const CALLOUT_OFFSETS = [
    [ 32, -60], [-32, -60], [ 32, -110], [-32, -110],
    [ 60, -30], [-60, -30], [ 32,  30], [-32,  30],
    [ 60,  30], [-60,  30], [ 32, -160], [-32, -160]
  ];

  function calloutTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    return {
      accent: t.callout || '#e3120b',
      text: t.labelColor || '#333333',
      inverse: t.inverseText || '#FFFFFF',
      bg: t.bg || '#f4f3f0'
    };
  }

  function measureCalloutBox(text) {
    const lines = String(text).split('\n');
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + 16);
    const h = lines.length * 13 + 16;
    return { w: w, h: h };
  }

  // Total area of a rect that lands on top of anything it should not.
  function calloutOverlap(r, rects) {
    let sum = 0;
    for (let i = 0; i < rects.length; i++) {
      const o = rects[i];
      const dx = Math.min(r.x + r.w + CALLOUT_PAD, o.x + o.w) - Math.max(r.x - CALLOUT_PAD, o.x);
      const dy = Math.min(r.y + r.h + CALLOUT_PAD, o.y + o.h) - Math.max(r.y - CALLOUT_PAD, o.y);
      if (dx > 0 && dy > 0) sum += dx * dy;
    }
    return sum;
  }

  function calloutInBounds(r, b) {
    return r.x >= b.x + 2 && r.y >= b.y + 2 &&
           r.x + r.w <= b.x + b.w - 2 && r.y + r.h <= b.y + b.h - 2;
  }

  function drawCalloutBox(g, bx, by, text, edge) {
    const th = calloutTheme();
    const lines = String(text).split('\n');
    const lh = 13, pad = 8;
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + pad * 2);
    const h = lines.length * lh + pad * 2;
    el('rect', { x: bx, y: by, width: w, height: h, rx: 6, ry: 6,
      fill: th.bg, 'fill-opacity': 0.94, stroke: edge, 'stroke-width': 0.8 }, g);
    lines.forEach((ln, i) => {
      txt(ln, { x: bx + pad, y: by + pad + (i + 1) * lh - 3, 'font-size': 10,
        fill: th.text, 'font-family': FONT }, g);
    });
  }

  // Leader from the anchor to the box. Straight when the box sits diagonally
  // from the mark; an elbow when it sits squarely above or beside it, so the
  // line reads as a pointer rather than as another data mark.
  function drawCalloutLeader(g, ax, ay, box, color, mode) {
    const midX = box.x + box.w / 2, midY = box.y + box.h / 2;
    if (mode === 'above' || mode === 'below') {
      const edgeY = mode === 'above' ? box.y + box.h : box.y;
      const stem = mode === 'above' ? edgeY + 8 : edgeY - 8;
      const cx = Math.max(box.x + 8, Math.min(box.x + box.w - 8, ax));
      const d = 'M ' + ax + ' ' + ay + ' L ' + ax + ' ' + stem +
                ' L ' + cx + ' ' + stem + ' L ' + cx + ' ' + edgeY;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    if (mode === 'right' || mode === 'left') {
      const edgeX = mode === 'right' ? box.x : box.x + box.w;
      const stem = mode === 'right' ? edgeX - 8 : edgeX + 8;
      const cy = Math.max(box.y + 8, Math.min(box.y + box.h - 8, ay));
      const d = 'M ' + ax + ' ' + ay + ' L ' + stem + ' ' + ay +
                ' L ' + stem + ' ' + cy + ' L ' + edgeX + ' ' + cy;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    let lx = midX, ly = midY;
    if (ax < box.x) lx = box.x;
    else if (ax > box.x + box.w) lx = box.x + box.w;
    if (ay < box.y) ly = box.y;
    else if (ay > box.y + box.h) ly = box.y + box.h;
    el('line', { x1: ax, y1: ay, x2: lx, y2: ly, stroke: color, 'stroke-width': 1.2 }, g);
  }

  function drawCallouts(g, items, bounds, cfg) {
    if (!items || !items.length) return;
    cfg = cfg || {};
    const mode = cfg.mode || 'auto';
    const obstacles = (cfg.obstacles || []).slice();
    const th = calloutTheme();
    const placed = [];
    const gutter = cfg.gutter != null ? cfg.gutter : 10;

    // Sorting by the axis the band runs along keeps leaders from crossing.
    const ordered = items.slice().sort((a, b) =>
      (mode === 'right' || mode === 'left') ? a.y - b.y : a.x - b.x);

    ordered.forEach(it => {
      const box = measureCalloutBox(it.text);
      const color = it.color || th.accent;
      const blocked = obstacles.concat(placed);
      let best = null, bestCost = Infinity, leader = mode;

      const consider = (x, y, penalty, leadMode) => {
        const r = { x: x, y: y, w: box.w, h: box.h };
        if (!calloutInBounds(r, bounds)) return;
        const cost = calloutOverlap(r, blocked) + (penalty || 0);
        if (cost < bestCost) { bestCost = cost; best = r; leader = leadMode || mode; }
      };

      if (mode === 'above' || mode === 'below') {
        // Band across the top (or bottom): the box keeps to the headroom the
        // engine reserved, and slides sideways from the anchor until it is
        // clear. Distance from the anchor is the tie-breaker, so a note stays
        // over the mark it belongs to whenever the room is there.
        const bandY = mode === 'above'
          ? bounds.y + gutter
          : bounds.y + bounds.h - gutter - box.h;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
          consider(it.x - box.w / 2 + dx, bandY, Math.abs(dx) * 0.5, mode);
        }
        // Second row under the first when the band is full.
        if (bestCost > 0) {
          const row2 = mode === 'above' ? bandY + box.h + CALLOUT_PAD
                                        : bandY - box.h - CALLOUT_PAD;
          for (let step = 0; step <= 24; step++) {
            const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
            consider(it.x - box.w / 2 + dx, row2, 400 + Math.abs(dx) * 0.5, mode);
          }
        }
      } else if (mode === 'right' || mode === 'left') {
        // Gutter past the ends of the bars, one box per row, aligned with the
        // row it annotates.
        const colX = mode === 'right'
          ? bounds.x + bounds.w - gutter - box.w
          : bounds.x + gutter;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dy = Math.ceil(step / 2) * 14 * (step % 2 ? 1 : -1);
          consider(colX, it.y - box.h / 2 + dy, Math.abs(dy) * 0.5, mode);
        }
      } else if (mode === 'radial' && cfg.center) {
        // Push out from the middle of the ring or cluster, so the leader reads
        // as a spoke. Straight out is preferred, but the fan of angles around
        // it matters: a wedge pointing into a crowded side still has a clear
        // diagonal to reach for, and a spoke 30° off still reads as a spoke.
        const vx = it.x - cfg.center.x, vy = it.y - cfg.center.y;
        const base = Math.atan2(vy, vx);
        const FAN = [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31];
        for (let f = 0; f < FAN.length && bestCost > 0; f++) {
          const a = base + FAN[f];
          for (let d = 30; d <= 260 && bestCost > 0; d += 14) {
            const px = it.x + Math.cos(a) * d, py = it.y + Math.sin(a) * d;
            consider(px - box.w / 2, py - box.h / 2,
              d * 0.4 + Math.abs(FAN[f]) * 90, 'auto');
          }
        }
      }

      // Ladder of diagonal offsets: the general fallback, and the default for
      // charts with no obvious free direction (line, scatter).
      if (bestCost > 0) {
        for (let i = 0; i < CALLOUT_OFFSETS.length; i++) {
          const ox = CALLOUT_OFFSETS[i][0], oy = CALLOUT_OFFSETS[i][1];
          consider(ox >= 0 ? it.x + ox : it.x + ox - box.w,
                   oy < 0 ? it.y + oy - box.h : it.y + oy,
                   (mode === 'auto' ? 0 : 800) + i * 2, 'auto');
        }
      }

      if (!best) {
        // Nothing fits: clamp inside and accept the overlap rather than drop a
        // note the author wrote.
        best = {
          x: Math.max(bounds.x + 2, Math.min(bounds.x + bounds.w - box.w - 2, it.x - box.w / 2)),
          y: Math.max(bounds.y + 2, Math.min(bounds.y + bounds.h - box.h - 2, it.y - box.h - 20)),
          w: box.w, h: box.h
        };
        leader = 'auto';
      }
      placed.push(best);

      drawCalloutLeader(g, it.x, it.y, best, color, leader);
      el('circle', { cx: it.x, cy: it.y, r: 4.5, fill: color,
        stroke: th.inverse, 'stroke-width': 1 }, g);
      drawCalloutBox(g, best.x, best.y, it.text, color);
    });
  }

  // Match a callout to a named thing: `name`, `category`, `point`, `code` and
  // `label` are all accepted so the key reads naturally per chart type.
  function calloutKey(co) {
    const k = co.name != null ? co.name
      : co.category != null ? co.category
      : co.point != null ? co.point
      : co.code != null ? co.code
      : co.label != null ? co.label
      : co.row != null ? co.row
      : co.panel != null ? co.panel : null;
    return k == null ? null : String(k);
  }

  // ---------------- main ----------------
  function Chart(container, opts) {
    applyTheme();
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.fontFamily = FONT;
    container.style.background = BG;

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 500;
    const chartOpts = opts.chart || {};


    const hasTitle = !!opts.title;
    const hasSub = !!opts.subtitle;
    // Left-aligned title zone; extra top space if title/subtitle present
    const titleLines = hasTitle
      ? wrapHeading(opts.title, F_TITLE, W - 40, TITLE_LINES, true) : [];
    const subLines = hasSub
      ? wrapHeading(opts.subtitle, F_SUB, W - 40, SUB_LINES, false) : [];
    const subY0 = 34 + (titleLines.length ? (titleLines.length - 1) * TITLE_LH + 20 : 0);
    const titleBlockH = (hasTitle ? 24 + (titleLines.length - 1) * TITLE_LH : 0)
                      + (hasSub ? 22 + (subLines.length - 1) * SUB_LH : 0) + 18;

    // Compute right pad based on longest y-tick label + inline series label estimate
    const yAxis = opts.yAxis || {};
    const xAxis = opts.xAxis || {};
    const xType = xAxis.type || (xAxis.categories ? 'category' : 'linear');
    // A line implies a continuous x. Named (non-temporal) categories are not a
    // valid x-axis for this engine: give each category its own series over a
    // date/number x-axis, or use a bar chart. Refuse loudly rather than drawing
    // a line across an axis whose labels cannot be shown.
    if (xType === 'category') {
      const _cats = xAxis.categories || [];
      if (!_cats.length || !_cats.every(c => parseAxisDate(c) !== null)) {
        return errorChart(container, W, H, opts,
          'Line charts need a continuous or temporal x-axis.',
          'Named categories cannot be plotted as a line. Use a bar chart, or give each category its own series over a date or numeric x-axis.');
      }
    }
    const yType = yAxis.type || 'linear';
    const isLog = yType === 'logarithmic';
    const valueSuffix = (yAxis.suffix != null) ? yAxis.suffix : '';

    // Legend / inline labels: legend is default when multiple series;
    // inline labels are opt-in via lineLabels:'inline' | 'name' | 'value' | 'both'.
    const seriesRaw = opts.series || [];
    const inlineMode = (typeof opts.lineLabels === 'string' && opts.lineLabels !== 'inline')
      ? opts.lineLabels : 'name';
    const showInline = (opts.lineLabels === 'inline'
      || opts.lineLabels === 'name' || opts.lineLabels === 'value' || opts.lineLabels === 'both');
    const legendEnabled = (opts.legend && opts.legend.enabled != null)
      ? !!opts.legend.enabled
      : (!showInline && seriesRaw.length > 1);

    const maxNameLen = seriesRaw.reduce((a, s) => Math.max(a, (s.name || '').length), 0);
    const rightPadForNames = showInline ? Math.min(140, 8 + maxNameLen * 6.5) : 0;

    // â”€â”€ Legend layout (top rows, wraps as needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const F_LEG = 12, LEG_ROW = 20, LEG_GAP = 18, LEG_ICON = 12, LEG_ICON_GAP = 6;
    function _layoutLegend(items, availW) {
      const widths = items.map(it => LEG_ICON + LEG_ICON_GAP + Math.ceil(String(it.name).length * F_LEG * 0.55) + LEG_GAP);
      const rows = [];
      let cur = [], curX = 0;
      for (let i = 0; i < items.length; i++) {
        if (cur.length && curX + widths[i] > availW) { rows.push(cur); cur = []; curX = 0; }
        cur.push({ item: items[i], x: curX, w: widths[i] });
        curX += widths[i];
      }
      if (cur.length) rows.push(cur);
      return { rows, height: rows.length * LEG_ROW };
    }
    const availLegW = W - 40;
    const _legendLayout = legendEnabled
      ? _layoutLegend(seriesRaw.map((s, i) => ({ name: s.name || 'Series ' + (i + 1) })), availLegW)
      : { rows: [], height: 0 };
    const legendZone = _legendLayout.height + (legendEnabled ? 18 : 0);

    const M = {
      l: 20,
      r: 55 + rightPadForNames,  // y-labels on right + inline name space
      t: titleBlockH + legendZone + 8,
      b: 42
    };
    const IW = W - M.l - M.r;
    // Category axis: plan the labels before fixing the bottom margin so a
    // slanted or stacked band gets the room it needs. planCatAxis() is re-run
    // from render() (inside the reserved band) when the data length changes.
    // A line implies a continuous x, so a list of names is not something this
    // axis can label: the series still draw (names stay in the tooltip), but
    // named categories get no tick labels. Categories that parse as dates are
    // labelled normally, collapsed to a calendar period.
    function planCatAxis(n, band) {
      const cats = (xAxis.categories || []).slice(0, n);
      const empty = { ticks: [], font: F_TICK, rotate: 0, stagger: false,
        lines: 1, count: n, height: 20 };
      if (!cats.length || !cats.every(c => parseAxisDate(c) !== null)) return empty;
      return layoutCategoryAxis(cats, IW, F_TICK,
        band || Math.max(40, Math.min(110, H * 0.3)));
    }
    let catLayout = (xAxis.categories && (xAxis.type || 'category') === 'category')
      ? planCatAxis(xAxis.categories.length) : null;
    if (catLayout) M.b = Math.max(42, catLayout.height + TICK_L + 6);
    const IH = H - M.t - M.b;

    const svg = el('svg', { xmlns: NS, width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.background = BG;
    svg.style.display = 'block';
    container.appendChild(svg);

    // --- title / subtitle (top-left) ---
    const titleX = 20;
    titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: 34 + i * TITLE_LH, 'text-anchor': 'start',
      'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, svg));
    subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * SUB_LH, 'text-anchor': 'start',
      'font-size': F_SUB, fill: SUB_COL, 'font-family': FONT }, svg));

    // --- series def ---
    const seriesDefs = seriesRaw.map((s, i) => {
      const color = s.color || COLORS[i % COLORS.length];
      // Default to smoothed spline; opt out per series (type:'line'/'step') or globally (chart.smooth:false).
      const smoothDefault = !(opts.chart && opts.chart.smooth === false);
      const type = s.type || (opts.chart && opts.chart.type) || (smoothDefault ? 'spline' : 'line');
      const marker = Object.assign({ enabled: false, symbol: 'circle', radius: 4 },
        (opts.plotOptions && opts.plotOptions.series && opts.plotOptions.series.marker) || {}, s.marker || {});
      const points = normalizePoints(s.data, xType, xAxis.categories);
      // On by default, as everywhere else. A series with many points gets
      // crowded, so dataLabels:false â€” globally or per series â€” is the way
      // back to a bare line.
      const plotDL = opts.plotOptions && opts.plotOptions.series && opts.plotOptions.series.dataLabels;
      const dataLabels = Object.assign({},
        typeof plotDL === 'object' ? plotDL : {},
        typeof s.dataLabels === 'object' ? s.dataLabels : {},
        { enabled: dlEnabled(s.dataLabels, dlEnabled(plotDL, true)) });
      return {
        name: s.name || 'Series ' + (i + 1), color, type, points,
        legendColor: s.legendColor,
        marker, dataLabels, lineWidth: s.lineWidth != null ? s.lineWidth : LINE_W,
        dashStyle: s.dashStyle, step: s.step,
        negativeColor: s.negativeColor, threshold: s.threshold != null ? s.threshold : 0,
        visible: true,
        valueSuffix: s.valueSuffix || (opts.tooltip && opts.tooltip.valueSuffix) || '',
        valuePrefix: s.valuePrefix || (opts.tooltip && opts.tooltip.valuePrefix) || '',
        valueDecimals: s.valueDecimals != null ? s.valueDecimals : (opts.tooltip && opts.tooltip.valueDecimals)
      };
    });

    // Compute ranges
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    seriesDefs.forEach(s => s.points.forEach(p => {
      if (!p) return;
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }));
    if (xAxis.categories) { xMin = 0; xMax = xAxis.categories.length - 1; }
    if (xAxis.min != null) xMin = xAxis.min;
    if (xAxis.max != null) xMax = xAxis.max;
    if (yAxis.min != null) yMin = yAxis.min;
    if (yAxis.max != null) yMax = yAxis.max;
    if (xMin === xMax) { xMin -= 1; xMax += 1; }

    // clean_charts: y baseline is min(0, min); ticks via MaxNLocator(nbins=5)
    let yTicks;
    if (isLog) {
      if (yMin <= 0) yMin = 1;
      yTicks = logTicks(yMin, yMax);
      yMin = yTicks[0]; yMax = yTicks[yTicks.length - 1];
    } else {
      let yLo = Math.min(0, yMin);
      let yHi = yMax;
      if (yAxis.min != null) yLo = yAxis.min;
      if (yAxis.max != null) yHi = yAxis.max;
      const pad = (yHi - yLo) * 0.05;
      yTicks = niceTicks(yLo, yHi + pad, 5);
      yMin = yTicks[0]; yMax = yTicks[yTicks.length - 1];
    }

    let viewMin = xMin, viewMax = xMax;
    // Padding on the right of x range (like clean_charts pad_duration 3%).
    // Recomputed by recomputeXRange() so a live series keeps its 3%% as the
    // window slides.
    let xPad = (xMax - xMin) * 0.03;
    viewMax += xPad;

    function xScale(x) { return M.l + ((x - viewMin) / (viewMax - viewMin)) * IW; }
    function yScale(y) {
      if (isLog) {
        const lmin = Math.log10(yMin), lmax = Math.log10(yMax);
        return M.t + IH - ((Math.log10(Math.max(y, 1e-30)) - lmin) / (lmax - lmin)) * IH;
      }
      return M.t + IH - ((y - yMin) / (yMax - yMin)) * IH;
    }
    function xInvert(px) { return viewMin + ((px - M.l) / IW) * (viewMax - viewMin); }

    // Layers
    const defs = el('defs', {}, svg);
    const gBands = el('g', {}, svg);
    const gGrid  = el('g', {}, svg);
    const gSeries = el('g', {}, svg);
    const gMarkers = el('g', {}, svg);
    const gLabels = el('g', {}, svg);
    // Boxes of the labels already placed, shared across series so no two
    // value labels can overlap (see the greedy placement below).
    const labelBoxes = [];
    const gAxes = el('g', {}, svg);
    const gAnnot = el('g', {}, svg);
    const gLegend = el('g', {}, svg);
    const gInteract = el('g', {}, svg);

    // Clip for series
    const clipId = 'cc-clip-' + Math.random().toString(36).slice(2);
    const cp = el('clipPath', { id: clipId }, defs);
    el('rect', { x: M.l, y: M.t, width: IW, height: IH }, cp);
    gSeries.setAttribute('clip-path', 'url(#' + clipId + ')');
    gMarkers.setAttribute('clip-path', 'url(#' + clipId + ')');

    function addCommas(n) {
      // Strip binary-float noise before stringifying: 25.999999999999996 -> 26,
      // 0.30000000000000004 -> 0.3. Values like these arrive whenever a chart is
      // fed a computed share or a summed column, and String() renders every
      // artefact digit. 12 significant figures sits well inside double
      // precision, so genuine values are untouched while accumulated ~1e-15
      // error rounds away.
      if (typeof n === 'number' && isFinite(n)) n = +n.toPrecision(12);
      const s = String(n);
      const neg = s.startsWith('-') ? '-' : '';
      const abs = neg ? s.slice(1) : s;
      const dot = abs.indexOf('.');
      const intPart = dot < 0 ? abs : abs.slice(0, dot);
      const fracPart = dot < 0 ? '' : abs.slice(dot);
      return neg + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fracPart;
    }
    function formatY(v) {
      if (isLog) {
        const e = Math.round(Math.log10(v));
        if (Math.abs(v - Math.pow(10, e)) < 1e-9) {
          if (v >= 1) return addCommas(v);
          return v.toString();
        }
      }
      const s = (v === Math.floor(v)) ? String(v) : (+v.toFixed(3)).toString();
      return addCommas(s) + (valueSuffix || '');
    }

    function formatValue(v, s) {
      const d = s.valueDecimals;
      const val = d != null ? (+v).toFixed(d) : v;
      return (s.valuePrefix || '') + addCommas(val) + (s.valueSuffix || '');
    }

    function render() {
      gBands.innerHTML = '';
      gGrid.innerHTML = '';
      gSeries.innerHTML = '';
      gMarkers.innerHTML = '';
      gLabels.innerHTML = '';
      labelBoxes.length = 0;      // placement is per-render; zoom redraws re-run it
      gAxes.innerHTML = '';
      gAnnot.innerHTML = '';

      // Highlight ranges (xAxis plotBands)
      (xAxis.plotBands || []).forEach(b => {
        const x1 = xScale(b.from), x2 = xScale(b.to);
        el('rect', { x: Math.min(x1,x2), y: M.t, width: Math.abs(x2-x1), height: IH,
          fill: b.color || HIGHLIGHT, 'fill-opacity': b.alpha != null ? b.alpha : 0.12 }, gBands);
        if (b.label) {
          txt(b.label.text, { x: (x1+x2)/2, y: M.t - 6, 'text-anchor': 'middle',
            'font-size': 10, 'font-weight': 700, fill: b.color || HIGHLIGHT,
            'font-family': FONT }, gBands);
        }
        if (b.paragraph) {
          const py = M.t + IH * (1 - (b.paragraphY != null ? b.paragraphY : 0.85));
          drawParagraphBox(gAnnot, (x1+x2)/2, py, b.paragraph, b.color || HIGHLIGHT, 'center');
        }
      });
      // yAxis plotBands
      (yAxis.plotBands || []).forEach(b => {
        const y1 = yScale(b.from), y2 = yScale(b.to);
        el('rect', { x: M.l, y: Math.min(y1,y2), width: IW, height: Math.abs(y2-y1),
          fill: b.color || HIGHLIGHT, 'fill-opacity': b.alpha != null ? b.alpha : 0.12 }, gBands);
      });

      // Horizontal gridlines
      yTicks.forEach(v => {
        const y = yScale(v);
        el('line', { x1: M.l, x2: M.l + IW, y1: y, y2: y, stroke: GRID, 'stroke-width': GRID_W }, gGrid);
      });

      // xAxis plotLines (vlines)
      (xAxis.plotLines || []).forEach(pl => {
        const x = xScale(pl.value);
        el('line', { x1: x, x2: x, y1: M.t, y2: M.t + IH,
          stroke: pl.color || AXIS, 'stroke-width': pl.width || 1.5,
          'stroke-dasharray': dashArray(pl.dashStyle || 'Dash') }, gAnnot);
        if (pl.label) txt(pl.label.text, { x, y: M.t - 6, 'text-anchor': 'middle',
          'font-size': 10, 'font-weight': 700, fill: pl.color || AXIS,
          'font-family': FONT }, gAnnot);
        if (pl.paragraph) {
          const py = M.t + IH * (1 - (pl.paragraphY != null ? pl.paragraphY : 0.85));
          drawParagraphBox(gAnnot, x, py, pl.paragraph, pl.color || AXIS, 'center');
        }
      });
      // yAxis plotLines
      (yAxis.plotLines || []).forEach(pl => {
        const y = yScale(pl.value);
        el('line', { x1: M.l, x2: M.l + IW, y1: y, y2: y,
          stroke: pl.color || AXIS, 'stroke-width': pl.width || 1.5,
          'stroke-dasharray': dashArray(pl.dashStyle || 'Dash') }, gAnnot);
        if (pl.label) txt(pl.label.text, { x: M.l + 4, y: y - 5, 'font-size': 10,
          'font-weight': 700, fill: pl.color || AXIS, 'font-family': FONT }, gAnnot);
      });

      // Series
      seriesDefs.forEach(s => {
        if (!s.visible) return;
        const pts = s.points.map(p => p ? [xScale(p.x), yScale(p.y)] : null);
        const path = s.type === 'spline' ? pchipPath(pts)
          : s.type === 'step' ? stepPath(pts, s.step || 'left')
          : linePath(pts);
        if (s.lineWidth > 0) {
          if (s.negativeColor) {
            const tY = yScale(s.threshold);
            const posId = 'p-' + Math.random().toString(36).slice(2);
            const negId = 'n-' + Math.random().toString(36).slice(2);
            const cp1 = el('clipPath', { id: posId }, defs);
            el('rect', { x: M.l, y: M.t, width: IW, height: Math.max(0, tY - M.t) }, cp1);
            const cp2 = el('clipPath', { id: negId }, defs);
            el('rect', { x: M.l, y: tY, width: IW, height: Math.max(0, M.t + IH - tY) }, cp2);
            el('path', { d: path, stroke: s.color, 'stroke-width': s.lineWidth, fill: 'none',
              'stroke-linejoin': 'round', 'stroke-linecap': 'round',
              'stroke-dasharray': dashArray(s.dashStyle), 'clip-path': 'url(#' + posId + ')' }, gSeries);
            el('path', { d: path, stroke: s.negativeColor, 'stroke-width': s.lineWidth, fill: 'none',
              'stroke-linejoin': 'round', 'stroke-linecap': 'round',
              'stroke-dasharray': dashArray(s.dashStyle), 'clip-path': 'url(#' + negId + ')' }, gSeries);
          } else {
            el('path', { d: path, stroke: s.color, 'stroke-width': s.lineWidth, fill: 'none',
              'stroke-linejoin': 'round', 'stroke-linecap': 'round',
              'stroke-dasharray': dashArray(s.dashStyle) }, gSeries);
          }
        }
        if (s.marker && s.marker.enabled) {
          s.points.forEach(p => {
            if (!p || p.x < viewMin || p.x > viewMax) return;
            drawMarker(gMarkers, s, p, xScale(p.x), yScale(p.y));
          });
        }
        if (s.dataLabels && s.dataLabels.enabled) {
          s.points.forEach(p => {
            if (!p || p.x < viewMin || p.x > viewMax) return;
            const label = s.dataLabels.format
              ? String(s.dataLabels.format).replace('{y}', formatValue(p.y, s))
              : formatValue(p.y, s);
            // Since labels are on by default, a dense series would otherwise
            // stack numbers on top of each other. Placement is greedy: a label
            // that would collide with one already drawn is dropped, so what
            // survives is always readable. Widths are estimated, as elsewhere.
            const lx = xScale(p.x), ly = yScale(p.y) - 10;
            const lw = label.length * 11 * 0.60 + 4, lh = 13;
            const box = { x1: lx - lw / 2, x2: lx + lw / 2, y1: ly - lh, y2: ly + 3 };
            const clash = labelBoxes.some(b =>
              box.x1 < b.x2 && box.x2 > b.x1 && box.y1 < b.y2 && box.y2 > b.y1);
            if (clash) return;
            labelBoxes.push(box);
            const t = txt(label, { x: lx, y: ly,
              'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700,
              fill: TITLE_COL, 'font-family': FONT }, gLabels);
            t.setAttribute('stroke', BG);
            t.setAttribute('stroke-width', '3');
            t.setAttribute('paint-order', 'stroke');
          });
        }
      });

      // Y-axis labels on RIGHT, no tick marks
      yTicks.forEach(v => {
        const y = yScale(v);
        txt(formatY(v), { x: M.l + IW + 8, y: y + 4, 'text-anchor': 'start',
          'font-size': F_TICK, 'font-weight': TICK_FW, fill: TICK_COL, 'font-family': FONT }, gAxes);
      });

      // X-axis: boundary ticks + centered labels
      let boundaries = [];
      let centers = [];
      if (xType === 'category') {
        // Planned category axis (see layoutCategoryAxis): named categories all
        // keep a label, temporal ones collapse to calendar periods. Drawn here
        // rather than through `centers`, which only handles plain upright text.
        const n = xAxis.categories.length;
        if (!catLayout || n !== catLayout.count) catLayout = planCatAxis(n, M.b - TICK_L - 6);
        catLayout.ticks.forEach((tk, k) => {
          drawCategoryLabel(gAxes, catLayout, tk, k, xScale(tk.i),
            M.t + IH + TICK_L + 12, TICK_COL, TICK_FW);
        });
        if (!catLayout.ticks.length) {
          boundaries.push(-0.5, n - 0.5);
        } else if (catLayout.ticks.length === n) {
          for (let i = -0.5; i <= n - 0.5 + 0.001; i++) boundaries.push(i);
        } else {
          catLayout.ticks.forEach(tk => boundaries.push(tk.i - 0.5));
          boundaries.push(n - 0.5);
        }
      } else if (xType === 'datetime') {
        const bs = dateBoundaries(viewMin, viewMax, xAxis.tickInterval || 'auto', IW, F_TICK);
        boundaries = bs.boundaries;
        centers = bs.centers;
      } else {
        const t = niceTicks(viewMin, viewMax, 6);
        boundaries = t;
        for (let i = 0; i < t.length - 1; i++) centers.push({ ms: (t[i] + t[i + 1]) / 2, label: String(t[i]) });
        centers.push({ ms: t[t.length - 1], label: String(t[t.length - 1]) });
      }
      // Bottom spine (thick black)
      el('line', { x1: M.l, y1: M.t + IH, x2: M.l + IW, y2: M.t + IH, stroke: AXIS, 'stroke-width': AXIS_W }, gAxes);
      // Boundary tick marks (down)
      boundaries.forEach(b => {
        if (b < viewMin - 1e-9 || b > viewMax + 1e-9) return;
        const x = xScale(b);
        el('line', { x1: x, y1: M.t + IH, x2: x, y2: M.t + IH + TICK_L, stroke: AXIS, 'stroke-width': TICK_W }, gAxes);
      });
      // Centered labels
      centers.forEach(c => {
        if (c.ms < viewMin - 1e-9 || c.ms > viewMax + 1e-9) return;
        txt(c.label, { x: xScale(c.ms), y: M.t + IH + TICK_L + 14, 'text-anchor': 'middle',
          'font-size': F_TICK, 'font-weight': TICK_FW, fill: TICK_COL, 'font-family': FONT }, gAxes);
      });

      // Inline line-end labels
      if (showInline) placeInlineLabels();

      // Callouts / annotations â€” auto-placed together to avoid overlap
      layoutCallouts(opts.callouts || []);
    }

    function drawMarker(g, s, p, cx, cy, hover) {
      const r = hover ? ((s.marker.radius || 4) + 2) : (s.marker.radius || 4);
      const sym = (p.marker && p.marker.symbol) || (s.marker && s.marker.symbol) || 'circle';
      const path = symbolPath(sym, cx, cy, r);
      if (path) return el('path', { d: path, fill: s.color, stroke: INV_TEXT, 'stroke-width': hover ? 1.5 : 1 }, g);
      return el('circle', { cx, cy, r, fill: s.color, stroke: INV_TEXT, 'stroke-width': hover ? 1.5 : 1 }, g);
    }

    function placeInlineLabels() {
      // Collect last visible point per series
      const items = [];
      seriesDefs.forEach(s => {
        if (!s.visible) return;
        let last = null;
        for (let i = s.points.length - 1; i >= 0; i--) {
          const p = s.points[i];
          if (p && p.x <= viewMax) { last = p; break; }
        }
        if (last) items.push({ s, p: last, y: yScale(last.y) });
      });
      // Resolve vertical overlaps
      items.sort((a, b) => a.y - b.y);
      const minGap = 14;
      for (let i = 1; i < items.length; i++) {
        if (items[i].y - items[i - 1].y < minGap) items[i].y = items[i - 1].y + minGap;
      }
      items.forEach(it => {
        const x = Math.min(xScale(it.p.x) + 6, M.l + IW + 4);
        let label = it.s.name;
        if (inlineMode === 'value') label = formatValue(it.p.y, it.s);
        else if (inlineMode === 'both') label = `${it.s.name}: ${formatValue(it.p.y, it.s)}`;
        txt(label, { x, y: it.y + 4, 'text-anchor': 'start',
          'font-size': F_INLINE, 'font-weight': 600, fill: it.s.color, 'font-family': FONT }, gLabels);
      });
    }

    // `callouts: [{ x, series, text, color }]` — anchored to the nearest point
    // at that x. The line and its value labels are handed in as obstacles, so a
    // note lands in clear plot rather than across the trend it is describing.
    function layoutCallouts(callouts) {
      if (!callouts.length) return;
      const items = callouts.map(co => {
        const seriesIdx = co.series != null ? seriesDefs.findIndex(s => s.name === co.series) : 0;
        const s = seriesDefs[seriesIdx >= 0 ? seriesIdx : 0];
        if (!s) return null;
        let best = null, bd = Infinity;
        s.points.forEach(p => { if (!p) return; const d = Math.abs(p.x - co.x); if (d < bd) { bd = d; best = p; } });
        if (!best) return null;
        return { x: xScale(best.x), y: yScale(best.y), text: co.text, color: co.color };
      }).filter(Boolean);

      // Sample every visible series into small rects: cheap, and enough to keep
      // a box off the line without hit-testing the path itself.
      const obstacles = labelBoxes.map(b =>
        ({ x: b.x1, y: b.y1, w: b.x2 - b.x1, h: b.y2 - b.y1 }));
      seriesDefs.forEach(s => {
        if (!s.visible) return;
        s.points.forEach(p => {
          if (!p || p.x < viewMin || p.x > viewMax) return;
          const px = xScale(p.x), py = yScale(p.y);
          obstacles.push({ x: px - 4, y: py - 4, w: 8, h: 8 });
        });
      });
      drawCallouts(gAnnot, items, { x: M.l, y: M.t, w: IW, h: IH },
        { mode: 'auto', obstacles: obstacles });
    }

    // ---- interaction ----
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `position:absolute;pointer-events:none;background:${BG};border:1px solid #bbb;border-radius:4px;padding:6px 8px;font:12px ${FONT};box-shadow:1px 1px 3px rgba(0,0,0,0.12);display:none;white-space:nowrap;z-index:10;`;
    container.appendChild(tooltip);

    const crosshair = el('line', { x1: 0, x2: 0, y1: M.t, y2: M.t + IH, stroke: AXIS,
      'stroke-width': 1, 'stroke-dasharray': '3 3', style: 'display:none;pointer-events:none' }, gInteract);
    const hoverGroup = el('g', {}, gInteract);

    function onMove(evt) {
      const rect = svg.getBoundingClientRect();
      const px = evt.clientX - rect.left, py = evt.clientY - rect.top;
      if (px < M.l || px > M.l + IW || py < M.t || py > M.t + IH) { hideTooltip(); return; }
      const xVal = xInvert(px);
      let nearestX = null, nd = Infinity;
      const rows = [];
      seriesDefs.forEach(s => {
        if (!s.visible) return;
        let best = null, bd = Infinity;
        s.points.forEach(p => { if (!p) return; const d = Math.abs(p.x - xVal); if (d < bd) { bd = d; best = p; } });
        if (best) rows.push({ s, p: best });
        if (best && bd < nd) { nd = bd; nearestX = best.x; }
      });
      if (nearestX == null) { hideTooltip(); return; }
      const cx = xScale(nearestX);
      crosshair.setAttribute('x1', cx);
      crosshair.setAttribute('x2', cx);
      crosshair.style.display = 'block';
      hoverGroup.innerHTML = '';
      rows.forEach(r => drawMarker(hoverGroup, r.s, r.p, xScale(r.p.x), yScale(r.p.y), true));
      const header = formatHeader(nearestX);
      let html = `<div style="font-size:12px;font-weight:700;color:${TITLE_COL};margin-bottom:2px">${esc(header)}</div>`;
      rows.forEach(r => {
        html += `<div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:9px;height:9px;background:${r.s.color};border-radius:2px"></span><span style="color:${LABEL_COL}">${esc(r.s.name)}: </span><b style="color:${TITLE_COL}">${esc(formatValue(r.p.y, r.s) + valueSuffix)}</b></div>`;
      });
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
      let tx = cx + 12, ty = py - th / 2;
      if (tx + tw > W - 4) tx = cx - tw - 12;
      if (ty < 4) ty = 4;
      if (ty + th > H - 4) ty = H - th - 4;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    }
    function hideTooltip() {
      crosshair.style.display = 'none';
      tooltip.style.display = 'none';
      hoverGroup.innerHTML = '';
    }
    function formatHeader(x) {
      if (xType === 'datetime') return fmtDateFull(x);
      if (xType === 'category') return xAxis.categories[Math.round(x)];
      return String(x);
    }
    svg.addEventListener('mousemove', onMove);
    svg.addEventListener('mouseleave', hideTooltip);

    // Zoom (x)
    let dragStart = null, selection = null, resetBtn = null;
    if (chartOpts.zoomType === 'x') {
      selection = el('rect', { x: 0, y: M.t, width: 0, height: IH,
        fill: HIGHLIGHT, 'fill-opacity': 0.15, style: 'display:none;pointer-events:none' }, gInteract);
      svg.addEventListener('mousedown', e => {
        const rect = svg.getBoundingClientRect();
        const px = e.clientX - rect.left;
        if (px < M.l || px > M.l + IW) return;
        dragStart = px;
        selection.setAttribute('x', px);
        selection.setAttribute('width', 0);
        selection.style.display = 'block';
        e.preventDefault();
      });
      svg.addEventListener('mousemove', e => {
        if (dragStart == null) return;
        const rect = svg.getBoundingClientRect();
        const px = Math.max(M.l, Math.min(M.l + IW, e.clientX - rect.left));
        selection.setAttribute('x', Math.min(dragStart, px));
        selection.setAttribute('width', Math.abs(px - dragStart));
      });
      window.addEventListener('mouseup', e => {
        if (dragStart == null) return;
        const rect = svg.getBoundingClientRect();
        const px = Math.max(M.l, Math.min(M.l + IW, e.clientX - rect.left));
        selection.style.display = 'none';
        if (Math.abs(px - dragStart) > 5) {
          viewMin = xInvert(Math.min(dragStart, px));
          viewMax = xInvert(Math.max(dragStart, px));
          render();
          showResetBtn();
        }
        dragStart = null;
      });
    }
    function showResetBtn() {
      if (resetBtn) return;
      resetBtn = document.createElement('button');
      resetBtn.textContent = 'Reset zoom';
      resetBtn.style.cssText = `position:absolute;top:12px;right:12px;padding:5px 10px;font:11px ${FONT};background:${BG};border:1px solid ${AXIS};border-radius:3px;cursor:pointer;color:${LABEL_COL};z-index:5;`;
      resetBtn.addEventListener('click', () => {
        viewMin = xMin; viewMax = xMax + xPad; render();
        resetBtn.remove(); resetBtn = null;
      });
      container.appendChild(resetBtn);
    }

    function recomputeXRange() {
      let mn = Infinity, mx = -Infinity;
      seriesDefs.forEach(s => s.points.forEach(p => {
        if (!p) return;
        if (p.x < mn) mn = p.x;
        if (p.x > mx) mx = p.x;
      }));
      // Move both edges only while the view is still tracking the data (i.e.
      // the user has not drag-zoomed). addPoint/shift then scrolls the axis
      // instead of stretching it: points dropped off the left would otherwise
      // leave a growing blank, since viewMin stayed pinned to the first sample.
      const following = Math.abs(viewMax - (xMax + xPad)) < 1
        && Math.abs(viewMin - xMin) < 1;
      xMin = mn; xMax = mx;
      xPad = (xMax - xMin) * 0.03;
      if (following) { viewMin = xMin; viewMax = xMax + xPad; }
    }

    // â”€â”€ Top legend (below subtitle) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function renderLegend() {
      gLegend.innerHTML = '';
      if (!legendEnabled) return;
      const startY = titleBlockH + 2;
      const availW = W - 40;
      _legendLayout.rows.forEach((row, ri) => {
        const rowW = row.reduce((s, c) => s + c.w, 0) - LEG_GAP;
        const rowStartX = 20;
        row.forEach(cell => {
          const s = seriesDefs.find(x => x.name === cell.item.name);
          if (!s) return;
          const x = rowStartX + cell.x;
          const y = startY + ri * LEG_ROW;
          const gr = el('g', { class: 'lg-item', style: 'cursor:pointer' }, gLegend);
          el('rect', { x: x - 2, y: y - 2, width: cell.w, height: LEG_ROW - 2, fill: 'transparent' }, gr);
          el('rect', { x, y: y + 2, width: LEG_ICON, height: LEG_ICON, rx: 2,
            fill: s.visible ? s.color : '#ccc' }, gr);
          txt(s.name, { x: x + LEG_ICON + LEG_ICON_GAP, y: y + 12,
            'font-size': F_LEG, 'font-weight': 600,
            fill: s.visible ? (s.legendColor || TITLE_COL) : '#ccc',
            'text-decoration': s.visible ? 'none' : 'line-through',
            'font-family': FONT }, gr);
          gr.addEventListener('click', () => {
            s.visible = !s.visible;
            render(); renderLegend();
          });
        });
      });
    }

    render();
    renderLegend();

    return {
      redraw: () => { render(); renderLegend(); },
      addPoint(seriesIndex, x, y) {
        seriesDefs[seriesIndex].points.push({ x, y });
        recomputeXRange(); render();
      },
      shift(seriesIndex) {
        seriesDefs[seriesIndex].points.shift();
        recomputeXRange(); render();
      },
      getSeries() { return seriesDefs; }
    };
  }

    Charts.line = Chart;
})();

// ─── column / bar ───────────────────────────────────────────────────

/*
 * Clean-charts-styled column/bar chart engine.
 * Matches tokens from clean_charts.config + barv.py / barh.py / stacked_bar.py:
 *  - Cream bg, Inter, black+blue palette
 *  - Column: y-labels floating on the left (no ticks), category labels below bars,
 *    value labels above bars, only-bottom thin spine, horizontal gridlines
 *  - Bar (horizontal): category labels left of bars aligned with title,
 *    x-axis on TOP (ticks + labels, no tick marks), vertical gridlines,
 *    value labels inside-right (white) if bar is long, else outside-right (dark)
 *  - Stacked & grouped variants, negative values, column range, column pyramid,
 *    population pyramid (bar + negative stack)
 * Interactions: hover -> shared tooltip, category-slot highlight.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // clean_charts tokens
  let BG, GRID, AXIS, TITLE_COL, SUB_COL, LABEL_COL, SEC_COL, INV_TEXT, HIGHLIGHT, POS_COL, NEG_COL, DEFAULT_COL, COLORS;
  let CAT_COL, CAT_FW, TICK_COL, TICK_FW, VAL_COL, VAL_FW;
  let FONT, F_TITLE, F_SUB, F_LABEL, F_TICK, F_VALUE, SPINE_W, GRID_W;
  function applyTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    BG = t.bg || '#f4f3f0';
    GRID = t.grid || '#dcdbd7';
    AXIS = t.axis || '#000000';
    TITLE_COL = t.titleColor || '#111111';
    SUB_COL = t.subtitleColor || '#666666';
    LABEL_COL = t.labelColor || '#333333';
    SEC_COL = t.secondaryColor || '#666666';
    INV_TEXT = t.inverseText || '#FFFFFF';
    HIGHLIGHT = t.highlight || '#1f77b4';
    POS_COL = t.positive || '#2323FF';
    NEG_COL = t.negative || '#D1107A';
    DEFAULT_COL = t.defaultColor || '#000000';
    COLORS = t.colors || ['#000000','#2323FF','#4949FF','#7070FF','#9696FF','#BCBCFF','#DDD0FF'];
    // Shared text roles â€” see the hierarchy comment in theme.js.
    CAT_COL = t.categoryColor || TITLE_COL;
    CAT_FW = t.categoryWeight != null ? t.categoryWeight : 600;
    TICK_COL = t.tickColor || LABEL_COL;
    TICK_FW = t.tickWeight != null ? t.tickWeight : 400;
    VAL_COL = t.valueColor || TITLE_COL;
    VAL_FW = t.valueWeight != null ? t.valueWeight : 700;
    FONT = t.font || "'Inter','Segoe UI',Arial,Helvetica,sans-serif";
    F_TITLE = t.titleSize != null ? t.titleSize : 17;
    F_SUB = t.subtitleSize != null ? t.subtitleSize : 12;
    F_LABEL = t.labelSize != null ? t.labelSize : 11.5;
    F_TICK = t.tickSize != null ? t.tickSize : 11;
    F_VALUE = t.valueSize != null ? t.valueSize : 11;
    SPINE_W = t.spineWidth != null ? t.spineWidth : 1.1;
    GRID_W = t.gridWidth != null ? t.gridWidth : 0.8;
  }

  // Resolve a dataLabels option to a boolean. Accepts `true`/`false` directly or
  // an `{enabled}` object, and falls back to the engine's default when the
  // option says nothing.
  function dlEnabled(opt, dflt) {
    if (opt === false) return false;
    if (opt === true) return true;
    if (opt && opt.enabled != null) return !!opt.enabled;
    return dflt;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, attrs, parent) {
    const e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }

  // â”€â”€ Heading wrapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Titles wrap to at most 2 lines, subtitles to at most 3; whatever does
  // not fit is clipped with an ellipsis. Widths are estimated (not measured)
  // so the whole layout can be decided before anything hits the DOM.
  function _headW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.58 : 0.53);
  }
  function _clipLine(str, fontSize, maxW, bold) {
    let s = String(str);
    if (_headW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && _headW(s + 'â€¦', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s.,;:]+$/, '') + 'â€¦';
  }
  function wrapHeading(str, fontSize, maxW, maxLines, bold) {
    const words = String(str == null ? '' : str).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i];
      if (_headW(next, fontSize, bold) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    lines.push(cur);
    if (lines.length > maxLines) {
      const tail = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(_clipLine(tail, fontSize, maxW, bold));
    }
    return lines.map(l => _clipLine(l, fontSize, maxW, bold));
  }
  const TITLE_LINES = 2, SUB_LINES = 3, TITLE_LH = 21, SUB_LH = 16;
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }


  // â”€â”€ dense-axis tick thinning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // With many categories every label would be drawn, so they collide and the
  // axis looks squeezed. When the labels parse as dates we keep only the ones
  // that open a calendar period (hour â†’ day â†’ week â†’ month â†’ quarter â†’ year),
  // stepping up to a coarser period until the kept labels fit the available
  // pixels; otherwise we fall back to an even stride. Called from render(), so
  // a chart whose data keeps growing re-thins itself on every update.
  const TMONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function tpad(n) { return n < 10 ? '0' + n : '' + n; }

  function parseAxisDate(v) {
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v > 1e11 ? v : null;
    if (typeof v !== 'string') return null;
    if (!/\d{4}|\d{1,2}[\/-]\d{1,2}/.test(v)) return null;
    const t = Date.parse(v);
    return isNaN(t) ? null : t;
  }

  // Coarsest-last ladder of calendar periods.
  const AXIS_PERIODS = [
    { key: ms => Math.floor(ms / 3600000),
      fmt: (d) => tpad(d.getUTCHours()) + ':' + tpad(d.getUTCMinutes()) },
    { key: ms => Math.floor(ms / 86400000),
      fmt: (d, first) => TMONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + (first ? ' ' + d.getUTCFullYear() : '') },
    { key: ms => Math.floor((ms / 86400000 - 4) / 7),
      fmt: (d, first) => TMONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + (first ? ' ' + d.getUTCFullYear() : '') },
    { key: ms => { const d = new Date(ms); return d.getUTCFullYear() * 12 + d.getUTCMonth(); },
      fmt: (d, first) => TMONTHS[d.getUTCMonth()] + (first || d.getUTCMonth() === 0 ? " '" + tpad(d.getUTCFullYear() % 100) : '') },
    { key: ms => { const d = new Date(ms); return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3); },
      fmt: (d, first) => 'Q' + (Math.floor(d.getUTCMonth() / 3) + 1) + (first || d.getUTCMonth() < 3 ? " '" + tpad(d.getUTCFullYear() % 100) : '') },
    { key: ms => new Date(ms).getUTCFullYear(),
      fmt: (d) => String(d.getUTCFullYear()) }
  ];

  // Does this label set fit in `avail` px of axis length? Only x-axes need this:
  // their labels sit side by side and collide, whereas a y-axis (horizontal bar)
  // gives every category its own row and can carry the full-length label, so
  // y-axis labels are never thinned.
  function labelsFit(items, avail, fontSize) {
    if (items.length <= 1) return true;
    const per = items.reduce((a, it) => Math.max(a, it.label.length), 0) * fontSize * 0.62 + 12;
    return items.length * per <= avail;
  }

  // Plan the x-axis category labels for `avail` px of axis.
  // Temporal categories collapse to a coarser calendar period (see above) â€”
  // dropping "Feb 3" from a run of days still leaves a readable time axis.
  // Named categories cannot be dropped that way: "Chrome, ?, ?, Safari" is
  // worse than no axis at all. So for them nothing is ever dropped; instead the
  // labels are given more room, in order â€” full width, smaller type, two
  // wrapped lines, two staggered rows, 45Â° slant, then 90Â° vertical. An
  // ellipsis is the last resort, used only after wrapping has been tried.
  // Returns { ticks:[{i, lines:[...]}], font, rotate, stagger, lines, height }.
  function layoutCategoryAxis(cats, avail, baseFont, maxBand) {
    const n = cats.length;
    const CW = 0.62;                       // avg glyph width / font-size
    const base = baseFont || 11;
    maxBand = maxBand || 96;
    const FONTS = [base, base - 1, base - 2].filter(f => f >= 9);
    const upright = (ticks, font, lines, stagger) => ({
      ticks, font, rotate: 0, stagger: !!stagger, lines, count: n,
      height: Math.round(font * 1.25 * lines * (stagger ? 2 : 1)) + 20
    });
    const one = items => items.map(it => ({ i: it.i, lines: [it.label] }));
    if (!n) return upright([], base, 1);

    const all = cats.map((c, i) => ({ i, label: c == null ? String(i) : String(c) }));
    const widest = all.reduce((a, it) => Math.max(a, it.label.length), 0) * CW * base;
    const slot = avail / n;
    if (widest + 10 <= slot) return upright(one(all), base, 1);

    // Temporal: step up the calendar ladder instead of crowding.
    const times = cats.map(parseAxisDate);
    if (times.every(t => t !== null)) {
      for (let p = 0; p < AXIS_PERIODS.length; p++) {
        const period = AXIS_PERIODS[p];
        const picked = [];
        let prev = null;
        for (let i = 0; i < n; i++) {
          const k = period.key(times[i]);
          if (prev === null || k !== prev) {
            picked.push({ i, label: period.fmt(new Date(times[i]), picked.length === 0) });
            prev = k;
          }
        }
        if (picked.length < n && picked.length > 1 && labelsFit(picked, avail, base)) {
          return upright(one(picked), base, 1);
        }
      }
    }

    // Named categories: keep every label, find a presentation that fits.
    // 1) upright â€” shrink the type a little, wrapping onto two lines if it helps
    for (const font of FONTS) {
      if (widest * (font / base) + 10 <= slot) return upright(one(all), font, 1);
      const wrapped = all.map(it => ({ i: it.i, lines: wrapAxisLabel(it.label, 2) }));
      if (maxLineChars(wrapped) * CW * font + 8 <= slot) return upright(wrapped, font, 2);
    }
    // 2) stagger onto two baselines â€” each label gets two slots of width
    for (const font of FONTS) {
      if (widest * (font / base) + 8 <= slot * 2) return upright(one(all), font, 1, true);
    }
    // 3) slant 45Â°, then 4) stand labels vertically. Spacing now costs about a
    // glyph height per wrapped line, and length is bounded by the band depth â€”
    // so try a second line before giving up any characters.
    const slanted = (ticks, font, rotate, lines, proj) => ({
      ticks, font, rotate, stagger: false, lines, count: n,
      height: Math.round(Math.min(maxBand, maxLineChars(ticks) * CW * font / proj + 16)) + 6
    });
    for (const rotate of [45, 90]) {
      const proj = rotate === 45 ? Math.SQRT2 : 1;      // band px per text px
      const thin = rotate === 45 ? base * 0.95 : base * 1.05;
      for (const font of FONTS) {
        const maxChars = Math.max(4, Math.floor((maxBand - 16) * proj / (CW * font)));
        for (const lines of [1, 2]) {
          if (thin * (font / base) * lines > slot) break;
          const ticks = all.map(it => ({ i: it.i, lines: wrapAxisLabel(it.label, lines) }));
          if (maxLineChars(ticks) <= maxChars) return slanted(ticks, font, rotate, lines, proj);
        }
      }
      // Wrapping was not enough for this angle: truncate to the band depth.
      for (const font of FONTS) {
        const maxChars = Math.max(4, Math.floor((maxBand - 16) * proj / (CW * font)));
        for (const lines of [2, 1]) {
          if (thin * (font / base) * lines > slot) continue;
          const ticks = all.map(it => ({
            i: it.i, lines: wrapAxisLabel(it.label, lines).map(l => ellipsize(l, maxChars))
          }));
          return slanted(ticks, font, rotate, lines, proj);
        }
      }
    }
    // Slots too narrow for any legible text â€” the tooltip carries the names.
    return upright([], base, 1);
  }

  // Y-axis (horizontal bar) row labels. Each category owns a row, so nothing is
  // ever dropped; a label that outgrows the gutter wraps onto a second line
  // whenever the row is tall enough for one, and only what still does not fit
  // after wrapping is cut with an ellipsis. Type shrinks a step or two, both to
  // buy that second line and to keep tightly packed rows from colliding.
  function layoutRowLabels(cats, availW, rowH, baseFont) {
    const CW = 0.62;
    const strs = cats.map(c => (c == null ? '' : String(c)));
    const fonts = [baseFont, baseFont - 1, baseFont - 2].filter(f => f >= 9);
    for (const font of fonts) {
      const lh = font * 1.2;
      if (lh > rowH && font !== fonts[fonts.length - 1]) continue;   // row too short for this size
      const maxChars = Math.max(3, Math.floor(availW / (CW * font)));
      if (strs.every(l => l.length <= maxChars)) return { lines: strs.map(l => [l]), font, lh };
      if (rowH >= lh * 2) {
        const wrapped = strs.map(l => wrapAxisLabel(l, 2));
        if (wrapped.every(w => w.every(l => l.length <= maxChars))) return { lines: wrapped, font, lh };
      }
    }
    // Longer than the gutter even wrapped: wrap if the row allows, then clip.
    const font = fonts[0] || baseFont;
    const lh = font * 1.2;
    const maxChars = Math.max(3, Math.floor(availW / (CW * font)));
    const maxLines = rowH >= lh * 2 ? 2 : 1;
    return {
      lines: strs.map(l => wrapAxisLabel(l, maxLines).slice(0, maxLines).map(x => ellipsize(x, maxChars))),
      font, lh
    };
  }

  // Widest rendered line of a row-label layout, in px.
  function rowLabelWidth(rl) {
    return rl.lines.reduce((a, lns) =>
      Math.max(a, lns.reduce((b, l) => Math.max(b, l.length), 0)), 0) * 0.62 * rl.font;
  }

  function maxLineChars(ticks) {
    return ticks.reduce((a, t) => Math.max(a, t.lines.reduce((b, l) => Math.max(b, l.length), 0)), 0);
  }
  function ellipsize(s, maxChars) {
    s = String(s);
    return s.length <= maxChars ? s : s.slice(0, Math.max(1, maxChars - 1)) + 'â€¦';
  }
  // Word wrap into at most `lines` lines, split where the longest line comes
  // out shortest — a balanced wrap fits a narrow slot that a greedy one misses.
  function wrapAxisLabel(label, lines) {
    const s = String(label);
    const words = s.split(/\s+/);
    if (lines < 2 || words.length <= 1) return [s];
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const score = Math.max(a.length, b.length);
      if (!best || score < best.score) best = { score, out: [a, b] };
    }
    if (lines <= 2 || words.length === 2) return best.out;
    return [best.out[0]].concat(wrapAxisLabel(best.out[1], lines - 1));
  }

  // Draw one planned axis label. `x` is the slot centre, `yTop` the first
  // baseline. Rotated labels hang from the axis anchored at their end, with
  // wrapped lines stepping along the rotated frame's own y so they stay
  // perpendicular to the axis.
  function drawCategoryLabel(g, layout, tick, k, x, yTop, color, weight) {
    const a = { 'font-size': layout.font, 'font-weight': weight, fill: color, 'font-family': FONT };
    const lh = layout.font * 1.25;
    const y0 = yTop + (layout.stagger && k % 2 ? lh : 0);
    tick.lines.forEach((ln, li) => {
      const t = txt(ln, Object.assign({ x, y: y0 + li * lh,
        'text-anchor': layout.rotate ? 'end' : 'middle' }, a), g);
      if (layout.rotate) t.setAttribute('transform', `rotate(-${layout.rotate} ${x} ${yTop})`);
    });
  }

  function niceTicks(min, max, count) {
    count = count || 5;
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;
    const step0 = Math.pow(10, Math.floor(Math.log10(range / count)));
    const err = (count / range) * step0;
    let step = step0;
    if (err <= 0.15) step *= 10;
    else if (err <= 0.35) step *= 5;
    else if (err <= 0.75) step *= 2;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(12));
    return out;
  }
  function darken(hex, amt) {
    const c = hex.replace('#','');
    const n = parseInt(c.length === 3 ? c.split('').map(x=>x+x).join('') : c, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * (1 - amt))));
    g = Math.max(0, Math.min(255, Math.round(g * (1 - amt))));
    b = Math.max(0, Math.min(255, Math.round(b * (1 - amt))));
    return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
  }
  function lighten(hex, amt) { return darken(hex, -amt); }
  // Rough luminance to pick contrast text
  function contrastText(hex) {
    const c = hex.replace('#','');
    const n = parseInt(c.length === 3 ? c.split('').map(x=>x+x).join('') : c, 16);
    const r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    const L = 0.299*r + 0.587*g + 0.114*b;
    return L < 140 ? INV_TEXT : TITLE_COL;
  }

  // Word-wrap into up to N lines of a target character width (rough px based)
  function wrapText(str, maxChars, maxLines) {
    const words = String(str).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      if (!cur.length) { cur = w; continue; }
      if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
      else { lines.push(cur); cur = w; if (lines.length >= maxLines - 1) break; }
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      const last = lines.slice(0, maxLines);
      last[maxLines - 1] = last[maxLines - 1].slice(0, maxChars - 1) + 'â€¦';
      return last;
    }
    return lines;
  }

  // ---------------- main ----------------
  // ── callouts ────────────────────────────────────────────────────────────
  // A callout is an anchor dot on the mark, a leader, and a paragraph box.
  // The block is shared by every engine (each is its own IIFE) so a note reads
  // the same everywhere, but *where* the box goes is the engine's call: a
  // column chart puts its notes in a band above the bars, a horizontal bar
  // chart in the gutter past the bar ends, a scatter in the emptiest corner
  // near the point. Passing the marks in as `obstacles` is what keeps a box
  // off the data instead of merely off the other boxes.
  //
  //   drawCallouts(g, items, bounds, {
  //     mode: 'above' | 'right' | 'radial' | 'auto',
  //     obstacles: [{ x, y, w, h }],   // rects the box must not cover
  //     center: { x, y },              // radial mode: what to push away from
  //     gutter: 12                     // band/gutter thickness for above/right
  //   })
  //
  // Placement stays deterministic — candidates are tried in a fixed order —
  // so re-rendering the same data puts every box back where it was.
  const CALLOUT_PAD = 6;          // clearance between a box and anything else
  const CALLOUT_LEAD = 14;        // shortest leader worth drawing

  const CALLOUT_OFFSETS = [
    [ 32, -60], [-32, -60], [ 32, -110], [-32, -110],
    [ 60, -30], [-60, -30], [ 32,  30], [-32,  30],
    [ 60,  30], [-60,  30], [ 32, -160], [-32, -160]
  ];

  function calloutTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    return {
      accent: t.callout || '#e3120b',
      text: t.labelColor || '#333333',
      inverse: t.inverseText || '#FFFFFF',
      bg: t.bg || '#f4f3f0'
    };
  }

  function measureCalloutBox(text) {
    const lines = String(text).split('\n');
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + 16);
    const h = lines.length * 13 + 16;
    return { w: w, h: h };
  }

  // Total area of a rect that lands on top of anything it should not.
  function calloutOverlap(r, rects) {
    let sum = 0;
    for (let i = 0; i < rects.length; i++) {
      const o = rects[i];
      const dx = Math.min(r.x + r.w + CALLOUT_PAD, o.x + o.w) - Math.max(r.x - CALLOUT_PAD, o.x);
      const dy = Math.min(r.y + r.h + CALLOUT_PAD, o.y + o.h) - Math.max(r.y - CALLOUT_PAD, o.y);
      if (dx > 0 && dy > 0) sum += dx * dy;
    }
    return sum;
  }

  function calloutInBounds(r, b) {
    return r.x >= b.x + 2 && r.y >= b.y + 2 &&
           r.x + r.w <= b.x + b.w - 2 && r.y + r.h <= b.y + b.h - 2;
  }

  function drawCalloutBox(g, bx, by, text, edge) {
    const th = calloutTheme();
    const lines = String(text).split('\n');
    const lh = 13, pad = 8;
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + pad * 2);
    const h = lines.length * lh + pad * 2;
    el('rect', { x: bx, y: by, width: w, height: h, rx: 6, ry: 6,
      fill: th.bg, 'fill-opacity': 0.94, stroke: edge, 'stroke-width': 0.8 }, g);
    lines.forEach((ln, i) => {
      txt(ln, { x: bx + pad, y: by + pad + (i + 1) * lh - 3, 'font-size': 10,
        fill: th.text, 'font-family': FONT }, g);
    });
  }

  // Leader from the anchor to the box. Straight when the box sits diagonally
  // from the mark; an elbow when it sits squarely above or beside it, so the
  // line reads as a pointer rather than as another data mark.
  function drawCalloutLeader(g, ax, ay, box, color, mode) {
    const midX = box.x + box.w / 2, midY = box.y + box.h / 2;
    if (mode === 'above' || mode === 'below') {
      const edgeY = mode === 'above' ? box.y + box.h : box.y;
      const stem = mode === 'above' ? edgeY + 8 : edgeY - 8;
      const cx = Math.max(box.x + 8, Math.min(box.x + box.w - 8, ax));
      const d = 'M ' + ax + ' ' + ay + ' L ' + ax + ' ' + stem +
                ' L ' + cx + ' ' + stem + ' L ' + cx + ' ' + edgeY;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    if (mode === 'right' || mode === 'left') {
      const edgeX = mode === 'right' ? box.x : box.x + box.w;
      const stem = mode === 'right' ? edgeX - 8 : edgeX + 8;
      const cy = Math.max(box.y + 8, Math.min(box.y + box.h - 8, ay));
      const d = 'M ' + ax + ' ' + ay + ' L ' + stem + ' ' + ay +
                ' L ' + stem + ' ' + cy + ' L ' + edgeX + ' ' + cy;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    let lx = midX, ly = midY;
    if (ax < box.x) lx = box.x;
    else if (ax > box.x + box.w) lx = box.x + box.w;
    if (ay < box.y) ly = box.y;
    else if (ay > box.y + box.h) ly = box.y + box.h;
    el('line', { x1: ax, y1: ay, x2: lx, y2: ly, stroke: color, 'stroke-width': 1.2 }, g);
  }

  function drawCallouts(g, items, bounds, cfg) {
    if (!items || !items.length) return;
    cfg = cfg || {};
    const mode = cfg.mode || 'auto';
    const obstacles = (cfg.obstacles || []).slice();
    const th = calloutTheme();
    const placed = [];
    const gutter = cfg.gutter != null ? cfg.gutter : 10;

    // Sorting by the axis the band runs along keeps leaders from crossing.
    const ordered = items.slice().sort((a, b) =>
      (mode === 'right' || mode === 'left') ? a.y - b.y : a.x - b.x);

    ordered.forEach(it => {
      const box = measureCalloutBox(it.text);
      const color = it.color || th.accent;
      const blocked = obstacles.concat(placed);
      let best = null, bestCost = Infinity, leader = mode;

      const consider = (x, y, penalty, leadMode) => {
        const r = { x: x, y: y, w: box.w, h: box.h };
        if (!calloutInBounds(r, bounds)) return;
        const cost = calloutOverlap(r, blocked) + (penalty || 0);
        if (cost < bestCost) { bestCost = cost; best = r; leader = leadMode || mode; }
      };

      if (mode === 'above' || mode === 'below') {
        // Band across the top (or bottom): the box keeps to the headroom the
        // engine reserved, and slides sideways from the anchor until it is
        // clear. Distance from the anchor is the tie-breaker, so a note stays
        // over the mark it belongs to whenever the room is there.
        const bandY = mode === 'above'
          ? bounds.y + gutter
          : bounds.y + bounds.h - gutter - box.h;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
          consider(it.x - box.w / 2 + dx, bandY, Math.abs(dx) * 0.5, mode);
        }
        // Second row under the first when the band is full.
        if (bestCost > 0) {
          const row2 = mode === 'above' ? bandY + box.h + CALLOUT_PAD
                                        : bandY - box.h - CALLOUT_PAD;
          for (let step = 0; step <= 24; step++) {
            const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
            consider(it.x - box.w / 2 + dx, row2, 400 + Math.abs(dx) * 0.5, mode);
          }
        }
      } else if (mode === 'right' || mode === 'left') {
        // Gutter past the ends of the bars, one box per row, aligned with the
        // row it annotates.
        const colX = mode === 'right'
          ? bounds.x + bounds.w - gutter - box.w
          : bounds.x + gutter;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dy = Math.ceil(step / 2) * 14 * (step % 2 ? 1 : -1);
          consider(colX, it.y - box.h / 2 + dy, Math.abs(dy) * 0.5, mode);
        }
      } else if (mode === 'radial' && cfg.center) {
        // Push out from the middle of the ring or cluster, so the leader reads
        // as a spoke. Straight out is preferred, but the fan of angles around
        // it matters: a wedge pointing into a crowded side still has a clear
        // diagonal to reach for, and a spoke 30° off still reads as a spoke.
        const vx = it.x - cfg.center.x, vy = it.y - cfg.center.y;
        const base = Math.atan2(vy, vx);
        const FAN = [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31];
        for (let f = 0; f < FAN.length && bestCost > 0; f++) {
          const a = base + FAN[f];
          for (let d = 30; d <= 260 && bestCost > 0; d += 14) {
            const px = it.x + Math.cos(a) * d, py = it.y + Math.sin(a) * d;
            consider(px - box.w / 2, py - box.h / 2,
              d * 0.4 + Math.abs(FAN[f]) * 90, 'auto');
          }
        }
      }

      // Ladder of diagonal offsets: the general fallback, and the default for
      // charts with no obvious free direction (line, scatter).
      if (bestCost > 0) {
        for (let i = 0; i < CALLOUT_OFFSETS.length; i++) {
          const ox = CALLOUT_OFFSETS[i][0], oy = CALLOUT_OFFSETS[i][1];
          consider(ox >= 0 ? it.x + ox : it.x + ox - box.w,
                   oy < 0 ? it.y + oy - box.h : it.y + oy,
                   (mode === 'auto' ? 0 : 800) + i * 2, 'auto');
        }
      }

      if (!best) {
        // Nothing fits: clamp inside and accept the overlap rather than drop a
        // note the author wrote.
        best = {
          x: Math.max(bounds.x + 2, Math.min(bounds.x + bounds.w - box.w - 2, it.x - box.w / 2)),
          y: Math.max(bounds.y + 2, Math.min(bounds.y + bounds.h - box.h - 2, it.y - box.h - 20)),
          w: box.w, h: box.h
        };
        leader = 'auto';
      }
      placed.push(best);

      drawCalloutLeader(g, it.x, it.y, best, color, leader);
      el('circle', { cx: it.x, cy: it.y, r: 4.5, fill: color,
        stroke: th.inverse, 'stroke-width': 1 }, g);
      drawCalloutBox(g, best.x, best.y, it.text, color);
    });
  }

  // Match a callout to a named thing: `name`, `category`, `point`, `code` and
  // `label` are all accepted so the key reads naturally per chart type.
  function calloutKey(co) {
    const k = co.name != null ? co.name
      : co.category != null ? co.category
      : co.point != null ? co.point
      : co.code != null ? co.code
      : co.label != null ? co.label
      : co.row != null ? co.row
      : co.panel != null ? co.panel : null;
    return k == null ? null : String(k);
  }

  function Chart(container, opts) {
    applyTheme();
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.fontFamily = FONT;
    container.style.background = BG;

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 500;
    const chartOpts = opts.chart || {};
    const inverted = (chartOpts.type === 'bar') || chartOpts.inverted;
    const is3D = !!(chartOpts.options3d && chartOpts.options3d.enabled);
    const depth3D = (chartOpts.options3d && chartOpts.options3d.depth) || 25;

    const xAxis = opts.xAxis || {};
    const yAxis = opts.yAxis || {};
    const categories = xAxis.categories || [];
    const plotColumn = (opts.plotOptions && opts.plotOptions.column) || {};
    const plotBar    = (opts.plotOptions && opts.plotOptions.bar) || {};
    const plotSeries = (opts.plotOptions && opts.plotOptions.series) || {};
    const plotCommon = Object.assign({}, plotSeries, plotColumn, plotBar);

    const stacking = plotCommon.stacking || null; // 'normal'|'percent'|null
    const pointPadding = plotCommon.pointPadding != null ? plotCommon.pointPadding : 0.1;
    const groupPadding = plotCommon.groupPadding != null ? plotCommon.groupPadding : 0.2;
    const forcedType = plotCommon.type || chartOpts.type;
    const valueSuffix = (yAxis.suffix != null) ? yAxis.suffix : '';
    // Value labels are on by default: the number a bar encodes is what the
    // reader came for, and making them read it off an axis is a needless
    // indirection. Opt out with dataLabels:false or {enabled:false}, at
    // plotOptions or series level.
    const showValues = dlEnabled(plotCommon.dataLabels, true);

    const hasTitle = !!opts.title;
    const hasSub = !!opts.subtitle;

    // Title zone (fig.text style: top-left)
    const titleLines = hasTitle
      ? wrapHeading(opts.title, F_TITLE, W - 40, TITLE_LINES, true) : [];
    const subLines = hasSub
      ? wrapHeading(opts.subtitle, F_SUB, W - 40, SUB_LINES, false) : [];
    const subY0 = 34 + (titleLines.length ? (titleLines.length - 1) * TITLE_LH + 20 : 0);
    const titleBlockH = (hasTitle ? 24 + (titleLines.length - 1) * TITLE_LH : 0)
                      + (hasSub ? 22 + (subLines.length - 1) * SUB_LH : 0) + 18;

    // Determine longest category label for horizontal bar left pad
    const maxCatLen = categories.reduce((a,c) => Math.max(a, String(c).length), 0);

    // titleX is the shared left edge for title, subtitle, and (for columns) y-labels
    const titleX = 20;

    // â”€â”€ Legend layout (top row(s), auto-enabled when multi-series) â”€â”€â”€â”€â”€â”€
    const F_LEG = 12, LEG_ROW = 20, LEG_GAP = 18, LEG_ICON = 12, LEG_ICON_GAP = 6;
    const seriesCount = (opts.series || []).length;
    const legendEnabled = (opts.legend && opts.legend.enabled != null)
      ? !!opts.legend.enabled : (seriesCount > 1);
    function layoutLegend(items, availW) {
      const widths = items.map(it => LEG_ICON + LEG_ICON_GAP + Math.ceil(String(it.name).length * F_LEG * 0.55) + LEG_GAP);
      const rows = [];
      let cur = [], curX = 0;
      for (let i = 0; i < items.length; i++) {
        if (cur.length && curX + widths[i] > availW) { rows.push(cur); cur = []; curX = 0; }
        cur.push({ item: items[i], x: curX, w: widths[i] });
        curX += widths[i];
      }
      if (cur.length) rows.push(cur);
      return { rows, height: rows.length * LEG_ROW };
    }
    const availLegW = W - 40;
    const legendLayout = legendEnabled
      ? layoutLegend((opts.series || []).map((s, i) => ({ name: s.name || 'Series ' + (i + 1) })), availLegW)
      : { rows: [], height: 0 };
    const legendZone = legendLayout.height + (legendEnabled ? 18 : 0);

    // Horizontal bars carry their category label in the left gutter. Lay the
    // labels out against the widest gutter we would ever allow (a third of the
    // chart), then pull the gutter in to the width the text actually uses —
    // otherwise a wrapped label leaves a canyon between itself and the bars.
    const rowCount = Math.max(1, categories.length
      || ((opts.series || [])[0] ? ((opts.series[0].data || []).length) : 1));
    const gutterMax = Math.min(Math.max(172, W * 0.34), 20 + maxCatLen * 6.5 + 14);
    const rowLabelCats = categories.length
      ? categories : Array.from({ length: rowCount }, (_, i) => i);
    let rowLabels = null;
    let leftPadForBars = 24;
    if (inverted) {
      const ihEst = Math.max(40, H - (titleBlockH + legendZone + 34) - 26);
      rowLabels = layoutRowLabels(rowLabelCats, gutterMax - titleX - 10,
        ihEst / rowCount, F_LABEL);
      leftPadForBars = Math.min(gutterMax,
        Math.round(titleX + rowLabelWidth(rowLabels) + 12));
    }

    const M = {
      l: inverted ? leftPadForBars : 62,   // column: room for y-labels left-aligned to titleX
      r: 20,
      t: titleBlockH + legendZone + (inverted ? 34 : 8),  // + legend + top-axis room when inverted
      b: (inverted ? 26 : 40)  // room for category labels + ~20px outer pad
    };
    const IW = W - M.l - M.r;
    // Columns: plan the category labels before fixing the bottom margin, so a
    // slanted or stacked band gets the room it needs. Recomputed per render()
    // via renderCatLayout() when the data length changes.
    const catCount = categories.length || ((opts.series || [])[0] ? (opts.series[0].data || []).length : 0);
    let catLayout = inverted
      ? null
      : layoutCategoryAxis(
          categories.length ? categories : Array.from({ length: catCount }, (_, i) => i),
          IW, F_LABEL, Math.max(40, Math.min(110, H * 0.3)));
    if (catLayout) M.b = Math.max(26, catLayout.height);
    const IH = H - M.t - M.b;

    const svg = el('svg', { xmlns: NS, width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.background = BG;
    svg.style.display = 'block';
    container.appendChild(svg);

    // Title & subtitle top-left (titleX declared above with M)
    titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: 34 + i * TITLE_LH, 'text-anchor': 'start',
      'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, svg));
    subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * SUB_LH, 'text-anchor': 'start',
      'font-size': F_SUB, fill: SUB_COL, 'font-family': FONT }, svg));

    // Normalize series (assign gradient colors by default)
    const nSeries = (opts.series || []).length;
    const seriesDefs = (opts.series || []).map((s, i) => {
      // Default color: gradient palette when >1 series, else DEFAULT_COL
      const defaultColor = (nSeries === 1) ? DEFAULT_COL : COLORS[i % COLORS.length];
      const color = s.color || defaultColor;
      const type = s.type || forcedType || 'column';
      const dataLabels = Object.assign(
        { format: null, y: -4 },
        typeof plotCommon.dataLabels === 'object' ? plotCommon.dataLabels : {},
        typeof s.dataLabels === 'object' ? s.dataLabels : {},
        { enabled: dlEnabled(s.dataLabels, showValues) }
      );
      const points = (s.data || []).map((d, j) => {
        if (d === null || d === undefined) return null;
        if (typeof d === 'number') return { x: j, y: d, name: categories[j] };
        if (Array.isArray(d)) {
          if (d.length === 2 && type !== 'columnrange') return { x: d[0], y: d[1] };
          if (d.length === 2) return { x: j, low: d[0], high: d[1], name: categories[j] };
          return { x: d[0], low: d[1], high: d[2] };
        }
        return Object.assign({ x: j, name: categories[j] }, d);
      });
      return {
        name: s.name || 'Series ' + (i + 1),
        color, type, points, dataLabels,
        legendColor: s.legendColor,
        scenario: s.scenario,
        stack: s.stack != null ? s.stack : 0,
        negativeColor: s.negativeColor,
        visible: true,
        valueSuffix: s.valueSuffix || (opts.tooltip && opts.tooltip.valueSuffix) || valueSuffix,
        valuePrefix: s.valuePrefix || (opts.tooltip && opts.tooltip.valuePrefix) || '',
        valueDecimals: s.valueDecimals != null ? s.valueDecimals : (opts.tooltip && opts.tooltip.valueDecimals)
      };
    });

    // Y range considering stacking
    function computeYRange() {
      let yMin = Infinity, yMax = -Infinity;
      const n = categories.length || (seriesDefs[0] ? seriesDefs[0].points.length : 0);
      if (stacking === 'percent') {
        return { yMin: 0, yMax: 100, yTicks: [0, 20, 40, 60, 80, 100] };
      }
      if (stacking === 'normal') {
        for (let i = 0; i < n; i++) {
          let posSum = 0, negSum = 0;
          seriesDefs.forEach(s => {
            if (!s.visible) return;
            const p = s.points[i]; if (!p) return;
            const v = p.y != null ? p.y : (p.high != null ? p.high : 0);
            if (v >= 0) posSum += v; else negSum += v;
          });
          yMin = Math.min(yMin, negSum, 0);
          yMax = Math.max(yMax, posSum);
        }
      } else {
        seriesDefs.forEach(s => {
          if (!s.visible) return;
          s.points.forEach(p => {
            if (!p) return;
            if (p.low != null && p.high != null) { yMin = Math.min(yMin, p.low); yMax = Math.max(yMax, p.high); }
            else if (p.y != null) { yMin = Math.min(yMin, p.y, 0); yMax = Math.max(yMax, p.y); }
          });
        });
      }
      // Callouts live in a band past the ends of the bars — above them on a
      // column chart, right of them on a horizontal bar chart. The room has to
      // come out of the value axis, or the tallest bar and the note fight over
      // the same pixels. Skipped when the author fixed the axis themselves.
      if ((opts.callouts || []).length && yAxis.max == null && yMax > 0) {
        const band = calloutBandPx(opts.callouts);
        const plotPx = inverted ? IW : IH;
        const frac = Math.min(0.42, band / Math.max(60, plotPx));
        yMax = yMax + (yMax - Math.min(0, yMin)) * frac;
      }
      if (yAxis.min != null) yMin = yAxis.min;
      if (yAxis.max != null) yMax = yAxis.max;
      if (yMin === Infinity) yMin = 0;
      if (yMax === -Infinity) yMax = 1;
      // add small headroom for value labels
      const pad = (yMax - yMin) * (showValues && !stacking ? 0.12 : 0.05);
      let yLo = yMin - (yMin < 0 ? pad : 0);
      let yHi = yMax + pad;
      if (yAxis.min != null) yLo = yAxis.min;
      if (yAxis.max != null) yHi = yAxis.max;
      const yTicks = niceTicks(yLo, yHi, 5);
      return { yMin: yTicks[0], yMax: yTicks[yTicks.length - 1], yTicks };
    }

    // Layers
    const defs = el('defs', {}, svg);
    const gGrid = el('g', {}, svg);
    const gBars = el('g', {}, svg);
    const gLabels = el('g', {}, svg);
    // Boxes of the value labels already placed this render. A label that would
    // overlap one already drawn is dropped, so what survives is always
    // readable. Widths are estimated, as everywhere else in the engines.
    const labelBoxes = [];
    function placeLabel(cx, cy, text, anchor) {
      const w = String(text).length * F_VALUE * 0.60 + 4, h = 13;
      const x1 = anchor === 'end' ? cx - w : anchor === 'start' ? cx : cx - w / 2;
      const box = { x1: x1, x2: x1 + w, y1: cy - h, y2: cy + 3 };
      if (labelBoxes.some(b => box.x1 < b.x2 && box.x2 > b.x1 && box.y1 < b.y2 && box.y2 > b.y1)) {
        return false;
      }
      labelBoxes.push(box);
      return true;
    }
    const gAxes = el('g', {}, svg);
    const gAnnot = el('g', {}, svg);   // callouts sit above bars and labels
    const gLegend = el('g', {}, svg);
    const gInteract = el('g', {}, svg);

    // Scales
    let yScale, xScaleVal, ranges;
    function computeScales() {
      ranges = computeYRange();
      if (!inverted) {
        yScale = v => M.t + IH - ((v - ranges.yMin) / (ranges.yMax - ranges.yMin)) * IH;
      } else {
        xScaleVal = v => M.l + ((v - ranges.yMin) / (ranges.yMax - ranges.yMin)) * IW;
      }
    }

    function catCenterX(i, n) { return M.l + ((i + 0.5) / n) * IW; }
    function catCenterY(i, n) { return M.t + ((i + 0.5) / n) * IH; }

    function addCommas(n) {
      // Strip binary-float noise before stringifying: 25.999999999999996 -> 26,
      // 0.30000000000000004 -> 0.3. Values like these arrive whenever a chart is
      // fed a computed share or a summed column, and String() renders every
      // artefact digit. 12 significant figures sits well inside double
      // precision, so genuine values are untouched while accumulated ~1e-15
      // error rounds away.
      if (typeof n === 'number' && isFinite(n)) n = +n.toPrecision(12);
      const s = String(n);
      const neg = s.startsWith('-') ? '-' : '';
      const abs = neg ? s.slice(1) : s;
      const dot = abs.indexOf('.');
      const intPart = dot < 0 ? abs : abs.slice(0, dot);
      const fracPart = dot < 0 ? '' : abs.slice(dot);
      return neg + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fracPart;
    }
    function fmtY(v) {
      const abs = Math.abs(v);
      let s;
      if (abs >= 1e9) s = addCommas((v/1e9).toFixed(1)) + 'B';
      else if (abs >= 1e6) s = addCommas((v/1e6).toFixed(1)) + 'M';
      else if (abs >= 1e3) s = addCommas((v/1e3).toFixed(1)) + 'k';
      else s = addCommas((v === Math.floor(v)) ? String(v) : (+v.toFixed(3)).toString());
      return s + valueSuffix;
    }
    function formatValue(v, s) {
      const d = s.valueDecimals;
      const raw = d != null ? (+v).toFixed(d) : (v === Math.floor(v) ? String(v) : String(+v.toFixed(3)));
      return (s.valuePrefix || '') + addCommas(raw) + (s.valueSuffix || '');
    }

    // Filled by render(), read by drawBar(): how many stacked segments sit
    // either side of zero for each category.
    const segsPerSide = [];

    // One anchor per bar drawn this render, so a callout can name a category
    // (and optionally a series) instead of guessing at pixels.
    const barAnchors = [];
    // Everything a note must not cover: the bars, and the value labels placed
    // this render.
    const barRects = [];

    // Room a band of notes needs, in px — the tallest box plus breathing room.
    function calloutBandPx(cos) {
      let h = 0;
      (cos || []).forEach(co => { h = Math.max(h, measureCalloutBox(co.text).h); });
      return h + 26;
    }

    function render() {
      gGrid.innerHTML = '';
      gBars.innerHTML = '';
      gLabels.innerHTML = '';
      gAnnot.innerHTML = '';
      barAnchors.length = 0;
      barRects.length = 0;
      labelBoxes.length = 0;   // placement is per render
      gAxes.innerHTML = '';
      computeScales();
      const n = categories.length || (seriesDefs[0] ? seriesDefs[0].points.length : 0);
      const visibleSeries = seriesDefs.filter(s => s.visible);

      // --- axes / gridlines ---
      if (!inverted) {
        // Column: horizontal gridlines & bottom spine, floating y-labels on left
        ranges.yTicks.forEach(v => {
          const y = yScale(v);
          el('line', { x1: M.l, x2: M.l + IW, y1: y, y2: y,
            stroke: GRID, 'stroke-width': GRID_W }, gGrid);
          const label = stacking === 'percent' ? (Math.round(v) + '%') : fmtY(v);
          txt(label, { x: titleX, y: y + 4, 'text-anchor': 'start',
            'font-size': F_TICK, 'font-weight': TICK_FW, fill: TICK_COL, 'font-family': FONT }, gAxes);
        });
        // Bottom spine (light, thin)
        const y0 = yScale(Math.max(0, ranges.yMin));
        el('line', { x1: M.l, y1: y0, x2: M.l + IW, y2: y0,
          stroke: LABEL_COL, 'stroke-width': SPINE_W }, gAxes);
        // Category labels below bars, laid out to fit without dropping any
        // named category (see layoutCategoryAxis).
        if (n !== catLayout.count) {
          catLayout = layoutCategoryAxis(
            categories.length ? categories : Array.from({ length: n }, (_, i) => i),
            IW, F_LABEL, M.b);
        }
        catLayout.ticks.forEach((tk, k) => {
          drawCategoryLabel(gAxes, catLayout, tk, k, catCenterX(tk.i, n),
            M.t + IH + 16, CAT_COL, CAT_FW);
        });
      } else {
        // Horizontal bar: vertical gridlines, top spine, x-axis labels on TOP
        ranges.yTicks.forEach(v => {
          const x = xScaleVal(v);
          el('line', { x1: x, x2: x, y1: M.t, y2: M.t + IH,
            stroke: GRID, 'stroke-width': GRID_W }, gGrid);
          let label = stacking === 'percent' ? (Math.round(v) + '%') : fmtY(v);
          if (opts.tooltip && opts.tooltip.absoluteX) label = fmtY(Math.abs(v));
          txt(label, { x, y: M.t - 10, 'text-anchor': 'middle',
            'font-size': F_TICK, 'font-weight': TICK_FW, fill: TICK_COL, 'font-family': FONT }, gAxes);
        });
        // Top spine
        el('line', { x1: M.l, y1: M.t, x2: M.l + IW, y2: M.t,
          stroke: LABEL_COL, 'stroke-width': SPINE_W }, gAxes);
        // Category labels aligned to titleX, vertically centered on bar. Never
        // thinned: each category owns a row, so labels stack instead of
        // colliding and a dropped one would leave a bar unidentified. They are
        // wrapped (and only then clipped) to the gutter so they never run into
        // the bars.
        if (rowLabels.lines.length !== n) {
          rowLabels = layoutRowLabels(
            categories.length ? categories : Array.from({ length: n }, (_, i) => i),
            M.l - titleX - 10, IH / Math.max(1, n), F_LABEL);
        }
        rowLabels.lines.forEach((lns, i) => {
          const y = catCenterY(i, n) + 4 - (lns.length - 1) * rowLabels.lh / 2;
          lns.forEach((ln, li) => {
            txt(ln, { x: titleX, y: y + li * rowLabels.lh, 'text-anchor': 'start',
              'font-size': rowLabels.font, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT }, gAxes);
          });
        });
      }

      // --- bars ---
      // How many stacked segments sit either side of zero, per category. One
      // segment per side means the label can go at the bar's end (the pyramid
      // case); more than one and it has to stay inside its own segment.
      segsPerSide.length = 0;
      if (stacking === 'normal' || stacking === 'percent') {
        for (let i = 0; i < n; i++) {
          let pos = 0, neg = 0;
          visibleSeries.forEach(sv => {
            const pt = sv.points[i];
            if (!pt || pt.y == null) return;
            if (pt.y >= 0) pos++; else neg++;
          });
          segsPerSide.push({ pos: pos, neg: neg });
        }
      }

      if (stacking === 'normal' || stacking === 'percent') {
        for (let i = 0; i < n; i++) {
          let posOffset = 0, negOffset = 0;
          let total = 0;
          if (stacking === 'percent') {
            visibleSeries.forEach(s => {
              const p = s.points[i]; if (!p) return;
              const v = p.y || 0; if (v > 0) total += v;
            });
          }
          visibleSeries.forEach((s, si) => {
            const p = s.points[i]; if (!p || p.y == null) return;
            let v = p.y;
            if (stacking === 'percent') v = total > 0 ? (v / total) * 100 : 0;
            if (!inverted) {
              const y0 = yScale(v >= 0 ? posOffset : negOffset);
              const y1 = yScale(v >= 0 ? posOffset + v : negOffset + v);
              const barW = ((IW / n) * (1 - groupPadding * 2)) * (1 - pointPadding * 2);
              const cx = catCenterX(i, n);
              drawBar(s, p, cx - barW/2, Math.min(y0,y1), barW, Math.abs(y1-y0), false, i, si, v, true);
              if (v >= 0) posOffset += v; else negOffset += v;
            } else {
              const x0 = xScaleVal(v >= 0 ? posOffset : negOffset);
              const x1 = xScaleVal(v >= 0 ? posOffset + v : negOffset + v);
              const barH = ((IH / n) * (1 - groupPadding * 2)) * (1 - pointPadding * 2);
              const cy = catCenterY(i, n);
              drawBar(s, p, Math.min(x0,x1), cy - barH/2, Math.abs(x1-x0), barH, true, i, si, v, true);
              if (v >= 0) posOffset += v; else negOffset += v;
            }
          });
        }
      } else {
        const groupCount = visibleSeries.length;
        for (let si = 0; si < visibleSeries.length; si++) {
          const s = visibleSeries[si];
          for (let i = 0; i < n; i++) {
            const p = s.points[i]; if (!p) continue;
            const isRange = (p.low != null && p.high != null);
            if (!inverted) {
              const groupW = (IW / n) * (1 - groupPadding * 2);
              const barW = (groupW / groupCount) * (1 - pointPadding * 2);
              const groupStart = catCenterX(i, n) - groupW / 2 + (groupW / groupCount) * si;
              const barX = groupStart + ((groupW / groupCount) - barW) / 2;
              let y0, y1, v;
              if (isRange) { y0 = yScale(p.high); y1 = yScale(p.low); v = p.high; }
              else if (p.y >= 0) { y0 = yScale(p.y); y1 = yScale(0); v = p.y; }
              else { y0 = yScale(0); y1 = yScale(p.y); v = p.y; }
              drawBar(s, p, barX, Math.min(y0,y1), barW, Math.abs(y1-y0), false, i, si, v, false);
            } else {
              const groupH = (IH / n) * (1 - groupPadding * 2);
              const barH = (groupH / groupCount) * (1 - pointPadding * 2);
              const groupStart = catCenterY(i, n) - groupH / 2 + (groupH / groupCount) * si;
              const barY = groupStart + ((groupH / groupCount) - barH) / 2;
              let x0, x1, v;
              if (isRange) { x0 = xScaleVal(p.low); x1 = xScaleVal(p.high); v = p.high; }
              else if (p.y >= 0) { x0 = xScaleVal(0); x1 = xScaleVal(p.y); v = p.y; }
              else { x0 = xScaleVal(p.y); x1 = xScaleVal(0); v = p.y; }
              drawBar(s, p, Math.min(x0,x1), barY, Math.abs(x1-x0), barH, true, i, si, v, false);
            }
          }
        }
      }

      drawValueAxisMarks();
      layoutCallouts();
    }

    // `callouts: [{ category, series, text, color }]` — `category` names an
    // xAxis category (or gives its index); `series` picks one bar out of a
    // group or stack, defaulting to the first series that has that category.
    function layoutCallouts() {
      const cos = opts.callouts || [];
      if (!cos.length || !barAnchors.length) return;
      const items = cos.map(co => {
        const key = calloutKey(co);
        const idx = (co.x != null && key == null) ? Number(co.x) : null;
        const matches = barAnchors.filter(a =>
          (key != null ? a.name === key : a.catIdx === idx) &&
          (co.series == null || a.series === co.series));
        const a = matches[0];
        return a ? { x: a.x, y: a.y, text: co.text, color: co.color } : null;
      }).filter(Boolean);
      // Columns grow upward, so their free room is the band across the top and
      // the leader drops straight down onto the bar. Horizontal bars grow
      // rightward, so the band is the gutter past their ends.
      const obstacles = barRects.concat(labelBoxes.map(b =>
        ({ x: b.x1, y: b.y1, w: b.x2 - b.x1, h: b.y2 - b.y1 })));
      drawCallouts(gAnnot, items, { x: M.l, y: M.t, w: IW, h: IH }, {
        mode: inverted ? 'right' : 'above',
        obstacles: obstacles,
        gutter: 8
      });
    }

    // ── Target / threshold marks on the value axis ──────────────────────
    // `yAxis.plotLines` and `yAxis.plotBands` — a labelled target, budget, or
    // break-even that bars can be read against. Drawn last, into gAxes, so the
    // mark sits above the bars: a target line hidden behind a bar is useless.
    // Orientation follows the chart — horizontal for columns, vertical for
    // bars — so the same config works for both.
    const DASH = { Solid: '', Dash: '6 4', ShortDash: '4 2', ShortDot: '1 3',
                   Dot: '2 4', LongDash: '10 5', DashDot: '8 3 2 3' };
    function drawValueAxisMarks() {
      const ax = opts.yAxis || {};
      const pos = v => inverted ? xScaleVal(v) : yScale(v);
      const clamp = v => Math.max(ranges.yMin, Math.min(ranges.yMax, v));

      (ax.plotBands || []).forEach(b => {
        if (b.from == null || b.to == null) return;
        const a = pos(clamp(b.from)), c = pos(clamp(b.to));
        const attrs = inverted
          ? { x: Math.min(a,c), y: M.t, width: Math.abs(c-a), height: IH }
          : { x: M.l, y: Math.min(a,c), width: IW, height: Math.abs(c-a) };
        el('rect', Object.assign(attrs, { fill: b.color || HIGHLIGHT,
          'fill-opacity': b.alpha != null ? b.alpha : 0.12 }), gAxes);
      });

      (ax.plotLines || []).forEach(pl => {
        if (pl.value == null) return;
        const p = pos(clamp(pl.value));
        const attrs = inverted
          ? { x1: p, x2: p, y1: M.t, y2: M.t + IH }
          : { x1: M.l, x2: M.l + IW, y1: p, y2: p };
        el('line', Object.assign(attrs, {
          stroke: pl.color || AXIS, 'stroke-width': pl.width || 1.5,
          'stroke-dasharray': DASH[pl.dashStyle || 'ShortDash'] || '4 2' }), gAxes);
        if (pl.label && pl.label.text) {
          // Label rides the end of the mark, inside the plot area.
          const la = inverted
            ? { x: p + 5, y: M.t + 12, 'text-anchor': 'start' }
            : { x: M.l + IW, y: p - 5, 'text-anchor': 'end' };
          txt(pl.label.text, Object.assign(la, { 'font-size': 10, 'font-weight': 700,
            fill: pl.color || AXIS, 'font-family': FONT }), gAxes);
        }
      });
    }

    // ── Scenario notation (IBCS) ────────────────────────────────────────
    // Encodes the *status* of a number — measured, planned, projected — in the
    // fill style rather than the hue, which leaves colour free to carry
    // emphasis. solid = actual · outlined = plan/budget · hatched = forecast.
    // Series-level via `series[i].scenario`, point-level via `point.scenario`
    // (so one series can turn from actual to forecast partway along).
    const hatchIds = {};
    function hatchFor(color) {
      if (hatchIds[color]) return hatchIds[color];
      const id = 'cc-hatch-' + Math.random().toString(36).slice(2);
      const pat = el('pattern', { id, width: 5, height: 5,
        patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
      el('rect', { width: 5, height: 5, fill: BG }, pat);
      el('rect', { width: 2.4, height: 5, fill: color }, pat);
      hatchIds[color] = id;
      return id;
    }
    // Returns the SVG paint attributes for a bar in the given scenario.
    function scenarioFill(scenario, color) {
      if (scenario === 'plan' || scenario === 'budget')
        return { fill: BG, stroke: color, 'stroke-width': 1.6 };
      if (scenario === 'forecast' || scenario === 'estimate')
        return { fill: `url(#${hatchFor(color)})`, stroke: color, 'stroke-width': 1 };
      return { fill: color };
    }

    function drawBar(s, p, x, y, w, h, isBar, catIdx, seriesIdx, valueForLabel, isStacked) {
      if (w <= 0) w = 0.5;
      if (h <= 0) h = 0.5;
      // The bar's outer end — the tip the reader's eye already goes to.
      barRects.push({ x: x, y: y, w: w, h: h });
      barAnchors.push({
        catIdx: catIdx, series: s.name,
        name: categories[catIdx] != null ? String(categories[catIdx]) : String(catIdx),
        // Column: just inside the top of the bar, since the value label sits
        // above it. Horizontal bar: just outside the end, since there the label
        // sits inside the bar.
        x: isBar ? (valueForLabel >= 0 ? x + w + 7 : x - 7) : x + w / 2,
        y: isBar
          ? y + h / 2
          : (valueForLabel >= 0 ? y + Math.min(7, h / 2) : y + h - Math.min(7, h / 2))
      });
      const barColor = pickColor(s, p);
      const scenario = p.scenario || s.scenario;
      const paint = scenarioFill(scenario, barColor);
      const isPyramid = (s.type === 'columnpyramid');
      let node;
      if (is3D && !isBar) {
        const d = depth3D, dx = d * 0.5, dy = -d * 0.4;
        const front = el('g', { class: 'bar', 'data-cat': catIdx, 'data-series': seriesIdx }, gBars);
        el('path', { d: `M ${x+w} ${y} L ${x+w+dx} ${y+dy} L ${x+w+dx} ${y+h+dy} L ${x+w} ${y+h} Z`,
          fill: darken(barColor, 0.25) }, front);
        el('path', { d: `M ${x} ${y} L ${x+dx} ${y+dy} L ${x+w+dx} ${y+dy} L ${x+w} ${y} Z`,
          fill: lighten(barColor, 0.15) }, front);
        el('rect', Object.assign({ x, y, width: w, height: h }, paint), front);
        node = front;
      } else if (isPyramid && !isBar) {
        const cx = x + w/2;
        const yBase = ranges.yMin < 0 ? yScale(0) : (y + h);
        node = el('polygon', Object.assign({ points: `${x},${yBase} ${x+w},${yBase} ${cx},${y}`,
          class: 'bar', 'data-cat': catIdx, 'data-series': seriesIdx }, paint), gBars);
      } else {
        node = el('rect', Object.assign({ x, y, width: w, height: h,
          class: 'bar', 'data-cat': catIdx, 'data-series': seriesIdx }, paint), gBars);
      }

      // Data labels â€” clean-charts style
      if (s.dataLabels && s.dataLabels.enabled) {
        const val = (p.y != null) ? p.y : (p.high != null ? `${p.low}â€“${p.high}` : '');
        const label = s.dataLabels.format
          ? String(s.dataLabels.format).replace('{y}', Math.abs(val))
          : (typeof val === 'number' ? fmtY(Math.abs(val)) : val);

        // Estimated label width â€” the engines size text without measuring it.
        const labelW = String(label).length * F_VALUE * 0.60;

        if (!isBar) {
          const side = segsPerSide[catIdx] || { pos: 0, neg: 0 };
          const stackedNeighbour = isStacked &&
            (valueForLabel >= 0 ? side.pos : side.neg) > 1;
          if (stackedNeighbour) {
            // Inside the segment: above it is where the NEXT segment sits, so
            // an above-bar label would land on its neighbour. Segments too
            // short to hold the number simply go unlabelled.
            if (h >= F_VALUE + 6) {
              txt(label, { x: x + w / 2, y: y + h / 2 + F_VALUE * 0.36, 'text-anchor': 'middle',
                'font-size': F_VALUE, 'font-weight': 700, fill: contrastText(barColor),
                'font-family': FONT }, gLabels);
            }
          } else if (placeLabel(x + w / 2, y - 6, label, 'middle')) {
            // Value ABOVE bar
            txt(label, { x: x + w / 2, y: y - 6, 'text-anchor': 'middle',
              'font-size': F_VALUE, 'font-weight': VAL_FW, fill: VAL_COL, 'font-family': FONT }, gLabels);
          }
        } else if (isStacked) {
          const side = segsPerSide[catIdx] || { pos: 0, neg: 0 };
          const alone = (valueForLabel >= 0 ? side.pos : side.neg) <= 1;
          const ly = y + h / 2 + 4;
          if (alone) {
            // Population-pyramid shape: the label sits at the bar's outer end â€”
            // the right tip for a positive value, the left tip for a negative
            // one â€” inside the bar when it fits, just outside when it does not.
            const outward = valueForLabel < 0;
            if (w >= labelW + 12) {
              txt(label, { x: outward ? x + 6 : x + w - 6, y: ly,
                'text-anchor': outward ? 'start' : 'end',
                'font-size': F_VALUE, 'font-weight': 700, fill: contrastText(barColor),
                'font-family': FONT }, gLabels);
            } else {
              const lx = outward ? x - 6 : x + w + 6;
              if (placeLabel(lx, ly, label, outward ? 'end' : 'start')) {
                txt(label, { x: lx, y: ly, 'text-anchor': outward ? 'end' : 'start',
                  'font-size': F_VALUE, 'font-weight': VAL_FW, fill: VAL_COL,
                  'font-family': FONT }, gLabels);
              }
            }
          } else if (w >= labelW + 12) {
            // Several segments on this side: the only honest place for the
            // number is inside the segment it belongs to.
            txt(label, { x: x + w / 2, y: ly, 'text-anchor': 'middle',
              'font-size': F_VALUE, 'font-weight': 700, fill: contrastText(barColor),
              'font-family': FONT }, gLabels);
          }
        } else {
          // Value at right end of bar; inside-white if long enough, else outside-dark
          const total = xScaleVal(ranges.yMax) - xScaleVal(ranges.yMin);
          const threshold = total * 0.15;
          // An outlined (plan) bar has no fill to sit a label on, so it always
          // takes the outside placement regardless of length.
          if (w >= threshold && paint.fill !== BG) {
            txt(label, { x: x + w - 6, y: y + h/2 + 4, 'text-anchor': 'end',
              'font-size': F_VALUE, 'font-weight': 700, fill: contrastText(barColor), 'font-family': FONT }, gLabels);
          } else if (placeLabel(x + w + 6, y + h/2 + 4, label, 'start')) {
            txt(label, { x: x + w + 6, y: y + h/2 + 4, 'text-anchor': 'start',
              'font-size': F_VALUE, 'font-weight': VAL_FW, fill: VAL_COL, 'font-family': FONT }, gLabels);
          }
        }
      }
    }

    function pickColor(s, p) {
      if (p.color) return p.color;
      if (s.negativeColor && p.y != null && p.y < 0) return s.negativeColor;
      return s.color;
    }

    // Interaction â€” shared tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `position:absolute;pointer-events:none;background:${BG};border:1px solid #bbb;border-radius:4px;padding:6px 8px;font:12px ${FONT};box-shadow:1px 1px 3px rgba(0,0,0,0.12);display:none;white-space:nowrap;z-index:10;`;
    container.appendChild(tooltip);

    const crosshair = el('rect', { x: 0, y: 0, width: 0, height: 0,
      fill: '#000', 'fill-opacity': 0.04, style: 'display:none;pointer-events:none' }, gInteract);

    function onMove(evt) {
      const rect = svg.getBoundingClientRect();
      const px = evt.clientX - rect.left, py = evt.clientY - rect.top;
      if (px < M.l || px > M.l + IW || py < M.t || py > M.t + IH) { hideTooltip(); return; }
      const n = categories.length || (seriesDefs[0] ? seriesDefs[0].points.length : 0);
      let idx;
      if (!inverted) idx = Math.min(n-1, Math.max(0, Math.floor((px - M.l) / (IW/n))));
      else idx = Math.min(n-1, Math.max(0, Math.floor((py - M.t) / (IH/n))));
      if (!inverted) {
        crosshair.setAttribute('x', M.l + (idx / n) * IW);
        crosshair.setAttribute('y', M.t);
        crosshair.setAttribute('width', IW / n);
        crosshair.setAttribute('height', IH);
      } else {
        crosshair.setAttribute('x', M.l);
        crosshair.setAttribute('y', M.t + (idx / n) * IH);
        crosshair.setAttribute('width', IW);
        crosshair.setAttribute('height', IH / n);
      }
      crosshair.style.display = 'block';
      const header = categories[idx] != null ? String(categories[idx]) : String(idx);
      let html = `<div style="font-size:12px;font-weight:700;color:${TITLE_COL};margin-bottom:2px">${esc(header)}</div>`;
      seriesDefs.forEach(s => {
        if (!s.visible) return;
        const p = s.points[idx]; if (!p) return;
        let val;
        if (p.low != null && p.high != null) val = `${formatValue(p.low, s)} â€“ ${formatValue(p.high, s)}`;
        else if (p.y != null) val = formatValue(Math.abs(p.y), s);
        else return;
        html += `<div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:9px;height:9px;background:${s.color};border-radius:2px"></span><span style="color:${LABEL_COL}">${esc(s.name)}: </span><b style="color:${TITLE_COL}">${esc(val)}</b></div>`;
      });
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
      let tx = px + 14, ty = py - th/2;
      if (tx + tw > W - 4) tx = px - tw - 14;
      if (ty < 4) ty = 4;
      if (ty + th > H - 4) ty = H - th - 4;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    }
    function hideTooltip() {
      crosshair.style.display = 'none';
      tooltip.style.display = 'none';
    }
    svg.addEventListener('mousemove', onMove);
    svg.addEventListener('mouseleave', hideTooltip);

    // â”€â”€ Top legend (below subtitle) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function renderLegend() {
      gLegend.innerHTML = '';
      if (!legendEnabled) return;
      const startY = titleBlockH + 2;
      const availW = W - 40;
      legendLayout.rows.forEach((row, ri) => {
        const rowW = row.reduce((s, c) => s + c.w, 0) - LEG_GAP;
        const rowStartX = 20;
        row.forEach(cell => {
          const s = seriesDefs.find(x => x.name === cell.item.name);
          if (!s) return;
          const x = rowStartX + cell.x;
          const y = startY + ri * LEG_ROW;
          const gr = el('g', { class: 'lg-item', style: 'cursor:pointer' }, gLegend);
          el('rect', { x: x - 2, y: y - 2, width: cell.w, height: LEG_ROW - 2, fill: 'transparent' }, gr);
          // The swatch carries the scenario notation too — a legend showing a
          // solid block for a hatched forecast series misreports the data.
          el('rect', Object.assign({ x, y: y + 2, width: LEG_ICON, height: LEG_ICON, rx: 2 },
            s.visible ? scenarioFill(s.scenario, s.color) : { fill: '#ccc' }), gr);
          txt(s.name, { x: x + LEG_ICON + LEG_ICON_GAP, y: y + 12,
            'font-size': F_LEG, 'font-weight': 600,
            fill: s.visible ? (s.legendColor || TITLE_COL) : '#ccc',
            'text-decoration': s.visible ? 'none' : 'line-through',
            'font-family': FONT }, gr);
          gr.addEventListener('click', () => {
            s.visible = !s.visible;
            render(); renderLegend();
          });
        });
      });
    }

    render();
    renderLegend();

    return {
      redraw: () => { render(); renderLegend(); },
      getSeries: () => seriesDefs
    };
  }

    Charts.column = Chart;
  Charts._barBase = Chart;
})();


Charts.bar = function (container, opts) {
  opts = opts || {}; opts.chart = opts.chart || {}; opts.chart.type = 'bar';
  return Charts._barBase(container, opts);
};

// ─── donut / pie ────────────────────────────────────────────────────

/*
 * Clean-charts-styled donut chart engine.
 * Matches clean_charts/plots/donut.py:
 *  - Cream bg, Inter, top-left title/subtitle
 *  - Black → blue gradient wedges (get_gradient_colors)
 *  - BG-colored 2px separators between wedges (cutout look)
 *  - Callout: radial-out → diagonal-to-elbow → horizontal-to-label-column
 *  - Fixed label columns at outer chart margins (left/right)
 *  - Two-line label: bold category name above, lighter value below
 *  - Iterative relaxation to avoid label overlap
 *  - Optional bold center label
 * Interactions preserved: hover slice → highlight + tooltip; click → explode.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  let BG, AXIS, TITLE_COL, SUB_COL, LABEL_COL, CALLOUT_COL, CONNECT_COL, CONNECT_W, START_COL, END_COL;
  let CAT_COL, CAT_FW, TICK_COL, TICK_FW, VAL_COL, VAL_FW;
  let FONT, F_TITLE, F_SUB, F_LABEL, F_VALUE, F_CENTER;
  function applyTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    BG = t.bg || '#f4f3f0';
    AXIS = t.axis || '#000000';
    TITLE_COL = t.titleColor || '#111111';
    SUB_COL = t.subtitleColor || '#666666';
    LABEL_COL = t.labelColor || '#333333';
    CALLOUT_COL = t.connectorLabel || '#555555';
    // The connector rule carries the label, so it is drawn darker and heavier
    // than the old hairline; both are theme tokens.
    CONNECT_COL = t.connectorLine || t.labelColor || '#333333';
    CONNECT_W = t.connectorWidth != null ? t.connectorWidth : 1.4;
    START_COL = t.gradientStart || '#000000';
    END_COL = t.gradientEnd || '#2323FF';
    // Shared text roles — see the hierarchy comment in theme.js.
    CAT_COL = t.categoryColor || TITLE_COL;
    CAT_FW = t.categoryWeight != null ? t.categoryWeight : 600;
    TICK_COL = t.tickColor || LABEL_COL;
    TICK_FW = t.tickWeight != null ? t.tickWeight : 400;
    VAL_COL = t.valueColor || TITLE_COL;
    VAL_FW = t.valueWeight != null ? t.valueWeight : 700;
    FONT = t.font || "'Inter','Segoe UI',Arial,Helvetica,sans-serif";
    F_TITLE = t.titleSize != null ? t.titleSize : 17;
    F_SUB = t.subtitleSize != null ? t.subtitleSize : 12;
    F_LABEL = t.labelSize != null ? t.labelSize : 11.5;
    F_VALUE = t.valueSize != null ? t.valueSize : 11;
    F_CENTER = t.centerSize != null ? t.centerSize : 14;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, attrs, parent) {
    const e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }

  // ── Heading wrapping ────────────────────────────────────────────────
  // Titles wrap to at most 2 lines, subtitles to at most 3; whatever does
  // not fit is clipped with an ellipsis. Widths are estimated (not measured)
  // so the whole layout can be decided before anything hits the DOM.
  function _headW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.58 : 0.53);
  }
  function _clipLine(str, fontSize, maxW, bold) {
    let s = String(str);
    if (_headW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && _headW(s + '…', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s.,;:]+$/, '') + '…';
  }
  function wrapHeading(str, fontSize, maxW, maxLines, bold) {
    const words = String(str == null ? '' : str).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i];
      if (_headW(next, fontSize, bold) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    lines.push(cur);
    if (lines.length > maxLines) {
      const tail = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(_clipLine(tail, fontSize, maxW, bold));
    }
    return lines.map(l => _clipLine(l, fontSize, maxW, bold));
  }
  const TITLE_LINES = 2, SUB_LINES = 3, TITLE_LH = 21, SUB_LH = 16;
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function addCommas(n) {
    // Strip binary-float noise before stringifying: 25.999999999999996 -> 26,
    // 0.30000000000000004 -> 0.3. Values like these arrive whenever a chart is
    // fed a computed share or a summed column, and String() renders every
    // artefact digit. 12 significant figures sits well inside double
    // precision, so genuine values are untouched while accumulated ~1e-15
    // error rounds away.
    if (typeof n === 'number' && isFinite(n)) n = +n.toPrecision(12);
    const s = String(n);
    const neg = s.startsWith('-') ? '-' : '';
    const abs = neg ? s.slice(1) : s;
    const dot = abs.indexOf('.');
    const intPart = dot < 0 ? abs : abs.slice(0, dot);
    const fracPart = dot < 0 ? '' : abs.slice(dot);
    return neg + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fracPart;
  }
  function hex2rgb(hex) {
    const c = hex.replace('#','');
    const n = parseInt(c.length === 3 ? c.split('').map(x=>x+x).join('') : c, 16);
    return [(n>>16)&255,(n>>8)&255,n&255];
  }
  function rgb2hex(r,g,b) {
    return '#' + [r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  }
  function gradientColors(startHex, endHex, n) {
    if (n <= 0) return [];
    if (n === 1) return [startHex];
    const [r1,g1,b1] = hex2rgb(startHex);
    const [r2,g2,b2] = hex2rgb(endHex);
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      out.push(rgb2hex(r1+(r2-r1)*t, g1+(g2-g1)*t, b1+(b2-b1)*t));
    }
    return out;
  }
  function lighten(hex, amt) {
    const [r,g,b] = hex2rgb(hex);
    return rgb2hex(r + (255-r)*amt, g + (255-g)*amt, b + (255-b)*amt);
  }
  function darken(hex, amt) {
    const [r,g,b] = hex2rgb(hex);
    return rgb2hex(r*(1-amt), g*(1-amt), b*(1-amt));
  }

  function parseSize(v, ref) {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    const s = String(v).trim();
    if (s.endsWith('%')) return (parseFloat(s) / 100) * ref;
    return parseFloat(s);
  }

  function arcSegment(cx, cy, rOuter, rInner, a0, a1) {
    if (a1 - a0 >= Math.PI * 2 - 1e-6) {
      const x1 = cx + rOuter, y1 = cy;
      const x2 = cx - rOuter, y2 = cy;
      let d = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 1 1 ${x2} ${y2} A ${rOuter} ${rOuter} 0 1 1 ${x1} ${y1}`;
      if (rInner > 0) {
        const ix1 = cx + rInner, iy1 = cy;
        const ix2 = cx - rInner, iy2 = cy;
        d += ` M ${ix1} ${iy1} A ${rInner} ${rInner} 0 1 0 ${ix2} ${iy2} A ${rInner} ${rInner} 0 1 0 ${ix1} ${iy1} Z`;
      } else d += ' Z';
      return d;
    }
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const x1 = cx + rOuter * Math.cos(a0), y1 = cy + rOuter * Math.sin(a0);
    const x2 = cx + rOuter * Math.cos(a1), y2 = cy + rOuter * Math.sin(a1);
    if (rInner > 0) {
      const ix2 = cx + rInner * Math.cos(a1), iy2 = cy + rInner * Math.sin(a1);
      const ix1 = cx + rInner * Math.cos(a0), iy1 = cy + rInner * Math.sin(a0);
      return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}
              L ${ix2} ${iy2} A ${rInner} ${rInner} 0 ${large} 0 ${ix1} ${iy1} Z`;
    }
    return `M ${cx} ${cy} L ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  // ---------------- main ----------------
  // ── callouts ────────────────────────────────────────────────────────────
  // A callout is an anchor dot on the mark, a leader, and a paragraph box.
  // The block is shared by every engine (each is its own IIFE) so a note reads
  // the same everywhere, but *where* the box goes is the engine's call: a
  // column chart puts its notes in a band above the bars, a horizontal bar
  // chart in the gutter past the bar ends, a scatter in the emptiest corner
  // near the point. Passing the marks in as `obstacles` is what keeps a box
  // off the data instead of merely off the other boxes.
  //
  //   drawCallouts(g, items, bounds, {
  //     mode: 'above' | 'right' | 'radial' | 'auto',
  //     obstacles: [{ x, y, w, h }],   // rects the box must not cover
  //     center: { x, y },              // radial mode: what to push away from
  //     gutter: 12                     // band/gutter thickness for above/right
  //   })
  //
  // Placement stays deterministic — candidates are tried in a fixed order —
  // so re-rendering the same data puts every box back where it was.
  const CALLOUT_PAD = 6;          // clearance between a box and anything else
  const CALLOUT_LEAD = 14;        // shortest leader worth drawing

  const CALLOUT_OFFSETS = [
    [ 32, -60], [-32, -60], [ 32, -110], [-32, -110],
    [ 60, -30], [-60, -30], [ 32,  30], [-32,  30],
    [ 60,  30], [-60,  30], [ 32, -160], [-32, -160]
  ];

  function calloutTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    return {
      accent: t.callout || '#e3120b',
      text: t.labelColor || '#333333',
      inverse: t.inverseText || '#FFFFFF',
      bg: t.bg || '#f4f3f0'
    };
  }

  function measureCalloutBox(text) {
    const lines = String(text).split('\n');
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + 16);
    const h = lines.length * 13 + 16;
    return { w: w, h: h };
  }

  // Total area of a rect that lands on top of anything it should not.
  function calloutOverlap(r, rects) {
    let sum = 0;
    for (let i = 0; i < rects.length; i++) {
      const o = rects[i];
      const dx = Math.min(r.x + r.w + CALLOUT_PAD, o.x + o.w) - Math.max(r.x - CALLOUT_PAD, o.x);
      const dy = Math.min(r.y + r.h + CALLOUT_PAD, o.y + o.h) - Math.max(r.y - CALLOUT_PAD, o.y);
      if (dx > 0 && dy > 0) sum += dx * dy;
    }
    return sum;
  }

  function calloutInBounds(r, b) {
    return r.x >= b.x + 2 && r.y >= b.y + 2 &&
           r.x + r.w <= b.x + b.w - 2 && r.y + r.h <= b.y + b.h - 2;
  }

  function drawCalloutBox(g, bx, by, text, edge) {
    const th = calloutTheme();
    const lines = String(text).split('\n');
    const lh = 13, pad = 8;
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + pad * 2);
    const h = lines.length * lh + pad * 2;
    el('rect', { x: bx, y: by, width: w, height: h, rx: 6, ry: 6,
      fill: th.bg, 'fill-opacity': 0.94, stroke: edge, 'stroke-width': 0.8 }, g);
    lines.forEach((ln, i) => {
      txt(ln, { x: bx + pad, y: by + pad + (i + 1) * lh - 3, 'font-size': 10,
        fill: th.text, 'font-family': FONT }, g);
    });
  }

  // Leader from the anchor to the box. Straight when the box sits diagonally
  // from the mark; an elbow when it sits squarely above or beside it, so the
  // line reads as a pointer rather than as another data mark.
  function drawCalloutLeader(g, ax, ay, box, color, mode) {
    const midX = box.x + box.w / 2, midY = box.y + box.h / 2;
    if (mode === 'above' || mode === 'below') {
      const edgeY = mode === 'above' ? box.y + box.h : box.y;
      const stem = mode === 'above' ? edgeY + 8 : edgeY - 8;
      const cx = Math.max(box.x + 8, Math.min(box.x + box.w - 8, ax));
      const d = 'M ' + ax + ' ' + ay + ' L ' + ax + ' ' + stem +
                ' L ' + cx + ' ' + stem + ' L ' + cx + ' ' + edgeY;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    if (mode === 'right' || mode === 'left') {
      const edgeX = mode === 'right' ? box.x : box.x + box.w;
      const stem = mode === 'right' ? edgeX - 8 : edgeX + 8;
      const cy = Math.max(box.y + 8, Math.min(box.y + box.h - 8, ay));
      const d = 'M ' + ax + ' ' + ay + ' L ' + stem + ' ' + ay +
                ' L ' + stem + ' ' + cy + ' L ' + edgeX + ' ' + cy;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    let lx = midX, ly = midY;
    if (ax < box.x) lx = box.x;
    else if (ax > box.x + box.w) lx = box.x + box.w;
    if (ay < box.y) ly = box.y;
    else if (ay > box.y + box.h) ly = box.y + box.h;
    el('line', { x1: ax, y1: ay, x2: lx, y2: ly, stroke: color, 'stroke-width': 1.2 }, g);
  }

  function drawCallouts(g, items, bounds, cfg) {
    if (!items || !items.length) return;
    cfg = cfg || {};
    const mode = cfg.mode || 'auto';
    const obstacles = (cfg.obstacles || []).slice();
    const th = calloutTheme();
    const placed = [];
    const gutter = cfg.gutter != null ? cfg.gutter : 10;

    // Sorting by the axis the band runs along keeps leaders from crossing.
    const ordered = items.slice().sort((a, b) =>
      (mode === 'right' || mode === 'left') ? a.y - b.y : a.x - b.x);

    ordered.forEach(it => {
      const box = measureCalloutBox(it.text);
      const color = it.color || th.accent;
      const blocked = obstacles.concat(placed);
      let best = null, bestCost = Infinity, leader = mode;

      const consider = (x, y, penalty, leadMode) => {
        const r = { x: x, y: y, w: box.w, h: box.h };
        if (!calloutInBounds(r, bounds)) return;
        const cost = calloutOverlap(r, blocked) + (penalty || 0);
        if (cost < bestCost) { bestCost = cost; best = r; leader = leadMode || mode; }
      };

      if (mode === 'above' || mode === 'below') {
        // Band across the top (or bottom): the box keeps to the headroom the
        // engine reserved, and slides sideways from the anchor until it is
        // clear. Distance from the anchor is the tie-breaker, so a note stays
        // over the mark it belongs to whenever the room is there.
        const bandY = mode === 'above'
          ? bounds.y + gutter
          : bounds.y + bounds.h - gutter - box.h;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
          consider(it.x - box.w / 2 + dx, bandY, Math.abs(dx) * 0.5, mode);
        }
        // Second row under the first when the band is full.
        if (bestCost > 0) {
          const row2 = mode === 'above' ? bandY + box.h + CALLOUT_PAD
                                        : bandY - box.h - CALLOUT_PAD;
          for (let step = 0; step <= 24; step++) {
            const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
            consider(it.x - box.w / 2 + dx, row2, 400 + Math.abs(dx) * 0.5, mode);
          }
        }
      } else if (mode === 'right' || mode === 'left') {
        // Gutter past the ends of the bars, one box per row, aligned with the
        // row it annotates.
        const colX = mode === 'right'
          ? bounds.x + bounds.w - gutter - box.w
          : bounds.x + gutter;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dy = Math.ceil(step / 2) * 14 * (step % 2 ? 1 : -1);
          consider(colX, it.y - box.h / 2 + dy, Math.abs(dy) * 0.5, mode);
        }
      } else if (mode === 'radial' && cfg.center) {
        // Push out from the middle of the ring or cluster, so the leader reads
        // as a spoke. Straight out is preferred, but the fan of angles around
        // it matters: a wedge pointing into a crowded side still has a clear
        // diagonal to reach for, and a spoke 30° off still reads as a spoke.
        const vx = it.x - cfg.center.x, vy = it.y - cfg.center.y;
        const base = Math.atan2(vy, vx);
        const FAN = [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31];
        for (let f = 0; f < FAN.length && bestCost > 0; f++) {
          const a = base + FAN[f];
          for (let d = 30; d <= 260 && bestCost > 0; d += 14) {
            const px = it.x + Math.cos(a) * d, py = it.y + Math.sin(a) * d;
            consider(px - box.w / 2, py - box.h / 2,
              d * 0.4 + Math.abs(FAN[f]) * 90, 'auto');
          }
        }
      }

      // Ladder of diagonal offsets: the general fallback, and the default for
      // charts with no obvious free direction (line, scatter).
      if (bestCost > 0) {
        for (let i = 0; i < CALLOUT_OFFSETS.length; i++) {
          const ox = CALLOUT_OFFSETS[i][0], oy = CALLOUT_OFFSETS[i][1];
          consider(ox >= 0 ? it.x + ox : it.x + ox - box.w,
                   oy < 0 ? it.y + oy - box.h : it.y + oy,
                   (mode === 'auto' ? 0 : 800) + i * 2, 'auto');
        }
      }

      if (!best) {
        // Nothing fits: clamp inside and accept the overlap rather than drop a
        // note the author wrote.
        best = {
          x: Math.max(bounds.x + 2, Math.min(bounds.x + bounds.w - box.w - 2, it.x - box.w / 2)),
          y: Math.max(bounds.y + 2, Math.min(bounds.y + bounds.h - box.h - 2, it.y - box.h - 20)),
          w: box.w, h: box.h
        };
        leader = 'auto';
      }
      placed.push(best);

      drawCalloutLeader(g, it.x, it.y, best, color, leader);
      el('circle', { cx: it.x, cy: it.y, r: 4.5, fill: color,
        stroke: th.inverse, 'stroke-width': 1 }, g);
      drawCalloutBox(g, best.x, best.y, it.text, color);
    });
  }

  // Match a callout to a named thing: `name`, `category`, `point`, `code` and
  // `label` are all accepted so the key reads naturally per chart type.
  function calloutKey(co) {
    const k = co.name != null ? co.name
      : co.category != null ? co.category
      : co.point != null ? co.point
      : co.code != null ? co.code
      : co.label != null ? co.label
      : co.row != null ? co.row
      : co.panel != null ? co.panel : null;
    return k == null ? null : String(k);
  }

  function Chart(container, opts) {
    applyTheme();
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.fontFamily = FONT;
    container.style.background = BG;

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 500;
    const chartOpts = opts.chart || {};
    const plotOpts = (opts.plotOptions && opts.plotOptions.pie) || {};

    const isSemi = plotOpts.startAngle != null && plotOpts.endAngle != null &&
      Math.abs((plotOpts.endAngle - plotOpts.startAngle) - 180) < 1e-6;

    const hasTitle = !!opts.title;
    const hasSub = !!opts.subtitle;
    // Auto-show legend when there are multiple wedges (each with its own color/name);
    // caller can force off with legend:{enabled:false}.
    const allData = (opts.series && opts.series[0] && opts.series[0].data) || [];

    // ── Reject negative and non-finite slices ───────────────────────────
    // A donut shows parts of a whole, so a negative part has no meaning: it
    // would shrink the total that every other wedge is measured against and
    // sweep its own arc backwards over its neighbour. Drawing |y| instead
    // would be worse — it makes -10 indistinguishable from +10. So such
    // points are dropped from the geometry, the total, and the legend. The
    // developer is told once, by name, on the console; the *reader* is told on
    // the chart itself, by a footnote — otherwise a donut that silently omits
    // a category looks like a complete picture of the data, which is the same
    // misreading that drawing |y| would cause.
    function pointValue(p) {
      const y = Array.isArray(p) ? p[1] : (p && typeof p === 'object' ? p.y : p);
      return +y;
    }
    function pointName(p, i) {
      if (Array.isArray(p)) return p[0];
      if (p && typeof p === 'object') return p.name || 'Slice ' + (i + 1);
      return String(i);
    }
    const dropped = [];
    const rawData = allData.filter((p, i) => {
      const y = pointValue(p);
      if (Number.isFinite(y) && y >= 0) return true;
      dropped.push({ name: pointName(p, i), raw: Array.isArray(p) ? p[1] : (p && typeof p === 'object' ? p.y : p) });
      return false;
    });
    const droppedNames = dropped.map(d => d.name + ' (' + d.raw + ')');
    if (dropped.length && typeof console !== 'undefined' && console.warn) {
      console.warn('[charts-lib donut] Dropped ' + dropped.length +
        ' slice(s) with a negative or non-finite value, which a part-to-whole chart cannot represent: ' +
        droppedNames.join(', ') + '.');
    }

    // On-chart footnote. Names the omitted categories while the list is short
    // enough to fit on one line; past that it falls back to a count, since a
    // truncated list is worse than an honest total. Suppressed with
    // plotOptions.pie.droppedNote = false.
    const F_NOTE = 11;
    const noteEnabled = !(plotOpts.droppedNote === false);
    let droppedNote = '';
    if (dropped.length && noteEnabled) {
      const suffix = plotOpts.valueSuffix || '';
      const listed = dropped.map(d => d.name + ' (' + d.raw + suffix + ')').join(', ');
      const long = 'Not shown: ' + listed + ' — negative values can’t be part of a whole';
      const short = 'Not shown: ' + dropped.length +
        (dropped.length === 1 ? ' slice with a negative value' : ' slices with negative values');
      droppedNote = (long.length * F_NOTE * 0.5 <= W - 40) ? long : short;
    }
    const noteH = droppedNote ? F_NOTE + 10 : 0;

    const legendDefault = rawData.length > 1;
    const legendEnabled = (opts.legend && opts.legend.enabled != null)
      ? !!opts.legend.enabled : legendDefault;

    // Uniform outer margin (clean-charts uses ~40px)
    const marginPx = 22;
    const titleLines = hasTitle
      ? wrapHeading(opts.title, F_TITLE, W - 40, TITLE_LINES, true) : [];
    const subLines = hasSub
      ? wrapHeading(opts.subtitle, F_SUB, W - 40, SUB_LINES, false) : [];
    const subY0 = 34 + (titleLines.length ? (titleLines.length - 1) * TITLE_LH + 20 : 0);
    const titleBlockH = (hasTitle ? 24 + (titleLines.length - 1) * TITLE_LH : 0)
                      + (hasSub ? 22 + (subLines.length - 1) * SUB_LH : 0) + 18;

    const svg = el('svg', { xmlns: NS, width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.background = BG;
    svg.style.display = 'block';
    container.appendChild(svg);

    // Title & subtitle top-left
    const titleX = 20;
    titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: 34 + i * TITLE_LH, 'text-anchor': 'start',
      'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, svg));
    subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * SUB_LH, 'text-anchor': 'start',
      'font-size': F_SUB, fill: SUB_COL, 'font-family': FONT }, svg));

    // ── Legend layout (top, below subtitle, wraps to multiple rows) ─────
    const F_LEG = 12, LEG_ROW = 20, LEG_GAP = 18, LEG_ICON = 12, LEG_ICON_GAP = 6;
    function layoutLegend(items, availW) {
      const widths = items.map(it => LEG_ICON + LEG_ICON_GAP + Math.ceil(it.name.length * F_LEG * 0.55) + LEG_GAP);
      const rows = [];
      let cur = [], curX = 0;
      for (let i = 0; i < items.length; i++) {
        if (cur.length && curX + widths[i] > availW) { rows.push(cur); cur = []; curX = 0; }
        cur.push({ item: items[i], x: curX, w: widths[i] });
        curX += widths[i];
      }
      if (cur.length) rows.push(cur);
      return { rows, height: rows.length * LEG_ROW };
    }
    const availLegendW = W - marginPx * 2;
    const legendLayout = legendEnabled
      ? layoutLegend(rawData.map((d, i) => {
          let name;
          if (Array.isArray(d)) name = d[0];
          else if (typeof d === 'object') name = d.name || 'Slice ' + (i + 1);
          else name = String(i);
          return { name };
        }), availLegendW)
      : { rows: [], height: 0 };
    const rawLegendZone = legendLayout.height + (legendEnabled ? 18 : 0);

    // The footnote takes its space out of the plot box, so the ring and the
    // stacked callouts shrink to make room rather than colliding with it.
    const chartBottom = H - marginPx - noteH;
    const chartLeft = marginPx;
    const chartRight = W - marginPx;
    const chartW = chartRight - chartLeft;

    const cx = chartLeft + chartW / 2;
    let cy;
    let baseR;

    // ── Connector-label budget ──────────────────────────────────────────
    // Every wedge always gets a callout unless the caller turns labels off.
    // What adapts is how much room they take: two-line blocks first, then
    // one-line blocks, then progressively smaller type, and — when the box is
    // still too tight — the legend is dropped, since it only repeats the names
    // the callouts already carry.
    const userLabels = (plotOpts.dataLabels === false ||
      (plotOpts.dataLabels && plotOpts.dataLabels.enabled === false)) ? 'off' : 'on';

    const TWO_LINE_H = 40, ONE_LINE_H = 24;
    // clean-charts callout stub, as fractions of the outer radius.
    const CALLOUT_GAP = 0.08, CALLOUT_LEN = 0.12;
    // The elbow sits 40% of the way from the ring edge to the label column,
    // shared by every label on that side so all the kinks line up.
    const ELBOW_FRAC = 0.40;
    const perSide = Math.max(1, Math.ceil(rawData.length / 2));

    // Label columns are measured from the text they will actually hold, not a
    // flat fraction of the width. Short labels ("A", "30") therefore leave the
    // donut nearly the whole box, which is what makes the callouts read as
    // annotations on a large ring rather than a small ring wedged between two
    // wide gutters.
    const totalForPct = rawData.reduce((sum, p) => {
      const y = Array.isArray(p) ? p[1] : (p && typeof p === 'object' ? p.y : p);
      return sum + (+y || 0);
    }, 0) || 1;
    let widestName = 0, widestValue = 0, widestPair = 0;
    rawData.forEach((p, i) => {
      const name = Array.isArray(p) ? p[0] : ((p && p.name) || ('Slice ' + (i + 1)));
      const y = Array.isArray(p) ? p[1] : (p && typeof p === 'object' ? p.y : p);
      const valueStr = plotOpts.showPercentages
        ? ((+y || 0) / totalForPct * 100).toFixed(1) + '%'
        : addCommas(+y || 0) + (plotOpts.valueSuffix || '');
      const nw = String(name).length * F_LABEL * 0.62;
      const vw = valueStr.length * F_VALUE * 0.6;
      widestName = Math.max(widestName, nw);
      widestValue = Math.max(widestValue, vw);
      widestPair = Math.max(widestPair, nw + vw + 10);
    });
    const showConnectorLabels = userLabels !== 'off';

    // Degrade in this order, taking the first option that fits:
    //   two-line blocks → one-line blocks → drop the legend → name-only
    //   labels → shrink the type (floor 0.72).
    // Something is always drawn; only the amount of detail gives way.
    const vRoomFor = zone => (chartBottom - (titleBlockH + zone + 8)) - 24;
    const textWidthFor = mode =>
      mode === 'two' ? Math.max(widestName, widestValue)
      : mode === 'one' ? widestPair
      : mode === 'value' ? widestValue
      : widestName;
    const CONNECT_RUN = 44;              // flat run reserved beside the text
    const capPadFor = mode => chartW * (mode === 'two' ? 0.30 : 0.40);

    let legendZone = rawLegendZone;
    let labelMode = 'two';
    let labelScale = 1;
    if (showConnectorLabels) {
      const attempts = [];
      [rawLegendZone, 0].forEach(zone => {
        ['two', 'one', 'name'].forEach(mode => {
          // Two-line blocks want to sit comfortably (75% of the column);
          // tighter modes may use all of it.
          const blockH = mode === 'two' ? TWO_LINE_H : ONE_LINE_H;
          const room = vRoomFor(zone) * (mode === 'two' ? 0.75 : 1);
          const fitsV = perSide * blockH <= room;
          const fitsH = textWidthFor(mode) + CONNECT_RUN <= capPadFor(mode);
          attempts.push({ zone, mode, ok: fitsV && fitsH });
        });
      });
      const win = attempts.find(a => a.ok);
      if (win) {
        legendZone = win.zone;
        labelMode = win.mode;
        // A name-only callout next to a legend says the same thing twice. Let
        // the legend keep the names and give the callouts the values instead —
        // which are narrower, so the ring grows too.
        if (win.mode === 'name' && win.zone > 0) labelMode = 'value';
      } else {
        // Nothing fits at full size: keep the most compact layout, drop the
        // legend (the callouts already carry the names) and shrink the type
        // until both the stack and the column fit.
        legendZone = (opts.legend && opts.legend.enabled === true) ? rawLegendZone : 0;
        labelMode = 'name';
        const vScale = vRoomFor(legendZone) / (perSide * ONE_LINE_H);
        const hScale = (capPadFor('name') - CONNECT_RUN) / Math.max(1, textWidthFor('name'));
        labelScale = Math.max(0.72, Math.min(1, vScale, hScale));
      }
    }
    const legendVisible = legendEnabled && legendZone > 0;
    const chartTop = titleBlockH + legendZone + 8;
    const chartH = chartBottom - chartTop;
    const vRoom = chartH - 24;
    // The column is only as wide as the text it holds plus the connector run,
    // so the ring keeps every pixel the labels do not need.
    const labelPad = Math.max(56, Math.min(capPadFor(labelMode),
      textWidthFor(labelMode) * labelScale + CONNECT_RUN));

    const labelColPad = showConnectorLabels ? labelPad : 30;
    if (isSemi) {
      cy = chartBottom - 20;
      baseR = Math.max(30, Math.min((chartW - labelColPad * 2) / 2, chartH - 20));
    } else {
      cy = chartTop + chartH / 2;
      // clean-charts sizes the ring at 40% of the available height (donut_radius),
      // which is what leaves the vertical room the callout stubs and stacked
      // labels need above and below the ring.
      baseR = Math.max(30, Math.min((chartW - labelColPad * 2) / 2, chartH * 0.40));
    }

    const sizePct = parseSize(plotOpts.size, Math.min(chartW, chartH)) || (baseR * 2);
    const outerR = Math.min(baseR, sizePct / 2);
    // clean-charts hole_radius: fraction of outer RADIUS (not diameter).
    // e.g. innerSize:'50%' -> innerR = 0.5 * outerR (a thick ring)
    const holeRatio = plotOpts.innerSize != null ? null : 0.6;
    const innerR = plotOpts.innerSize != null
      ? parseSize(plotOpts.innerSize, outerR)
      : outerR * holeRatio;

    const rawSeries = opts.series && opts.series[0];
    if (!rawSeries) return;
    const dataName = rawSeries.name || 'Series 1';

    // Angle convention: Highcharts 0 = 12 o'clock, clockwise.
    let startAngleDeg = plotOpts.startAngle != null ? plotOpts.startAngle : 0;
    const endAngleDeg = plotOpts.endAngle != null ? plotOpts.endAngle : 360;
    const spanDeg = endAngleDeg - startAngleDeg;
    function angleRad(hcDeg) { return (hcDeg - 90) * Math.PI / 180; }
    const userSetStartAngle = plotOpts.startAngle != null;
    const autoRotate = plotOpts.autoRotate !== false;

    // Data + gradient colors (clean-charts default black → blue)
    const startCol = plotOpts.startColor || opts.startColor || START_COL;
    const endCol   = plotOpts.endColor   || opts.endColor   || END_COL;
    // Colors span the slices that will actually be drawn, so dropping a bad
    // point does not leave a gap in the gradient.
    const gradList = gradientColors(startCol, endCol, rawData.length);

    const data = rawData.map((d, i) => {
      let name, y, z, color, sliced;
      if (Array.isArray(d)) { name = d[0]; y = d[1]; }
      else if (typeof d === 'object') { name = d.name; y = d.y; z = d.z; color = d.color; sliced = d.sliced; }
      else { name = String(i); y = d; }
      return {
        name, y, z,
        color: color || gradList[i],
        sliced: !!sliced,
        visible: true,
        origIdx: i
      };
    });

    const isVariableRadius = rawSeries.type === 'variablepie' || plotOpts.variableRadius;
    const minRadius = parseSize(plotOpts.minPointSize, outerR * 2) || outerR * 0.4;

    // Layers
    const defs = el('defs', {}, svg);
    const gSlices = el('g', {}, svg);
    const gConnectors = el('g', {}, svg);
    const gLabels = el('g', {}, svg);
    const gCenter = el('g', {}, svg);
    const gLegend = el('g', {}, svg);
    const gAnnot = el('g', {}, svg);    // callouts draw above wedges and labels
    // Where the connector labels landed this render — obstacles for callouts.
    const labelRects = [];

    // (Radial gradient wedge fills removed by library policy.)

    // Footnote naming the dropped slices — bottom-left, aligned with the title.
    if (droppedNote) {
      txt(droppedNote, {
        x: titleX, y: H - marginPx + 2, 'text-anchor': 'start',
        'font-size': F_NOTE, fill: SUB_COL, 'font-family': FONT
      }, svg);
    }

    function render() {
      gSlices.innerHTML = '';
      gConnectors.innerHTML = '';
      gLabels.innerHTML = '';
      gCenter.innerHTML = '';

      const visible = data.filter(d => d.visible);
      const total = visible.reduce((s, d) => s + d.y, 0);
      if (total <= 0) {
        // Nothing to divide up — every slice was dropped, hidden, or zero.
        // Say so rather than leaving an unexplained empty box.
        const why = droppedNames.length && !data.length
          ? 'No positive values to chart'
          : 'Nothing to show';
        txt(why, {
          x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
          'font-size': F_LABEL, fill: SUB_COL, 'font-family': FONT
        }, gCenter);
        return;
      }
      const maxZ = isVariableRadius ? Math.max(...visible.map(d => d.z || 0)) : 1;

      const explodeDist = 10;
      const showLabels = showConnectorLabels;
      const oneLine = labelMode !== 'two';   // 'one' and 'name' share the single baseline
      const nameOnly = labelMode === 'name';
      const valueOnly = labelMode === 'value';

      // Auto-rotate: pick a startAngle that balances slice midpoints between
      // the left and right label columns (fewer per side ⇒ less connector deflection
      // and no overlap). Skip when the user set startAngle, on semi-circles, or when
      // autoRotate is disabled.
      if (autoRotate && !userSetStartAngle && !isSemi && visible.length > 2) {
        const fracs = visible.map(d => d.y / total);
        let bestOff = 0, bestScore = Infinity;
        for (let off = 0; off < 360; off += 5) {
          let acc2 = 0, right = 0, left = 0, flat = 0;
          for (const f of fracs) {
            const midDeg = off + (acc2 + f / 2) * spanDeg;
            acc2 += f;
            const midRad = (midDeg - 90) * Math.PI / 180;
            if (Math.cos(midRad) >= 0) right++; else left++;
            // A wedge whose midpoint sits on the horizontal axis exits the ring
            // at its widest point, so its connector degenerates into one flat
            // line with no elbow. Rotate those off the axis.
            if (Math.abs(Math.sin(midRad)) < 0.20) flat++;
          }
          const score = Math.max(right, left) * 1000 + flat * 120 + Math.abs(right - left);
          if (score < bestScore) { bestScore = score; bestOff = off; }
        }
        startAngleDeg = bestOff;
      }

      // Pass 1: compute geometry + ideal label positions
      const items = [];
      let acc = 0;
      data.forEach(d => {
        if (!d.visible) { d._node = null; return; }
        const frac = d.y / total;
        const a0 = angleRad(startAngleDeg + acc * spanDeg);
        const a1 = angleRad(startAngleDeg + (acc + frac) * spanDeg);
        acc += frac;
        const rOut = isVariableRadius
          ? (minRadius + ((d.z || 0) / (maxZ || 1)) * (outerR - minRadius))
          : outerR;
        const midA = (a0 + a1) / 2;
        const off = d.sliced ? explodeDist : 0;
        d._midA = midA; d._rOut = rOut; d._off = off; d._frac = frac;
        d._a0 = a0; d._a1 = a1;

        // clean-charts callout stub: a radial segment from r*1.08 to r*1.20.
        // The label's natural y is the OUTER end of that stub, not the wedge edge.
        const r1 = rOut * (1 + CALLOUT_GAP) + off;
        const r2 = rOut * (1 + CALLOUT_GAP + CALLOUT_LEN) + off;
        d._p1 = [cx + r1 * Math.cos(midA), cy + r1 * Math.sin(midA)];
        d._p2 = [cx + r2 * Math.cos(midA), cy + r2 * Math.sin(midA)];
        const idealY = d._p2[1];
        const side = Math.cos(midA) >= 0 ? 'right' : 'left';
        items.push({ d, idealY, side });
      });

      // Pass 2: draw wedges (BG-colored 2px separators for cutout look)
      items.forEach(({ d }) => {
        const ox = Math.cos(d._midA) * d._off, oy = Math.sin(d._midA) * d._off;
        const path = arcSegment(cx + ox, cy + oy, d._rOut, innerR, d._a0, d._a1);
        const fill = d.color;
        const slice = el('path', { d: path, fill,
          stroke: BG, 'stroke-width': 2, 'stroke-linejoin': 'round',
          class: 'slice', 'data-idx': d.origIdx,
          style: 'cursor:pointer;transition:opacity .15s' }, gSlices);
        d._node = slice;
      });

      labelRects.length = 0;

      // Pass 3: label stacking with iterative relaxation (clean-charts style)
      if (showLabels) {
        // Fixed label columns at outer chart edges
        // Align label columns with the title/legend inner pad (titleX = 20).
        const rightColX = W - titleX;
        const leftColX = titleX;
        // Every connector uses the same short diagonal — a fixed horizontal run
        // out of the wedge — so the kinks line up across labels and the long
        // horizontal into the label column is the dominant part of the path.
        // Shared elbow x per side (clean-charts): 40% of the way from the ring
        // edge out to the label column. One column of kinks per side.
        const rightElbowX = (cx + outerR) + (rightColX - (cx + outerR)) * ELBOW_FRAC;
        const leftElbowX = (cx - outerR) - ((cx - outerR) - leftColX) * ELBOW_FRAC;

        const minY = chartTop + 12;
        const maxY = (isSemi ? cy - 6 : chartBottom - 12);
        // Two-line block: name above the connector's horizontal run, value
        // below it. In the compact one-line mode both sit above the rule, which
        // halves the vertical budget per label.
        // Type shrinks with labelScale when the stack would otherwise overflow.
        const fLabel = F_LABEL * labelScale, fValue = F_VALUE * labelScale;
        // clean-charts anchors both lines to the connector's horizontal run:
        // the name sits on it (baseline just above), the value hangs below it.
        const nameDY = oneLine ? -(fLabel * 0.35) : -(fLabel * 0.55);
        const valueDY = oneLine ? -(fLabel * 0.35) : (fValue * 0.25 + fValue * 0.8);
        // Minimum vertical pitch between two label blocks, as in clean-charts:
        // (label + value + 4) * 1.1, floored by the mode's nominal block height.
        const labelBlockH = oneLine
          ? Math.max(fLabel * 1.6, ONE_LINE_H * labelScale)
          : Math.max((fLabel + fValue + 4) * 1.1, TWO_LINE_H * labelScale);

        // clean-charts de-overlap: symmetric pairwise relaxation, repeated, with
        // a clamp to the plot box after each sweep. Unlike a one-directional
        // cascade this pushes crowded neighbours apart in BOTH directions, so a
        // cluster stays centred on where its wedges actually are.
        function relax(group) {
          if (group.length <= 1) { group.forEach(it => it.y = it.idealY); return; }
          group.sort((a, b) => a.idealY - b.idealY);
          group.forEach(it => it.y = it.idealY);
          for (let pass = 0; pass < 20; pass++) {
            for (let j = 0; j < group.length - 1; j++) {
              const diff = group[j + 1].y - group[j].y;
              if (diff < labelBlockH) {
                const push = (labelBlockH - diff) / 2;
                group[j].y -= push;
                group[j + 1].y += push;
              }
            }
            group.forEach(it => { it.y = Math.max(minY, Math.min(maxY, it.y)); });
          }
        }
        items.forEach(it => it.y = it.idealY);
        relax(items.filter(it => it.side === 'right'));
        relax(items.filter(it => it.side === 'left'));

        // Draw callouts + labels
        items.forEach(it => {
          const d = it.d;
          const isRight = it.side === 'right';
          const colX = isRight ? rightColX : leftColX;
          const anch = isRight ? 'end' : 'start';

          // Four-point connector (clean-charts):
          //   p1 → p2                radial stub straight out of the wedge
          //   p2 → (elbowX, labelY)  diagonal to the shared elbow column
          //   (elbowX, y) → (colX,y) horizontal run into the label column,
          //                          doubling as the rule under the name.
          const p1 = d._p1, p2 = d._p2;
          const elbowX = isRight ? rightElbowX : leftElbowX;
          el('path', {
            d: `M ${p1[0]} ${p1[1]} L ${p2[0]} ${p2[1]} L ${elbowX} ${it.y} L ${colX} ${it.y}`,
            stroke: CONNECT_COL, 'stroke-width': CONNECT_W, fill: 'none',
            'stroke-linecap': 'round', 'stroke-linejoin': 'round'
          }, gConnectors);

          // Two-line label: name (bold) above, value (lighter) below
          const pct = d._frac * 100;
          const valueSuffix = plotOpts.valueSuffix || '';
          let valueStr;
          if (plotOpts.showPercentages) valueStr = pct.toFixed(1) + '%';
          else valueStr = addCommas(d.y === Math.floor(d.y) ? d.y : (+d.y.toFixed(2))) + valueSuffix;

          // clean-charts insets the text a few px from the end of the rule.
          const lx = colX + (isRight ? -4 : 4);
          // Remember the whole label block *including* its connector run —
          // the horizontal rule is as much a thing to avoid as the text.
          const blockW = Math.max(d.name.length, 6) * fLabel * 0.62 + 10;
          // The run starts at the wedge stub, kinks at the elbow and ends in
          // the label column — cover all of it, not just the text.
          const runL = Math.min(d._p2[0], elbowX, colX, isRight ? lx - blockW : lx);
          const runR = Math.max(d._p2[0], elbowX, colX, isRight ? lx : lx + blockW);
          const runT = Math.min(d._p2[1], it.y) - fLabel - 4;
          const runB = Math.max(d._p2[1], it.y) + fValue + 4;
          labelRects.push({ x: runL, y: runT, w: runR - runL, h: runB - runT });

          if (valueOnly) {
            txt(valueStr, {
              x: lx, y: it.y +nameDY, 'text-anchor': anch,
              'font-size': fLabel, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT
            }, gLabels);
          } else if (nameOnly) {
            txt(d.name, {
              x: lx, y: it.y +nameDY, 'text-anchor': anch,
              'font-size': fLabel, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT
            }, gLabels);
          } else if (oneLine) {
            // Name then value share one baseline, reading outward-in on both
            // sides: the name always sits against the column edge.
            const nameW = d.name.length * fLabel * 0.6 + 8;
            txt(d.name, {
              x: lx, y: it.y +nameDY, 'text-anchor': anch,
              'font-size': fLabel, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT
            }, gLabels);
            txt(valueStr, {
              x: isRight ? lx - nameW : lx + nameW, y: it.y + valueDY,
              'text-anchor': anch,
              'font-size': fValue, 'font-weight': TICK_FW, fill: TICK_COL, 'font-family': FONT
            }, gLabels);
          } else {
            txt(d.name, {
              x: lx, y: it.y +nameDY, 'text-anchor': anch,
              'font-size': fLabel, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT
            }, gLabels);
            txt(valueStr, {
              x: lx, y: it.y +valueDY, 'text-anchor': anch,
              'font-size': fValue, 'font-weight': TICK_FW, fill: TICK_COL, 'font-family': FONT
            }, gLabels);
          }
        });
      }

      // `callouts: [{ name, text, color }]` — `name` is the slice's own name.
      // The anchor sits mid-ring on the wedge's bisector; the box is pushed
      // straight out along that bisector so the leader reads as one more spoke
      // and the note clears both the ring and the connector labels, which are
      // already queued up in the two side columns.
      (function () {
        const cos = opts.callouts || [];
        if (!cos.length) return;
        gAnnot.innerHTML = '';
        const byName = {};
        items.forEach(({ d }) => { byName[String(d.name)] = d; });
        const list = cos.map(co => {
          const key = calloutKey(co);
          const d = key != null ? byName[key] : items[0] && items[0].d;
          if (!d) return null;
          const r = (innerR + d._rOut) / 2 + d._off;
          return { x: cx + Math.cos(d._midA) * r, y: cy + Math.sin(d._midA) * r,
            text: co.text, color: co.color };
        }).filter(Boolean);
        drawCallouts(gAnnot, list, { x: 4, y: chartTop, w: W - 8, h: chartBottom - chartTop }, {
          mode: 'radial',
          center: { x: cx, y: cy },
          obstacles: labelRects.concat([
            // The ring as a cross of two rects: together they cover the disc
            // including its top, bottom and sides, while leaving the diagonal
            // corners free — which is exactly where a note fits beside a donut.
            { x: cx - outerR, y: cy - outerR * 0.707,
              w: outerR * 2, h: outerR * 1.414 },
            { x: cx - outerR * 0.707, y: cy - outerR,
              w: outerR * 1.414, h: outerR * 2 }
          ])
        });
      })();

      // Center label
      if (plotOpts.centerText) {
        const ct = plotOpts.centerText;
        const cyC = isSemi ? cy - 20 : cy;
        const lines = String(ct.value != null ? ct.value : total).split('\n');
        lines.forEach((ln, i) => {
          txt(ln, { x: cx, y: cyC - (lines.length - 1) * 8 + i * 20,
            'text-anchor': 'middle', 'font-size': ct.valueFontSize || F_CENTER * 1.6,
            'font-weight': VAL_FW, fill: ct.color || VAL_COL, 'font-family': FONT }, gCenter);
        });
        if (ct.label) txt(ct.label, {
          x: cx, y: cyC + (lines.length - 1) * 10 + 22,
          'text-anchor': 'middle', 'font-size': F_LABEL, fill: SUB_COL,
          'font-family': FONT
        }, gCenter);
      }
    }

    // Legend — top row(s), below subtitle, wraps as needed
    function renderLegend() {
      gLegend.innerHTML = '';
      if (!legendVisible) return;
      const startX = titleX;
      const startY = titleBlockH + 2;
      legendLayout.rows.forEach((row, ri) => {
        // Left-align each row at the title's x position
        const rowStartX = startX;
        row.forEach(cell => {
          const d = data[rawData.indexOf(rawData.find((r, i) =>
            (typeof r === 'object' ? (r.name || 'Slice ' + (i + 1)) : (Array.isArray(r) ? r[0] : String(i))) === cell.item.name
          ))] || data.find(x => x.name === cell.item.name);
          if (!d) return;
          const x = rowStartX + cell.x;
          const y = startY + ri * LEG_ROW;
          const gr = el('g', { class: 'lg-item', style: 'cursor:pointer' }, gLegend);
          el('rect', { x: x - 2, y: y - 2, width: cell.w, height: LEG_ROW - 2, fill: 'transparent' }, gr);
          el('rect', { x, y: y + 2, width: LEG_ICON, height: LEG_ICON, rx: 2,
            fill: d.visible ? d.color : '#ccc' }, gr);
          txt(d.name, { x: x + LEG_ICON + LEG_ICON_GAP, y: y + 12, 'font-size': F_LEG, 'font-weight': CAT_FW,
            fill: d.visible ? CAT_COL : '#ccc',
            'text-decoration': d.visible ? 'none' : 'line-through',
            'font-family': FONT }, gr);
          gr.addEventListener('click', () => {
            d.visible = !d.visible;
            render(); renderLegend();
          });
        });
      });
    }

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `position:absolute;pointer-events:none;background:${BG};border:1px solid #bbb;border-radius:4px;padding:6px 8px;font:12px ${FONT};box-shadow:1px 1px 3px rgba(0,0,0,0.12);display:none;white-space:nowrap;z-index:10;`;
    container.appendChild(tooltip);

    function showTooltip(d, ev) {
      const total = data.filter(x=>x.visible).reduce((s,x)=>s+x.y, 0);
      const pct = (d.y / total * 100).toFixed(1);
      tooltip.innerHTML =
        `<div style="font-size:12px;font-weight:700;color:${TITLE_COL};margin-bottom:2px">${esc(dataName)}</div>` +
        `<div><span style="display:inline-block;width:9px;height:9px;background:${d.color};border-radius:2px;margin-right:6px"></span>${esc(d.name)}: <b style="color:${TITLE_COL}">${esc(addCommas(d.y))}</b> (${pct}%)</div>`;
      tooltip.style.display = 'block';
      const rect = svg.getBoundingClientRect();
      const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
      const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
      let tx = px + 14, ty = py - th / 2;
      if (tx + tw > W - 4) tx = px - tw - 14;
      if (ty < 4) ty = 4;
      if (ty + th > H - 4) ty = H - th - 4;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    }
    function hideTooltip() { tooltip.style.display = 'none'; }

    svg.addEventListener('mousemove', ev => {
      const target = ev.target;
      if (target && target.classList && target.classList.contains('slice')) {
        const idx = +target.getAttribute('data-idx');
        const d = data[idx];
        if (!d) return;
        data.forEach(x => { if (x._node) x._node.style.opacity = '1'; });
        target.style.opacity = '0.85';
        showTooltip(d, ev);
      } else {
        data.forEach(x => { if (x._node) x._node.style.opacity = '1'; });
        hideTooltip();
      }
    });
    svg.addEventListener('mouseleave', () => {
      data.forEach(x => { if (x._node) x._node.style.opacity = '1'; });
      hideTooltip();
    });

    svg.addEventListener('click', ev => {
      const target = ev.target;
      if (target && target.classList && target.classList.contains('slice')) {
        const idx = +target.getAttribute('data-idx');
        const d = data[idx];
        if (d) { d.sliced = !d.sliced; render(); }
      }
    });

    render();
    renderLegend();

    return { redraw: () => { render(); renderLegend(); }, getData: () => data };
  }

    Charts.donut = Chart;
})();


Charts.pie = function (container, opts) {
  // Full pie: force innerSize to 0 (unless caller explicitly sets it).
  opts = opts || {}; opts.plotOptions = opts.plotOptions || {}; opts.plotOptions.pie = opts.plotOptions.pie || {};
  if (opts.plotOptions.pie.innerSize == null) opts.plotOptions.pie.innerSize = 0;
  return Charts.donut(container, opts);
};

// ─── scatter / bubble / packedBubble ───────────────────────────────

/*
 * Clean-charts-styled scatter / bubble chart engine.
 * Matches clean_charts/plots/scatter.py + bubble_scatter.py + grouped_scatter.py:
 *  - Cream bg, Inter typography, top-left title/subtitle
 *  - Both LEFT and BOTTOM spines visible (dark, thick); top/right hidden
 *  - Both x and y gridlines
 *  - Y-axis label bold, rotated 90°, aligned to title's left edge
 *  - X-axis label bold at bottom
 *  - Bubbles gradient-colored by size (black → blue)
 *  - Points/bubbles have white edges
 *  - Trend line dashed blue
 *  - Legend at top-left (below subtitle) for grouped scatter
 *  - Packed bubble via physics relaxation
 * Interactions: hover point/bubble -> enlarge + tooltip; legend toggle.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // clean_charts tokens
  let BG, GRID, AXIS, TITLE_COL, SUB_COL, LABEL_COL, INV_TEXT, START_COL, END_COL, TREND_COL, DEFAULT_COL;
  function applyThemeColors() {
    const t = (window.Charts && window.Charts.theme) || {};
    BG = t.bg || '#f4f3f0';
    GRID = t.grid || '#dcdbd7';
    AXIS = t.labelColor || '#333333';
    TITLE_COL = t.titleColor || '#111111';
    SUB_COL = t.subtitleColor || '#666666';
    LABEL_COL = t.labelColor || '#333333';
    INV_TEXT = t.inverseText || '#FFFFFF';
    START_COL = t.gradientStart || '#000000';
    END_COL = t.gradientEnd || '#2323FF';
    TREND_COL = t.trend || '#2323FF';
    DEFAULT_COL = t.defaultColor || '#000000';
  }

  let CAT_COL, CAT_FW, TICK_COL, TICK_FW, VAL_COL, VAL_FW;
  let FONT, F_TITLE, F_SUB, F_LABEL, F_TICK, F_POINT_LBL, SPINE_W, GRID_W;
  function applyTheme() {
    applyThemeColors();
    const t = (window.Charts && window.Charts.theme) || {};
    // Shared text roles — see the hierarchy comment in theme.js.
    CAT_COL = t.categoryColor || TITLE_COL;
    CAT_FW = t.categoryWeight != null ? t.categoryWeight : 600;
    TICK_COL = t.tickColor || LABEL_COL;
    TICK_FW = t.tickWeight != null ? t.tickWeight : 400;
    VAL_COL = t.valueColor || TITLE_COL;
    VAL_FW = t.valueWeight != null ? t.valueWeight : 700;
    FONT = t.font || "'Inter','Segoe UI',Arial,Helvetica,sans-serif";
    F_TITLE = t.titleSize != null ? t.titleSize : 17;
    F_SUB = t.subtitleSize != null ? t.subtitleSize : 12;
    F_LABEL = t.labelSize != null ? t.labelSize : 11.5;
    F_TICK = t.tickSize != null ? t.tickSize : 11;
    F_POINT_LBL = t.pointLabelSize != null ? t.pointLabelSize : 10;
    SPINE_W = t.axisWidth != null ? t.axisWidth : 1.8;
    GRID_W = t.gridWidth != null ? t.gridWidth : 0.8;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, attrs, parent) {
    const e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }

  // ── Heading wrapping ────────────────────────────────────────────────
  // Titles wrap to at most 2 lines, subtitles to at most 3; whatever does
  // not fit is clipped with an ellipsis. Widths are estimated (not measured)
  // so the whole layout can be decided before anything hits the DOM.
  function _headW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.58 : 0.53);
  }
  function _clipLine(str, fontSize, maxW, bold) {
    let s = String(str);
    if (_headW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && _headW(s + '…', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s.,;:]+$/, '') + '…';
  }
  function wrapHeading(str, fontSize, maxW, maxLines, bold) {
    const words = String(str == null ? '' : str).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i];
      if (_headW(next, fontSize, bold) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    lines.push(cur);
    if (lines.length > maxLines) {
      const tail = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(_clipLine(tail, fontSize, maxW, bold));
    }
    return lines.map(l => _clipLine(l, fontSize, maxW, bold));
  }
  const TITLE_LINES = 2, SUB_LINES = 3, TITLE_LH = 21, SUB_LH = 16;
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function addCommas(n) {
    // Strip binary-float noise before stringifying: 25.999999999999996 -> 26,
    // 0.30000000000000004 -> 0.3. Values like these arrive whenever a chart is
    // fed a computed share or a summed column, and String() renders every
    // artefact digit. 12 significant figures sits well inside double
    // precision, so genuine values are untouched while accumulated ~1e-15
    // error rounds away.
    if (typeof n === 'number' && isFinite(n)) n = +n.toPrecision(12);
    const s = String(n);
    const neg = s.startsWith('-') ? '-' : '';
    const abs = neg ? s.slice(1) : s;
    const dot = abs.indexOf('.');
    const intPart = dot < 0 ? abs : abs.slice(0, dot);
    const fracPart = dot < 0 ? '' : abs.slice(dot);
    return neg + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fracPart;
  }
  function hex2rgb(hex) {
    const c = hex.replace('#','');
    const n = parseInt(c.length === 3 ? c.split('').map(x=>x+x).join('') : c, 16);
    return [(n>>16)&255,(n>>8)&255,n&255];
  }
  function rgb2hex(r,g,b) {
    return '#' + [r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  }
  function gradientColors(startHex, endHex, n) {
    if (n <= 0) return [];
    if (n === 1) return [startHex];
    const [r1,g1,b1] = hex2rgb(startHex);
    const [r2,g2,b2] = hex2rgb(endHex);
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      out.push(rgb2hex(r1+(r2-r1)*t, g1+(g2-g1)*t, b1+(b2-b1)*t));
    }
    return out;
  }
  function darken(hex, amt) {
    const [r,g,b] = hex2rgb(hex);
    return rgb2hex(r*(1-amt), g*(1-amt), b*(1-amt));
  }

  function niceTicks(min, max, count) {
    count = count || 6;
    if (min === max) { min -= 1; max += 1; }
    const range = max - min;
    const step0 = Math.pow(10, Math.floor(Math.log10(range / count)));
    const err = (count / range) * step0;
    let step = step0;
    if (err <= 0.15) step *= 10;
    else if (err <= 0.35) step *= 5;
    else if (err <= 0.75) step *= 2;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const out = [];
    for (let v = lo; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(12));
    return out;
  }

  function symbolPath(kind, cx, cy, r) {
    switch (kind) {
      case 'square':        return `M ${cx-r} ${cy-r} h ${r*2} v ${r*2} h ${-r*2} Z`;
      case 'diamond':       return `M ${cx} ${cy-r} L ${cx+r} ${cy} L ${cx} ${cy+r} L ${cx-r} ${cy} Z`;
      case 'triangle':      return `M ${cx} ${cy-r} L ${cx+r} ${cy+r} L ${cx-r} ${cy+r} Z`;
      case 'triangle-down': return `M ${cx-r} ${cy-r} L ${cx+r} ${cy-r} L ${cx} ${cy+r} Z`;
      default: return null;
    }
  }

  function linreg(pts) {
    const n = pts.length;
    let sx=0, sy=0, sxx=0, sxy=0;
    pts.forEach(([x,y]) => { sx += x; sy += y; sxx += x*x; sxy += x*y; });
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const intercept = (sy - slope * sx) / n;
    return { slope, intercept };
  }

  function packLayout(items, W, H, opts) {
    opts = opts || {};
    const cx = opts.cx != null ? opts.cx : W/2;
    const cy = opts.cy != null ? opts.cy : H/2;
    const groupCenters = opts.groupCenters || null;
    items.forEach((b, i) => {
      const gc = groupCenters ? groupCenters[b.group] : { x: cx, y: cy };
      const angle = (i * 137.5) * Math.PI / 180;
      const dist = Math.random() * Math.min(W, H) * 0.15;
      b.x = gc.x + Math.cos(angle) * dist;
      b.y = gc.y + Math.sin(angle) * dist;
    });
    const iters = 200;
    for (let iter = 0; iter < iters; iter++) {
      items.forEach(b => {
        const gc = groupCenters ? groupCenters[b.group] : { x: cx, y: cy };
        b.x += (gc.x - b.x) * 0.02;
        b.y += (gc.y - b.y) * 0.02;
      });
      for (let i = 0; i < items.length; i++) {
        for (let j = i+1; j < items.length; j++) {
          const a = items[i], b = items[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 0.01;
          const minDist = a.r + b.r + 1.5;
          if (dist < minDist) {
            const push = (minDist - dist) / 2;
            const ux = dx / dist, uy = dy / dist;
            a.x -= ux * push; a.y -= uy * push;
            b.x += ux * push; b.y += uy * push;
          }
        }
      }
    }
  }

  // ---------------- main ----------------
  // ── callouts ────────────────────────────────────────────────────────────
  // A callout is an anchor dot on the mark, a leader, and a paragraph box.
  // The block is shared by every engine (each is its own IIFE) so a note reads
  // the same everywhere, but *where* the box goes is the engine's call: a
  // column chart puts its notes in a band above the bars, a horizontal bar
  // chart in the gutter past the bar ends, a scatter in the emptiest corner
  // near the point. Passing the marks in as `obstacles` is what keeps a box
  // off the data instead of merely off the other boxes.
  //
  //   drawCallouts(g, items, bounds, {
  //     mode: 'above' | 'right' | 'radial' | 'auto',
  //     obstacles: [{ x, y, w, h }],   // rects the box must not cover
  //     center: { x, y },              // radial mode: what to push away from
  //     gutter: 12                     // band/gutter thickness for above/right
  //   })
  //
  // Placement stays deterministic — candidates are tried in a fixed order —
  // so re-rendering the same data puts every box back where it was.
  const CALLOUT_PAD = 6;          // clearance between a box and anything else
  const CALLOUT_LEAD = 14;        // shortest leader worth drawing

  const CALLOUT_OFFSETS = [
    [ 32, -60], [-32, -60], [ 32, -110], [-32, -110],
    [ 60, -30], [-60, -30], [ 32,  30], [-32,  30],
    [ 60,  30], [-60,  30], [ 32, -160], [-32, -160]
  ];

  function calloutTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    return {
      accent: t.callout || '#e3120b',
      text: t.labelColor || '#333333',
      inverse: t.inverseText || '#FFFFFF',
      bg: t.bg || '#f4f3f0'
    };
  }

  function measureCalloutBox(text) {
    const lines = String(text).split('\n');
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + 16);
    const h = lines.length * 13 + 16;
    return { w: w, h: h };
  }

  // Total area of a rect that lands on top of anything it should not.
  function calloutOverlap(r, rects) {
    let sum = 0;
    for (let i = 0; i < rects.length; i++) {
      const o = rects[i];
      const dx = Math.min(r.x + r.w + CALLOUT_PAD, o.x + o.w) - Math.max(r.x - CALLOUT_PAD, o.x);
      const dy = Math.min(r.y + r.h + CALLOUT_PAD, o.y + o.h) - Math.max(r.y - CALLOUT_PAD, o.y);
      if (dx > 0 && dy > 0) sum += dx * dy;
    }
    return sum;
  }

  function calloutInBounds(r, b) {
    return r.x >= b.x + 2 && r.y >= b.y + 2 &&
           r.x + r.w <= b.x + b.w - 2 && r.y + r.h <= b.y + b.h - 2;
  }

  function drawCalloutBox(g, bx, by, text, edge) {
    const th = calloutTheme();
    const lines = String(text).split('\n');
    const lh = 13, pad = 8;
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + pad * 2);
    const h = lines.length * lh + pad * 2;
    el('rect', { x: bx, y: by, width: w, height: h, rx: 6, ry: 6,
      fill: th.bg, 'fill-opacity': 0.94, stroke: edge, 'stroke-width': 0.8 }, g);
    lines.forEach((ln, i) => {
      txt(ln, { x: bx + pad, y: by + pad + (i + 1) * lh - 3, 'font-size': 10,
        fill: th.text, 'font-family': FONT }, g);
    });
  }

  // Leader from the anchor to the box. Straight when the box sits diagonally
  // from the mark; an elbow when it sits squarely above or beside it, so the
  // line reads as a pointer rather than as another data mark.
  function drawCalloutLeader(g, ax, ay, box, color, mode) {
    const midX = box.x + box.w / 2, midY = box.y + box.h / 2;
    if (mode === 'above' || mode === 'below') {
      const edgeY = mode === 'above' ? box.y + box.h : box.y;
      const stem = mode === 'above' ? edgeY + 8 : edgeY - 8;
      const cx = Math.max(box.x + 8, Math.min(box.x + box.w - 8, ax));
      const d = 'M ' + ax + ' ' + ay + ' L ' + ax + ' ' + stem +
                ' L ' + cx + ' ' + stem + ' L ' + cx + ' ' + edgeY;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    if (mode === 'right' || mode === 'left') {
      const edgeX = mode === 'right' ? box.x : box.x + box.w;
      const stem = mode === 'right' ? edgeX - 8 : edgeX + 8;
      const cy = Math.max(box.y + 8, Math.min(box.y + box.h - 8, ay));
      const d = 'M ' + ax + ' ' + ay + ' L ' + stem + ' ' + ay +
                ' L ' + stem + ' ' + cy + ' L ' + edgeX + ' ' + cy;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    let lx = midX, ly = midY;
    if (ax < box.x) lx = box.x;
    else if (ax > box.x + box.w) lx = box.x + box.w;
    if (ay < box.y) ly = box.y;
    else if (ay > box.y + box.h) ly = box.y + box.h;
    el('line', { x1: ax, y1: ay, x2: lx, y2: ly, stroke: color, 'stroke-width': 1.2 }, g);
  }

  function drawCallouts(g, items, bounds, cfg) {
    if (!items || !items.length) return;
    cfg = cfg || {};
    const mode = cfg.mode || 'auto';
    const obstacles = (cfg.obstacles || []).slice();
    const th = calloutTheme();
    const placed = [];
    const gutter = cfg.gutter != null ? cfg.gutter : 10;

    // Sorting by the axis the band runs along keeps leaders from crossing.
    const ordered = items.slice().sort((a, b) =>
      (mode === 'right' || mode === 'left') ? a.y - b.y : a.x - b.x);

    ordered.forEach(it => {
      const box = measureCalloutBox(it.text);
      const color = it.color || th.accent;
      const blocked = obstacles.concat(placed);
      let best = null, bestCost = Infinity, leader = mode;

      const consider = (x, y, penalty, leadMode) => {
        const r = { x: x, y: y, w: box.w, h: box.h };
        if (!calloutInBounds(r, bounds)) return;
        const cost = calloutOverlap(r, blocked) + (penalty || 0);
        if (cost < bestCost) { bestCost = cost; best = r; leader = leadMode || mode; }
      };

      if (mode === 'above' || mode === 'below') {
        // Band across the top (or bottom): the box keeps to the headroom the
        // engine reserved, and slides sideways from the anchor until it is
        // clear. Distance from the anchor is the tie-breaker, so a note stays
        // over the mark it belongs to whenever the room is there.
        const bandY = mode === 'above'
          ? bounds.y + gutter
          : bounds.y + bounds.h - gutter - box.h;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
          consider(it.x - box.w / 2 + dx, bandY, Math.abs(dx) * 0.5, mode);
        }
        // Second row under the first when the band is full.
        if (bestCost > 0) {
          const row2 = mode === 'above' ? bandY + box.h + CALLOUT_PAD
                                        : bandY - box.h - CALLOUT_PAD;
          for (let step = 0; step <= 24; step++) {
            const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
            consider(it.x - box.w / 2 + dx, row2, 400 + Math.abs(dx) * 0.5, mode);
          }
        }
      } else if (mode === 'right' || mode === 'left') {
        // Gutter past the ends of the bars, one box per row, aligned with the
        // row it annotates.
        const colX = mode === 'right'
          ? bounds.x + bounds.w - gutter - box.w
          : bounds.x + gutter;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dy = Math.ceil(step / 2) * 14 * (step % 2 ? 1 : -1);
          consider(colX, it.y - box.h / 2 + dy, Math.abs(dy) * 0.5, mode);
        }
      } else if (mode === 'radial' && cfg.center) {
        // Push out from the middle of the ring or cluster, so the leader reads
        // as a spoke. Straight out is preferred, but the fan of angles around
        // it matters: a wedge pointing into a crowded side still has a clear
        // diagonal to reach for, and a spoke 30° off still reads as a spoke.
        const vx = it.x - cfg.center.x, vy = it.y - cfg.center.y;
        const base = Math.atan2(vy, vx);
        const FAN = [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31];
        for (let f = 0; f < FAN.length && bestCost > 0; f++) {
          const a = base + FAN[f];
          for (let d = 30; d <= 260 && bestCost > 0; d += 14) {
            const px = it.x + Math.cos(a) * d, py = it.y + Math.sin(a) * d;
            consider(px - box.w / 2, py - box.h / 2,
              d * 0.4 + Math.abs(FAN[f]) * 90, 'auto');
          }
        }
      }

      // Ladder of diagonal offsets: the general fallback, and the default for
      // charts with no obvious free direction (line, scatter).
      if (bestCost > 0) {
        for (let i = 0; i < CALLOUT_OFFSETS.length; i++) {
          const ox = CALLOUT_OFFSETS[i][0], oy = CALLOUT_OFFSETS[i][1];
          consider(ox >= 0 ? it.x + ox : it.x + ox - box.w,
                   oy < 0 ? it.y + oy - box.h : it.y + oy,
                   (mode === 'auto' ? 0 : 800) + i * 2, 'auto');
        }
      }

      if (!best) {
        // Nothing fits: clamp inside and accept the overlap rather than drop a
        // note the author wrote.
        best = {
          x: Math.max(bounds.x + 2, Math.min(bounds.x + bounds.w - box.w - 2, it.x - box.w / 2)),
          y: Math.max(bounds.y + 2, Math.min(bounds.y + bounds.h - box.h - 2, it.y - box.h - 20)),
          w: box.w, h: box.h
        };
        leader = 'auto';
      }
      placed.push(best);

      drawCalloutLeader(g, it.x, it.y, best, color, leader);
      el('circle', { cx: it.x, cy: it.y, r: 4.5, fill: color,
        stroke: th.inverse, 'stroke-width': 1 }, g);
      drawCalloutBox(g, best.x, best.y, it.text, color);
    });
  }

  // Match a callout to a named thing: `name`, `category`, `point`, `code` and
  // `label` are all accepted so the key reads naturally per chart type.
  function calloutKey(co) {
    const k = co.name != null ? co.name
      : co.category != null ? co.category
      : co.point != null ? co.point
      : co.code != null ? co.code
      : co.label != null ? co.label
      : co.row != null ? co.row
      : co.panel != null ? co.panel : null;
    return k == null ? null : String(k);
  }

  function Chart(container, opts) {
    applyTheme();
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.fontFamily = FONT;
    container.style.background = BG;

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 500;
    const chartOpts = opts.chart || {};
    const globalType = chartOpts.type || 'scatter';
    const isPacked = globalType === 'packedbubble';

    const xAxis = opts.xAxis || {};
    const yAxis = opts.yAxis || {};

    const hasTitle = !!opts.title;
    const hasSub = !!opts.subtitle;
    const yTitle = (yAxis.title && (yAxis.title.text || yAxis.title)) || '';
    const xTitle = (xAxis.title && (xAxis.title.text || xAxis.title)) || '';
    const xSuffix = xAxis.suffix || '';
    const ySuffix = yAxis.suffix || '';

    // Layout tokens (clean-charts uses ~45px outer margin)
    const marginPx = 22;
    const titleLines = hasTitle
      ? wrapHeading(opts.title, F_TITLE, W - 40, TITLE_LINES, true) : [];
    const subLines = hasSub
      ? wrapHeading(opts.subtitle, F_SUB, W - 40, SUB_LINES, false) : [];
    const subY0 = 34 + (titleLines.length ? (titleLines.length - 1) * TITLE_LH + 20 : 0);
    const titleBlockH = (hasTitle ? 24 + (titleLines.length - 1) * TITLE_LH : 0)
                      + (hasSub ? 22 + (subLines.length - 1) * SUB_LH : 0) + 18;

    // Legend: auto-enable when multi-series; wraps across rows as needed.
    const hasLegend = (opts.legend && opts.legend.enabled != null)
      ? !!opts.legend.enabled
      : ((opts.series || []).length > 1);
    const F_LEG = 12, LEG_ROW = 20, LEG_GAP = 18, LEG_ICON = 12, LEG_ICON_GAP = 6;
    function _layoutLegend(items, availW) {
      const widths = items.map(it => LEG_ICON + LEG_ICON_GAP + Math.ceil(String(it.name).length * F_LEG * 0.55) + LEG_GAP);
      const rows = [];
      let cur = [], curX = 0;
      for (let i = 0; i < items.length; i++) {
        if (cur.length && curX + widths[i] > availW) { rows.push(cur); cur = []; curX = 0; }
        cur.push({ item: items[i], x: curX, w: widths[i] });
        curX += widths[i];
      }
      if (cur.length) rows.push(cur);
      return { rows, height: rows.length * LEG_ROW };
    }
    const _legendLayout = hasLegend
      ? _layoutLegend((opts.series || []).map((s, i) => ({ name: s.name || 'Series ' + (i + 1) })), W - 44)
      : { rows: [], height: 0 };
    const legendZone = _legendLayout.height + (hasLegend ? 18 : 0);

    // Left margin needs room for y-label (rotated) + y-tick text
    // Estimate widest y-tick label so leftPad scales with the actual numbers
    // being drawn — prevents a long y-tick from overlapping the rotated y-title.
    let _yLo = Infinity, _yHi = -Infinity;
    (opts.series || []).forEach(s => (s.data || []).forEach(d => {
      const y = Array.isArray(d) ? d[1] : (d && typeof d === 'object' ? d.y : d);
      if (typeof y === 'number' && isFinite(y)) { if (y < _yLo) _yLo = y; if (y > _yHi) _yHi = y; }
    }));
    if (yAxis.min != null) _yLo = yAxis.min;
    if (yAxis.max != null) _yHi = yAxis.max;
    const _yPad = isFinite(_yLo) && isFinite(_yHi) ? (_yHi - _yLo) * 0.05 : 0;
    const _previewTicks = (isFinite(_yLo) && isFinite(_yHi))
      ? niceTicks(_yLo - _yPad, _yHi + _yPad, 6) : [0];
    const _maxLbl = _previewTicks.reduce((m, v) =>
      Math.max(m, (addCommas((+v.toFixed(6)).toString()) + ySuffix).length), 3);
    const _tickTextW = Math.ceil(_maxLbl * F_TICK * 0.6) + 8; // +8 gap between text and spine
    // Symmetric with bottomPad: edge pad + title + tick strings.
    const leftPad = 8 + (yTitle ? 22 : 0) + _tickTextW;
    // Bottom needs room for x-label and tick labels
    const bottomPad = 28 + (xTitle ? 22 : 0);

    const M = {
      l: leftPad,
      r: marginPx,
      t: titleBlockH + legendZone + 8,
      b: bottomPad
    };
    const IW = W - M.l - M.r;
    const IH = H - M.t - M.b;

    const svg = el('svg', { xmlns: NS, width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.background = BG;
    svg.style.display = 'block';
    container.appendChild(svg);

    // Title and subtitle top-left, aligned to titleX
    const titleX = 20;
    titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: 34 + i * TITLE_LH, 'text-anchor': 'start',
      'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, svg));
    subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * SUB_LH, 'text-anchor': 'start',
      'font-size': F_SUB, fill: SUB_COL, 'font-family': FONT }, svg));

    // Normalize series
    const seriesDefs = (opts.series || []).map((s, i) => {
      const type = s.type || globalType || 'scatter';
      const marker = Object.assign({ symbol: 'circle', radius: 5 },
        (opts.plotOptions && opts.plotOptions.series && opts.plotOptions.series.marker) || {},
        (opts.plotOptions && opts.plotOptions[type] && opts.plotOptions[type].marker) || {},
        s.marker || {});
      const points = (s.data || []).map((d, j) => {
        if (d === null || d === undefined) return null;
        if (Array.isArray(d)) {
          if (d.length === 3) return { x: d[0], y: d[1], z: d[2] };
          // [name, value] — the documented packed-bubble shape. A string first
          // element is a label, not a coordinate, so it becomes the point name
          // and the index stands in for x.
          if (typeof d[0] === 'string') return { x: j, y: d[1], name: d[0] };
          return { x: d[0], y: d[1] };
        }
        if (typeof d === 'object') return Object.assign({}, d);
        return { x: j, y: d };
      });
      return {
        name: s.name || 'Series ' + (i + 1),
        color: s.color,   // may be null → auto-assigned below
        legendColor: s.legendColor,
        type, points, marker,
        visible: true,
        regression: !!s.regression,
        showLabels: s.showLabels !== false,   // labels draw only for named points
        valueSuffix: s.valueSuffix || (opts.tooltip && opts.tooltip.valueSuffix) || '',
        xSuffix: xSuffix, ySuffix: ySuffix
      };
    });

    // Auto-assign colors: gradient across series for scatter groups; single default for a single series
    if (seriesDefs.length > 1) {
      const grad = gradientColors(START_COL, END_COL, seriesDefs.length);
      seriesDefs.forEach((s, i) => { if (!s.color) s.color = grad[i]; });
    } else {
      seriesDefs.forEach(s => { if (!s.color) s.color = DEFAULT_COL; });
    }

    // Compute ranges
    function computeRanges() {
      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, zMin = Infinity, zMax = -Infinity;
      seriesDefs.forEach(s => {
        if (!s.visible) return;
        s.points.forEach(p => {
          if (!p) return;
          if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
          if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
          if (p.z != null) { if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z; }
        });
      });
      if (xAxis.min != null) xMin = xAxis.min; if (xAxis.max != null) xMax = xAxis.max;
      if (yAxis.min != null) yMin = yAxis.min; if (yAxis.max != null) yMax = yAxis.max;
      const xPad = (xMax - xMin) * 0.05, yPad = (yMax - yMin) * 0.05;
      const xt = niceTicks(xMin - xPad, xMax + xPad, 6);
      const yt = niceTicks(yMin - yPad, yMax + yPad, 6);
      return {
        xMin: xt[0], xMax: xt[xt.length-1], yMin: yt[0], yMax: yt[yt.length-1],
        xTicks: xt, yTicks: yt, zMin, zMax
      };
    }

    // Layers
    const defs = el('defs', {}, svg);
    const gGrid = el('g', {}, svg);
    const gAxes = el('g', {}, svg);
    const gLines = el('g', {}, svg);
    const gPoints = el('g', {}, svg);
    const gLabels = el('g', {}, svg);
    const gAnnot = el('g', {}, svg);   // callouts draw above points and labels
    // Where every point landed this render, so a callout can name a point
    // (or give x/y) instead of pixels.
    const pointAnchors = [];
    // The marks themselves, so a note lands in empty plot rather than on a point.
    const markRects = [];
    const gInteract = el('g', {}, svg);
    const gLegend = el('g', {}, svg);

    // ---- render ----
    function render() {
      gGrid.innerHTML = '';
      gAxes.innerHTML = '';
      gLines.innerHTML = '';
      gPoints.innerHTML = '';
      gAnnot.innerHTML = '';
      pointAnchors.length = 0;
      markRects.length = 0;
      gLabels.innerHTML = '';

      if (isPacked) return renderPacked();

      const r = computeRanges();
      const xScale = v => M.l + ((v - r.xMin) / (r.xMax - r.xMin)) * IW;
      const yScale = v => M.t + IH - ((v - r.yMin) / (r.yMax - r.yMin)) * IH;

      // Both x AND y gridlines
      r.yTicks.forEach(v => {
        const y = yScale(v);
        el('line', { x1: M.l, x2: M.l + IW, y1: y, y2: y, stroke: GRID, 'stroke-width': GRID_W }, gGrid);
        const label = addCommas((+v.toFixed(6)).toString()) + ySuffix;
        txt(label, { x: M.l - 8, y: y + 4, 'text-anchor': 'end',
          'font-size': F_TICK, 'font-weight': TICK_FW, fill: TICK_COL, 'font-family': FONT }, gAxes);
      });
      r.xTicks.forEach(v => {
        const x = xScale(v);
        el('line', { x1: x, x2: x, y1: M.t, y2: M.t + IH, stroke: GRID, 'stroke-width': GRID_W }, gGrid);
        const label = addCommas((+v.toFixed(6)).toString()) + xSuffix;
        txt(label, { x, y: M.t + IH + 18, 'text-anchor': 'middle',
          'font-size': F_TICK, 'font-weight': TICK_FW, fill: TICK_COL, 'font-family': FONT }, gAxes);
      });

      // Both LEFT and BOTTOM spines (dark)
      el('line', { x1: M.l, y1: M.t, x2: M.l, y2: M.t + IH, stroke: AXIS, 'stroke-width': SPINE_W }, gAxes);
      el('line', { x1: M.l, y1: M.t + IH, x2: M.l + IW, y2: M.t + IH, stroke: AXIS, 'stroke-width': SPINE_W }, gAxes);

      // X label bottom-centered
      if (xTitle) txt(xTitle, { x: M.l + IW/2, y: H - 8, 'text-anchor': 'middle',
        'font-size': F_LABEL, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT }, gAxes);
      // Y label rotated, aligned to titleX
      if (yTitle) {
        const t = txt(yTitle, { x: 0, y: 0, 'text-anchor': 'middle',
          'font-size': F_LABEL, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT }, gAxes);
        // Shift anchor right by ~ascent so the rotated text's visual left edge sits at titleX.
        t.setAttribute('transform', `translate(${titleX + 11}, ${M.t + IH/2}) rotate(-90)`);
      }

      // Bubble radius: sqrt-scaled between minSize (area) — clean-charts style
      const bubbleOpts = (opts.plotOptions && opts.plotOptions.bubble) || {};
      const minSizeArea = parseFloat(bubbleOpts.minSize || 60);  // area in "points²"
      const maxSizeArea = parseFloat(bubbleOpts.maxSize || 600);
      const minR = Math.sqrt(minSizeArea / Math.PI);
      const maxR = Math.sqrt(maxSizeArea / Math.PI);

      // Determine bubble color mode: gradient by size when only one bubble series
      const bubbleGrad = (r.zMin !== Infinity && r.zMax !== r.zMin)
        ? gradientColors(START_COL, END_COL, 100) : null;

      seriesDefs.forEach((s, si) => {
        if (!s.visible) return;
        const isBubble = s.type === 'bubble';
        s.points.forEach((p, pi) => {
          if (!p) return;
          const cx = xScale(p.x), cy = yScale(p.y);
          let radius = s.marker.radius || 5;
          let fillColor = s.color;
          if (isBubble && p.z != null && r.zMax > r.zMin) {
            const norm = (p.z - r.zMin) / (r.zMax - r.zMin);
            radius = minR + Math.sqrt(norm) * (maxR - minR);
            if (bubbleGrad) fillColor = bubbleGrad[Math.min(99, Math.floor(norm * 99))];
          }
          drawPoint(gPoints, s, p, cx, cy, radius, si, pi, false, fillColor);
          pointAnchors.push({ series: s.name, name: p.name != null ? String(p.name) : null,
            px: p.x, py: p.y, x: cx, y: cy });
          markRects.push({ x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 });

          // Point labels
          if (s.showLabels && p.name) {
            txt(p.name, { x: cx, y: cy - radius - 4, 'text-anchor': 'middle',
              'font-size': F_POINT_LBL, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT }, gLabels);
          }
        });

        // Regression line
        if (s.regression) {
          const pts = s.points.filter(Boolean).map(p => [p.x, p.y]);
          if (pts.length >= 2) {
            const { slope, intercept } = linreg(pts);
            const y1 = slope * r.xMin + intercept;
            const y2 = slope * r.xMax + intercept;
            el('line', {
              x1: xScale(r.xMin), y1: yScale(y1),
              x2: xScale(r.xMax), y2: yScale(y2),
              stroke: TREND_COL, 'stroke-width': 2, 'stroke-dasharray': '6 4'
            }, gLines);
          }
        }
      });

      layoutCallouts();
    }

    function renderPacked() {
      const flat = [];
      const groupCenters = {};
      const visible = seriesDefs.filter(s => s.visible);
      const n = visible.length;

      // Draw a light bottom spine as a base reference
      el('line', { x1: M.l, y1: M.t + IH, x2: M.l + IW, y2: M.t + IH, stroke: AXIS, 'stroke-width': SPINE_W }, gAxes);

      visible.forEach((s, si) => {
        const gx = M.l + IW * ((si + 0.5) / n);
        const gy = M.t + IH / 2;
        groupCenters[s.name] = { x: gx, y: gy };
        s.points.forEach(p => {
          // Packed bubbles size on `y`; `value` is accepted as an alias.
          if (p && p.y == null && p.value != null) p.y = p.value;
          if (!p || p.y == null) return;
          flat.push({ s, p, group: s.name });
        });
      });
      const yValues = flat.map(b => b.p.y);
      const maxV = Math.max(...yValues), minV = Math.min(...yValues);
      const packedOpts = (opts.plotOptions && opts.plotOptions.packedbubble) || {};
      const minR = parseFloat(packedOpts.minSize || 15) / 2;
      const maxR = parseFloat(packedOpts.maxSize || 55) / 2;
      const grad = gradientColors(START_COL, END_COL, 100);
      flat.forEach(b => {
        const t = (maxV === minV) ? 1 : Math.sqrt((b.p.y - minV) / (maxV - minV));
        b.r = minR + t * (maxR - minR);
        b._fillColor = (n === 1) ? grad[Math.min(99, Math.floor(t * 99))] : b.s.color;
      });
      packLayout(flat, W, H, {
        cx: M.l + IW / 2, cy: M.t + IH / 2,
        groupCenters: (n > 1) ? groupCenters : null
      });
      flat.forEach(b => {
        b.x = Math.max(M.l + b.r + 2, Math.min(M.l + IW - b.r - 2, b.x));
        b.y = Math.max(M.t + b.r + 2, Math.min(M.t + IH - b.r - 2, b.y));
      });
      flat.forEach((b, i) => {
        drawPoint(gPoints, b.s, b.p, b.x, b.y, b.r, seriesDefs.indexOf(b.s), i, false, b._fillColor);
        pointAnchors.push({ series: b.s.name, name: b.p.name != null ? String(b.p.name) : null,
          px: b.p.x, py: b.p.y, x: b.x, y: b.y });
        markRects.push({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 });
        if (b.r > 16 && b.p.name) {
          // Use white text on dark fill, dark on light
          const [rr,gg,bb] = hex2rgb(b._fillColor);
          const L = 0.299*rr + 0.587*gg + 0.114*bb;
          const col = L < 140 ? INV_TEXT : TITLE_COL;
          txt(b.p.name, { x: b.x, y: b.y + 4, 'text-anchor': 'middle',
            'font-size': Math.min(12, b.r * 0.42), 'font-weight': 700,
            fill: col, 'font-family': FONT, style: 'pointer-events:none' }, gLabels);
        }
      });

      layoutCallouts();
    }

    function drawPoint(g, s, p, cx, cy, radius, si, pi, hover, colorOverride) {
      const fillColor = colorOverride || s.color;
      const r = hover ? radius + 2 : radius;
      const sym = (p.marker && p.marker.symbol) || s.marker.symbol || 'circle';
      const path = symbolPath(sym, cx, cy, r);
      let node;
      if (path) {
        node = el('path', { d: path, fill: fillColor,
          stroke: INV_TEXT, 'stroke-width': hover ? 1.5 : 0.8 }, g);
      } else {
        // circle
        node = el('circle', { cx, cy, r, fill: fillColor,
          stroke: INV_TEXT, 'stroke-width': hover ? 1.5 : 0.8 }, g);
      }
      node.classList.add('pt');
      node.setAttribute('data-si', si);
      node.setAttribute('data-pi', pi);
      node.style.cursor = 'pointer';
      return node;
    }

    // Legend — top row(s), left-aligned, below subtitle, wraps as needed
    // `callouts: [{ point | name, x, y, series, text, color }]` — name a point
    // (packed bubbles and labelled scatters have names), or give `x`/`y` and
    // the nearest point in data space wins.
    function layoutCallouts() {
      const cos = opts.callouts || [];
      if (!cos.length || !pointAnchors.length) return;
      const items = cos.map(co => {
        const key = calloutKey(co);
        const pool = co.series != null
          ? pointAnchors.filter(a => a.series === co.series) : pointAnchors;
        if (!pool.length) return null;
        let a = null;
        if (key != null) {
          a = pool.filter(q => q.name === key)[0];
        } else if (co.x != null) {
          let bd = Infinity;
          pool.forEach(q => {
            const dx = q.px - co.x;
            const dy = co.y != null ? q.py - co.y : 0;
            const d = dx * dx + dy * dy;
            if (d < bd) { bd = d; a = q; }
          });
        }
        return a ? { x: a.x, y: a.y, text: co.text, color: co.color } : null;
      }).filter(Boolean);
      // A cloud of points has no single free direction, so the box goes to the
      // emptiest spot near its own point. Packed bubbles do have one: straight
      // out of the cluster.
      drawCallouts(gAnnot, items, { x: M.l, y: M.t, w: IW, h: IH }, isPacked
        ? { mode: 'radial', center: { x: M.l + IW / 2, y: M.t + IH / 2 }, obstacles: markRects }
        : { mode: 'auto', obstacles: markRects });
    }

    function renderLegend() {
      gLegend.innerHTML = '';
      if (!hasLegend) return;
      const startY = titleBlockH + 2;
      _legendLayout.rows.forEach((row, ri) => {
        const rowStartX = 20;
        row.forEach(cell => {
          const s = seriesDefs.find(x => x.name === cell.item.name);
          if (!s) return;
          const x = rowStartX + cell.x;
          const y = startY + ri * LEG_ROW;
          const gr = el('g', { class: 'lg-item', style: 'cursor:pointer' }, gLegend);
          el('rect', { x: x - 2, y: y - 2, width: cell.w, height: LEG_ROW - 2, fill: 'transparent' }, gr);
          el('rect', { x, y: y + 2, width: LEG_ICON, height: LEG_ICON, rx: 2,
            fill: s.visible ? s.color : '#ccc' }, gr);
          txt(s.name, { x: x + LEG_ICON + LEG_ICON_GAP, y: y + 12,
            'font-size': F_LEG, 'font-weight': 600,
            fill: s.visible ? (s.legendColor || TITLE_COL) : '#ccc',
            'text-decoration': s.visible ? 'none' : 'line-through',
            'font-family': FONT }, gr);
          gr.addEventListener('click', () => {
            s.visible = !s.visible;
            render(); renderLegend();
          });
        });
      });
    }

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `position:absolute;pointer-events:none;background:${BG};border:1px solid #bbb;border-radius:4px;padding:6px 8px;font:12px ${FONT};box-shadow:1px 1px 3px rgba(0,0,0,0.12);display:none;white-space:nowrap;z-index:10;`;
    container.appendChild(tooltip);

    function showTip(s, p, ev) {
      const header = p.name || s.name;
      let html = `<div style="font-size:12px;font-weight:700;color:${TITLE_COL};margin-bottom:2px">${esc(header)}</div>`;
      html += `<div><span style="display:inline-block;width:9px;height:9px;background:${s.color};border-radius:50%;margin-right:6px"></span>`
        + `x: <b style="color:${TITLE_COL}">${esc(addCommas(String(p.x)))}${xSuffix}</b>, `
        + `y: <b style="color:${TITLE_COL}">${esc(addCommas(p.y))}${ySuffix}</b>`
        + (p.z != null ? `, z: <b style="color:${TITLE_COL}">${esc(addCommas(String(p.z)))}${s.valueSuffix}</b>` : '')
        + `</div>`;
      tooltip.innerHTML = html;
      tooltip.style.display = 'block';
      const rect = svg.getBoundingClientRect();
      const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
      const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
      let tx = px + 14, ty = py - th / 2;
      if (tx + tw > W - 4) tx = px - tw - 14;
      if (ty < 4) ty = 4;
      if (ty + th > H - 4) ty = H - th - 4;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    }
    function hideTip() { tooltip.style.display = 'none'; }

    // Hover state, apply on enter only
    let currentHover = null;
    function clearHover() {
      const t = currentHover;
      if (!t) return;
      if (t._origR != null) t.setAttribute('r', t._origR);
      if (t._origSW != null) t.setAttribute('stroke-width', t._origSW);
      currentHover = null;
    }
    svg.addEventListener('mousemove', ev => {
      const target = ev.target;
      if (target && target.classList && target.classList.contains('pt')) {
        if (currentHover !== target) {
          clearHover();
          currentHover = target;
          const cr = target.getAttribute('r');
          if (cr != null) { target._origR = cr; target.setAttribute('r', String(+cr + 2)); }
          const csw = target.getAttribute('stroke-width');
          target._origSW = csw;
          target.setAttribute('stroke-width', '1.5');
        }
        const si = +target.getAttribute('data-si');
        const pi = +target.getAttribute('data-pi');
        const s = seriesDefs[si];
        if (s) {
          const p = s.points[pi] || s.points.find(Boolean);
          showTip(s, p, ev);
        }
      } else {
        clearHover();
        hideTip();
      }
    });
    svg.addEventListener('mouseleave', () => { clearHover(); hideTip(); });

    const _origRender = render;
    render = function () { currentHover = null; _origRender(); };

    render();
    renderLegend();

    return {
      redraw: () => { render(); renderLegend(); },
      getSeries: () => seriesDefs
    };
  }

    Charts.scatter = Chart;
})();


Charts.bubble = function (container, opts) {
  opts = opts || {}; opts.chart = opts.chart || {}; opts.chart.type = 'bubble';
  return Charts.scatter(container, opts);
};
Charts.packedBubble = function (container, opts) {
  opts = opts || {}; opts.chart = opts.chart || {}; opts.chart.type = 'packedbubble';
  return Charts.scatter(container, opts);
};

// ─── barList ───────────────────────────────────────────────────────

/*
 * Clean-charts-styled bar LIST engine (Charts.barList).
 *
 * A horizontal bar chart stripped to its two honest elements — the category
 * and the length of its bar. There is no axis, no gridline, no tick and no
 * spine: the category label sits directly ABOVE its own bar, full width, and
 * the value sits at the bar's end. That makes long category names free (they
 * are not squeezed into a left gutter that every other row has to pay for)
 * and suits ranked lists, survey results and share breakdowns.
 *
 * Design language shared with the rest of charts-lib:
 *  - Cream bg, Inter, top-left title/subtitle at the same metrics as the
 *    other engines, all label x-positions aligned to the same titleX = 20
 *  - Theme tokens only (Charts.theme) — no literal colors in the draw code
 *  - Bold value labels, muted category text, hover highlight + shared tooltip
 *  - Negative values are drawn from a shared zero baseline, in the theme's
 *    negative color, since a bar chart CAN represent them honestly
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  let BG, TITLE_COL, SUB_COL, LABEL_COL, SEC_COL, NEG_COL, DEFAULT_COL, COLORS, GRID;
  let CAT_COL, CAT_FW, TICK_COL, TICK_FW, VAL_COL, VAL_FW;
  let FONT, F_TITLE, F_SUB, F_LABEL, F_VALUE;
  function applyTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    BG = t.bg || '#f4f3f0';
    GRID = t.grid || '#dcdbd7';
    TITLE_COL = t.titleColor || '#111111';
    SUB_COL = t.subtitleColor || '#666666';
    LABEL_COL = t.labelColor || '#333333';
    SEC_COL = t.secondaryColor || '#666666';
    NEG_COL = t.negative || '#D1107A';
    DEFAULT_COL = t.defaultColor || '#000000';
    COLORS = t.colors || ['#000000','#2323FF','#4949FF','#7070FF','#9696FF','#BCBCFF','#DDD0FF'];
    // Shared text roles — see the hierarchy comment in theme.js.
    CAT_COL = t.categoryColor || TITLE_COL;
    CAT_FW = t.categoryWeight != null ? t.categoryWeight : 600;
    TICK_COL = t.tickColor || LABEL_COL;
    TICK_FW = t.tickWeight != null ? t.tickWeight : 400;
    VAL_COL = t.valueColor || TITLE_COL;
    VAL_FW = t.valueWeight != null ? t.valueWeight : 700;
    FONT = t.font || "'Inter','Segoe UI',Arial,Helvetica,sans-serif";
    F_TITLE = t.titleSize != null ? t.titleSize : 17;
    F_SUB = t.subtitleSize != null ? t.subtitleSize : 12;
    F_LABEL = t.labelSize != null ? t.labelSize : 11.5;
    F_VALUE = t.valueSize != null ? t.valueSize : 11;
  }

  // Resolve a dataLabels option to a boolean. Accepts `true`/`false` directly or
  // an `{enabled}` object, and falls back to the engine's default when the
  // option says nothing.
  function dlEnabled(opt, dflt) {
    if (opt === false) return false;
    if (opt === true) return true;
    if (opt && opt.enabled != null) return !!opt.enabled;
    return dflt;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, attrs, parent) {
    const e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }

  // ── Heading wrapping ────────────────────────────────────────────────
  // Titles wrap to at most 2 lines, subtitles to at most 3; whatever does
  // not fit is clipped with an ellipsis. Widths are estimated (not measured)
  // so the whole layout can be decided before anything hits the DOM.
  function _headW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.58 : 0.53);
  }
  function _clipLine(str, fontSize, maxW, bold) {
    let s = String(str);
    if (_headW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && _headW(s + '…', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s.,;:]+$/, '') + '…';
  }
  function wrapHeading(str, fontSize, maxW, maxLines, bold) {
    const words = String(str == null ? '' : str).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i];
      if (_headW(next, fontSize, bold) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    lines.push(cur);
    if (lines.length > maxLines) {
      const tail = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(_clipLine(tail, fontSize, maxW, bold));
    }
    return lines.map(l => _clipLine(l, fontSize, maxW, bold));
  }
  const TITLE_LINES = 2, SUB_LINES = 3, TITLE_LH = 21, SUB_LH = 16;
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function addCommas(n) {
    // Strip binary-float noise before stringifying: 25.999999999999996 -> 26,
    // 0.30000000000000004 -> 0.3. Values like these arrive whenever a chart is
    // fed a computed share or a summed column, and String() renders every
    // artefact digit. 12 significant figures sits well inside double
    // precision, so genuine values are untouched while accumulated ~1e-15
    // error rounds away.
    if (typeof n === 'number' && isFinite(n)) n = +n.toPrecision(12);
    const s = String(n);
    const neg = s.startsWith('-') ? '-' : '';
    const abs = neg ? s.slice(1) : s;
    const dot = abs.indexOf('.');
    const intPart = dot < 0 ? abs : abs.slice(0, dot);
    const fracPart = dot < 0 ? '' : abs.slice(dot);
    return neg + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fracPart;
  }
  // Rough advance width. The engines all estimate rather than measure so that
  // layout is decided before anything is added to the DOM.
  function textW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.60 : 0.55);
  }
  function truncate(str, fontSize, maxW, bold) {
    let s = String(str);
    if (textW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && textW(s + '…', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  // ---------------- main ----------------
  // ── callouts ────────────────────────────────────────────────────────────
  // A callout is an anchor dot on the mark, a leader, and a paragraph box.
  // The block is shared by every engine (each is its own IIFE) so a note reads
  // the same everywhere, but *where* the box goes is the engine's call: a
  // column chart puts its notes in a band above the bars, a horizontal bar
  // chart in the gutter past the bar ends, a scatter in the emptiest corner
  // near the point. Passing the marks in as `obstacles` is what keeps a box
  // off the data instead of merely off the other boxes.
  //
  //   drawCallouts(g, items, bounds, {
  //     mode: 'above' | 'right' | 'radial' | 'auto',
  //     obstacles: [{ x, y, w, h }],   // rects the box must not cover
  //     center: { x, y },              // radial mode: what to push away from
  //     gutter: 12                     // band/gutter thickness for above/right
  //   })
  //
  // Placement stays deterministic — candidates are tried in a fixed order —
  // so re-rendering the same data puts every box back where it was.
  const CALLOUT_PAD = 6;          // clearance between a box and anything else
  const CALLOUT_LEAD = 14;        // shortest leader worth drawing

  const CALLOUT_OFFSETS = [
    [ 32, -60], [-32, -60], [ 32, -110], [-32, -110],
    [ 60, -30], [-60, -30], [ 32,  30], [-32,  30],
    [ 60,  30], [-60,  30], [ 32, -160], [-32, -160]
  ];

  function calloutTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    return {
      accent: t.callout || '#e3120b',
      text: t.labelColor || '#333333',
      inverse: t.inverseText || '#FFFFFF',
      bg: t.bg || '#f4f3f0'
    };
  }

  function measureCalloutBox(text) {
    const lines = String(text).split('\n');
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + 16);
    const h = lines.length * 13 + 16;
    return { w: w, h: h };
  }

  // Total area of a rect that lands on top of anything it should not.
  function calloutOverlap(r, rects) {
    let sum = 0;
    for (let i = 0; i < rects.length; i++) {
      const o = rects[i];
      const dx = Math.min(r.x + r.w + CALLOUT_PAD, o.x + o.w) - Math.max(r.x - CALLOUT_PAD, o.x);
      const dy = Math.min(r.y + r.h + CALLOUT_PAD, o.y + o.h) - Math.max(r.y - CALLOUT_PAD, o.y);
      if (dx > 0 && dy > 0) sum += dx * dy;
    }
    return sum;
  }

  function calloutInBounds(r, b) {
    return r.x >= b.x + 2 && r.y >= b.y + 2 &&
           r.x + r.w <= b.x + b.w - 2 && r.y + r.h <= b.y + b.h - 2;
  }

  function drawCalloutBox(g, bx, by, text, edge) {
    const th = calloutTheme();
    const lines = String(text).split('\n');
    const lh = 13, pad = 8;
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + pad * 2);
    const h = lines.length * lh + pad * 2;
    el('rect', { x: bx, y: by, width: w, height: h, rx: 6, ry: 6,
      fill: th.bg, 'fill-opacity': 0.94, stroke: edge, 'stroke-width': 0.8 }, g);
    lines.forEach((ln, i) => {
      txt(ln, { x: bx + pad, y: by + pad + (i + 1) * lh - 3, 'font-size': 10,
        fill: th.text, 'font-family': FONT }, g);
    });
  }

  // Leader from the anchor to the box. Straight when the box sits diagonally
  // from the mark; an elbow when it sits squarely above or beside it, so the
  // line reads as a pointer rather than as another data mark.
  function drawCalloutLeader(g, ax, ay, box, color, mode) {
    const midX = box.x + box.w / 2, midY = box.y + box.h / 2;
    if (mode === 'above' || mode === 'below') {
      const edgeY = mode === 'above' ? box.y + box.h : box.y;
      const stem = mode === 'above' ? edgeY + 8 : edgeY - 8;
      const cx = Math.max(box.x + 8, Math.min(box.x + box.w - 8, ax));
      const d = 'M ' + ax + ' ' + ay + ' L ' + ax + ' ' + stem +
                ' L ' + cx + ' ' + stem + ' L ' + cx + ' ' + edgeY;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    if (mode === 'right' || mode === 'left') {
      const edgeX = mode === 'right' ? box.x : box.x + box.w;
      const stem = mode === 'right' ? edgeX - 8 : edgeX + 8;
      const cy = Math.max(box.y + 8, Math.min(box.y + box.h - 8, ay));
      const d = 'M ' + ax + ' ' + ay + ' L ' + stem + ' ' + ay +
                ' L ' + stem + ' ' + cy + ' L ' + edgeX + ' ' + cy;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    let lx = midX, ly = midY;
    if (ax < box.x) lx = box.x;
    else if (ax > box.x + box.w) lx = box.x + box.w;
    if (ay < box.y) ly = box.y;
    else if (ay > box.y + box.h) ly = box.y + box.h;
    el('line', { x1: ax, y1: ay, x2: lx, y2: ly, stroke: color, 'stroke-width': 1.2 }, g);
  }

  function drawCallouts(g, items, bounds, cfg) {
    if (!items || !items.length) return;
    cfg = cfg || {};
    const mode = cfg.mode || 'auto';
    const obstacles = (cfg.obstacles || []).slice();
    const th = calloutTheme();
    const placed = [];
    const gutter = cfg.gutter != null ? cfg.gutter : 10;

    // Sorting by the axis the band runs along keeps leaders from crossing.
    const ordered = items.slice().sort((a, b) =>
      (mode === 'right' || mode === 'left') ? a.y - b.y : a.x - b.x);

    ordered.forEach(it => {
      const box = measureCalloutBox(it.text);
      const color = it.color || th.accent;
      const blocked = obstacles.concat(placed);
      let best = null, bestCost = Infinity, leader = mode;

      const consider = (x, y, penalty, leadMode) => {
        const r = { x: x, y: y, w: box.w, h: box.h };
        if (!calloutInBounds(r, bounds)) return;
        const cost = calloutOverlap(r, blocked) + (penalty || 0);
        if (cost < bestCost) { bestCost = cost; best = r; leader = leadMode || mode; }
      };

      if (mode === 'above' || mode === 'below') {
        // Band across the top (or bottom): the box keeps to the headroom the
        // engine reserved, and slides sideways from the anchor until it is
        // clear. Distance from the anchor is the tie-breaker, so a note stays
        // over the mark it belongs to whenever the room is there.
        const bandY = mode === 'above'
          ? bounds.y + gutter
          : bounds.y + bounds.h - gutter - box.h;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
          consider(it.x - box.w / 2 + dx, bandY, Math.abs(dx) * 0.5, mode);
        }
        // Second row under the first when the band is full.
        if (bestCost > 0) {
          const row2 = mode === 'above' ? bandY + box.h + CALLOUT_PAD
                                        : bandY - box.h - CALLOUT_PAD;
          for (let step = 0; step <= 24; step++) {
            const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
            consider(it.x - box.w / 2 + dx, row2, 400 + Math.abs(dx) * 0.5, mode);
          }
        }
      } else if (mode === 'right' || mode === 'left') {
        // Gutter past the ends of the bars, one box per row, aligned with the
        // row it annotates.
        const colX = mode === 'right'
          ? bounds.x + bounds.w - gutter - box.w
          : bounds.x + gutter;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dy = Math.ceil(step / 2) * 14 * (step % 2 ? 1 : -1);
          consider(colX, it.y - box.h / 2 + dy, Math.abs(dy) * 0.5, mode);
        }
      } else if (mode === 'radial' && cfg.center) {
        // Push out from the middle of the ring or cluster, so the leader reads
        // as a spoke. Straight out is preferred, but the fan of angles around
        // it matters: a wedge pointing into a crowded side still has a clear
        // diagonal to reach for, and a spoke 30° off still reads as a spoke.
        const vx = it.x - cfg.center.x, vy = it.y - cfg.center.y;
        const base = Math.atan2(vy, vx);
        const FAN = [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31];
        for (let f = 0; f < FAN.length && bestCost > 0; f++) {
          const a = base + FAN[f];
          for (let d = 30; d <= 260 && bestCost > 0; d += 14) {
            const px = it.x + Math.cos(a) * d, py = it.y + Math.sin(a) * d;
            consider(px - box.w / 2, py - box.h / 2,
              d * 0.4 + Math.abs(FAN[f]) * 90, 'auto');
          }
        }
      }

      // Ladder of diagonal offsets: the general fallback, and the default for
      // charts with no obvious free direction (line, scatter).
      if (bestCost > 0) {
        for (let i = 0; i < CALLOUT_OFFSETS.length; i++) {
          const ox = CALLOUT_OFFSETS[i][0], oy = CALLOUT_OFFSETS[i][1];
          consider(ox >= 0 ? it.x + ox : it.x + ox - box.w,
                   oy < 0 ? it.y + oy - box.h : it.y + oy,
                   (mode === 'auto' ? 0 : 800) + i * 2, 'auto');
        }
      }

      if (!best) {
        // Nothing fits: clamp inside and accept the overlap rather than drop a
        // note the author wrote.
        best = {
          x: Math.max(bounds.x + 2, Math.min(bounds.x + bounds.w - box.w - 2, it.x - box.w / 2)),
          y: Math.max(bounds.y + 2, Math.min(bounds.y + bounds.h - box.h - 2, it.y - box.h - 20)),
          w: box.w, h: box.h
        };
        leader = 'auto';
      }
      placed.push(best);

      drawCalloutLeader(g, it.x, it.y, best, color, leader);
      el('circle', { cx: it.x, cy: it.y, r: 4.5, fill: color,
        stroke: th.inverse, 'stroke-width': 1 }, g);
      drawCalloutBox(g, best.x, best.y, it.text, color);
    });
  }

  // Match a callout to a named thing: `name`, `category`, `point`, `code` and
  // `label` are all accepted so the key reads naturally per chart type.
  function calloutKey(co) {
    const k = co.name != null ? co.name
      : co.category != null ? co.category
      : co.point != null ? co.point
      : co.code != null ? co.code
      : co.label != null ? co.label
      : co.row != null ? co.row
      : co.panel != null ? co.panel : null;
    return k == null ? null : String(k);
  }

  function Chart(container, opts) {
    applyTheme();
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.fontFamily = FONT;
    container.style.background = BG;

    const W = container.clientWidth || 800;
    const plot = (opts.plotOptions && opts.plotOptions.barList) ||
                 (opts.plotOptions && opts.plotOptions.series) || {};
    const yAxis = opts.yAxis || {};
    const valueSuffix = plot.valueSuffix != null ? plot.valueSuffix
                      : (yAxis.suffix != null ? yAxis.suffix : '');
    // Value labels are on by default here as in every other engine; with them
    // off the bars give up no room to them and run the full track.
    const showValues = dlEnabled(plot.dataLabels, true);

    // ── Data ────────────────────────────────────────────────────────────
    // Accepts the same shapes as the other engines: [{name,y}], [name, y]
    // pairs, or bare numbers paired with xAxis.categories.
    const cats = (opts.xAxis && opts.xAxis.categories) || [];
    const series = (opts.series && opts.series[0]) || { data: [] };
    const seriesName = series.name || 'Series 1';
    let points = (series.data || []).map((d, i) => {
      let name, y, color;
      if (Array.isArray(d)) { name = d[0]; y = +d[1]; }
      else if (d && typeof d === 'object') { name = d.name; y = +d.y; color = d.color; }
      else { y = +d; }
      if (name == null) name = cats[i] != null ? cats[i] : 'Item ' + (i + 1);
      return { name, y: Number.isFinite(y) ? y : 0, color, idx: i };
    });

    // Ranked lists are the common case, so sorting is built in.
    if (plot.sort === 'desc') points.sort((a, b) => b.y - a.y);
    else if (plot.sort === 'asc') points.sort((a, b) => a.y - b.y);

    const colorByPoint = plot.colorByPoint === true;
    points.forEach((p, i) => {
      if (!p.color) p.color = colorByPoint ? COLORS[i % COLORS.length]
                                           : (series.color || DEFAULT_COL);
      if (p.y < 0 && !colorByPoint && !(series.data[p.idx] || {}).color) p.color = NEG_COL;
    });

    const hasTitle = !!opts.title;
    const hasSub = !!opts.subtitle;
    const titleX = 20;                       // shared left edge, as in bar.js
    const titleLines = hasTitle
      ? wrapHeading(opts.title, F_TITLE, W - 40, TITLE_LINES, true) : [];
    const subLines = hasSub
      ? wrapHeading(opts.subtitle, F_SUB, W - 40, SUB_LINES, false) : [];
    const subY0 = 34 + (titleLines.length ? (titleLines.length - 1) * TITLE_LH + 20 : 0);
    const titleBlockH = (hasTitle ? 24 + (titleLines.length - 1) * TITLE_LH : 0)
                      + (hasSub ? 22 + (subLines.length - 1) * SUB_LH : 0) + 18;
    const marginR = 20, marginB = 16;

    // ── Row metrics ─────────────────────────────────────────────────────
    // A row is: category label, then its bar, then the gap to the next row.
    // The label belongs to the bar under it, so the label→bar gap is much
    // tighter than the row→row gap; that grouping is what lets the eye read
    // the pairs without any rule or axis to separate them.
    const n = points.length;
    const labelH = Math.round(F_LABEL * 1.25);
    const labelGap = 5;
    const rowGap = plot.rowGap != null ? plot.rowGap : 22;
    let barH = plot.barHeight != null ? plot.barHeight : 26;

    // Height: honour an explicit container height by fitting the rows into
    // it; otherwise grow the container to the content, which is what a list
    // of arbitrary length actually wants.
    const rowH = () => labelH + labelGap + barH + rowGap;
    const chromeH = titleBlockH + marginB;
    const fixedH = container.clientHeight;
    let H;
    if (plot.autoHeight === false && fixedH) {
      H = fixedH;
      const avail = H - chromeH;
      if (n) {
        const need = n * rowH() - rowGap;
        if (need > avail) barH = Math.max(6, barH - (need - avail) / n);
      }
    } else {
      H = Math.round(chromeH + (n ? n * rowH() - rowGap : 0));
      container.style.height = H + 'px';
    }

    const svg = el('svg', { xmlns: NS, width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.background = BG;
    svg.style.display = 'block';
    container.appendChild(svg);

    titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: 34 + i * TITLE_LH, 'text-anchor': 'start',
      'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, svg));
    subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * SUB_LH, 'text-anchor': 'start',
      'font-size': F_SUB, fill: SUB_COL, 'font-family': FONT }, svg));

    if (!n) return { getData: () => points };

    // ── Horizontal scale ────────────────────────────────────────────────
    // No axis means no tick rounding: the longest bar simply takes the room
    // that is left once its own value label is accounted for. Bars stay
    // strictly proportional to each other, which is the only comparison this
    // chart type asks the reader to make.
    const fmt = v => (plot.format ? String(plot.format).replace('{y}', addCommas(v))
                                  : addCommas(v) + valueSuffix);
    let widestValue = 0;
    if (showValues) {
      points.forEach(p => { widestValue = Math.max(widestValue, textW(fmt(p.y), F_VALUE, true)); });
    }

    const valuePad = 8;
    const contentL = titleX;
    const contentR = W - marginR;

    const maxV = Math.max(0, ...points.map(p => p.y));
    const minV = Math.min(0, ...points.map(p => p.y));
    const span = (maxV - minV) || 1;

    // Room for the value label is reserved at whichever end a bar can reach:
    // always on the right, and on the left too once any bar runs backwards —
    // otherwise a negative bar's label is drawn off the edge of the canvas.
    const leftGutter = minV < 0 ? widestValue + valuePad : 0;
    const trackL = contentL + leftGutter;
    const trackW = Math.max(40, (contentR - trackL) - widestValue - valuePad);
    const zeroX = trackL + (0 - minV) / span * trackW;
    const scale = v => Math.abs(v) / span * trackW;

    const gBars = el('g', {}, svg);
    const gLabels = el('g', {}, svg);

    // A zero baseline only earns its keep when bars actually go both ways.
    if (minV < 0) {
      el('line', { x1: zeroX, y1: titleBlockH - 6, x2: zeroX, y2: H - marginB,
        stroke: GRID, 'stroke-width': 1 }, gBars);
    }

    // ── Rows ────────────────────────────────────────────────────────────
    let y = titleBlockH;
    // One anchor per bar, so `callouts: [{ name, text }]` can name a row.
    const barAnchors = [];
    // Bar + its label above it: the block a note must not cover.
    const barRects = [];

    points.forEach(p => {
      const w = Math.max(1, scale(p.y));
      const barX = p.y < 0 ? zeroX - w : zeroX;
      const barY = y + labelH + labelGap;

      // Category label, above its own bar and aligned to the bar's starting
      // edge, so the pair reads as one unit. With no negatives that edge is
      // the content left margin, which is the plain left-aligned list.
      const labelX = Math.min(barX, zeroX);
      txt(truncate(p.name, F_LABEL, contentR - labelX, false), {
        x: labelX, y: y + F_LABEL, 'text-anchor': 'start',
        'font-size': F_LABEL, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT
      }, gLabels);

      // Anchor past the value label rather than on the bar end: the value is
      // already sitting there, and a leader through it reads as a strikethrough.
      const valW = textW(fmt(p.y), F_VALUE, true) + valuePad * 2;
      barAnchors.push({ name: String(p.name),
        x: p.y < 0 ? barX - valW : barX + w + valW,
        y: barY + barH / 2 });
      barRects.push({ x: barX, y: y, w: w, h: labelH + labelGap + barH });

      const rect = el('rect', {
        x: barX, y: barY, width: w, height: barH, fill: p.color,
        class: 'blist-bar', 'data-idx': p.idx,
        style: 'cursor:default;transition:opacity .15s'
      }, gBars);
      p._node = rect;

      // Value at the bar's end, always outside it — with no axis to anchor
      // against, the end of the bar is the only place the number can sit
      // without the reader having to guess where the bar stops.
      const vx = p.y < 0 ? barX - valuePad : barX + w + valuePad;
      if (showValues) txt(fmt(p.y), {
        x: vx, y: barY + barH / 2 + F_VALUE * 0.36,
        'text-anchor': p.y < 0 ? 'end' : 'start',
        'font-size': F_VALUE, 'font-weight': VAL_FW,
        fill: plot.valueColor === 'series' ? p.color : VAL_COL,
        'font-family': FONT
      }, gLabels);

      y += labelH + labelGap + barH + rowGap;
    });


    // `callouts: [{ name, text, color }]` — `name` is the bar's own category name.
    (function () {
      const cos = opts.callouts || [];
      if (!cos.length) return;
      const gAnnot = el('g', {}, svg);
      const items = cos.map(co => {
        const key = calloutKey(co);
        const a = key != null ? barAnchors.filter(q => q.name === key)[0] : barAnchors[0];
        return a ? { x: a.x, y: a.y, text: co.text, color: co.color } : null;
      }).filter(Boolean);
      // Rows run the full width, so the free room is past the end of the bar:
      // the note sits in the right gutter, level with its own row.
      drawCallouts(gAnnot, items, { x: 4, y: titleBlockH, w: W - 8, h: H - titleBlockH - 4 },
        { mode: 'right', obstacles: barRects, gutter: 6 });
    })();

    // ── Tooltip (same treatment as the other engines) ───────────────────
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `position:absolute;pointer-events:none;background:${BG};border:1px solid #bbb;border-radius:4px;padding:6px 8px;font:12px ${FONT};box-shadow:1px 1px 3px rgba(0,0,0,0.12);display:none;white-space:nowrap;z-index:10;`;
    container.appendChild(tooltip);

    svg.addEventListener('mousemove', ev => {
      const target = ev.target;
      if (target && target.classList && target.classList.contains('blist-bar')) {
        const p = points.find(q => q._node === target);
        if (!p) return;
        points.forEach(q => { if (q._node) q._node.style.opacity = '1'; });
        target.style.opacity = '0.85';
        tooltip.innerHTML =
          `<div style="font-size:12px;font-weight:700;color:${TITLE_COL};margin-bottom:2px">${esc(seriesName)}</div>` +
          `<div><span style="display:inline-block;width:9px;height:9px;background:${p.color};border-radius:2px;margin-right:6px"></span>${esc(p.name)}: <b style="color:${TITLE_COL}">${esc(fmt(p.y))}</b></div>`;
        tooltip.style.display = 'block';
        const rect = svg.getBoundingClientRect();
        const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
        const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
        let tx = px + 14, ty = py - th / 2;
        if (tx + tw > W - 4) tx = px - tw - 14;
        if (ty < 4) ty = 4;
        if (ty + th > H - 4) ty = H - th - 4;
        tooltip.style.left = tx + 'px';
        tooltip.style.top = ty + 'px';
      } else {
        points.forEach(q => { if (q._node) q._node.style.opacity = '1'; });
        tooltip.style.display = 'none';
      }
    });
    svg.addEventListener('mouseleave', () => {
      points.forEach(q => { if (q._node) q._node.style.opacity = '1'; });
      tooltip.style.display = 'none';
    });

    return { getData: () => points };
  }

    Charts.barList = Chart;
})();

// ─── barInsightTable ───────────────────────────────────────────────

/*
 * Clean-charts-styled bar INSIGHT TABLE engine (Charts.barInsightTable).
 *
 * One row per category, read left to right as a sentence:
 *
 *   Gross Revenue │ ▇▇▇▇▇▇ (FY22)   │ Topline Growth              │ +30%
 *                 │ ▇▇▇▇▇▇▇▇ (FY23) │ Year-over-year expansion    │
 *
 *   [row label]     [single or grouped bars]  [insight headline +   [big
 *                                              description]         stat]
 *
 * Use it when a bar alone under-sells the story: each row carries the
 * comparison (the bars), what it means (the insight text) and the one number
 * a reader should walk away with (the large stat). It is the chart type for
 * income statements, KPI reviews, before/after decks and scorecards.
 *
 * Design language shared with the rest of charts-lib:
 *  - Cream bg, Inter, top-left title/subtitle at the same metrics as the
 *    other engines, all left-column text aligned to the same titleX = 20
 *  - Same 20px outer pad on every side as column/bar
 *  - The five shared text roles only (title / subtitle / category / tick /
 *    value) — no font size or weight is invented here, and every size is
 *    derived from a theme token so a retheme carries through
 *  - Same top legend as column/bar: identical metrics, click to toggle a
 *    series, greyed + struck-through when hidden
 *  - Single series takes the theme's defaultColor; 2+ walk the palette
 *  - Hairline dividers between rows, never around them
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  let BG, TITLE_COL, SUB_COL, SEC_COL, NEG_COL, DEFAULT_COL, COLORS, GRID;
  let CAT_COL, CAT_FW, TICK_COL, TICK_FW, VAL_COL, VAL_FW;
  let FONT, F_TITLE, F_SUB, F_LABEL, F_TICK, F_VALUE;
  function applyTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    BG = t.bg || '#f4f3f0';
    GRID = t.grid || '#dcdbd7';
    TITLE_COL = t.titleColor || '#111111';
    SUB_COL = t.subtitleColor || '#666666';
    SEC_COL = t.secondaryColor || '#666666';
    NEG_COL = t.negative || '#D1107A';
    DEFAULT_COL = t.defaultColor || '#000000';
    COLORS = t.colors || ['#000000','#2323FF','#4949FF','#7070FF','#9696FF','#BCBCFF','#DDD0FF'];
    // Shared text roles — see the hierarchy comment in theme.js.
    CAT_COL = t.categoryColor || TITLE_COL;
    CAT_FW = t.categoryWeight != null ? t.categoryWeight : 600;
    TICK_COL = t.tickColor || '#333333';
    TICK_FW = t.tickWeight != null ? t.tickWeight : 400;
    VAL_COL = t.valueColor || TITLE_COL;
    VAL_FW = t.valueWeight != null ? t.valueWeight : 700;
    FONT = t.font || "'Inter','Segoe UI',Arial,Helvetica,sans-serif";
    F_TITLE = t.titleSize != null ? t.titleSize : 17;
    F_SUB = t.subtitleSize != null ? t.subtitleSize : 12;
    F_LABEL = t.labelSize != null ? t.labelSize : 11.5;
    F_TICK = t.tickSize != null ? t.tickSize : 11;
    F_VALUE = t.valueSize != null ? t.valueSize : 11;
  }

  // Resolve a dataLabels option to a boolean. Accepts `true`/`false` directly or
  // an `{enabled}` object, and falls back to the engine's default when the
  // option says nothing.
  function dlEnabled(opt, dflt) {
    if (opt === false) return false;
    if (opt === true) return true;
    if (opt && opt.enabled != null) return !!opt.enabled;
    return dflt;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, attrs, parent) {
    const e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }

  // ── Heading wrapping ────────────────────────────────────────────────
  // Titles wrap to at most 2 lines, subtitles to at most 3; whatever does
  // not fit is clipped with an ellipsis. Widths are estimated (not measured)
  // so the whole layout can be decided before anything hits the DOM.
  function _headW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.58 : 0.53);
  }
  function _clipLine(str, fontSize, maxW, bold) {
    let s = String(str);
    if (_headW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && _headW(s + '…', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s.,;:]+$/, '') + '…';
  }
  function wrapHeading(str, fontSize, maxW, maxLines, bold) {
    const words = String(str == null ? '' : str).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i];
      if (_headW(next, fontSize, bold) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    lines.push(cur);
    if (lines.length > maxLines) {
      const tail = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(_clipLine(tail, fontSize, maxW, bold));
    }
    return lines.map(l => _clipLine(l, fontSize, maxW, bold));
  }
  const TITLE_LINES = 2, SUB_LINES = 3, TITLE_LH = 21, SUB_LH = 16;
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function addCommas(n) {
    // Strip binary-float noise before stringifying: 25.999999999999996 -> 26,
    // 0.30000000000000004 -> 0.3. Values like these arrive whenever a chart is
    // fed a computed share or a summed column, and String() renders every
    // artefact digit. 12 significant figures sits well inside double
    // precision, so genuine values are untouched while accumulated ~1e-15
    // error rounds away.
    if (typeof n === 'number' && isFinite(n)) n = +n.toPrecision(12);
    const s = String(n);
    const neg = s.startsWith('-') ? '-' : '';
    const abs = neg ? s.slice(1) : s;
    const dot = abs.indexOf('.');
    const intPart = dot < 0 ? abs : abs.slice(0, dot);
    const fracPart = dot < 0 ? '' : abs.slice(dot);
    return neg + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fracPart;
  }
  function textW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.60 : 0.55);
  }
  function truncate(str, fontSize, maxW, bold) {
    let s = String(str);
    if (textW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && textW(s + '…', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  // ---------------- main ----------------
  // ── callouts ────────────────────────────────────────────────────────────
  // A callout is an anchor dot on the mark, a leader, and a paragraph box.
  // The block is shared by every engine (each is its own IIFE) so a note reads
  // the same everywhere, but *where* the box goes is the engine's call: a
  // column chart puts its notes in a band above the bars, a horizontal bar
  // chart in the gutter past the bar ends, a scatter in the emptiest corner
  // near the point. Passing the marks in as `obstacles` is what keeps a box
  // off the data instead of merely off the other boxes.
  //
  //   drawCallouts(g, items, bounds, {
  //     mode: 'above' | 'right' | 'radial' | 'auto',
  //     obstacles: [{ x, y, w, h }],   // rects the box must not cover
  //     center: { x, y },              // radial mode: what to push away from
  //     gutter: 12                     // band/gutter thickness for above/right
  //   })
  //
  // Placement stays deterministic — candidates are tried in a fixed order —
  // so re-rendering the same data puts every box back where it was.
  const CALLOUT_PAD = 6;          // clearance between a box and anything else
  const CALLOUT_LEAD = 14;        // shortest leader worth drawing

  const CALLOUT_OFFSETS = [
    [ 32, -60], [-32, -60], [ 32, -110], [-32, -110],
    [ 60, -30], [-60, -30], [ 32,  30], [-32,  30],
    [ 60,  30], [-60,  30], [ 32, -160], [-32, -160]
  ];

  function calloutTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    return {
      accent: t.callout || '#e3120b',
      text: t.labelColor || '#333333',
      inverse: t.inverseText || '#FFFFFF',
      bg: t.bg || '#f4f3f0'
    };
  }

  function measureCalloutBox(text) {
    const lines = String(text).split('\n');
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + 16);
    const h = lines.length * 13 + 16;
    return { w: w, h: h };
  }

  // Total area of a rect that lands on top of anything it should not.
  function calloutOverlap(r, rects) {
    let sum = 0;
    for (let i = 0; i < rects.length; i++) {
      const o = rects[i];
      const dx = Math.min(r.x + r.w + CALLOUT_PAD, o.x + o.w) - Math.max(r.x - CALLOUT_PAD, o.x);
      const dy = Math.min(r.y + r.h + CALLOUT_PAD, o.y + o.h) - Math.max(r.y - CALLOUT_PAD, o.y);
      if (dx > 0 && dy > 0) sum += dx * dy;
    }
    return sum;
  }

  function calloutInBounds(r, b) {
    return r.x >= b.x + 2 && r.y >= b.y + 2 &&
           r.x + r.w <= b.x + b.w - 2 && r.y + r.h <= b.y + b.h - 2;
  }

  function drawCalloutBox(g, bx, by, text, edge) {
    const th = calloutTheme();
    const lines = String(text).split('\n');
    const lh = 13, pad = 8;
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + pad * 2);
    const h = lines.length * lh + pad * 2;
    el('rect', { x: bx, y: by, width: w, height: h, rx: 6, ry: 6,
      fill: th.bg, 'fill-opacity': 0.94, stroke: edge, 'stroke-width': 0.8 }, g);
    lines.forEach((ln, i) => {
      txt(ln, { x: bx + pad, y: by + pad + (i + 1) * lh - 3, 'font-size': 10,
        fill: th.text, 'font-family': FONT }, g);
    });
  }

  // Leader from the anchor to the box. Straight when the box sits diagonally
  // from the mark; an elbow when it sits squarely above or beside it, so the
  // line reads as a pointer rather than as another data mark.
  function drawCalloutLeader(g, ax, ay, box, color, mode) {
    const midX = box.x + box.w / 2, midY = box.y + box.h / 2;
    if (mode === 'above' || mode === 'below') {
      const edgeY = mode === 'above' ? box.y + box.h : box.y;
      const stem = mode === 'above' ? edgeY + 8 : edgeY - 8;
      const cx = Math.max(box.x + 8, Math.min(box.x + box.w - 8, ax));
      const d = 'M ' + ax + ' ' + ay + ' L ' + ax + ' ' + stem +
                ' L ' + cx + ' ' + stem + ' L ' + cx + ' ' + edgeY;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    if (mode === 'right' || mode === 'left') {
      const edgeX = mode === 'right' ? box.x : box.x + box.w;
      const stem = mode === 'right' ? edgeX - 8 : edgeX + 8;
      const cy = Math.max(box.y + 8, Math.min(box.y + box.h - 8, ay));
      const d = 'M ' + ax + ' ' + ay + ' L ' + stem + ' ' + ay +
                ' L ' + stem + ' ' + cy + ' L ' + edgeX + ' ' + cy;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    let lx = midX, ly = midY;
    if (ax < box.x) lx = box.x;
    else if (ax > box.x + box.w) lx = box.x + box.w;
    if (ay < box.y) ly = box.y;
    else if (ay > box.y + box.h) ly = box.y + box.h;
    el('line', { x1: ax, y1: ay, x2: lx, y2: ly, stroke: color, 'stroke-width': 1.2 }, g);
  }

  function drawCallouts(g, items, bounds, cfg) {
    if (!items || !items.length) return;
    cfg = cfg || {};
    const mode = cfg.mode || 'auto';
    const obstacles = (cfg.obstacles || []).slice();
    const th = calloutTheme();
    const placed = [];
    const gutter = cfg.gutter != null ? cfg.gutter : 10;

    // Sorting by the axis the band runs along keeps leaders from crossing.
    const ordered = items.slice().sort((a, b) =>
      (mode === 'right' || mode === 'left') ? a.y - b.y : a.x - b.x);

    ordered.forEach(it => {
      const box = measureCalloutBox(it.text);
      const color = it.color || th.accent;
      const blocked = obstacles.concat(placed);
      let best = null, bestCost = Infinity, leader = mode;

      const consider = (x, y, penalty, leadMode) => {
        const r = { x: x, y: y, w: box.w, h: box.h };
        if (!calloutInBounds(r, bounds)) return;
        const cost = calloutOverlap(r, blocked) + (penalty || 0);
        if (cost < bestCost) { bestCost = cost; best = r; leader = leadMode || mode; }
      };

      if (mode === 'above' || mode === 'below') {
        // Band across the top (or bottom): the box keeps to the headroom the
        // engine reserved, and slides sideways from the anchor until it is
        // clear. Distance from the anchor is the tie-breaker, so a note stays
        // over the mark it belongs to whenever the room is there.
        const bandY = mode === 'above'
          ? bounds.y + gutter
          : bounds.y + bounds.h - gutter - box.h;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
          consider(it.x - box.w / 2 + dx, bandY, Math.abs(dx) * 0.5, mode);
        }
        // Second row under the first when the band is full.
        if (bestCost > 0) {
          const row2 = mode === 'above' ? bandY + box.h + CALLOUT_PAD
                                        : bandY - box.h - CALLOUT_PAD;
          for (let step = 0; step <= 24; step++) {
            const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
            consider(it.x - box.w / 2 + dx, row2, 400 + Math.abs(dx) * 0.5, mode);
          }
        }
      } else if (mode === 'right' || mode === 'left') {
        // Gutter past the ends of the bars, one box per row, aligned with the
        // row it annotates.
        const colX = mode === 'right'
          ? bounds.x + bounds.w - gutter - box.w
          : bounds.x + gutter;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dy = Math.ceil(step / 2) * 14 * (step % 2 ? 1 : -1);
          consider(colX, it.y - box.h / 2 + dy, Math.abs(dy) * 0.5, mode);
        }
      } else if (mode === 'radial' && cfg.center) {
        // Push out from the middle of the ring or cluster, so the leader reads
        // as a spoke. Straight out is preferred, but the fan of angles around
        // it matters: a wedge pointing into a crowded side still has a clear
        // diagonal to reach for, and a spoke 30° off still reads as a spoke.
        const vx = it.x - cfg.center.x, vy = it.y - cfg.center.y;
        const base = Math.atan2(vy, vx);
        const FAN = [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31];
        for (let f = 0; f < FAN.length && bestCost > 0; f++) {
          const a = base + FAN[f];
          for (let d = 30; d <= 260 && bestCost > 0; d += 14) {
            const px = it.x + Math.cos(a) * d, py = it.y + Math.sin(a) * d;
            consider(px - box.w / 2, py - box.h / 2,
              d * 0.4 + Math.abs(FAN[f]) * 90, 'auto');
          }
        }
      }

      // Ladder of diagonal offsets: the general fallback, and the default for
      // charts with no obvious free direction (line, scatter).
      if (bestCost > 0) {
        for (let i = 0; i < CALLOUT_OFFSETS.length; i++) {
          const ox = CALLOUT_OFFSETS[i][0], oy = CALLOUT_OFFSETS[i][1];
          consider(ox >= 0 ? it.x + ox : it.x + ox - box.w,
                   oy < 0 ? it.y + oy - box.h : it.y + oy,
                   (mode === 'auto' ? 0 : 800) + i * 2, 'auto');
        }
      }

      if (!best) {
        // Nothing fits: clamp inside and accept the overlap rather than drop a
        // note the author wrote.
        best = {
          x: Math.max(bounds.x + 2, Math.min(bounds.x + bounds.w - box.w - 2, it.x - box.w / 2)),
          y: Math.max(bounds.y + 2, Math.min(bounds.y + bounds.h - box.h - 2, it.y - box.h - 20)),
          w: box.w, h: box.h
        };
        leader = 'auto';
      }
      placed.push(best);

      drawCalloutLeader(g, it.x, it.y, best, color, leader);
      el('circle', { cx: it.x, cy: it.y, r: 4.5, fill: color,
        stroke: th.inverse, 'stroke-width': 1 }, g);
      drawCalloutBox(g, best.x, best.y, it.text, color);
    });
  }

  // Match a callout to a named thing: `name`, `category`, `point`, `code` and
  // `label` are all accepted so the key reads naturally per chart type.
  function calloutKey(co) {
    const k = co.name != null ? co.name
      : co.category != null ? co.category
      : co.point != null ? co.point
      : co.code != null ? co.code
      : co.label != null ? co.label
      : co.row != null ? co.row
      : co.panel != null ? co.panel : null;
    return k == null ? null : String(k);
  }

  function Chart(container, opts) {
    applyTheme();
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.fontFamily = FONT;
    container.style.background = BG;

    const W = container.clientWidth || 900;
    const plot = (opts.plotOptions && opts.plotOptions.barInsightTable) ||
                 (opts.plotOptions && opts.plotOptions.series) || {};
    // Bar-end values are on by default, like the other bar engines.
    const showValues = dlEnabled(plot.dataLabels, true);
    const yAxis = opts.yAxis || {};
    const valueSuffix = plot.valueSuffix != null ? plot.valueSuffix
                      : (yAxis.suffix != null ? yAxis.suffix : '');
    const fmt = v => (plot.format ? String(plot.format).replace('{y}', addCommas(v))
                                  : addCommas(v) + valueSuffix);

    // ── Data ────────────────────────────────────────────────────────────
    // Rows come from xAxis.categories (or from point names); every series
    // contributes one bar per row, so 1 series = single bars, 2+ = groups.
    const cats = (opts.xAxis && opts.xAxis.categories) || [];
    const nSeriesAll = (opts.series || []).length;
    const seriesDefs = (opts.series || []).map((s, si) => ({
      name: s.name || 'Series ' + (si + 1),
      // Same rule as column/bar: one series is the theme's default color,
      // several walk the palette.
      color: s.color || (nSeriesAll === 1 ? DEFAULT_COL : COLORS[si % COLORS.length]),
      data: s.data || [],
      visible: true
    }));

    const nRows = Math.max(cats.length, ...seriesDefs.map(s => s.data.length), 0);
    const pointAt = (s, i) => {
      const d = s.data[i];
      if (d == null) return null;
      if (Array.isArray(d)) return { y: +d[1], name: d[0] };
      if (typeof d === 'object') return { y: +d.y, name: d.name, color: d.color, extra: d };
      return { y: +d };
    };

    // Per-row extras (insight headline, description, stat) may be given as a
    // parallel `rows` array — the shape an author reaches for first — or
    // hung off the data points of any series.
    const rowsOpt = opts.rows || plot.rows || [];
    const rows = [];
    for (let i = 0; i < nRows; i++) {
      const pts = seriesDefs.map(s => {
        const p = pointAt(s, i);
        return p && Number.isFinite(p.y) ? p : null;
      });
      const fromPoint = pts.find(p => p && p.extra &&
        (p.extra.insight != null || p.extra.stat != null || p.extra.description != null)) || {};
      const ex = Object.assign({}, fromPoint.extra || {}, rowsOpt[i] || {});
      const firstNamed = pts.find(p => p && p.name);
      rows.push({
        idx: i,
        label: ex.label != null ? ex.label
             : (cats[i] != null ? cats[i] : (firstNamed ? firstNamed.name : 'Row ' + (i + 1))),
        insight: ex.insight != null ? ex.insight : (ex.headline != null ? ex.headline : ''),
        description: ex.description != null ? ex.description : '',
        stat: ex.stat,
        statNote: ex.statNote != null ? ex.statNote : '',
        statColor: ex.statColor,
        points: pts
      });
    }

    // A stat is the point of this chart type, so one is derived when the
    // author did not supply it: the change from the first series to the last,
    // which is what a two-column comparison is asking about anyway.
    const autoStat = plot.autoStat !== false && seriesDefs.length >= 2;
    rows.forEach(r => {
      if (r.stat != null || !autoStat) return;
      const a = r.points[0], b = r.points[r.points.length - 1];
      if (!a || !b || !a.y) return;
      const pct = (b.y - a.y) / Math.abs(a.y) * 100;
      if (!Number.isFinite(pct)) return;
      const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10;
      r.stat = (rounded > 0 ? '+' : '') + rounded + '%';
      if (r.statColor == null && plot.statColorBySign) r.statColor = rounded < 0 ? NEG_COL : TITLE_COL;
    });

    const hasInsight = rows.some(r => r.insight || r.description);
    const hasStat = rows.some(r => r.stat != null && r.stat !== '');

    // ── Title / subtitle ────────────────────────────────────────────────
    const hasTitle = !!opts.title;
    const hasSub = !!opts.subtitle;
    const titleX = 20;
    const titleLines = hasTitle
      ? wrapHeading(opts.title, F_TITLE, W - 40, TITLE_LINES, true) : [];
    const subLines = hasSub
      ? wrapHeading(opts.subtitle, F_SUB, W - 40, SUB_LINES, false) : [];
    const subY0 = 34 + (titleLines.length ? (titleLines.length - 1) * TITLE_LH + 20 : 0);
    const titleBlockH = (hasTitle ? 24 + (titleLines.length - 1) * TITLE_LH : 0)
                      + (hasSub ? 22 + (subLines.length - 1) * SUB_LH : 0) + 18;

    // ── Legend layout (top row(s), auto-enabled when multi-series) ──────
    // Metrics, wrap rule and toggle behaviour are the column/bar legend's.
    const F_LEG = 12, LEG_ROW = 20, LEG_GAP = 18, LEG_ICON = 12, LEG_ICON_GAP = 6;
    const legendEnabled = (opts.legend && opts.legend.enabled != null)
      ? !!opts.legend.enabled : (seriesDefs.length > 1);
    function layoutLegend(items, availW) {
      const widths = items.map(it =>
        LEG_ICON + LEG_ICON_GAP + Math.ceil(String(it.name).length * F_LEG * 0.55) + LEG_GAP);
      const rowsOut = [];
      let cur = [], curX = 0;
      for (let i = 0; i < items.length; i++) {
        if (cur.length && curX + widths[i] > availW) { rowsOut.push(cur); cur = []; curX = 0; }
        cur.push({ item: items[i], x: curX, w: widths[i] });
        curX += widths[i];
      }
      if (cur.length) rowsOut.push(cur);
      return { rows: rowsOut, height: rowsOut.length * LEG_ROW };
    }
    const legendLayout = legendEnabled
      ? layoutLegend(seriesDefs, W - 40) : { rows: [], height: 0 };
    const legendZone = legendLayout.height + (legendEnabled ? 18 : 0);

    // ── Column geometry ─────────────────────────────────────────────────
    // Four columns: row label, bars, insight text, stat. Widths are fractions
    // of the content width (or px when >1), and the columns that carry no
    // data collapse so a bars-only table still fills the canvas.
    // The outer pad is 20 on every side, as in column/bar.
    const marginR = 20, marginB = 20;
    const contentL = titleX, contentR = W - marginR;
    const contentW = contentR - contentL;
    const COL_GAP = plot.columnGap != null ? plot.columnGap : 22;

    const cw = plot.columns || {};
    const px = (v, dflt) => (v == null ? dflt : (v > 1 ? v : v * contentW));
    let wLabel = px(cw.label, contentW * 0.22);
    let wBars = px(cw.bars, contentW * 0.30);
    let wInsight = hasInsight ? px(cw.insight, contentW * 0.30) : 0;
    let wStat = hasStat ? px(cw.stat, contentW * 0.16) : 0;
    const gaps = COL_GAP * ((wInsight ? 1 : 0) + (wStat ? 1 : 0) + 1);
    // Any slack (or overflow) is absorbed by the bars column — it is the only
    // one whose width is a design choice rather than a function of its text.
    wBars += contentW - (wLabel + wBars + wInsight + wStat + gaps);
    wBars = Math.max(40, wBars);

    const xLabel = contentL;
    const xBars = xLabel + wLabel + COL_GAP;
    const xInsight = xBars + wBars + COL_GAP;

    // ── Type scale ──────────────────────────────────────────────────────
    // Every size is a theme token or derived from one, so retuning titleSize
    // / labelSize / tickSize in the theme moves this chart with the rest.
    const F_INSIGHT = plot.insightSize != null ? plot.insightSize : F_LABEL + 1.5;
    const F_DESC = plot.descriptionSize != null ? plot.descriptionSize : F_TICK;
    const F_STAT = plot.statSize != null ? plot.statSize : Math.round(F_TITLE * 1.5);
    const LABEL_LH = Math.round(F_LABEL * 1.35);
    const IN_LH = Math.round(F_INSIGHT * 1.3);
    const DESC_LH = Math.round(F_DESC * 1.35);
    const LABEL_LINES = plot.labelLines != null ? plot.labelLines : 2;
    const DESC_LINES = plot.descriptionLines != null ? plot.descriptionLines : 2;

    // ── Row metrics ─────────────────────────────────────────────────────
    const barH = plot.barHeight != null ? plot.barHeight : 20;
    const barGap = plot.barGap != null ? plot.barGap : 4;
    const rowPad = plot.rowPadding != null ? plot.rowPadding : 18;
    const dividers = plot.dividers !== false;

    // Long text is wrapped, not cut: row labels take up to 2 lines (as the
    // column engine wraps its category names), insight headlines 2, the
    // description `descriptionLines`. Only the last line is ever ellipsised.
    rows.forEach(r => {
      r.labelLines = wrapHeading(r.label, F_LABEL, wLabel, LABEL_LINES, CAT_FW >= 600);
      r.insightLines = r.insight
        ? wrapHeading(r.insight, F_INSIGHT, wInsight, 2, true) : [];
      r.descLines = r.description
        ? wrapHeading(r.description, F_DESC, wInsight, DESC_LINES, false) : [];
    });

    const container_ = container;
    const svg = el('svg', { xmlns: NS });
    svg.style.background = BG;
    svg.style.display = 'block';
    container_.appendChild(svg);

    // ── Tooltip (same treatment as the other engines) ───────────────────
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `position:absolute;pointer-events:none;background:${BG};border:1px solid #bbb;border-radius:4px;padding:6px 8px;font:12px ${FONT};box-shadow:1px 1px 3px rgba(0,0,0,0.12);display:none;white-space:nowrap;z-index:10;`;
    container_.appendChild(tooltip);

    let bars = [], H = 0;

    function render() {
      svg.innerHTML = '';
      bars = [];
      const vis = seriesDefs.filter(s => s.visible);
      const nSeries = Math.max(1, vis.length);

      // Row heights depend on how many series are showing, so they are
      // measured on every render rather than once.
      rows.forEach(r => {
        const barsH = vis.length ? vis.length * barH + (vis.length - 1) * barGap : 0;
        const labelH = r.labelLines.length * LABEL_LH;
        const insightH = r.insightLines.length * IN_LH + r.descLines.length * DESC_LH;
        const statH = r.stat != null && r.stat !== ''
          ? F_STAT * 1.1 + (r.statNote ? DESC_LH : 0) : 0;
        // A note on this row lives under its bars, so the row has to carry it.
        r.calloutBox = null;
        (opts.callouts || []).forEach(co => {
          const key = calloutKey(co);
          if (key != null && key !== String(r.name != null ? r.name : r.label)) return;
          if (r.calloutBox) return;
          r.calloutBox = Object.assign(measureCalloutBox(co.text), { text: co.text, color: co.color });
        });
        r.noteH = r.calloutBox ? r.calloutBox.h + 8 : 0;
        r.h = Math.max(barsH, labelH, insightH, statH) + rowPad * 2 + r.noteH;
      });

      const bodyH = rows.reduce((a, r) => a + r.h, 0);
      const chromeH = titleBlockH + legendZone + marginB;
      const fixedH = container_.clientHeight;
      if (plot.autoHeight === false && fixedH) H = fixedH;
      else { H = Math.round(chromeH + bodyH); container_.style.height = H + 'px'; }
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

      titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: 34 + i * TITLE_LH, 'text-anchor': 'start',
        'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, svg));
      subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * SUB_LH, 'text-anchor': 'start',
        'font-size': F_SUB, fill: SUB_COL, 'font-family': FONT }, svg));

      // Legend — identical metrics and toggle behaviour to column/bar.
      if (legendEnabled) {
        const startY = titleBlockH + 2;
        legendLayout.rows.forEach((row, ri) => {
          row.forEach(cell => {
            const s = cell.item;
            const x = titleX + cell.x;
            const y = startY + ri * LEG_ROW;
            const gr = el('g', { class: 'lg-item', style: 'cursor:pointer' }, svg);
            el('rect', { x: x - 2, y: y - 2, width: cell.w, height: LEG_ROW - 2, fill: 'transparent' }, gr);
            el('rect', { x, y: y + 2, width: LEG_ICON, height: LEG_ICON, rx: 2,
              fill: s.visible ? s.color : '#ccc' }, gr);
            txt(s.name, { x: x + LEG_ICON + LEG_ICON_GAP, y: y + 12,
              'font-size': F_LEG, 'font-weight': CAT_FW,
              fill: s.visible ? CAT_COL : '#ccc',
              'text-decoration': s.visible ? 'none' : 'line-through',
              'font-family': FONT }, gr);
            gr.addEventListener('click', () => {
              if (vis.length === 1 && s.visible) return;   // never hide the last one
              s.visible = !s.visible;
              render();
            });
          });
        });
      }

      if (!nRows) return;

      // ── Shared horizontal scale ───────────────────────────────────────
      // Every row is measured against the same maximum — that is the whole
      // point of stacking the rows in one table, and a per-row scale would
      // quietly make a small row look like a big one.
      const values = [];
      rows.forEach(r => r.points.forEach((p, si) =>
        { if (p && seriesDefs[si].visible) values.push(p.y); }));
      const maxV = Math.max(0, ...values);
      const minV = Math.min(0, ...values);
      const span = (maxV - minV) || 1;
      // With value labels on, the track gives up the room its widest label
      // needs at either end it can reach — otherwise the longest bar's number
      // runs into the insight column.
      const LBL_PAD = 8;
      let labelRoom = 0;
      if (showValues) {
        values.forEach(v => { labelRoom = Math.max(labelRoom, textW(fmt(v), F_VALUE, true)); });
        labelRoom += LBL_PAD;
      }
      const trackL = xBars + (minV < 0 ? labelRoom : 0);
      const trackW = Math.max(20, wBars - labelRoom - (minV < 0 ? labelRoom : 0));
      const zeroX = trackL + (0 - minV) / span * trackW;
      const scale = v => Math.abs(v) / span * trackW;

      const gBars = el('g', {}, svg);
      const gText = el('g', {}, svg);
      const gAnnot = el('g', {}, svg);
      // One anchor per drawn bar, so `callouts: [{ row, series, text }]` can
      // name a row of the table.
      const rowAnchors = [];
      // The bars themselves. The label, insight and stat columns are ruled out
      // by the bounds below instead — they are whole columns, not stray marks.
      const barRects = [];

      let y = titleBlockH + legendZone;
      rows.forEach((r, ri) => {
        const mid = y + (r.h - (r.noteH || 0)) / 2;

        // Row label — the category role, vertically centered against the whole
        // row rather than the bars, so it stays put when the insight text is
        // the tallest thing in the row.
        let ly = mid - (r.labelLines.length - 1) * LABEL_LH / 2 + F_LABEL * 0.36;
        r.labelLines.forEach(ln => {
          txt(ln, { x: xLabel, y: ly, 'text-anchor': 'start',
            'font-size': F_LABEL, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT }, gText);
          ly += LABEL_LH;
        });

        // Bars — one per visible series, grouped and centered in the row.
        const barsH = vis.length * barH + (vis.length - 1) * barGap;
        let by = mid - barsH / 2;
        r.points.forEach((p, si) => {
          if (!seriesDefs[si].visible) return;
          if (!p) { by += barH + barGap; return; }
          const w = Math.max(1, scale(p.y));
          const bx = p.y < 0 ? zeroX - w : zeroX;
          const color = p.color || (p.y < 0 && nSeries === 1 ? NEG_COL : seriesDefs[si].color);
          const rect = el('rect', {
            x: bx, y: by, width: w, height: barH, fill: color,
            class: 'bit-bar', style: 'cursor:default;transition:opacity .15s'
          }, gBars);
          bars.push({ node: rect, row: r, series: seriesDefs[si], value: p.y, color });
          // Past the value label, for the same reason as barList.
          const valW = showValues ? textW(fmt(p.y), F_VALUE, true) + LBL_PAD * 2 : 6;
          rowAnchors.push({ name: String(r.name != null ? r.name : r.label),
            series: seriesDefs[si].name,
            x: p.y < 0 ? bx - valW : bx + w + valW,
            y: by + barH / 2 });
          barRects.push({ x: Math.min(bx, zeroX), y: by, w: Math.abs(w), h: barH });
          if (showValues) {
            // Value role, outside the bar end — as in barList.
            txt(fmt(p.y), {
              x: p.y < 0 ? bx - LBL_PAD : bx + w + LBL_PAD, y: by + barH / 2 + F_VALUE * 0.36,
              'text-anchor': p.y < 0 ? 'end' : 'start',
              'font-size': F_VALUE, 'font-weight': VAL_FW, fill: VAL_COL, 'font-family': FONT
            }, gText);
          }
          by += barH + barGap;
        });

        // Insight column — headline in the category role, description under it
        // in the quieter tick role. The pair is centered as one block.
        if (wInsight && (r.insightLines.length || r.descLines.length)) {
          const blockH = r.insightLines.length * IN_LH + r.descLines.length * DESC_LH;
          let ty = mid - blockH / 2 + F_INSIGHT * 0.9;
          r.insightLines.forEach(ln => {
            txt(ln, { x: xInsight, y: ty, 'text-anchor': 'start', 'font-size': F_INSIGHT,
              'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT }, gText);
            ty += IN_LH;
          });
          r.descLines.forEach(ln => {
            txt(ln, { x: xInsight, y: ty, 'text-anchor': 'start', 'font-size': F_DESC,
              'font-weight': TICK_FW, fill: SEC_COL, 'font-family': FONT }, gText);
            ty += DESC_LH;
          });
        }

        // Stat column — the value role at display size, right-aligned to the
        // content edge so the column reads as one stack of figures.
        if (wStat && r.stat != null && r.stat !== '') {
          const noteH = r.statNote ? DESC_LH : 0;
          const sy = mid + F_STAT * 0.36 - noteH / 2;
          txt(truncate(r.stat, F_STAT, wStat, true), {
            x: contentR, y: sy, 'text-anchor': 'end', 'font-size': F_STAT,
            'font-weight': VAL_FW, fill: r.statColor || VAL_COL, 'font-family': FONT
          }, gText);
          if (r.statNote) {
            txt(truncate(r.statNote, F_DESC, wStat, false), {
              x: contentR, y: sy + DESC_LH + 2, 'text-anchor': 'end',
              'font-size': F_DESC, 'font-weight': TICK_FW, fill: SEC_COL, 'font-family': FONT
            }, gText);
          }
        }

        // `callouts: [{ row, series, text, color }]` — the note sits in the
        // strip its row reserved, left-aligned with the bars, with a short
        // elbow from the annotated bar's end. Nothing else in the row moves.
        if (r.calloutBox) {
          const anchor = rowAnchors.filter(q =>
            q.name === String(r.name != null ? r.name : r.label))[0];
          // Sit the box under the bar it annotates — centred on the anchor and
          // clamped to the track — so the leader is a short drop rather than a
          // diagonal across the row.
          // Hug the end of the track the anchor is nearest. Centring the box
          // on the anchor puts it over the value labels of the row's other
          // series; against the track edge it clears them.
          const rightHalf = anchor && anchor.x > trackL + trackW / 2;
          const bx = anchor
            ? (rightHalf ? trackL + trackW - r.calloutBox.w : trackL)
            : trackL;
          const box = { x: bx, y: y + r.h - r.calloutBox.h - rowPad,
            w: r.calloutBox.w, h: r.calloutBox.h };
          const color = r.calloutBox.color || calloutTheme().accent;
          if (anchor) {
            drawCalloutLeader(gAnnot, anchor.x, anchor.y, box, color, 'below');
            el('circle', { cx: anchor.x, cy: anchor.y, r: 4.5, fill: color,
              stroke: calloutTheme().inverse, 'stroke-width': 1 }, gAnnot);
          }
          drawCalloutBox(gAnnot, box.x, box.y, r.calloutBox.text, color);
        }

        y += r.h;
        if (dividers && ri < rows.length - 1) {
          el('line', { x1: contentL, y1: y, x2: contentR, y2: y,
            stroke: GRID, 'stroke-width': 1 }, gBars);
        }
      });


    }

    render();

    svg.addEventListener('mousemove', ev => {
      const target = ev.target;
      const hit = target && bars.find(b => b.node === target);
      if (hit) {
        bars.forEach(b => { b.node.style.opacity = '1'; });
        hit.node.style.opacity = '0.85';
        tooltip.innerHTML =
          `<div style="font-size:12px;font-weight:700;color:${TITLE_COL};margin-bottom:2px">${esc(hit.row.label)}</div>` +
          `<div><span style="display:inline-block;width:9px;height:9px;background:${hit.color};border-radius:2px;margin-right:6px"></span>${esc(hit.series.name)}: <b style="color:${TITLE_COL}">${esc(fmt(hit.value))}</b></div>` +
          (hit.row.stat != null && hit.row.stat !== ''
            ? `<div style="color:${SEC_COL};margin-top:2px">${esc(hit.row.insight || 'Change')}: <b style="color:${TITLE_COL}">${esc(hit.row.stat)}</b></div>` : '');
        tooltip.style.display = 'block';
        const rect = svg.getBoundingClientRect();
        const cx = ev.clientX - rect.left, cy = ev.clientY - rect.top;
        const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
        let tx = cx + 14, ty = cy - th / 2;
        if (tx + tw > W - 4) tx = cx - tw - 14;
        if (ty < 4) ty = 4;
        if (ty + th > H - 4) ty = H - th - 4;
        tooltip.style.left = tx + 'px';
        tooltip.style.top = ty + 'px';
      } else {
        bars.forEach(b => { b.node.style.opacity = '1'; });
        tooltip.style.display = 'none';
      }
    });
    svg.addEventListener('mouseleave', () => {
      bars.forEach(b => { b.node.style.opacity = '1'; });
      tooltip.style.display = 'none';
    });

    return { getData: () => rows, redraw: render };
  }

    Charts.barInsightTable = Chart;
})();

// ─── waffle ────────────────────────────────────────────────────────

/*
 * Clean-charts-styled WAFFLE engine (Charts.waffle).
 *
 * A row of part-of-whole panels. Each panel is one statistic: a large
 * percentage headline, a grid of dots underneath where the filled dots are
 * the share, then a bold label and a wrapped description. Thin vertical
 * rules separate the panels.
 *
 *   29%              30%              15%
 *   ●●●●●●●●●●   │   ●●●●●●●●●●   │   ●●●●●●●●●●
 *   ●●●●●●●●●●   │   ●●●●●●●●●●   │   ●●●●●●●●●●
 *   Growth Focus │   Resource…    │   Customer…
 *   Organizations…│  Companies…   │   Firms…
 *
 * Reach for it when the reader has to feel a proportion rather than compare
 * magnitudes: survey shares, adoption rates, "x in 100" facts. A bar chart
 * compares lengths; a waffle counts units, and 100 dots make "29%" concrete.
 *
 * Design language shared with the rest of charts-lib:
 *  - Cream bg, Inter, top-left title/subtitle at the same metrics as the
 *    other engines, title x-position aligned to the shared titleX = 20
 *  - Theme tokens only (Charts.theme) — no literal colors in the draw code
 *  - Same data shapes as barList: [{name,y}], [name,y] pairs, or bare
 *    numbers paired with xAxis.categories
 *  - Hover highlight + shared tooltip
 *
 * Values are read as percentages of the grid by default (y = 29 fills 29 of
 * 100 dots). Set plotOptions.waffle.total to count against something else.
 * Negative values are not representable in a part-of-whole grid, so they are
 * clamped to zero — the same honesty rule the donut engine applies.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  let BG, TITLE_COL, SUB_COL, LABEL_COL, SEC_COL, DEFAULT_COL, COLORS, GRID;
  let CAT_COL, CAT_FW, VAL_COL, VAL_FW;
  let FONT, F_TITLE, F_SUB, F_LABEL;
  function applyTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    BG = t.bg || '#f4f3f0';
    GRID = t.grid || '#dcdbd7';
    TITLE_COL = t.titleColor || '#111111';
    SUB_COL = t.subtitleColor || '#666666';
    LABEL_COL = t.labelColor || '#333333';
    SEC_COL = t.secondaryColor || '#666666';
    DEFAULT_COL = t.defaultColor || '#000000';
    COLORS = t.colors || ['#000000','#2323FF','#4949FF','#7070FF','#9696FF','#BCBCFF','#DDD0FF'];
    CAT_COL = t.categoryColor || TITLE_COL;
    CAT_FW = t.categoryWeight != null ? t.categoryWeight : 600;
    VAL_COL = t.valueColor || TITLE_COL;
    VAL_FW = t.valueWeight != null ? t.valueWeight : 700;
    FONT = t.font || "'Inter','Segoe UI',Arial,Helvetica,sans-serif";
    F_TITLE = t.titleSize != null ? t.titleSize : 17;
    F_SUB = t.subtitleSize != null ? t.subtitleSize : 12;
    F_LABEL = t.labelSize != null ? t.labelSize : 11.5;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, attrs, parent) {
    const e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }

  // ── Text estimation / wrapping (same approach as the other engines:
  // widths are estimated, not measured, so layout is settled before
  // anything reaches the DOM) ──────────────────────────────────────────
  function _headW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.58 : 0.53);
  }
  function _clipLine(str, fontSize, maxW, bold) {
    let s = String(str);
    if (_headW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && _headW(s + '…', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s.,;:]+$/, '') + '…';
  }
  function wrapHeading(str, fontSize, maxW, maxLines, bold) {
    const words = String(str == null ? '' : str).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i];
      if (_headW(next, fontSize, bold) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    lines.push(cur);
    if (lines.length > maxLines) {
      const tail = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(_clipLine(tail, fontSize, maxW, bold));
    }
    return lines.map(l => _clipLine(l, fontSize, maxW, bold));
  }
  const TITLE_LINES = 2, SUB_LINES = 3, TITLE_LH = 21, SUB_LH = 16;
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function addCommas(n) {
    // Strip binary-float noise before stringifying: 25.999999999999996 -> 26,
    // 0.30000000000000004 -> 0.3. Values like these arrive whenever a chart is
    // fed a computed share or a summed column, and String() renders every
    // artefact digit. 12 significant figures sits well inside double
    // precision, so genuine values are untouched while accumulated ~1e-15
    // error rounds away.
    if (typeof n === 'number' && isFinite(n)) n = +n.toPrecision(12);
    const s = String(n);
    const neg = s.startsWith('-') ? '-' : '';
    const abs = neg ? s.slice(1) : s;
    const dot = abs.indexOf('.');
    const intPart = dot < 0 ? abs : abs.slice(0, dot);
    const fracPart = dot < 0 ? '' : abs.slice(dot);
    return neg + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fracPart;
  }

  // ---------------- main ----------------
  // ── callouts ────────────────────────────────────────────────────────────
  // A callout is an anchor dot on the mark, a leader, and a paragraph box.
  // The block is shared by every engine (each is its own IIFE) so a note reads
  // the same everywhere, but *where* the box goes is the engine's call: a
  // column chart puts its notes in a band above the bars, a horizontal bar
  // chart in the gutter past the bar ends, a scatter in the emptiest corner
  // near the point. Passing the marks in as `obstacles` is what keeps a box
  // off the data instead of merely off the other boxes.
  //
  //   drawCallouts(g, items, bounds, {
  //     mode: 'above' | 'right' | 'radial' | 'auto',
  //     obstacles: [{ x, y, w, h }],   // rects the box must not cover
  //     center: { x, y },              // radial mode: what to push away from
  //     gutter: 12                     // band/gutter thickness for above/right
  //   })
  //
  // Placement stays deterministic — candidates are tried in a fixed order —
  // so re-rendering the same data puts every box back where it was.
  const CALLOUT_PAD = 6;          // clearance between a box and anything else
  const CALLOUT_LEAD = 14;        // shortest leader worth drawing

  const CALLOUT_OFFSETS = [
    [ 32, -60], [-32, -60], [ 32, -110], [-32, -110],
    [ 60, -30], [-60, -30], [ 32,  30], [-32,  30],
    [ 60,  30], [-60,  30], [ 32, -160], [-32, -160]
  ];

  function calloutTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    return {
      accent: t.callout || '#e3120b',
      text: t.labelColor || '#333333',
      inverse: t.inverseText || '#FFFFFF',
      bg: t.bg || '#f4f3f0'
    };
  }

  function measureCalloutBox(text) {
    const lines = String(text).split('\n');
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + 16);
    const h = lines.length * 13 + 16;
    return { w: w, h: h };
  }

  // Total area of a rect that lands on top of anything it should not.
  function calloutOverlap(r, rects) {
    let sum = 0;
    for (let i = 0; i < rects.length; i++) {
      const o = rects[i];
      const dx = Math.min(r.x + r.w + CALLOUT_PAD, o.x + o.w) - Math.max(r.x - CALLOUT_PAD, o.x);
      const dy = Math.min(r.y + r.h + CALLOUT_PAD, o.y + o.h) - Math.max(r.y - CALLOUT_PAD, o.y);
      if (dx > 0 && dy > 0) sum += dx * dy;
    }
    return sum;
  }

  function calloutInBounds(r, b) {
    return r.x >= b.x + 2 && r.y >= b.y + 2 &&
           r.x + r.w <= b.x + b.w - 2 && r.y + r.h <= b.y + b.h - 2;
  }

  function drawCalloutBox(g, bx, by, text, edge) {
    const th = calloutTheme();
    const lines = String(text).split('\n');
    const lh = 13, pad = 8;
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + pad * 2);
    const h = lines.length * lh + pad * 2;
    el('rect', { x: bx, y: by, width: w, height: h, rx: 6, ry: 6,
      fill: th.bg, 'fill-opacity': 0.94, stroke: edge, 'stroke-width': 0.8 }, g);
    lines.forEach((ln, i) => {
      txt(ln, { x: bx + pad, y: by + pad + (i + 1) * lh - 3, 'font-size': 10,
        fill: th.text, 'font-family': FONT }, g);
    });
  }

  // Leader from the anchor to the box. Straight when the box sits diagonally
  // from the mark; an elbow when it sits squarely above or beside it, so the
  // line reads as a pointer rather than as another data mark.
  function drawCalloutLeader(g, ax, ay, box, color, mode) {
    const midX = box.x + box.w / 2, midY = box.y + box.h / 2;
    if (mode === 'above' || mode === 'below') {
      const edgeY = mode === 'above' ? box.y + box.h : box.y;
      const stem = mode === 'above' ? edgeY + 8 : edgeY - 8;
      const cx = Math.max(box.x + 8, Math.min(box.x + box.w - 8, ax));
      const d = 'M ' + ax + ' ' + ay + ' L ' + ax + ' ' + stem +
                ' L ' + cx + ' ' + stem + ' L ' + cx + ' ' + edgeY;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    if (mode === 'right' || mode === 'left') {
      const edgeX = mode === 'right' ? box.x : box.x + box.w;
      const stem = mode === 'right' ? edgeX - 8 : edgeX + 8;
      const cy = Math.max(box.y + 8, Math.min(box.y + box.h - 8, ay));
      const d = 'M ' + ax + ' ' + ay + ' L ' + stem + ' ' + ay +
                ' L ' + stem + ' ' + cy + ' L ' + edgeX + ' ' + cy;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    let lx = midX, ly = midY;
    if (ax < box.x) lx = box.x;
    else if (ax > box.x + box.w) lx = box.x + box.w;
    if (ay < box.y) ly = box.y;
    else if (ay > box.y + box.h) ly = box.y + box.h;
    el('line', { x1: ax, y1: ay, x2: lx, y2: ly, stroke: color, 'stroke-width': 1.2 }, g);
  }

  function drawCallouts(g, items, bounds, cfg) {
    if (!items || !items.length) return;
    cfg = cfg || {};
    const mode = cfg.mode || 'auto';
    const obstacles = (cfg.obstacles || []).slice();
    const th = calloutTheme();
    const placed = [];
    const gutter = cfg.gutter != null ? cfg.gutter : 10;

    // Sorting by the axis the band runs along keeps leaders from crossing.
    const ordered = items.slice().sort((a, b) =>
      (mode === 'right' || mode === 'left') ? a.y - b.y : a.x - b.x);

    ordered.forEach(it => {
      const box = measureCalloutBox(it.text);
      const color = it.color || th.accent;
      const blocked = obstacles.concat(placed);
      let best = null, bestCost = Infinity, leader = mode;

      const consider = (x, y, penalty, leadMode) => {
        const r = { x: x, y: y, w: box.w, h: box.h };
        if (!calloutInBounds(r, bounds)) return;
        const cost = calloutOverlap(r, blocked) + (penalty || 0);
        if (cost < bestCost) { bestCost = cost; best = r; leader = leadMode || mode; }
      };

      if (mode === 'above' || mode === 'below') {
        // Band across the top (or bottom): the box keeps to the headroom the
        // engine reserved, and slides sideways from the anchor until it is
        // clear. Distance from the anchor is the tie-breaker, so a note stays
        // over the mark it belongs to whenever the room is there.
        const bandY = mode === 'above'
          ? bounds.y + gutter
          : bounds.y + bounds.h - gutter - box.h;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
          consider(it.x - box.w / 2 + dx, bandY, Math.abs(dx) * 0.5, mode);
        }
        // Second row under the first when the band is full.
        if (bestCost > 0) {
          const row2 = mode === 'above' ? bandY + box.h + CALLOUT_PAD
                                        : bandY - box.h - CALLOUT_PAD;
          for (let step = 0; step <= 24; step++) {
            const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
            consider(it.x - box.w / 2 + dx, row2, 400 + Math.abs(dx) * 0.5, mode);
          }
        }
      } else if (mode === 'right' || mode === 'left') {
        // Gutter past the ends of the bars, one box per row, aligned with the
        // row it annotates.
        const colX = mode === 'right'
          ? bounds.x + bounds.w - gutter - box.w
          : bounds.x + gutter;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dy = Math.ceil(step / 2) * 14 * (step % 2 ? 1 : -1);
          consider(colX, it.y - box.h / 2 + dy, Math.abs(dy) * 0.5, mode);
        }
      } else if (mode === 'radial' && cfg.center) {
        // Push out from the middle of the ring or cluster, so the leader reads
        // as a spoke. Straight out is preferred, but the fan of angles around
        // it matters: a wedge pointing into a crowded side still has a clear
        // diagonal to reach for, and a spoke 30° off still reads as a spoke.
        const vx = it.x - cfg.center.x, vy = it.y - cfg.center.y;
        const base = Math.atan2(vy, vx);
        const FAN = [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31];
        for (let f = 0; f < FAN.length && bestCost > 0; f++) {
          const a = base + FAN[f];
          for (let d = 30; d <= 260 && bestCost > 0; d += 14) {
            const px = it.x + Math.cos(a) * d, py = it.y + Math.sin(a) * d;
            consider(px - box.w / 2, py - box.h / 2,
              d * 0.4 + Math.abs(FAN[f]) * 90, 'auto');
          }
        }
      }

      // Ladder of diagonal offsets: the general fallback, and the default for
      // charts with no obvious free direction (line, scatter).
      if (bestCost > 0) {
        for (let i = 0; i < CALLOUT_OFFSETS.length; i++) {
          const ox = CALLOUT_OFFSETS[i][0], oy = CALLOUT_OFFSETS[i][1];
          consider(ox >= 0 ? it.x + ox : it.x + ox - box.w,
                   oy < 0 ? it.y + oy - box.h : it.y + oy,
                   (mode === 'auto' ? 0 : 800) + i * 2, 'auto');
        }
      }

      if (!best) {
        // Nothing fits: clamp inside and accept the overlap rather than drop a
        // note the author wrote.
        best = {
          x: Math.max(bounds.x + 2, Math.min(bounds.x + bounds.w - box.w - 2, it.x - box.w / 2)),
          y: Math.max(bounds.y + 2, Math.min(bounds.y + bounds.h - box.h - 2, it.y - box.h - 20)),
          w: box.w, h: box.h
        };
        leader = 'auto';
      }
      placed.push(best);

      drawCalloutLeader(g, it.x, it.y, best, color, leader);
      el('circle', { cx: it.x, cy: it.y, r: 4.5, fill: color,
        stroke: th.inverse, 'stroke-width': 1 }, g);
      drawCalloutBox(g, best.x, best.y, it.text, color);
    });
  }

  // Match a callout to a named thing: `name`, `category`, `point`, `code` and
  // `label` are all accepted so the key reads naturally per chart type.
  function calloutKey(co) {
    const k = co.name != null ? co.name
      : co.category != null ? co.category
      : co.point != null ? co.point
      : co.code != null ? co.code
      : co.label != null ? co.label
      : co.row != null ? co.row
      : co.panel != null ? co.panel : null;
    return k == null ? null : String(k);
  }

  function Chart(container, opts) {
    applyTheme();
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.fontFamily = FONT;
    container.style.background = BG;

    const W = container.clientWidth || 800;
    const plot = (opts.plotOptions && opts.plotOptions.waffle) ||
                 (opts.plotOptions && opts.plotOptions.series) || {};
    const yAxis = opts.yAxis || {};
    const valueSuffix = plot.valueSuffix != null ? plot.valueSuffix
                      : (yAxis.suffix != null ? yAxis.suffix : '%');

    // ── Data ────────────────────────────────────────────────────────────
    const cats = (opts.xAxis && opts.xAxis.categories) || [];
    const rows = opts.rows || [];
    const series = (opts.series && opts.series[0]) || { data: [] };
    const seriesName = series.name || 'Series 1';
    const points = (series.data || []).map((d, i) => {
      let name, y, color, description;
      if (Array.isArray(d)) { name = d[0]; y = +d[1]; }
      else if (d && typeof d === 'object') {
        name = d.name; y = +d.y; color = d.color; description = d.description;
      } else { y = +d; }
      if (name == null) name = cats[i] != null ? cats[i] : 'Item ' + (i + 1);
      if (description == null && rows[i]) description = rows[i].description;
      // A part-of-whole grid cannot show a negative share honestly.
      y = Number.isFinite(y) ? Math.max(0, y) : 0;
      return { name, y, color, description, idx: i };
    });

    const gridRows = plot.rows != null ? plot.rows : 10;
    const gridCols = plot.cols != null ? plot.cols : 10;
    const cells = gridRows * gridCols;
    const total = plot.total != null ? plot.total : 100;
    // Fill bottom-up by default: the block of filled dots sits on the floor
    // of the grid, which reads as a level the way a bar does.
    const fromTop = plot.fillDirection === 'top';
    const dividers = plot.dividers !== false;

    points.forEach((p, i) => {
      if (!p.color) p.color = plot.colorByPoint === false
        ? (series.color || COLORS[1] || DEFAULT_COL)
        : (series.color || COLORS[(i + 1) % COLORS.length]);
      p.filled = Math.max(0, Math.min(cells, Math.round(p.y / total * cells)));
    });

    const emptyColor = plot.emptyColor || '#a7adc4';
    const emptyOpacity = plot.emptyOpacity != null ? plot.emptyOpacity : 1;

    // ── Headings ────────────────────────────────────────────────────────
    const hasTitle = !!opts.title, hasSub = !!opts.subtitle;
    const titleX = 20;
    const titleLines = hasTitle ? wrapHeading(opts.title, F_TITLE, W - 40, TITLE_LINES, true) : [];
    const subLines = hasSub ? wrapHeading(opts.subtitle, F_SUB, W - 40, SUB_LINES, false) : [];
    const subY0 = 34 + (titleLines.length ? (titleLines.length - 1) * TITLE_LH + 20 : 0);
    const titleBlockH = (hasTitle ? 24 + (titleLines.length - 1) * TITLE_LH : 0)
                      + (hasSub ? 22 + (subLines.length - 1) * SUB_LH : 0) + 26;

    // ── Panel geometry ──────────────────────────────────────────────────
    // Panels split the content width evenly; the dot grid is sized to
    // whatever is left inside a panel once its own gutter is taken, and
    // capped so a two-panel chart doesn't blow the dots up to blobs.
    const n = points.length;
    if (!n) {
      const svg0 = el('svg', { xmlns: NS, width: W, height: titleBlockH,
        viewBox: `0 0 ${W} ${titleBlockH}` });
      svg0.style.background = BG; svg0.style.display = 'block';
      container.appendChild(svg0);
      titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: 34 + i * TITLE_LH,
        'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, svg0));
      subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * SUB_LH,
        'font-size': F_SUB, fill: SUB_COL, 'font-family': FONT }, svg0));
      return { getData: () => points };
    }

    const marginR = 20, marginB = 18;
    const contentL = titleX, contentR = W - marginR;
    const panelW = (contentR - contentL) / n;
    const panelPad = plot.panelPadding != null ? plot.panelPadding : 22;
    const innerW = Math.max(40, panelW - panelPad * 2);

    const gapRatio = plot.dotGap != null ? plot.dotGap : 0.42;  // gap as a share of dot size
    const maxDot = plot.dotSize != null ? plot.dotSize : 11;
    let dot = Math.min(maxDot, innerW / (gridCols + (gridCols - 1) * gapRatio));
    const gap = dot * gapRatio;
    const gridW = gridCols * dot + (gridCols - 1) * gap;
    const gridH = gridRows * dot + (gridRows - 1) * gap;

    const F_STAT = plot.statSize != null ? plot.statSize : 34;
    const F_NAME = plot.nameSize != null ? plot.nameSize : F_LABEL + 1;
    const F_DESC = plot.descriptionSize != null ? plot.descriptionSize : F_LABEL;
    const DESC_LH = Math.round(F_DESC * 1.42);

    const statH = F_STAT + 14;
    const nameH = F_NAME + 16;
    // Every panel gets the same body height so the dividers and the label
    // baselines line up across the row, however uneven the copy is.
    const descLinesPer = points.map(p => p.description
      ? wrapHeading(p.description, F_DESC, innerW, plot.descriptionLines || 5, false) : []);
    const maxDescLines = Math.max(0, ...descLinesPer.map(l => l.length));
    const descH = maxDescLines ? maxDescLines * DESC_LH + 6 : 0;

    const bodyH = statH + gridH + 14 + nameH + descH;
    // A waffle panel is a solid block — big number, dot grid, name, note — with
    // no slack anywhere inside it. So the notes get their own band above the
    // panels, and the chart simply grows to hold it.
    let calloutBand = 0;
    (opts.callouts || []).forEach(co => {
      calloutBand = Math.max(calloutBand, measureCalloutBox(co.text).h);
    });
    if (calloutBand) calloutBand += 22;
    const H = Math.round(titleBlockH + calloutBand + bodyH + marginB);
    container.style.height = H + 'px';

    const svg = el('svg', { xmlns: NS, width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.background = BG;
    svg.style.display = 'block';
    container.appendChild(svg);

    titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: 34 + i * TITLE_LH, 'text-anchor': 'start',
      'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, svg));
    subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * SUB_LH, 'text-anchor': 'start',
      'font-size': F_SUB, fill: SUB_COL, 'font-family': FONT }, svg));

    const fmt = v => (plot.format ? String(plot.format).replace('{y}', addCommas(v))
                                  : addCommas(v) + valueSuffix);

    const gPanels = el('g', {}, svg);
    const top = titleBlockH + calloutBand;
    const gridTop = top + statH;

    // ── Dividers: hairlines between panels, spanning the grid + label
    // block only, so they read as separators and not as chart furniture.
    if (dividers && n > 1) {
      for (let i = 1; i < n; i++) {
        const x = contentL + panelW * i;
        el('line', { x1: x, y1: gridTop - 8, x2: x, y2: top + bodyH - 4,
          stroke: SEC_COL, 'stroke-width': 1, opacity: 0.55 }, gPanels);
      }
    }

    // One anchor per panel, so `callouts: [{ name, text }]` can name a stat.
    const panelAnchors = [];

    points.forEach((p, pi) => {
      const cx = contentL + panelW * pi + panelW / 2;   // panel center line
      const g = el('g', {}, gPanels);
      // Anchor on the headline stat: it is what the note is about, and the
      // leader then runs up through clear space instead of across the dots.
      panelAnchors.push({ name: String(p.name), x: cx, y: top + 6 });

      // Headline stat, centered over the grid.
      txt(fmt(p.y), {
        x: cx, y: top + F_STAT, 'text-anchor': 'middle',
        'font-size': F_STAT, 'font-weight': VAL_FW, fill: VAL_COL, 'font-family': FONT
      }, g);

      // Dot grid. Cells are indexed row-major from whichever end the fill
      // starts, so a partially filled row always sits adjacent to the full
      // ones instead of floating.
      const gx = cx - gridW / 2;
      const dots = [];
      for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
          const order = fromTop ? r * gridCols + c
                                : (gridRows - 1 - r) * gridCols + c;
          const on = order < p.filled;
          const node = el('circle', {
            cx: gx + c * (dot + gap) + dot / 2,
            cy: gridTop + r * (dot + gap) + dot / 2,
            r: dot / 2,
            fill: on ? p.color : emptyColor,
            opacity: on ? 1 : emptyOpacity,
            class: 'waffle-dot', 'data-idx': p.idx
          }, g);
          dots.push(node);
        }
      }
      p._dots = dots;

      // Label, then the description under it — the same category → detail
      // hierarchy the other engines use (semibold dark name, quiet body).
      const nameY = gridTop + gridH + 14 + F_NAME;
      txt(_clipLine(p.name, F_NAME, panelW - 8, true), {
        x: cx, y: nameY, 'text-anchor': 'middle',
        'font-size': F_NAME, 'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT
      }, g);

      (descLinesPer[pi] || []).forEach((ln, li) => {
        txt(ln, { x: cx, y: nameY + 16 + li * DESC_LH, 'text-anchor': 'middle',
          'font-size': F_DESC, fill: SUB_COL, 'font-family': FONT }, g);
      });

      // Hit area for the whole panel, so hovering anywhere in it works.
      const hit = el('rect', {
        x: contentL + panelW * pi, y: top, width: panelW, height: bodyH,
        fill: 'transparent', class: 'waffle-hit', 'data-idx': p.idx,
        style: 'cursor:default'
      }, g);
      p._hit = hit;
    });


    // `callouts: [{ name, text, color }]` — `name` is the panel's own name.
    (function () {
      const cos = opts.callouts || [];
      if (!cos.length) return;
      const gAnnot = el('g', {}, svg);
      const items = cos.map(co => {
        const key = calloutKey(co);
        const a = key != null ? panelAnchors.filter(q => q.name === key)[0] : panelAnchors[0];
        return a ? { x: a.x, y: a.y, text: co.text, color: co.color } : null;
      }).filter(Boolean);
      drawCallouts(gAnnot, items, { x: 4, y: titleBlockH, w: W - 8, h: calloutBand + bodyH },
        { mode: 'above', gutter: 4, obstacles: panelAnchors.map(a =>
          ({ x: a.x - panelW / 2, y: top, w: panelW, h: bodyH })) });
    })();

    // ── Tooltip (same treatment as the other engines) ───────────────────
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `position:absolute;pointer-events:none;background:${BG};border:1px solid #bbb;border-radius:4px;padding:6px 8px;font:12px ${FONT};box-shadow:1px 1px 3px rgba(0,0,0,0.12);display:none;max-width:260px;white-space:normal;z-index:10;`;
    container.appendChild(tooltip);

    function clearHL() {
      points.forEach(q => q._dots.forEach(d => { d.style.opacity = ''; }));
    }

    svg.addEventListener('mousemove', ev => {
      const target = ev.target;
      const isPanel = target && target.classList &&
        (target.classList.contains('waffle-hit') || target.classList.contains('waffle-dot'));
      if (!isPanel) { clearHL(); tooltip.style.display = 'none'; return; }
      const idx = +target.getAttribute('data-idx');
      const p = points.find(q => q.idx === idx);
      if (!p) return;
      clearHL();
      points.forEach(q => { if (q !== p) q._dots.forEach(d => { d.style.opacity = '0.45'; }); });
      tooltip.innerHTML =
        `<div style="font-size:12px;font-weight:700;color:${TITLE_COL};margin-bottom:2px">${esc(seriesName)}</div>` +
        `<div><span style="display:inline-block;width:9px;height:9px;background:${p.color};border-radius:50%;margin-right:6px"></span>${esc(p.name)}: <b style="color:${TITLE_COL}">${esc(fmt(p.y))}</b></div>` +
        (p.description ? `<div style="margin-top:3px;color:${LABEL_COL}">${esc(p.description)}</div>` : '');
      tooltip.style.display = 'block';
      const rect = svg.getBoundingClientRect();
      const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
      const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
      let tx = px + 14, ty = py - th / 2;
      if (tx + tw > W - 4) tx = px - tw - 14;
      if (tx < 4) tx = 4;
      if (ty < 4) ty = 4;
      if (ty + th > H - 4) ty = H - th - 4;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    });
    svg.addEventListener('mouseleave', () => { clearHL(); tooltip.style.display = 'none'; });

    return { getData: () => points };
  }

    Charts.waffle = Chart;
})();

// ─── geofacet ──────────────────────────────────────────────────────

/*
 * Geofacet chart engine — small multiples laid out on a geographic grid.
 *
 * One tile per region, positioned by (row, col) in a grid that approximates
 * the real map. Three tile variants, selected with chart.variant:
 *   'bar'   — code + value on top, mini horizontal progress bar below (default)
 *   'heat'  — solid choropleth tile, color scaled across the value range
 *   'gauge' — radial progress ring with the value in the middle
 *
 * Regions present in the grid but absent from the data render as faint
 * placeholder labels, so the map keeps its shape (see the gauge example).
 *
 * Cells are always square and share one derived gap, so the tiles read as a
 * single block at any container aspect ratio. Spacing is deliberately not
 * configurable.
 *
 * Grids: 'us' (default, 50 states + DC) via Charts.geofacet.grids. Pass
 * chart.grid as an array of {code,row,col} (optionally {name}) for any other
 * geography.
 *
 * Interactions: hover tile → highlight + tooltip.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  let BG, TITLE_COL, SUB_COL, LABEL_COL, SEC_COL, START_COL, END_COL, INV_COL;
  let CAT_COL, CAT_FW, TICK_COL, TICK_FW, VAL_COL, VAL_FW;
  let FONT, F_TITLE, F_SUB, F_CODE, F_VALUE;
  function applyTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    BG = t.bg || '#f4f3f0';
    TITLE_COL = t.titleColor || '#111111';
    SUB_COL = t.subtitleColor || '#666666';
    LABEL_COL = t.labelColor || '#333333';
    SEC_COL = t.secondaryColor || '#666666';
    START_COL = t.gradientStart || '#000000';
    END_COL = t.gradientEnd || '#2323FF';
    INV_COL = t.inverseText || '#FFFFFF';
    // Shared text roles — see the hierarchy comment in theme.js.
    CAT_COL = t.categoryColor || TITLE_COL;
    CAT_FW = t.categoryWeight != null ? t.categoryWeight : 600;
    TICK_COL = t.tickColor || LABEL_COL;
    TICK_FW = t.tickWeight != null ? t.tickWeight : 400;
    VAL_COL = t.valueColor || TITLE_COL;
    VAL_FW = t.valueWeight != null ? t.valueWeight : 700;
    FONT = t.font || "'Inter','Segoe UI',Arial,Helvetica,sans-serif";
    F_TITLE = t.titleSize != null ? t.titleSize : 17;
    F_SUB = t.subtitleSize != null ? t.subtitleSize : 12;
    F_CODE = t.pointLabelSize != null ? t.pointLabelSize : 10;
    F_VALUE = t.valueSize != null ? t.valueSize : 11;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, attrs, parent) {
    const e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }

  // ── Heading wrapping ────────────────────────────────────────────────
  // Titles wrap to at most 2 lines, subtitles to at most 3; whatever does
  // not fit is clipped with an ellipsis. Widths are estimated (not measured)
  // so the whole layout can be decided before anything hits the DOM.
  function _headW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.58 : 0.53);
  }
  function _clipLine(str, fontSize, maxW, bold) {
    let s = String(str);
    if (_headW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && _headW(s + '…', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s.,;:]+$/, '') + '…';
  }
  function wrapHeading(str, fontSize, maxW, maxLines, bold) {
    const words = String(str == null ? '' : str).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i];
      if (_headW(next, fontSize, bold) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    lines.push(cur);
    if (lines.length > maxLines) {
      const tail = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(_clipLine(tail, fontSize, maxW, bold));
    }
    return lines.map(l => _clipLine(l, fontSize, maxW, bold));
  }
  const TITLE_LINES = 2, SUB_LINES = 3, TITLE_LH = 21, SUB_LH = 16;
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function hex2rgb(hex) {
    const c = hex.replace('#', '');
    const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgb2hex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function mix(startHex, endHex, t) {
    const [r1, g1, b1] = hex2rgb(startHex);
    const [r2, g2, b2] = hex2rgb(endHex);
    return rgb2hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  }
  function lighten(hex, amt) {
    const [r, g, b] = hex2rgb(hex);
    return rgb2hex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  }
  function luminance(hex) {
    const [r, g, b] = hex2rgb(hex);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  // ── Grids ───────────────────────────────────────────────────────────
  // us_state_grid: 50 states + DC on an 11-col × 8-row lattice.
  const US_GRID = (function () {
    const rows = [
      [[11, 'ME']],
      [[6, 'WI'], [10, 'VT'], [11, 'NH']],
      [[1, 'WA'], [2, 'ID'], [3, 'MT'], [4, 'ND'], [5, 'MN'], [6, 'IL'], [7, 'MI'], [9, 'NY'], [10, 'MA']],
      [[1, 'OR'], [2, 'NV'], [3, 'WY'], [4, 'SD'], [5, 'IA'], [6, 'IN'], [7, 'OH'], [8, 'PA'], [9, 'NJ'], [10, 'CT'], [11, 'RI']],
      [[1, 'CA'], [2, 'UT'], [3, 'CO'], [4, 'NE'], [5, 'MO'], [6, 'KY'], [7, 'WV'], [8, 'VA'], [9, 'MD'], [10, 'DE']],
      [[2, 'AZ'], [3, 'NM'], [4, 'KS'], [5, 'AR'], [6, 'TN'], [7, 'NC'], [8, 'SC'], [9, 'DC']],
      [[4, 'OK'], [5, 'LA'], [6, 'MS'], [7, 'AL'], [8, 'GA']],
      [[1, 'AK'], [2, 'HI'], [4, 'TX'], [9, 'FL']]
    ];
    const out = [];
    rows.forEach((cells, r) => cells.forEach(([col, code]) => out.push({ code, row: r + 1, col })));
    return out;
  })();

  // ---------------- main ----------------
  // ── callouts ────────────────────────────────────────────────────────────
  // A callout is an anchor dot on the mark, a leader, and a paragraph box.
  // The block is shared by every engine (each is its own IIFE) so a note reads
  // the same everywhere, but *where* the box goes is the engine's call: a
  // column chart puts its notes in a band above the bars, a horizontal bar
  // chart in the gutter past the bar ends, a scatter in the emptiest corner
  // near the point. Passing the marks in as `obstacles` is what keeps a box
  // off the data instead of merely off the other boxes.
  //
  //   drawCallouts(g, items, bounds, {
  //     mode: 'above' | 'right' | 'radial' | 'auto',
  //     obstacles: [{ x, y, w, h }],   // rects the box must not cover
  //     center: { x, y },              // radial mode: what to push away from
  //     gutter: 12                     // band/gutter thickness for above/right
  //   })
  //
  // Placement stays deterministic — candidates are tried in a fixed order —
  // so re-rendering the same data puts every box back where it was.
  const CALLOUT_PAD = 6;          // clearance between a box and anything else
  const CALLOUT_LEAD = 14;        // shortest leader worth drawing

  const CALLOUT_OFFSETS = [
    [ 32, -60], [-32, -60], [ 32, -110], [-32, -110],
    [ 60, -30], [-60, -30], [ 32,  30], [-32,  30],
    [ 60,  30], [-60,  30], [ 32, -160], [-32, -160]
  ];

  function calloutTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    return {
      accent: t.callout || '#e3120b',
      text: t.labelColor || '#333333',
      inverse: t.inverseText || '#FFFFFF',
      bg: t.bg || '#f4f3f0'
    };
  }

  function measureCalloutBox(text) {
    const lines = String(text).split('\n');
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + 16);
    const h = lines.length * 13 + 16;
    return { w: w, h: h };
  }

  // Total area of a rect that lands on top of anything it should not.
  function calloutOverlap(r, rects) {
    let sum = 0;
    for (let i = 0; i < rects.length; i++) {
      const o = rects[i];
      const dx = Math.min(r.x + r.w + CALLOUT_PAD, o.x + o.w) - Math.max(r.x - CALLOUT_PAD, o.x);
      const dy = Math.min(r.y + r.h + CALLOUT_PAD, o.y + o.h) - Math.max(r.y - CALLOUT_PAD, o.y);
      if (dx > 0 && dy > 0) sum += dx * dy;
    }
    return sum;
  }

  function calloutInBounds(r, b) {
    return r.x >= b.x + 2 && r.y >= b.y + 2 &&
           r.x + r.w <= b.x + b.w - 2 && r.y + r.h <= b.y + b.h - 2;
  }

  function drawCalloutBox(g, bx, by, text, edge) {
    const th = calloutTheme();
    const lines = String(text).split('\n');
    const lh = 13, pad = 8;
    const w = Math.min(220, Math.max.apply(null, lines.map(l => l.length)) * 6 + pad * 2);
    const h = lines.length * lh + pad * 2;
    el('rect', { x: bx, y: by, width: w, height: h, rx: 6, ry: 6,
      fill: th.bg, 'fill-opacity': 0.94, stroke: edge, 'stroke-width': 0.8 }, g);
    lines.forEach((ln, i) => {
      txt(ln, { x: bx + pad, y: by + pad + (i + 1) * lh - 3, 'font-size': 10,
        fill: th.text, 'font-family': FONT }, g);
    });
  }

  // Leader from the anchor to the box. Straight when the box sits diagonally
  // from the mark; an elbow when it sits squarely above or beside it, so the
  // line reads as a pointer rather than as another data mark.
  function drawCalloutLeader(g, ax, ay, box, color, mode) {
    const midX = box.x + box.w / 2, midY = box.y + box.h / 2;
    if (mode === 'above' || mode === 'below') {
      const edgeY = mode === 'above' ? box.y + box.h : box.y;
      const stem = mode === 'above' ? edgeY + 8 : edgeY - 8;
      const cx = Math.max(box.x + 8, Math.min(box.x + box.w - 8, ax));
      const d = 'M ' + ax + ' ' + ay + ' L ' + ax + ' ' + stem +
                ' L ' + cx + ' ' + stem + ' L ' + cx + ' ' + edgeY;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    if (mode === 'right' || mode === 'left') {
      const edgeX = mode === 'right' ? box.x : box.x + box.w;
      const stem = mode === 'right' ? edgeX - 8 : edgeX + 8;
      const cy = Math.max(box.y + 8, Math.min(box.y + box.h - 8, ay));
      const d = 'M ' + ax + ' ' + ay + ' L ' + stem + ' ' + ay +
                ' L ' + stem + ' ' + cy + ' L ' + edgeX + ' ' + cy;
      el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 1.2,
        'stroke-linejoin': 'round' }, g);
      return;
    }
    let lx = midX, ly = midY;
    if (ax < box.x) lx = box.x;
    else if (ax > box.x + box.w) lx = box.x + box.w;
    if (ay < box.y) ly = box.y;
    else if (ay > box.y + box.h) ly = box.y + box.h;
    el('line', { x1: ax, y1: ay, x2: lx, y2: ly, stroke: color, 'stroke-width': 1.2 }, g);
  }

  function drawCallouts(g, items, bounds, cfg) {
    if (!items || !items.length) return;
    cfg = cfg || {};
    const mode = cfg.mode || 'auto';
    const obstacles = (cfg.obstacles || []).slice();
    const th = calloutTheme();
    const placed = [];
    const gutter = cfg.gutter != null ? cfg.gutter : 10;

    // Sorting by the axis the band runs along keeps leaders from crossing.
    const ordered = items.slice().sort((a, b) =>
      (mode === 'right' || mode === 'left') ? a.y - b.y : a.x - b.x);

    ordered.forEach(it => {
      const box = measureCalloutBox(it.text);
      const color = it.color || th.accent;
      const blocked = obstacles.concat(placed);
      let best = null, bestCost = Infinity, leader = mode;

      const consider = (x, y, penalty, leadMode) => {
        const r = { x: x, y: y, w: box.w, h: box.h };
        if (!calloutInBounds(r, bounds)) return;
        const cost = calloutOverlap(r, blocked) + (penalty || 0);
        if (cost < bestCost) { bestCost = cost; best = r; leader = leadMode || mode; }
      };

      if (mode === 'above' || mode === 'below') {
        // Band across the top (or bottom): the box keeps to the headroom the
        // engine reserved, and slides sideways from the anchor until it is
        // clear. Distance from the anchor is the tie-breaker, so a note stays
        // over the mark it belongs to whenever the room is there.
        const bandY = mode === 'above'
          ? bounds.y + gutter
          : bounds.y + bounds.h - gutter - box.h;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
          consider(it.x - box.w / 2 + dx, bandY, Math.abs(dx) * 0.5, mode);
        }
        // Second row under the first when the band is full.
        if (bestCost > 0) {
          const row2 = mode === 'above' ? bandY + box.h + CALLOUT_PAD
                                        : bandY - box.h - CALLOUT_PAD;
          for (let step = 0; step <= 24; step++) {
            const dx = Math.ceil(step / 2) * 18 * (step % 2 ? 1 : -1);
            consider(it.x - box.w / 2 + dx, row2, 400 + Math.abs(dx) * 0.5, mode);
          }
        }
      } else if (mode === 'right' || mode === 'left') {
        // Gutter past the ends of the bars, one box per row, aligned with the
        // row it annotates.
        const colX = mode === 'right'
          ? bounds.x + bounds.w - gutter - box.w
          : bounds.x + gutter;
        for (let step = 0; step <= 24 && bestCost > 0; step++) {
          const dy = Math.ceil(step / 2) * 14 * (step % 2 ? 1 : -1);
          consider(colX, it.y - box.h / 2 + dy, Math.abs(dy) * 0.5, mode);
        }
      } else if (mode === 'radial' && cfg.center) {
        // Push out from the middle of the ring or cluster, so the leader reads
        // as a spoke. Straight out is preferred, but the fan of angles around
        // it matters: a wedge pointing into a crowded side still has a clear
        // diagonal to reach for, and a spoke 30° off still reads as a spoke.
        const vx = it.x - cfg.center.x, vy = it.y - cfg.center.y;
        const base = Math.atan2(vy, vx);
        const FAN = [0, 0.44, -0.44, 0.87, -0.87, 1.31, -1.31];
        for (let f = 0; f < FAN.length && bestCost > 0; f++) {
          const a = base + FAN[f];
          for (let d = 30; d <= 260 && bestCost > 0; d += 14) {
            const px = it.x + Math.cos(a) * d, py = it.y + Math.sin(a) * d;
            consider(px - box.w / 2, py - box.h / 2,
              d * 0.4 + Math.abs(FAN[f]) * 90, 'auto');
          }
        }
      }

      // Ladder of diagonal offsets: the general fallback, and the default for
      // charts with no obvious free direction (line, scatter).
      if (bestCost > 0) {
        for (let i = 0; i < CALLOUT_OFFSETS.length; i++) {
          const ox = CALLOUT_OFFSETS[i][0], oy = CALLOUT_OFFSETS[i][1];
          consider(ox >= 0 ? it.x + ox : it.x + ox - box.w,
                   oy < 0 ? it.y + oy - box.h : it.y + oy,
                   (mode === 'auto' ? 0 : 800) + i * 2, 'auto');
        }
      }

      if (!best) {
        // Nothing fits: clamp inside and accept the overlap rather than drop a
        // note the author wrote.
        best = {
          x: Math.max(bounds.x + 2, Math.min(bounds.x + bounds.w - box.w - 2, it.x - box.w / 2)),
          y: Math.max(bounds.y + 2, Math.min(bounds.y + bounds.h - box.h - 2, it.y - box.h - 20)),
          w: box.w, h: box.h
        };
        leader = 'auto';
      }
      placed.push(best);

      drawCalloutLeader(g, it.x, it.y, best, color, leader);
      el('circle', { cx: it.x, cy: it.y, r: 4.5, fill: color,
        stroke: th.inverse, 'stroke-width': 1 }, g);
      drawCalloutBox(g, best.x, best.y, it.text, color);
    });
  }

  // Match a callout to a named thing: `name`, `category`, `point`, `code` and
  // `label` are all accepted so the key reads naturally per chart type.
  function calloutKey(co) {
    const k = co.name != null ? co.name
      : co.category != null ? co.category
      : co.point != null ? co.point
      : co.code != null ? co.code
      : co.label != null ? co.label
      : co.row != null ? co.row
      : co.panel != null ? co.panel : null;
    return k == null ? null : String(k);
  }

  function Chart(container, opts) {
    applyTheme();
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.fontFamily = FONT;
    container.style.background = BG;

    const W = container.clientWidth || 800;
    const H = container.clientHeight || 500;
    const chartOpts = opts.chart || {};
    const plotOpts = (opts.plotOptions && opts.plotOptions.geofacet) || {};

    const variant = (chartOpts.variant || 'bar').toLowerCase();
    const grid = Array.isArray(chartOpts.grid) ? chartOpts.grid
      : (Chart.grids[chartOpts.grid || 'us'] || US_GRID);

    // Data: series[0].data as [{code,value,name}] or [[code, value]] or {CA: 98}
    const series0 = (opts.series && opts.series[0]) || {};
    const seriesName = series0.name || 'Value';
    const raw = series0.data || opts.data || [];
    const byCode = {};
    if (Array.isArray(raw)) {
      raw.forEach(d => {
        if (Array.isArray(d)) byCode[d[0]] = { value: +d[1] };
        else if (d && typeof d === 'object') byCode[d.code || d.name] = { value: +d.value, name: d.name };
      });
    } else if (raw && typeof raw === 'object') {
      for (const k in raw) byCode[k] = { value: +raw[k] };
    }

    const values = Object.keys(byCode).map(k => byCode[k].value).filter(v => isFinite(v));
    const dataMin = plotOpts.min != null ? plotOpts.min : (values.length ? Math.min(...values) : 0);
    const dataMax = plotOpts.max != null ? plotOpts.max : (values.length ? Math.max(...values) : 1);
    // Bars and gauges read as a share of a total, so they start at zero unless told otherwise.
    const scaleMin = variant === 'heat' ? dataMin : (plotOpts.min != null ? plotOpts.min : 0);
    const span = (dataMax - scaleMin) || 1;
    const frac = v => Math.max(0, Math.min(1, (v - scaleMin) / span));

    // Default formatter strips binary-float noise (25.999999999999996 -> 26);
    // see the note in addCommas. A caller-supplied `format` owns its own output.
    const fmt = plotOpts.format ||
      (v => String(typeof v === 'number' && isFinite(v) ? +v.toPrecision(12) : v));
    const suffix = plotOpts.valueSuffix || '';
    const showEmpty = plotOpts.showEmpty !== false;
    // Tile values are on by default; dataLabels:false leaves the region codes
    // and the marks, which is the "shape of the pattern" reading.
    const showValues = plotOpts.dataLabels === false ||
      (plotOpts.dataLabels && plotOpts.dataLabels.enabled === false) ? false : true;

    const hasTitle = !!opts.title;
    const hasSub = !!opts.subtitle;
    const marginPx = 20;
    const titleX = 20;
    const titleLines = hasTitle
      ? wrapHeading(opts.title, F_TITLE, W - 40, TITLE_LINES, true) : [];
    const subLines = hasSub
      ? wrapHeading(opts.subtitle, F_SUB, W - 40, SUB_LINES, false) : [];
    const subY0 = 34 + (titleLines.length ? (titleLines.length - 1) * TITLE_LH + 20 : 0);
    const titleBlockH = (hasTitle ? 24 + (titleLines.length - 1) * TITLE_LH : 0)
                      + (hasSub ? 22 + (subLines.length - 1) * SUB_LH : 0) + (hasTitle || hasSub ? 24 : 0);

    const svg = el('svg', { xmlns: NS, width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    svg.style.background = BG;
    svg.style.display = 'block';
    container.appendChild(svg);

    titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: 34 + i * TITLE_LH, 'text-anchor': 'start',
      'font-size': F_TITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, svg));
    subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * SUB_LH, 'text-anchor': 'start',
      'font-size': F_SUB, fill: SUB_COL, 'font-family': FONT }, svg));

    // ── Tile geometry ───────────────────────────────────────────────────
    // Grids are normalised to their own origin rather than assumed 1-based,
    // so a hand-written grid may index its rows and columns from 0, from 1,
    // or from anywhere else, and still lands inside the plot area.
    const colMin = Math.min(...grid.map(g => g.col));
    const rowMin = Math.min(...grid.map(g => g.row));
    const nCols = Math.max(...grid.map(g => g.col)) - colMin + 1;
    const nRows = Math.max(...grid.map(g => g.row)) - rowMin + 1;
    const gridTop = titleBlockH + 8;
    const availW = W - marginPx * 2;
    const availH = H - gridTop - marginPx;
    // One square cell size for both axes: the grid keeps its map shape at any
    // aspect ratio, and the space between tiles is identical horizontally and
    // vertically. The gap is derived from the cell — it is not configurable,
    // because an author-set gap is what makes a tile map read as disjoint.
    // A small grid (a handful of hand-placed regions) would otherwise inflate
    // its tiles to fill the box, which reads as a few big buttons rather than
    // a map. Cap the cell and let the leftover become margin.
    const maxTile = plotOpts.maxTileSize != null ? plotOpts.maxTileSize : 110;
    const cell = Math.max(12, Math.min(availW / nCols, availH / nRows, maxTile));
    const gap = Math.max(2, Math.min(8, cell * 0.1));
    const tileW = cell - gap, tileH = cell - gap;

    // Whatever room the shorter axis leaves over becomes outer margin, so the
    // block of tiles stays centred instead of spreading out.
    const gridW = nCols * cell, gridH = nRows * cell;
    const originX = marginPx + (availW - gridW) / 2;
    const originY = gridTop + (availH - gridH) / 2;

    // Small-tile behaviour: shrink the type with the tile, and drop labels once
    // even the shrunken type would not fit. Below `minText` a tile is mark-only.
    const k = Math.max(0.62, Math.min(1.25, tileW / 64));
    const fCode = Math.round(F_CODE * k * 10) / 10;
    const fValue = Math.round(F_VALUE * k * 10) / 10;
    const roomForCode = tileW >= 34 && tileH >= 22;
    const roomForValue = showValues && tileW >= 26;

    const radius = plotOpts.borderRadius != null ? plotOpts.borderRadius : 6;
    const emptyFill = lighten(SEC_COL, 0.88);
    const trackFill = lighten(SEC_COL, 0.82);

    // ── Interaction ─────────────────────────────────────────────────────
    // Same conventions as the other engines: a 4% black slot highlight behind
    // the hovered mark (column/bar), the mark itself easing to 0.85 opacity
    // (donut), and the shared cursor-following tooltip.
    const highlight = el('rect', { x: 0, y: 0, width: 0, height: 0, rx: radius,
      fill: '#000', 'fill-opacity': 0.04,
      style: 'display:none;pointer-events:none' }, svg);

    const tip = document.createElement('div');
    tip.style.cssText = 'position:absolute;pointer-events:none;background:' + BG +
      ';border:1px solid #bbb;border-radius:4px;padding:6px 8px;font:12px ' + FONT +
      ';box-shadow:1px 1px 3px rgba(0,0,0,0.12);display:none;white-space:nowrap;z-index:10;';
    container.appendChild(tip);

    function showTip(html, evt) {
      tip.innerHTML = html;
      tip.style.display = 'block';
      const r = svg.getBoundingClientRect();
      const px = evt.clientX - r.left, py = evt.clientY - r.top;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let tx = px + 14, ty = py - th / 2;
      if (tx + tw > W - 4) tx = px - tw - 14;
      if (ty < 4) ty = 4;
      if (ty + th > H - 4) ty = H - th - 4;
      tip.style.left = tx + 'px';
      tip.style.top = ty + 'px';
    }
    function hideTip() { tip.style.display = 'none'; highlight.style.display = 'none'; }

    // ── Render tiles ────────────────────────────────────────────────────
    const cells = [];
    // One anchor per tile, so `callouts: [{ code, text }]` can name a region.
    const tileAnchors = [];
    // Every tile in the grid — a tile map is mostly empty, and the note belongs
    // in that empty space rather than over a neighbouring region.
    const tileRects = [];
    grid.forEach(g => {
      const x = originX + (g.col - colMin) * cell + gap / 2;
      const y = originY + (g.row - rowMin) * cell + gap / 2;
      tileAnchors.push({ name: String(g.code), x: x + tileW / 2, y: y + tileH / 2 });
      tileRects.push({ x: x, y: y, w: tileW, h: tileH });
      const rec = byCode[g.code];
      const label = g.code;
      const grp = el('g', { class: 'geo-tile' }, svg);

      if (!rec || !isFinite(rec.value)) {
        if (showEmpty && roomForCode) {
          txt(label, { x: x + tileW / 2, y: y + tileH / 2 + fCode / 3, 'text-anchor': 'middle',
            'font-size': fCode, 'font-weight': 600, fill: lighten(SEC_COL, 0.75),
            'font-family': FONT }, grp);
        }
        return;
      }

      const v = rec.value;
      const f = frac(v);
      const valueText = fmt(v) + suffix;
      let hitRect, mark;   // `mark` is the element that reacts to hover

      if (variant === 'heat') {
        const fill = mix(lighten(END_COL, 0.7), START_COL === '#000000' ? END_COL : START_COL, f);
        const ink = luminance(fill) > 0.55 ? LABEL_COL : INV_COL;
        hitRect = mark = el('rect', { x, y, width: tileW, height: tileH, rx: radius, fill }, grp);
        const stacked = roomForCode && tileH >= fCode + fValue + 10;
        if (roomForCode) {
          txt(label, { x: x + tileW / 2, y: y + tileH / 2 - (stacked ? 4 : -fCode / 3),
            'text-anchor': 'middle', 'font-size': fCode, 'font-weight': 700, fill: ink,
            'font-family': FONT }, grp);
        }
        if (showValues && (stacked || (!roomForCode && roomForValue))) {
          txt(valueText, { x: x + tileW / 2,
            y: y + tileH / 2 + (stacked ? fValue + 2 : fValue / 3), 'text-anchor': 'middle',
            'font-size': fValue + (stacked ? 2 : 0), 'font-weight': 700, fill: ink,
            'font-family': FONT }, grp);
        }

      } else if (variant === 'gauge') {
        const cx = x + tileW / 2, cy = y + tileH / 2;
        const ring = Math.max(3, tileW * 0.09);
        const r = tileW / 2 - ring / 2 - 4;
        el('rect', { x, y, width: tileW, height: tileH, rx: radius, fill: lighten(SEC_COL, 0.9) }, grp);
        el('circle', { cx, cy, r, fill: 'none', stroke: trackFill, 'stroke-width': ring }, grp);
        const circ = 2 * Math.PI * r;
        mark = el('circle', { cx, cy, r, fill: 'none', stroke: END_COL, 'stroke-width': ring,
          'stroke-linecap': 'round', 'stroke-dasharray': `${circ * f} ${circ}`,
          transform: `rotate(-90 ${cx} ${cy})` }, grp);
        // Inside a ring there is far less room than in a full tile.
        const ringRoom = tileW >= 54;
        if (ringRoom) {
          txt(label, { x: cx, y: cy - 3, 'text-anchor': 'middle', 'font-size': fCode - 1,
            'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT }, grp);
        }
        if (showValues && tileW >= 34) {
          txt(valueText, { x: cx, y: cy + (ringRoom ? 11 : fValue / 3), 'text-anchor': 'middle',
            'font-size': fValue, 'font-weight': VAL_FW, fill: VAL_COL, 'font-family': FONT }, grp);
        }
        hitRect = el('rect', { x, y, width: tileW, height: tileH, rx: radius,
          fill: 'transparent' }, grp);

      } else { // 'bar'
        el('rect', { x, y, width: tileW, height: tileH, rx: radius, fill: lighten(SEC_COL, 0.9) }, grp);
        const padX = Math.max(3, Math.round(8 * k));
        const barH = Math.max(5, Math.min(12, tileH * 0.22));
        // Code and value sit on one line above the bar; both are dropped once the
        // tile is too narrow to hold them without colliding.
        const labelW = (label.length * fCode + valueText.length * fValue) * 0.55 + padX * 2 + 4;
        const showRow = roomForCode && tileW >= labelW && tileH >= barH + fCode + 12;
        const barY = showRow ? y + tileH - barH - 10 : y + (tileH - barH) / 2;
        const barW = tileW - padX * 2;
        if (showRow) {
          const rowY = y + fCode + 7;
          txt(label, { x: x + padX, y: rowY, 'text-anchor': 'start', 'font-size': fCode,
            'font-weight': CAT_FW, fill: CAT_COL, 'font-family': FONT }, grp);
          if (showValues) txt(valueText, { x: x + tileW - padX, y: rowY, 'text-anchor': 'end',
            'font-size': fValue, 'font-weight': VAL_FW, fill: VAL_COL, 'font-family': FONT }, grp);
        }
        el('rect', { x: x + padX, y: barY, width: barW, height: barH, rx: 2,
          fill: INV_COL }, grp);
        mark = el('rect', { x: x + padX, y: barY, width: Math.max(1.5, barW * f), height: barH, rx: 2,
          fill: f > 0.5 ? END_COL : START_COL }, grp);
        hitRect = el('rect', { x, y, width: tileW, height: tileH, rx: radius,
          fill: 'transparent' }, grp);
      }

      hitRect.style.cursor = 'pointer';
      mark.style.transition = 'opacity .15s';
      const entry = { code: g.code, name: rec.name || g.name || g.code, value: v, grp, x, y };
      cells.push(entry);

      const tipHtml = '<div style="font-size:12px;font-weight:700;color:' + TITLE_COL +
        ';margin-bottom:2px">' + esc(entry.name) + '</div>' +
        '<div style="color:' + LABEL_COL + '">' + esc(seriesName) + ': ' +
        '<b style="color:' + TITLE_COL + '">' + esc(valueText) + '</b></div>';

      function enter(evt) {
        mark.style.opacity = '0.85';
        highlight.setAttribute('x', x - gap / 2);
        highlight.setAttribute('y', y - gap / 2);
        highlight.setAttribute('width', cell);
        highlight.setAttribute('height', cell);
        highlight.style.display = 'block';
        showTip(tipHtml, evt);
      }
      hitRect.addEventListener('mouseenter', enter);
      hitRect.addEventListener('mousemove', enter);
      hitRect.addEventListener('mouseleave', () => { mark.style.opacity = '1'; hideTip(); });
    });

    // `callouts: [{ code, text, color }]` — `code` is the region code, the
    // same key the data uses.
    (function () {
      const cos = opts.callouts || [];
      if (!cos.length) return;
      const gAnnot = el('g', {}, svg);
      const items = cos.map(co => {
        const key = calloutKey(co);
        const a = key != null ? tileAnchors.filter(q => q.name === key)[0] : tileAnchors[0];
        return a ? { x: a.x, y: a.y, text: co.text, color: co.color } : null;
      }).filter(Boolean);
      drawCallouts(gAnnot, items, { x: 4, y: gridTop, w: W - 8, h: H - gridTop - 4 },
        { mode: 'auto', obstacles: tileRects });
    })();

    return { getData: () => cells, redraw: () => Chart(container, opts) };
  }

  Chart.grids = { us: US_GRID };

    Charts.geofacet = Chart;
})();

// ─── panels ─────────────────────────────────────────

/*
 * Charts.panels — side-by-side composition of any other charts-lib charts.
 *
 * Not an engine: it draws no data itself. It lays out a shared title/subtitle
 * block, splits the width into up to four panels per line, and hands each
 * panel to whichever factory the caller names — so a bar next to a donut, or
 * four bars each filtered to one segment, read as ONE exhibit with one
 * headline instead of four charts that happen to sit near each other.
 *
 *   Regional performance                              ← group title
 *   Q3 bookings by segment and channel                ← group subtitle
 *
 *    [ bar chart ]   │   [ donut ]   │   [ bar list ]
 *      panel title       panel title     panel title
 *
 * Design language shared with the rest of charts-lib:
 *  - Cream bg, Inter, top-left group title/subtitle at the same titleX = 20
 *    as every engine; the group heading is deliberately a size up from a
 *    panel's own title so the hierarchy is unambiguous
 *  - Theme tokens only (Charts.theme) — no literal colors in the layout code
 *  - Hairline separators between panels by default, `separators: false` off
 *  - Each panel keeps its own title, subtitle, legend, tooltip and hover
 *    behaviour: the panels are real charts, not pictures of charts
 *
 * More than `columns` charts wrap onto further lines, so a 2x2 of four bars
 * is just `columns: 2`. Panels that size themselves to their content
 * (barList, barInsightTable, waffle) are left to do so; everything else is
 * given the row's panel height.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';

  let BG, TITLE_COL, SUB_COL, SEC_COL;
  let FONT, F_TITLE, F_SUB;
  function applyTheme() {
    const t = (window.Charts && window.Charts.theme) || {};
    BG = t.bg || '#f4f3f0';
    TITLE_COL = t.titleColor || '#111111';
    SUB_COL = t.subtitleColor || '#666666';
    SEC_COL = t.secondaryColor || '#666666';
    FONT = t.font || "'Inter','Segoe UI',Arial,Helvetica,sans-serif";
    F_TITLE = t.titleSize != null ? t.titleSize : 17;
    F_SUB = t.subtitleSize != null ? t.subtitleSize : 12;
  }

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(t, attrs, parent) {
    const e = el('text', attrs, parent);
    e.textContent = t;
    return e;
  }

  // ── Heading wrapping — the same estimate-don't-measure approach the
  // engines use, so the layout is settled before anything hits the DOM.
  function _headW(str, fontSize, bold) {
    return String(str).length * fontSize * (bold ? 0.58 : 0.53);
  }
  function _clipLine(str, fontSize, maxW, bold) {
    let s = String(str);
    if (_headW(s, fontSize, bold) <= maxW) return s;
    while (s.length > 1 && _headW(s + '…', fontSize, bold) > maxW) s = s.slice(0, -1);
    return s.replace(/[\s.,;:]+$/, '') + '…';
  }
  function wrapHeading(str, fontSize, maxW, maxLines, bold) {
    const words = String(str == null ? '' : str).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = cur + ' ' + words[i];
      if (_headW(next, fontSize, bold) > maxW) { lines.push(cur); cur = words[i]; }
      else cur = next;
    }
    lines.push(cur);
    if (lines.length > maxLines) {
      const tail = lines.slice(maxLines - 1).join(' ');
      lines.length = maxLines - 1;
      lines.push(_clipLine(tail, fontSize, maxW, bold));
    }
    return lines.map(l => _clipLine(l, fontSize, maxW, bold));
  }
  const TITLE_LINES = 2, SUB_LINES = 3;

  // Panels that grow their own container to fit their content. Forcing a
  // height on these either clips a long list or leaves a gap under a short
  // one, so they are left alone.
  const AUTO_HEIGHT = { barList: 1, barInsightTable: 1, waffle: 1 };

  const MAX_COLUMNS = 4;   // past four, panels are too narrow to read

  // ---------------- main ----------------
  function Chart(container, opts) {
    applyTheme();
    opts = opts || {};
    if (typeof container === 'string') container = document.getElementById(container);
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.fontFamily = FONT;
    container.style.background = BG;
    // The composition owns its own height: the heading plus whatever the
    // rows come to. A height set on the outer container would fight that.
    container.style.height = 'auto';

    const plot = (opts.plotOptions && opts.plotOptions.panels) || {};
    const W = container.clientWidth || 800;

    // ── Panels ──────────────────────────────────────────────────────────
    // Accepts `charts:` (preferred) or `panels:`. Each entry is an ordinary
    // chart config plus a `type` naming any factory on the Charts namespace.
    const specs = (opts.charts || opts.panels || []).filter(Boolean);

    const titleX = 20, marginR = 20, marginB = 4;
    const F_GTITLE = plot.titleSize != null ? plot.titleSize : F_TITLE + 5;
    const F_GSUB = plot.subtitleSize != null ? plot.subtitleSize : F_SUB + 1;
    const GT_LH = Math.round(F_GTITLE * 1.25), GS_LH = Math.round(F_GSUB * 1.35);

    const hasTitle = !!opts.title, hasSub = !!opts.subtitle;
    const titleLines = hasTitle
      ? wrapHeading(opts.title, F_GTITLE, W - titleX - marginR, TITLE_LINES, true) : [];
    const subLines = hasSub
      ? wrapHeading(opts.subtitle, F_GSUB, W - titleX - marginR, SUB_LINES, false) : [];

    // ── Group heading ───────────────────────────────────────────────────
    // Drawn as SVG text, not HTML, so it renders with exactly the same
    // metrics and hinting as every panel's own title underneath it.
    if (hasTitle || hasSub) {
      const y0 = Math.round(F_GTITLE * 1.35) + 14;
      const subY0 = y0 + (titleLines.length ? (titleLines.length - 1) * GT_LH + 22 : 0);
      const headH = (hasTitle ? y0 + 8 + (titleLines.length - 1) * GT_LH : 14)
                  + (hasSub ? 14 + subLines.length * GS_LH : 0) + 10;
      const head = el('svg', { xmlns: NS, width: W, height: headH, viewBox: `0 0 ${W} ${headH}` });
      head.style.background = BG;
      head.style.display = 'block';
      container.appendChild(head);

      titleLines.forEach((ln, i) => txt(ln, { x: titleX, y: y0 + i * GT_LH, 'text-anchor': 'start',
        'font-size': F_GTITLE, 'font-weight': 700, fill: TITLE_COL, 'font-family': FONT }, head));
      subLines.forEach((ln, i) => txt(ln, { x: titleX, y: subY0 + i * GS_LH, 'text-anchor': 'start',
        'font-size': F_GSUB, fill: SUB_COL, 'font-family': FONT }, head));
    }

    if (!specs.length) return { charts: [], panels: [] };

    // ── Row layout ──────────────────────────────────────────────────────
    let columns = plot.columns != null ? plot.columns : Math.min(specs.length, MAX_COLUMNS);
    columns = Math.max(1, Math.min(MAX_COLUMNS, Math.round(columns)));
    const gap = plot.gap != null ? plot.gap : 24;
    const separators = plot.separators !== false;
    const panelH = plot.panelHeight != null ? plot.panelHeight : 320;
    const rowGap = plot.rowGap != null ? plot.rowGap : 26;

    const made = [];
    const panelEls = [];

    for (let start = 0; start < specs.length; start += columns) {
      const rowSpecs = specs.slice(start, start + columns);
      const row = document.createElement('div');
      row.className = 'panels-row';
      row.style.cssText = 'display:flex;align-items:stretch;width:100%;box-sizing:border-box;' +
        `padding:0 ${marginR}px 0 ${titleX}px;` +
        (start + columns < specs.length ? `margin-bottom:${rowGap}px;` : '');
      container.appendChild(row);

      // Two passes. Every cell and separator for the row is created FIRST,
      // because a flex child's width only settles once its siblings exist —
      // rendering as we go would hand the first panel the whole row's width.
      const cells = rowSpecs.map((spec, i) => {
        if (i > 0) {
          // The separator sits between the panels it divides and stretches to
          // the row height rather than a fixed length, which is what keeps an
          // auto-height panel next to a fixed one looking deliberate.
          const sep = document.createElement('div');
          sep.style.cssText = `flex:0 0 ${separators ? 1 : 0}px;align-self:stretch;` +
            `margin:0 ${gap / 2}px;background:${separators ? SEC_COL : 'transparent'};` +
            (separators ? 'opacity:0.5;' : '');
          row.appendChild(sep);
        }
        const cell = document.createElement('div');
        const auto = AUTO_HEIGHT[spec.type];
        const h = spec.height != null ? spec.height : panelH;
        cell.style.cssText = 'flex:1 1 0;min-width:0;position:relative;' +
          (auto ? '' : `height:${h}px;`);
        row.appendChild(cell);
        panelEls.push(cell);
        return cell;
      });

      rowSpecs.forEach((spec, i) => {
        const cell = cells[i];
        const type = spec.type || 'column';
        const factory = window.Charts && window.Charts[type];
        if (typeof factory !== 'function') {
          cell.innerHTML =
            `<div style="font:12px ${FONT};color:${SUB_COL};padding:8px">Unknown chart type “${
              String(type).replace(/[<&>]/g, '')}”</div>`;
          made.push(null);
          return;
        }

        // Everything except our own layout keys is the panel's own config,
        // so a panel is configured exactly as it would be standalone.
        const cfg = {};
        for (const k in spec) if (k !== 'type' && k !== 'height') cfg[k] = spec[k];
        made.push(factory(cell, cfg));
      });
    }

    return { charts: made, panels: panelEls };
  }

    Charts.panels = Chart;
})();
