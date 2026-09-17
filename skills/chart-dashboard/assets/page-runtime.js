/*!
 * page-runtime.js — the contract an editable page is built on.
 *
 * An editable page keeps its content as data rather than as code, so that a
 * person with no tooling can change it and save it without anyone rerunning
 * the build:
 *
 *   Charts  live in one JSON block, keyed by the id of the element they draw
 *           into:
 *             <script type="application/json" id="page-spec">
 *             { "version": 1, "charts": { "c1": { "type": "bar", "config": { … } } } }
 *             (end of script block)
 *   Text    stays in the HTML, on elements marked with a stable key and a kind:
 *             <h1 data-edit="text" data-key="title">Q4 review</h1>
 *             <p data-edit="rich" data-key="note-1">Revenue <b>rose</b> …</p>
 *           `text` is plain text. `rich` also keeps <b>, <strong>, <i>, <em>
 *           and <br>; everything else is unwrapped on the way in.
 *
 * This file draws every chart in the spec and exposes `window.Page`, the only
 * surface an editor needs: read and replace a chart, read and replace a text
 * element, and serialize the page back to a clean, standalone HTML file with
 * the edits in it. It edits what the page already has; it never adds or
 * removes a component.
 *
 * Charts drawn by page code (a filter's render(), say) are not in the spec.
 * They still work, and list() reports them as locked.
 *
 * Switching a chart's type goes through chart-convert.js (window.ChartConvert),
 * which must load before this file; without it alternatives() is empty.
 *
 * Load after charts.js and after any Charts.applyPalette call. No dependencies.
 */
