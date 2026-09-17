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

  var spec = null;
  var handles = {};
  var containerStyle = {};
  var listeners = [];
  var dirty = false;

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

  function renderAll() {
    spec = readSpec();
    var body = document.body;
    for (var i = 0; i < body.children.length; i++) body.children[i].setAttribute(STATIC_ATTR, '');
    Object.keys(spec.charts).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) containerStyle[id] = el.getAttribute('style');
      draw(id);
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
      var h = draw(id);
      emit({ kind: 'chart', id: id });
      if (!h) return { ok: false, error: 'unknown chart type "' + entry.type + '"' };
      return { ok: !h.error, error: h.error || null };
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
