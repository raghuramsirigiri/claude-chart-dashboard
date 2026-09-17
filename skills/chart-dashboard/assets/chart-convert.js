/*!
 * chart-convert.js — switch a chart's type without retyping its data.
 *
 * Every chart type wants its data in its own shape: a column chart takes
 * categories and series, a donut takes one series of named slices, a table
 * takes columns and rows. To offer "show this as a donut" the data has to go
 * through a shape they all agree on. This file reads a config into one of
 * four neutral datasets and builds a config for another type from it:
 *
 *   categorical  categories × series of numbers  column, bar, line, radar,
 *                                                  dumbbell, table, barList,
 *                                                  donut, pie, waffle,
 *                                                  packedBubble
 *   steps        a bridge (read-only source)      waterfall → categorical
 *   values       raw measurements                 histogram, histogramPercent,
 *                                                  histogramCumulative
 *   xy           points                           scatter, bubble
 *
 * sankey, reportTable, barInsightTable, panels and geofacet have no
 * neighbours: their data means nothing in another shape. They can still be
 * edited in place, just not switched.
 *
 * targets() only applies structural rules (series count, category count,
 * negatives). The page runtime also renders each candidate off screen, so
 * the library's own refusals count as well. This file has no DOM and no
 * dependency on charts.js, so it runs under Node for tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChartConvert = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORICAL = ['column', 'bar', 'line', 'radar', 'dumbbell', 'table',
    'barList', 'donut', 'pie', 'waffle', 'packedBubble'];
  var SINGLE = { barList: 1, donut: 1, pie: 1, waffle: 1, packedBubble: 1 };
  var AXIS = { column: 1, bar: 1, line: 1 };
  var NO_GAPS = { radar: 1, dumbbell: 1, barList: 1, donut: 1, pie: 1, waffle: 1, packedBubble: 1 };
  var VALUES = ['histogram', 'histogramPercent', 'histogramCumulative'];
  var XY = ['scatter', 'bubble'];
  var FIXED = ['sankey', 'reportTable', 'barInsightTable', 'panels', 'geofacet'];

  // Keys every chart understands. Anything else at the top level belongs to
  // the source type and is reported as lost when switching away.
  var COMMON = ['title', 'subtitle', 'legend', 'tooltip', 'credits'];
  // chart.* keys that are about the card, not the chart type.
  var CHART_COMMON = ['transparent', 'responsive', 'compact', 'backgroundColor'];

  function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function family(type) {
    if (CATEGORICAL.indexOf(type) >= 0) return 'categorical';
    if (type === 'waterfall') return 'steps';
    if (VALUES.indexOf(type) >= 0) return 'values';
    if (XY.indexOf(type) >= 0) return 'xy';
    return null;
  }

  // ── reading a point ────────────────────────────────────────────────
  // Engines accept a bare number, [name, y] / [x, y] pairs, or an object.
  function readPoint(p) {
    if (p === null || p === undefined) return { y: null };
    if (isNum(p)) return { y: p };
    if (Array.isArray(p)) {
      if (p.length >= 2 && typeof p[0] === 'string') return { name: p[0], y: isNum(p[1]) ? p[1] : null };
      return { x: p[0], y: isNum(p[p.length - 1]) ? p[p.length - 1] : null };
    }
    if (typeof p === 'object') {
      var y = isNum(p.y) ? p.y : (isNum(p.value) ? p.value : null);
      var out = { y: y };
      if (p.name != null) out.name = String(p.name);
      if (p.x != null) out.x = p.x;
      if (p.color) out.color = p.color;
      if (p.description) out.description = p.description;
      return out;
    }
    return { y: null };
  }

  function dateLabel(x) {
    var d = new Date(x);
    return isNaN(d.getTime()) ? String(x) : d.toISOString().slice(0, 10);
  }

  // ── config → dataset ───────────────────────────────────────────────
  function extract(type, config) {
    config = config || {};
    var fam = family(type);
    if (!fam) return null;
    var series = Array.isArray(config.series) ? config.series : [];

    if (fam === 'values') {
      var raw = config.data || (series[0] && series[0].data) || [];
      var values = raw.map(function (v) { return readPoint(v).y; }).filter(isNum);
      return values.length ? { kind: 'values', name: (series[0] && series[0].name) || null, values: values } : null;
    }

    if (fam === 'xy') {
      var anyZ = false;
      var xs = series.map(function (s) {
        var pts = (s.data || []).map(function (p) {
          if (Array.isArray(p)) return { x: p[0], y: p[1], z: p[2] };
          return { x: p.x, y: p.y, z: p.z, name: p.name, color: p.color };
        }).filter(function (p) { return isNum(p.x) && isNum(p.y); });
        return { name: s.name || null, color: s.color || null, points: pts };
      });
      xs.forEach(function (s) { s.points.forEach(function (p) { if (isNum(p.z)) anyZ = true; }); });
      return xs.length ? { kind: 'xy', series: xs, hasZ: anyZ && xs.every(function (s) {
        return s.points.every(function (p) { return isNum(p.z); });
      }) } : null;
    }

    if (fam === 'steps') {
      var steps = (series[0] && series[0].data) || config.data || [];
      var run = 0;
      var cats = [], vals = [], colors = [], locked = [];
      steps.forEach(function (p, i) {
        var pt = readPoint(p);
        var total = p && typeof p === 'object' && (p.isSum || p.isIntermediateSum);
        if (total) vals.push(pt.y != null ? pt.y : run);
        else { vals.push(pt.y); if (isNum(pt.y)) run += pt.y; }
        cats.push(pt.name || (total ? 'Total' : 'Step ' + (i + 1)));
        colors.push(pt.color || null);
        locked.push(!!total);
      });
      return vals.length ? {
        kind: 'categorical', categories: cats, oneWay: true, categoryEditable: true,
        series: [{ name: (series[0] && series[0].name) || null, color: null, values: vals, colors: colors, descriptions: [],
          // A total is computed from the steps before it, so its value is not
          // the reader's to type.
          locked: locked }]
      } : null;
    }

    // categorical
    if (type === 'table') {
      var cols = Array.isArray(config.columns) ? config.columns : [];
      var rows = Array.isArray(config.rows) ? config.rows : [];
      var numeric = cols.filter(function (c) {
        var seen = false;
        var allNum = rows.every(function (r) {
          var v = r[c.key];
          if (v === null || v === undefined || v === '') return true;
          if (isNum(v)) { seen = true; return true; }
          return false;
        });
        return allNum && seen;
      });
      if (!numeric.length || !rows.length) return null;
      return {
        kind: 'categorical', categoryEditable: true,
        categories: rows.map(function (r) { return String(r.name != null ? r.name : ''); }),
        series: numeric.map(function (c) {
          return { key: c.key, name: c.name || c.key, color: null, colors: [], descriptions: [],
            values: rows.map(function (r) { return isNum(r[c.key]) ? r[c.key] : null; }) };
        }),
        dropped: cols.length - numeric.length
      };
    }

    if (!series.length) return null;
    var axisCats = config.xAxis && Array.isArray(config.xAxis.categories) ? config.xAxis.categories.map(String) : null;
    var read = series.map(function (s) {
      return { name: s.name || null, color: s.color || null, points: (s.data || []).map(readPoint) };
    });

    var categories, categoryEditable = true;
    if (axisCats) {
      categories = axisCats;
    } else if (read[0].points.some(function (p) { return p.name != null; })) {
      categories = read[0].points.map(function (p, i) { return p.name != null ? p.name : 'Item ' + (i + 1); });
    } else if (read[0].points.some(function (p) { return p.x != null; })) {
      // A line over [x, y] pairs becomes categories only when every series is
      // sampled at the same x values; otherwise columns would misalign.
      var key = function (s) { return s.points.map(function (p) { return String(p.x); }).join('|'); };
      if (!read.every(function (s) { return key(s) === key(read[0]); })) return null;
      var dt = config.xAxis && config.xAxis.type === 'datetime';
      categoryEditable = false;   // they are x positions, not names
      categories = read[0].points.map(function (p) { return dt ? dateLabel(p.x) : String(p.x); });
    } else {
      categories = read[0].points.map(function (p, i) { return String(i + 1); });
      categoryEditable = false;
    }

    return {
      kind: 'categorical',
      categories: categories,
      categoryEditable: categoryEditable,
      series: read.map(function (s) {
        return {
          name: s.name, color: s.color,
          values: categories.map(function (c, i) { return s.points[i] ? s.points[i].y : null; }),
          colors: categories.map(function (c, i) { return (s.points[i] && s.points[i].color) || null; }),
          descriptions: categories.map(function (c, i) { return (s.points[i] && s.points[i].description) || null; })
        };
      })
    };
  }

  // ── dataset → config ───────────────────────────────────────────────
  function carry(base, target, lost) {
    var out = {};
    Object.keys(base || {}).forEach(function (k) {
      if (COMMON.indexOf(k) >= 0) { out[k] = clone(base[k]); return; }
      if (k === 'chart') {
        var c = {};
        Object.keys(base.chart || {}).forEach(function (ck) {
          if (CHART_COMMON.indexOf(ck) >= 0) c[ck] = clone(base.chart[ck]);
          else lost.push('chart.' + ck);
        });
        if (Object.keys(c).length) out.chart = c;
        return;
      }
      if (k === 'plotOptions') {
        if (base.plotOptions.series) out.plotOptions = { series: clone(base.plotOptions.series) };
        Object.keys(base.plotOptions).forEach(function (pk) { if (pk !== 'series') lost.push('plotOptions.' + pk); });
        return;
      }
      if (k === 'yAxis' && AXIS[target]) {
        var y = {};
        ['title', 'min', 'max', 'labels'].forEach(function (yk) { if (base.yAxis[yk] !== undefined) y[yk] = clone(base.yAxis[yk]); });
        if (Object.keys(y).length) out.yAxis = y;
        return;
      }
      if (k === 'series' || k === 'data' || k === 'columns' || k === 'rows') return;
      if (k === 'xAxis') {
        if (base.xAxis.title && AXIS[target]) out.xAxis = { title: clone(base.xAxis.title) };
        ['plotLines', 'plotBands', 'type'].forEach(function (xk) { if (base.xAxis[xk] !== undefined) lost.push('xAxis.' + xk); });
        return;
      }
      lost.push(k);
    });
    return out;
  }

  function point(y, color, name, description) {
    if (!color && name == null && !description) return y;
    var p = { y: y };
    if (name != null) p.name = name;
    if (color) p.color = color;
    if (description) p.description = description;
    return p;
  }

  function build(type, ds, base) {
    var lost = [];
    var cfg = carry(base, type, lost);

    if (ds.kind === 'values') {
      cfg.data = ds.values.slice();
      return { config: cfg, lost: lost };
    }

    if (ds.kind === 'xy') {
      cfg.series = ds.series.map(function (s) {
        var out = { data: s.points.map(function (p) {
          return type === 'bubble' ? [p.x, p.y, p.z] : [p.x, p.y];
        }) };
        if (s.name) out.name = s.name;
        if (s.color) out.color = s.color;
        return out;
      });
      if (type === 'scatter' && ds.hasZ) lost.push('bubble size (z)');
      return { config: cfg, lost: lost };
    }

    // categorical
    if (type === 'table') {
      cfg.columns = ds.series.map(function (s, i) { return { key: 's' + i, name: s.name || 'Value' }; });
      cfg.rows = ds.categories.map(function (c, j) {
        var r = { name: c };
        ds.series.forEach(function (s, i) { r['s' + i] = s.values[j]; });
        return r;
      });
      if (ds.series.some(function (s) { return s.colors.some(Boolean); })) lost.push('point colours');
      return { config: cfg, lost: lost };
    }

    if (SINGLE[type]) {
      var s0 = ds.series[0];
      cfg.series = [{
        data: ds.categories.map(function (c, j) {
          return point(s0.values[j], s0.colors[j], c, type === 'waffle' ? s0.descriptions[j] : null);
        })
      }];
      if (s0.name) cfg.series[0].name = s0.name;
      return { config: cfg, lost: lost };
    }

    cfg.xAxis = cfg.xAxis || {};
    cfg.xAxis.categories = ds.categories.slice();
    cfg.series = ds.series.map(function (s) {
      var out = { data: s.values.map(function (v, j) { return point(v, s.colors[j]); }) };
      if (s.name) out.name = s.name;
      if (s.color) out.color = s.color;
      return out;
    });
    if (type === 'radar' || type === 'dumbbell') {
      if (ds.series.some(function (s) { return s.colors.some(Boolean); })) lost.push('point colours');
    }
    return { config: cfg, lost: lost };
  }

  // ── which types this chart can become ──────────────────────────────
  function rules(type, ds) {
    if (ds.kind !== 'categorical') return null;
    var n = ds.series.length, k = ds.categories.length;
    var all = [];
    ds.series.forEach(function (s) { s.values.forEach(function (v) { if (isNum(v)) all.push(v); }); });
    var neg = all.some(function (v) { return v < 0; });
    // A blank is not a zero. Column, bar, line and table leave a gap; these
    // draw a missing value as 0 (a dot on the axis, a spoke to the centre),
    // which reads as a measurement nobody took.
    var blanks = ds.series.some(function (s) { return s.values.some(function (v) { return !isNum(v); }); });
    if (blanks && NO_GAPS[type]) return 'Some values are blank, and a ' + type + ' would draw them as zero.';
    if (type === 'radar' && k < 3) return 'A radar needs at least 3 categories; this has ' + k + '.';
    if (type === 'dumbbell' && n !== 2) return 'A dumbbell compares exactly 2 series; this has ' + n + '.';
    if (SINGLE[type] && n !== 1) return 'This chart shows one series; this data has ' + n + '.';
    if ((type === 'donut' || type === 'pie' || type === 'packedBubble' || type === 'waffle') && neg) {
      return 'Negative values cannot be parts of a whole.';
    }
    if (type === 'waffle' && all.some(function (v) { return v > 100; })) {
      return 'A waffle shows shares out of 100; these values go above 100.';
    }
    return null;
  }

  function warnings(type, ds) {
    var w = [];
    if (ds.kind !== 'categorical') return w;
    var k = ds.categories.length;
    if ((type === 'donut' || type === 'pie') && k > 6) w.push(k + ' slices; past 6 they get hard to compare. A bar chart reads better.');
    if (type === 'waffle' && k > 4) w.push(k + ' panels side by side; a waffle reads best with 4 or fewer.');
    if (type === 'line' && ds.series.some(function (s) { return s.values.some(function (v) { return v === null; }); })) {
      w.push('The data has gaps; a line will break at them.');
    }
    return w;
  }

  /**
   * Every type a chart could switch to, with a reason on the ones it can't.
   * The chart's own type is included as current. Returns [] for a type with
   * no neighbours or data that can't be read.
   */
  function targets(type, config) {
    var ds = extract(type, config);
    if (!ds) return [];
    var pool = ds.kind === 'categorical' ? CATEGORICAL
      : ds.kind === 'values' ? VALUES
      : ds.kind === 'xy' ? XY : [];
    var out = pool.map(function (t) {
      var reason = t === type ? null : rules(t, ds);
      if (!reason && t === 'bubble' && !ds.hasZ) reason = 'A bubble needs a size (z) for every point.';
      return { type: t, current: t === type, ok: !reason, reason: reason, warnings: reason ? [] : warnings(t, ds) };
    });
    if (type === 'waterfall') out.unshift({ type: 'waterfall', current: true, ok: true, reason: null, warnings: [] });
    return out;
  }

  /** { config, lost } for `to`, or { error } when it can't be built. */
  function convert(from, config, to) {
    var ds = extract(from, config);
    if (!ds) return { error: 'A ' + from + ' chart can\'t be switched to another type.' };
    if (from === to) return { config: clone(config), lost: [] };
    var t = targets(from, config).filter(function (x) { return x.type === to; })[0];
    if (!t) return { error: 'A ' + from + ' chart can\'t become a ' + to + '.' };
    if (!t.ok) return { error: t.reason };
    var built = build(to, ds, config);
    if (ds.dropped) built.lost.push(ds.dropped + ' non-numeric column(s)');
    return built;
  }

  // ── dataset → the same chart, with its own settings kept ───────────
  // convert() rebuilds a config and drops what the new type doesn't use. When
  // only the numbers or names change, everything else about the chart (sort
  // order, stacking, point colours, descriptions, reference lines) must stay,
  // so this writes the dataset back into a copy of the original config, point
  // by point, in whatever shape each point was written.
  function setPoint(p, y, name) {
    if (p === null || p === undefined || isNum(p)) return y;
    if (Array.isArray(p)) {
      var a = p.slice();
      if (typeof a[0] === 'string') { if (name != null) a[0] = name; a[1] = y; }
      else a[a.length - 1] = y;
      return a;
    }
    var o = clone(p);
    if ('value' in o && !('y' in o)) o.value = y; else o.y = y;
    if (name != null && 'name' in o) o.name = name;
    return o;
  }

  /**
   * A copy of `config` with the dataset's names and values written into it.
   * The dataset must come from extract(type, config) and keep its sizes:
   * this edits values, it never adds or removes rows or series. Returns
   * { config } or { error }.
   */
  function withData(type, config, ds) {
    var before = extract(type, config);
    if (!before) return { error: 'This chart\'s data can\'t be edited here.' };
    if (before.kind !== ds.kind) return { error: 'The data changed shape.' };
    var cfg = clone(config);

    if (ds.kind === 'values') {
      if (ds.values.length !== before.values.length) return { error: 'The number of values changed.' };
      var src = Array.isArray(cfg.data) ? cfg.data : cfg.series[0].data;
      if (src.length !== before.values.length) {
        return { error: 'Some values in this chart are not numbers, so it can\'t be edited here.' };
      }
      if (Array.isArray(cfg.data)) cfg.data = ds.values.slice();
      else cfg.series[0].data = ds.values.slice();
      return { config: cfg };
    }

    if (ds.kind === 'xy') {
      var badXY = ds.series.length !== before.series.length || ds.series.some(function (s, i) {
        return s.points.length !== before.series[i].points.length;
      });
      if (badXY) return { error: 'The number of points changed.' };
      // extract() skips points without numbers; only write back when none
      // were skipped, so indexes line up.
      if (cfg.series.some(function (s, i) { return (s.data || []).length !== before.series[i].points.length; })) {
        return { error: 'Some points in this chart have no numbers, so it can\'t be edited here.' };
      }
      ds.series.forEach(function (s, i) {
        if (s.name != null) cfg.series[i].name = s.name;
        cfg.series[i].data = cfg.series[i].data.map(function (p, j) {
          var q = s.points[j];
          if (Array.isArray(p)) return p.length > 2 ? [q.x, q.y, q.z] : [q.x, q.y];
          var o = clone(p); o.x = q.x; o.y = q.y; if ('z' in o) o.z = q.z; return o;
        });
      });
      return { config: cfg };
    }

    // categorical
    var k = before.categories.length;
    if (ds.categories.length !== k || ds.series.length !== before.series.length ||
        ds.series.some(function (s) { return s.values.length !== k; })) {
      return { error: 'Rows or series were added or removed; only values can change.' };
    }
    var cats = before.categoryEditable ? ds.categories : before.categories;

    if (type === 'table') {
      cfg.rows.forEach(function (r, j) {
        r.name = cats[j];
        ds.series.forEach(function (s) { r[s.key] = s.values[j]; });
      });
      cfg.columns.forEach(function (c) {
        ds.series.forEach(function (s) { if (s.key === c.key && s.name) c.name = s.name; });
      });
      return { config: cfg };
    }

    if (type === 'waterfall') {
      var pts = cfg.series && cfg.series[0] && cfg.series[0].data ? cfg.series[0].data : cfg.data;
      pts.forEach(function (p, j) {
        var total = p && typeof p === 'object' && (p.isSum || p.isIntermediateSum);
        var named = p && typeof p === 'object' && !Array.isArray(p) && p.name != null;
        if (total) { if (named || cats[j] !== 'Total') p.name = cats[j]; return; }
        pts[j] = setPoint(p, ds.series[0].values[j], cats[j]);
      });
      if (cfg.series && cfg.series[0] && ds.series[0].name) cfg.series[0].name = ds.series[0].name;
      return { config: cfg };
    }

    if (cfg.xAxis && Array.isArray(cfg.xAxis.categories)) cfg.xAxis.categories = cats.slice();
    cfg.series.forEach(function (s, i) {
      var d = ds.series[i];
      if (d.name) s.name = d.name;
      s.data = (s.data || []).map(function (p, j) { return setPoint(p, d.values[j], cats[j]); });
    });
    return { config: cfg };
  }

  return { extract: extract, targets: targets, convert: convert, withData: withData, family: family, FIXED: FIXED };

});