(function () {
  'use strict';

  var SPEC_ID = 'page-spec';
  var KINDS = { text: 1, rich: 1 };
  var RICH_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, BR: 1 };
  // Marks what was in <body> before any chart ran, so serialize() can drop
  // what charts added outside their own containers (tooltips, measuring nodes).
  var STATIC_ATTR = 'data-page-static';
  var TABLES = { table: 1, reportTable: 1, barInsightTable: 1 };
  // Dashboard grid: a .bento holds cells sized by one width class and an
  // optional h2. Layout edits only resize a cell among these widths and move
  // it within its own grid.
  var WIDTHS = ['w4', 'w6', 'w8', 'w12'];
  var cellIds = [];   // index = id; the cells present when the page opened

  var spec = null;
  var handles = {};
  var containerStyle = {};
  var listeners = [];
  var dirty = false;
  // Per chart, the config each type had before the reader switched away from
  // it, so bar → donut → bar gives back the bar exactly (sort order, stacking,
  // axis lines) instead of a rebuilt approximation. Not saved; cleared when
  // the chart's data is set directly.
  var byType = {};

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function readSpec() {
    var el = document.getElementById(SPEC_ID);
    if (!el) throw new Error('page-runtime: no <script id="' + SPEC_ID + '"> on this page');
    var parsed = JSON.parse(el.textContent);
    if (!parsed || typeof parsed.charts !== 'object') {
      throw new Error('page-runtime: #' + SPEC_ID + ' needs a "charts" object');
    }
    return parsed;
  }

  function emit(change) {
    dirty = true;
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](change); } catch (e) { console.error(e); }
    }
  }

  function textNode(key) {
    var el = document.querySelector('[data-key="' + String(key).replace(/"/g, '\\"') + '"]');
    if (!el || !KINDS[el.getAttribute('data-edit')]) return null;
    return el;
  }

  // Keep text and the few inline tags a paragraph needs; unwrap everything
  // else, and drop every attribute, so pasted markup cannot carry script,
  // styles or links into the saved file.
  function sanitize(html) {
    var box = document.createElement('div');
    box.innerHTML = html;
    (function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (k.nodeType === 3) continue;
        if (k.nodeType !== 1) { node.removeChild(k); continue; }
        walk(k);
        if (RICH_TAGS[k.tagName]) {
          while (k.attributes.length) k.removeAttribute(k.attributes[0].name);
        } else if (k.tagName === 'SCRIPT' || k.tagName === 'STYLE') {
          node.removeChild(k);
        } else {
          while (k.firstChild) node.insertBefore(k.firstChild, k);
          node.removeChild(k);
        }
      }
    })(box);
    return box.innerHTML;
  }

  // A chart type is a factory the manifest lists — not any function on
  // Charts (applyPalette would otherwise pass as a "type").
  function isChartType(type) {
    if (!window.Charts || typeof Charts[type] !== 'function') return false;
    var meta = Charts.meta && Charts.meta.charts;
    return meta ? Object.prototype.hasOwnProperty.call(meta, type) : true;
  }

  // Draw a candidate where nobody can see it, at the size it would get, and
  // return the library's refusal if it refuses. Non-responsive, so it leaves
  // no observer behind.
  function trial(type, config, w, h) {
    var box = document.createElement('div');
    box.setAttribute('data-page-ui', '');
    box.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;' +
      'width:' + (w || 600) + 'px;height:' + (h || 340) + 'px';
    document.body.appendChild(box);
    var cfg = clone(config);
    cfg.chart = cfg.chart || {};
    cfg.chart.responsive = false;
    var err = null;
    try {
      var hnd = Charts[type](box, cfg);
      err = hnd && hnd.error ? hnd.error : null;
      if (hnd && hnd.destroy) hnd.destroy();
    } catch (e) {
      err = e.message;
    }
    document.body.removeChild(box);
    return err;
  }

  function draw(id) {
    var entry = spec.charts[id];
    var el = document.getElementById(id);
    if (handles[id]) { handles[id].destroy(); delete handles[id]; }
    if (!el) { console.warn('page-runtime: chart "' + id + '" has no element'); return null; }
    if (!isChartType(entry.type)) {
      el.textContent = 'Unknown chart type: ' + entry.type;
      return null;
    }
    // A copy, so an engine that fills defaults into its config never writes
    // them back into the spec that gets saved.
    handles[id] = Charts[entry.type](id, clone(entry.config || {}));
    return handles[id];
  }

  function grids() { return Array.prototype.slice.call(document.querySelectorAll('.bento')); }
  function idOfCell(node) { return cellIds.indexOf(node); }
  function widthOf(node) {
    for (var i = 0; i < WIDTHS.length; i++) if (node.classList.contains(WIDTHS[i])) return WIDTHS[i];
    return null;
  }
  // The grid cell holding a chart: the ancestor whose parent is a .bento.
  function cellOf(id) {
    var n = document.getElementById(id);
    while (n && n.parentElement) {
      if (n.parentElement.classList.contains('bento')) return n;
      n = n.parentElement;
    }
    return null;
  }

  function renderAll() {
    spec = readSpec();
    grids().forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c) { cellIds.push(c); });
    });
    var body = document.body;
    for (var i = 0; i < body.children.length; i++) body.children[i].setAttribute(STATIC_ATTR, '');
    Object.keys(spec.charts).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) containerStyle[id] = el.getAttribute('style');
      draw(id);
    });
  }

  // Layout as plain data, so it can sit in a snapshot and a draft: per grid,
  // the cells in order as [id, className].
  function layoutState() {
    return grids().map(function (g) {
      return Array.prototype.map.call(g.children, function (c) { return [idOfCell(c), c.className]; });
    });
  }
  function restoreLayout(state) {
    var gs = grids();
    if (gs.length !== state.length) return;
    state.forEach(function (cells, i) {
      cells.forEach(function (pair) {
        var node = cellIds[pair[0]];
        if (!node || node.parentElement !== gs[i]) return;
        if (node.className !== pair[1]) node.className = pair[1];
        gs[i].appendChild(node);   // appending in saved order reorders the grid
      });
    });
  }

  var Page = {
    /** Every editable component: spec charts, locked code charts, text. */
    list: function () {
      var out = [];
      Object.keys(spec.charts).forEach(function (id) {
        out.push({ kind: 'chart', id: id, type: spec.charts[id].type, locked: false });
      });
      var boxes = document.querySelectorAll('.chart[id]');
      for (var i = 0; i < boxes.length; i++) {
        if (!spec.charts[boxes[i].id]) out.push({ kind: 'chart', id: boxes[i].id, locked: true });
      }
      var texts = document.querySelectorAll('[data-edit][data-key]');
      for (var j = 0; j < texts.length; j++) {
        var kind = texts[j].getAttribute('data-edit');
        if (KINDS[kind]) out.push({ kind: kind, id: texts[j].getAttribute('data-key') });
      }
      return out;
    },

    /** A copy of a chart's { type, config }; null for a locked or unknown id. */
    getChart: function (id) {
      return spec.charts[id] ? clone(spec.charts[id]) : null;
    },

    /**
     * Replace an existing chart's type and/or config, and redraw it. Returns
     * { ok, error }. A chart the library refuses keeps the new entry (so the
     * editor can show the refusal) — call setChart again with the old one to
     * revert.
     */
    setChart: function (id, next) {
      if (!spec.charts[id]) return { ok: false, error: 'no editable chart "' + id + '"' };
      var entry = {
        type: next && next.type ? next.type : spec.charts[id].type,
        config: clone(next && next.config ? next.config : spec.charts[id].config)
      };
      spec.charts[id] = entry;
      delete byType[id];
      var h = draw(id);
      emit({ kind: 'chart', id: id });
      if (!h) return { ok: false, error: 'unknown chart type "' + entry.type + '"' };
      return { ok: !h.error, error: h.error || null };
    },

    /**
     * The types this chart can switch to: [{ type, current, ok, reason,
     * warnings, lost }]. `reason` comes from the data's shape first, then from
     * the library itself: each candidate is drawn off screen at this chart's
     * size, and a refusal is reported in the library's own words. `lost`
     * names the settings the switch would drop.
     */
    alternatives: function (id) {
      var entry = spec.charts[id];
      if (!entry || !window.ChartConvert) return [];
      var el = document.getElementById(id);
      var w = el ? el.clientWidth : 0, h = el ? el.clientHeight : 0;
      var meta = (window.Charts && Charts.meta && Charts.meta.charts) || {};
      return ChartConvert.targets(entry.type, entry.config).filter(function (t) {
        return isChartType(t.type);
      }).map(function (t) {
        var out = { type: t.type, current: t.current, ok: t.ok, reason: t.reason,
          warnings: t.warnings.slice(), lost: [] };
        if (t.current || !t.ok) return out;
        var conv = ChartConvert.convert(entry.type, entry.config, t.type);
        if (conv.error) { out.ok = false; out.reason = conv.error; return out; }
        out.lost = conv.lost;
        var refusal = trial(t.type, conv.config, w, h);
        if (refusal) { out.ok = false; out.reason = refusal; out.warnings = []; }
        // Only warn when the switch makes things worse: the page was laid out
        // for the current type, so a card slightly under every type's
        // minimum is not news.
        var m = meta[t.type], cur = meta[entry.type];
        if (out.ok && m && w && m.minWidth && w < m.minWidth && (!cur || m.minWidth > (cur.minWidth || 0))) {
          out.warnings.push('This space is ' + w + 'px wide; a ' + t.type + ' needs about ' + m.minWidth + 'px.');
        }
        // Tables are as tall as their rows. In a fixed-height card the rows
        // stretch and leave a blank band (layout.md, Tables size themselves).
        var grid = el && el.closest ? el.closest('.bento') : null;
        if (out.ok && TABLES[t.type] && !TABLES[entry.type] && grid && !grid.classList.contains('flow')) {
          out.warnings.push('Tables size to their rows; in this fixed-height card they leave empty space below.');
        }
        return out;
      });
    },

    /**
     * Switch an existing chart to another type, converting its data. Returns
     * { ok, error, lost }. If the library refuses the result, the chart is
     * left as it was. Switching back to a type the chart had before restores
     * that config as it was.
     */
    switchType: function (id, type) {
      var entry = spec.charts[id];
      if (!entry) return { ok: false, error: 'no editable chart "' + id + '"', lost: [] };
      if (type === entry.type) return { ok: true, error: null, lost: [] };
      if (!window.ChartConvert) return { ok: false, error: 'chart-convert.js is not on this page', lost: [] };
      if (!isChartType(type)) return { ok: false, error: 'unknown chart type "' + type + '"', lost: [] };
      var memo = byType[id] || (byType[id] = {});
      var config, lost = [];
      if (memo[type]) {
        config = memo[type];
      } else {
        var conv = ChartConvert.convert(entry.type, entry.config, type);
        if (conv.error) return { ok: false, error: conv.error, lost: [] };
        config = conv.config;
        lost = conv.lost;
      }
      spec.charts[id] = { type: type, config: clone(config) };
      var hnd = draw(id);
      if (!hnd || hnd.error) {
        // Unlike setChart, a switch the library refuses is undone: the reader
        // asked for a different view of the same data, not for an error card.
        spec.charts[id] = entry;
        draw(id);
        return { ok: false, error: hnd ? hnd.error : 'draw failed', lost: [] };
      }
      memo[entry.type] = clone(entry.config);
      emit({ kind: 'chart', id: id });
      return { ok: true, error: null, lost: lost };
    },

    getText: function (key) {
      var el = textNode(key);
      if (!el) return null;
      return el.getAttribute('data-edit') === 'rich' ? el.innerHTML : el.textContent;
    },

    setText: function (key, value) {
      var el = textNode(key);
      if (!el) return { ok: false, error: 'no editable text "' + key + '"' };
      if (el.getAttribute('data-edit') === 'rich') el.innerHTML = sanitize(String(value));
      else el.textContent = String(value);
      emit({ kind: 'text', id: key });
      return { ok: true, error: null };
    },

    /** The chart types this page's library can draw. */
    chartTypes: function () {
      var meta = window.Charts && Charts.meta && Charts.meta.charts;
      return meta ? Object.keys(meta).filter(isChartType) : [];
    },

    /**
     * Everything an edit can change, for undo: every spec chart and every
     * marked text. Cheap enough to take before each edit.
     */
    snapshot: function () {
      var text = {};
      var nodes = document.querySelectorAll('[data-edit][data-key]');
      for (var i = 0; i < nodes.length; i++) {
        var key = nodes[i].getAttribute('data-key');
        if (KINDS[nodes[i].getAttribute('data-edit')]) text[key] = Page.getText(key);
      }
      return { charts: clone(spec.charts), text: text, layout: layoutState() };
    },

    /** Put the page back to a snapshot, redrawing only what differs. */
    restore: function (snap) {
      Object.keys(snap.charts).forEach(function (id) {
        if (!spec.charts[id]) return;
        if (JSON.stringify(spec.charts[id]) === JSON.stringify(snap.charts[id])) return;
        spec.charts[id] = clone(snap.charts[id]);
        draw(id);
      });
      Object.keys(snap.text).forEach(function (key) {
        var el = textNode(key);
        if (!el || Page.getText(key) === snap.text[key]) return;
        if (el.getAttribute('data-edit') === 'rich') el.innerHTML = sanitize(snap.text[key]);
        else el.textContent = snap.text[key];
      });
      if (snap.layout) restoreLayout(snap.layout);
      byType = {};
      emit({ kind: 'restore' });
    },

    /**
     * Where a chart sits in a dashboard grid: { width, widths, tall,
     * canTall, first, last }, or null when it isn't in one (a report, a
     * deck, a chart outside the grid).
     */
    layout: function (id) {
      var cell = cellOf(id);
      if (!cell || idOfCell(cell) < 0 || !widthOf(cell)) return null;
      var grid = cell.parentElement;
      return {
        width: widthOf(cell),
        widths: WIDTHS.slice(),
        tall: cell.classList.contains('h2'),
        // Content-sized rows (.flow) hold tables that set their own height.
        canTall: !grid.classList.contains('flow'),
        first: !cell.previousElementSibling,
        last: !cell.nextElementSibling
      };
    },

    /** Change a chart's cell: { width: 'w4'|'w6'|'w8'|'w12', tall: bool }. */
    setLayout: function (id, next) {
      var cur = Page.layout(id);
      if (!cur) return { ok: false, error: 'this chart is not in a grid' };
      var cell = cellOf(id);
      if (next.width && WIDTHS.indexOf(next.width) < 0) return { ok: false, error: 'unknown width ' + next.width };
      if (next.width && next.width !== cur.width) { cell.classList.remove(cur.width); cell.classList.add(next.width); }
      if (next.tall != null && cur.canTall) cell.classList.toggle('h2', !!next.tall);
      emit({ kind: 'layout', id: id });
      return { ok: true, error: null };
    },

    /** Swap a chart's cell with its neighbour: by -1 (earlier) or +1 (later). */
    move: function (id, by) {
      var cell = cellOf(id);
      if (!cell || idOfCell(cell) < 0) return { ok: false, error: 'this chart is not in a grid' };
      var other = by < 0 ? cell.previousElementSibling : cell.nextElementSibling;
      if (!other) return { ok: false, error: by < 0 ? 'already first' : 'already last' };
      if (by < 0) cell.parentElement.insertBefore(cell, other);
      else cell.parentElement.insertBefore(other, cell);
      emit({ kind: 'layout', id: id });
      return { ok: true, error: null };
    },

    redraw: function (id) { return id ? draw(id) : Object.keys(spec.charts).forEach(draw); },

    on: function (fn) { listeners.push(fn); },

    isDirty: function () { return dirty; },

    /**
     * The page as a standalone HTML string with the current edits: chart
     * containers emptied (the runtime redraws them on open), the spec block
     * rewritten, and anything charts added outside their containers dropped.
     * Elements marked data-page-ui (a future editor's chrome) are removed.
     */
    serialize: function () {
      var root = document.documentElement.cloneNode(true);
      var body = root.querySelector('body');
      Array.prototype.slice.call(body.children).forEach(function (c) {
        if (!c.hasAttribute(STATIC_ATTR)) body.removeChild(c);
        else c.removeAttribute(STATIC_ATTR);
      });
      Array.prototype.slice.call(root.querySelectorAll('[data-page-ui]')).forEach(function (n) {
        n.parentNode.removeChild(n);
      });
      Object.keys(spec.charts).forEach(function (id) {
        var box = root.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id));
        if (!box) return;
        box.innerHTML = '';
        if (containerStyle[id] == null) box.removeAttribute('style');
        else box.setAttribute('style', containerStyle[id]);
      });
      // < keeps a closing script tag inside a title or label from closing the block.
      root.querySelector('#' + SPEC_ID).textContent =
        '\n' + JSON.stringify(spec, null, 2).replace(/</g, '\\u003c') + '\n';
      return '<!DOCTYPE html>\n' + root.outerHTML;
    }
  };

  window.Page = Page;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderAll);
  else renderAll();
})();
