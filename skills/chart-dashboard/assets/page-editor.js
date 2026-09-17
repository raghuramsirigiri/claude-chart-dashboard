/*!
 * page-editor.js — change an editable page without code.
 *
 * An "Edit page" button opens edit mode. Hovering outlines what can be
 * changed. Clicking a heading or paragraph edits it in place. Clicking a
 * chart opens a panel with three tabs:
 *   Type  the chart types that suit its data, and why the others don't
 *   Text  title and subtitle
 *   Data  a grid of its existing names and values
 * Undo and redo cover every change. The editor only changes what the page
 * already has; it never adds or removes a component, a row or a series.
 *
 * Saving writes the whole page back out as one HTML file:
 *   Save              overwrites the file where the browser allows it
 *                     (File System Access API: Chrome, Edge), otherwise
 *                     downloads it. The new file is opened in a hidden frame
 *                     first, and nothing is written unless every chart draws.
 *   Save clean copy   the same page without this editor, for sending on.
 * Edits are also kept as a draft in this browser's localStorage, so a closed
 * tab offers to restore them, and leaving with unsaved changes asks first.
 *
 * Everything it draws lives in one shadow root on a host marked
 * data-page-ui, so the page's CSS can't reach it and Page.serialize() leaves
 * it out of a saved file. All changes go through window.Page
 * (page-runtime.js) and window.ChartConvert (chart-convert.js).
 *
 * Load after page-runtime.js. No dependencies.
 */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var NAMES = {
    column: 'Columns', bar: 'Bars', line: 'Line', radar: 'Radar', dumbbell: 'Dumbbell',
    table: 'Table', barList: 'Bar list', donut: 'Donut', pie: 'Pie', waffle: 'Waffle',
    packedBubble: 'Packed bubbles', histogram: 'Histogram', histogramPercent: 'Histogram (%)',
    histogramCumulative: 'Cumulative histogram', scatter: 'Scatter', bubble: 'Bubble',
    waterfall: 'Waterfall', sankey: 'Sankey', reportTable: 'Report table',
    barInsightTable: 'Bar insight table', panels: 'Panels', geofacet: 'Map grid'
  };
  var name = function (t) { return NAMES[t] || t; };

  var CSS = [
    ':host{all:initial}',
    '@media print{:host{display:none!important}}',
    '*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'button{font:inherit;cursor:pointer}',
    '.toggle,.bar,.panel,.note{pointer-events:auto}',
    '.toggle{position:fixed;right:20px;bottom:20px;padding:10px 16px;border-radius:999px;border:1px solid #d0d0d0;',
    '  background:#fff;color:#111;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.14)}',
    '.toggle:hover{background:#f3f3f3}',
    // Bottom of the screen, clear of page headers; on a phone the panel is a
    // bottom sheet, so the bar goes to the top instead.
    '.bar{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;',
    '  padding:6px 6px 6px 14px;border-radius:999px;background:#111;color:#fff;font-size:13px;',
    '  box-shadow:0 6px 24px rgba(0,0,0,.25);max-width:calc(100vw - 24px)}',
    // With the side panel open, centre the bar over what is left of the page.
    '@media (max-width:700px){.bar{bottom:auto;top:12px}}',
    '@media (min-width:701px){.bar.shift{left:calc((100% - 380px) / 2);max-width:calc(100% - 404px)}}',
    '.bar .msg{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
    '.bar .status{color:#aaa;white-space:nowrap}',
    '.bar button{border:0;border-radius:999px;padding:6px 12px;background:#333;color:#fff;font-size:13px}',
    '.bar button:hover:not(:disabled){background:#444}',
    '.bar button:disabled{opacity:.4;cursor:default}',
    '.bar button.done{background:#fff;color:#111;font-weight:600}',
    '.bar button.save{background:#2f6bff;font-weight:600}',
    '.bar button.save:hover:not(:disabled){background:#1f58e8}',
    '.bar .status.unsaved{color:#ffcf66}',
    '.menu{position:relative}',
    '.menu .more{padding:6px 10px}',
    '.menu .list{position:absolute;bottom:calc(100% + 8px);right:0;background:#fff;color:#111;border-radius:8px;',
    '  box-shadow:0 8px 30px rgba(0,0,0,.25);padding:4px;min-width:220px}',
    '@media (max-width:700px){.menu .list{bottom:auto;top:calc(100% + 8px)}}',
    '.menu .list button{display:block;width:100%;text-align:left;background:none;color:#111;border-radius:6px;padding:8px 10px}',
    '.menu .list button:hover{background:#f0f0f0}',
    '.menu .list small{display:block;color:#777;font-size:11px;margin-top:2px}',
    '.card{position:fixed;right:20px;bottom:72px;width:300px;max-width:calc(100vw - 40px);background:#fff;color:#111;',
    '  border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.2);padding:14px 16px;font-size:13px;line-height:1.45;pointer-events:auto}',
    '.card .acts{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}',
    '.card button{border:1px solid #ccc;background:#fff;border-radius:6px;padding:6px 12px;color:#111}',
    '.card button.primary{background:#2f6bff;border-color:#2f6bff;color:#fff;font-weight:600}',
    '.toast{position:fixed;left:50%;bottom:72px;transform:translateX(-50%);background:#111;color:#fff;border-radius:8px;',
    '  padding:8px 14px;font-size:13px;max-width:calc(100vw - 40px);box-shadow:0 6px 24px rgba(0,0,0,.25);pointer-events:auto}',
    '.toast.err{background:#8a1c1c}',
    '@media (max-width:700px){.toast{bottom:auto;top:64px}}',
    '.hl,.sel{position:fixed;pointer-events:none;border-radius:6px}',
    '.hl{outline:2px dashed #2f6bff;outline-offset:2px}',
    '.sel{outline:2px solid #2f6bff;outline-offset:2px}',
    '.hl .tag{position:absolute;left:0;top:-24px;background:#2f6bff;color:#fff;font-size:11px;',
    '  padding:2px 8px;border-radius:4px;white-space:nowrap}',
    '.hl.locked{outline-color:#999}.hl.locked .tag{background:#777}',
    '.panel{position:fixed;top:0;right:0;bottom:0;width:380px;max-width:100vw;background:#fff;color:#111;',
    '  border-left:1px solid #ddd;box-shadow:-8px 0 30px rgba(0,0,0,.12);display:flex;flex-direction:column;font-size:13px}',
    '@media (max-width:700px){.panel{top:auto;width:100%;height:60vh;border-left:0;border-top:1px solid #ddd}}',
    '.head{display:flex;align-items:center;gap:8px;padding:14px 16px 10px;border-bottom:1px solid #eee}',
    '.head .t{flex:1;min-width:0}',
    '.head .k{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#777}',
    '.head .n{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.x{border:0;background:none;font-size:22px;line-height:1;color:#666;padding:4px 8px;border-radius:6px}',
    '.x:hover{background:#f0f0f0}',
    '.tabs{display:flex;gap:4px;padding:8px 12px 0;border-bottom:1px solid #eee}',
    '.tabs button{border:0;background:none;padding:8px 12px;border-bottom:2px solid transparent;color:#555;font-size:13px}',
    '.tabs button[aria-selected=true]{color:#111;border-bottom-color:#2f6bff;font-weight:600}',
    '.body{flex:1;overflow:auto;padding:14px 16px 24px}',
    '.hint{color:#666;margin:0 0 12px;line-height:1.45}',
    '.flash{margin:0 0 12px;padding:8px 10px;border-radius:6px;line-height:1.4}',
    '.flash.err{background:#fdecec;color:#8a1c1c}',
    '.flash.info{background:#eef3ff;color:#1d3a8a}',
    '.flash.warn{background:#fff6e0;color:#6b4a00}',
    '.flash button{margin-left:6px;border:0;background:none;text-decoration:underline;color:inherit;padding:0}',
    '.types{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.type{text-align:left;border:1px solid #ddd;background:#fff;border-radius:8px;padding:10px;color:#111}',
    '.type:hover:not(:disabled){border-color:#2f6bff}',
    '.type.cur{border-color:#2f6bff;background:#eef3ff}',
    '.type:disabled{cursor:default;background:#fafafa;color:#999}',
    '.type b{display:block;font-size:13px}',
    '.type small{display:block;margin-top:4px;font-size:11px;line-height:1.35;color:#888}',
    '.type small.w{color:#8a6100}',
    'label.f{display:block;margin:0 0 12px;font-size:12px;color:#555}',
    'label.f input{display:block;width:100%;margin-top:4px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px;color:#111}',
    'table{border-collapse:collapse;width:100%}',
    'th,td{border:1px solid #e3e3e3;padding:0}',
    'th{background:#f6f6f6;font-weight:600;font-size:12px;text-align:left}',
    'td input,th input{width:100%;min-width:64px;border:0;padding:7px 8px;font-size:13px;background:transparent;color:#111}',
    'td input:focus,th input:focus{outline:2px solid #2f6bff;outline-offset:-2px;background:#fff}',
    'td input.num{text-align:right;font-variant-numeric:tabular-nums}',
    'td input:disabled,th input:disabled{color:#888;background:#f6f6f6}',
    'input.bad{background:#fdecec!important;outline:2px solid #d33!important;outline-offset:-2px}',
    '.grp td{background:#f6f6f6}',
    '.scroll{overflow:auto;max-width:100%}'
  ].join('\n');

  var host, root, ui = {};
  var editing = false, selected = null, textEdit = null;
  var undoStack = [], redoStack = [];
  var dataTouched = {};
  var tab = 'type';
  var flash = null;   // { kind, text } shown once at the top of the panel

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) n.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  // ── undo ───────────────────────────────────────────────────────────
  // Every change is: take a snapshot, change the page, and keep the
  // snapshot only if the change went through.
  function change(fn) {
    var before = Page.snapshot();
    var ok = fn();
    if (ok === false) { Page.restore(before); return false; }
    undoStack.push(before);
    if (undoStack.length > 200) undoStack.shift();
    redoStack = [];
    refreshBar();
    return true;
  }
  function undo() {
    if (textEdit) finishText(true);
    if (!undoStack.length) return;
    redoStack.push(Page.snapshot());
    Page.restore(undoStack.pop());
    afterHistory();
  }
  function redo() {
    if (textEdit) finishText(true);
    if (!redoStack.length) return;
    undoStack.push(Page.snapshot());
    Page.restore(redoStack.pop());
    afterHistory();
  }
  function afterHistory() {
    flash = null;
    refreshBar();
    if (selected && selected.kind === 'chart') renderPanel();
    place();
  }

  // ── what can be edited under the pointer ───────────────────────────
  function hit(node) {
    for (var n = node; n && n.nodeType === 1 && n !== document.body; n = n.parentNode) {
      var kind = n.getAttribute('data-edit');
      if ((kind === 'text' || kind === 'rich') && n.getAttribute('data-key')) {
        return { kind: 'text', el: n, id: n.getAttribute('data-key'), rich: kind === 'rich' };
      }
      if (n.classList && n.classList.contains('chart') && n.id) {
        return { kind: 'chart', el: n, id: n.id, locked: !Page.getChart(n.id) };
      }
    }
    return null;
  }
  function fromUI(e) {
    var path = e.composedPath ? e.composedPath() : [];
    return path.indexOf(host) >= 0;
  }
  function inTextEdit(node) {
    return textEdit && (node === textEdit.el || textEdit.el.contains(node));
  }

  function box(target, node) {
    if (!target) { node.hidden = true; return; }
    var r = target.getBoundingClientRect();
    node.hidden = false;
    node.style.left = r.left + 'px';
    node.style.top = r.top + 'px';
    node.style.width = r.width + 'px';
    node.style.height = r.height + 'px';
  }
  var hovered = null;
  function place() {
    box(hovered && (!selected || hovered.el !== selected.el) ? hovered.el : null, ui.hl);
    box(selected ? selected.el : null, ui.sel);
  }

  // ── events while editing ───────────────────────────────────────────
  function onMove(e) {
    if (fromUI(e)) { hovered = null; place(); return; }
    var h = inTextEdit(e.target) ? null : hit(e.target);
    hovered = h;
    if (h) {
      ui.hl.classList.toggle('locked', !!h.locked);
      ui.tag.textContent = h.kind === 'text' ? (h.rich ? 'Edit paragraph' : 'Edit text')
        : h.locked ? 'Locked chart' : 'Edit chart';
    }
    place();
  }
  function onDown(e) {
    if (fromUI(e) || inTextEdit(e.target)) return;
    if (hit(e.target)) { e.preventDefault(); e.stopPropagation(); }
  }
  function onClick(e) {
    if (fromUI(e) || inTextEdit(e.target)) return;
    closeMenu();
    var h = hit(e.target);
    e.preventDefault();
    e.stopPropagation();
    if (textEdit) finishText(true);
    if (!h) { select(null); return; }
    h.x = e.clientX;
    h.y = e.clientY;
    select(h);
  }
  function onKey(e) {
    if (!editing) return;
    var typing = inTextEdit(e.target) || (root.activeElement && /INPUT|TEXTAREA/.test(root.activeElement.tagName));
    var mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (root.activeElement && root.activeElement.blur) root.activeElement.blur();   // commit a grid cell
      save(e.shiftKey);
    } else if (mod && !typing && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if (mod && !typing && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      redo();
    } else if (e.key === 'Escape' && !typing) {
      if (ui.list && !ui.list.hidden) closeMenu();
      else select(null);
    }
  }
  function onScroll() { place(); }

  // ── text in place ──────────────────────────────────────────────────
  function startText(h) {
    var node = h.el;
    textEdit = { el: node, key: h.id, rich: h.rich, before: Page.snapshot(), original: Page.getText(h.id) };
    if (!h.rich) {
      node.setAttribute('contenteditable', 'plaintext-only');
      if (node.contentEditable !== 'plaintext-only') node.setAttribute('contenteditable', 'true');
    } else {
      node.setAttribute('contenteditable', 'true');
    }
    node.addEventListener('keydown', textKey);
    node.addEventListener('blur', textBlur);
    node.focus();
    // A label or heading is usually retyped whole, so select it all; in a
    // paragraph the reader clicked where they want to change something.
    var range = null;
    if (h.rich && h.x != null) {
      if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(h.x, h.y);
      else if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(h.x, h.y);
        if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
      }
      if (range && !node.contains(range.startContainer)) range = null;
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(node);
      if (h.rich) range.collapse(false);
    }
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    setMessage(h.rich
      ? 'Editing paragraph · Ctrl+B bold · Ctrl+I italic · click outside to finish'
      : 'Editing text · Enter to finish · Esc to cancel');
  }
  function textKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishText(false); select(null); }
    else if (e.key === 'Enter' && !textEdit.rich) { e.preventDefault(); finishText(true); select(null); }
  }
  function textBlur() {
    // Clicking the bar's Undo blurs the text first; commit so undo sees it.
    if (textEdit) { finishText(true); if (selected && selected.kind === 'text') select(null); }
  }
  function finishText(keep) {
    var t = textEdit;
    if (!t) return;
    textEdit = null;
    t.el.removeEventListener('keydown', textKey);
    t.el.removeEventListener('blur', textBlur);
    t.el.removeAttribute('contenteditable');
    var value = t.rich ? t.el.innerHTML : t.el.textContent;
    if (!keep) { Page.restore(t.before); setMessage(null); return; }
    if (value === t.original) { setMessage(null); return; }
    Page.setText(t.key, value);
    undoStack.push(t.before);
    redoStack = [];
    setMessage(null);
    refreshBar();
  }

  // ── selection ──────────────────────────────────────────────────────
  function select(h) {
    if (textEdit) finishText(true);
    selected = h;
    flash = null;
    var open = !!h && h.kind === 'chart';
    ui.panel.hidden = !open;
    ui.bar.classList.toggle('shift', open);
    if (!h) { place(); return; }
    if (h.kind === 'text') { place(); startText(h); return; }
    tab = 'type';
    renderPanel();
    place();
  }

  // ── panel ──────────────────────────────────────────────────────────
  function renderPanel() {
    var id = selected.id;
    var entry = Page.getChart(id);
    var body = el('div', { class: 'body' });
    var head = el('div', { class: 'head' }, [
      el('div', { class: 't' }, [
        el('div', { class: 'k', text: entry ? name(entry.type) : 'Chart' }),
        el('div', { class: 'n', text: entry && entry.config.title ? entry.config.title : id })
      ]),
      el('button', { class: 'x', 'aria-label': 'Close', title: 'Close (Esc)', onclick: function () { select(null); } }, ['×'])
    ]);
    ui.panel.textContent = '';
    ui.panel.appendChild(head);

    if (!entry) {
      body.appendChild(el('p', { class: 'hint', text: 'This chart is drawn by the page’s own code, so it can’t be changed here.' }));
      ui.panel.appendChild(body);
      return;
    }

    var tabs = el('div', { class: 'tabs', role: 'tablist' });
    [['type', 'Type'], ['text', 'Text'], ['data', 'Data']].forEach(function (t) {
      tabs.appendChild(el('button', { role: 'tab', 'aria-selected': String(tab === t[0]),
        onclick: function () { tab = t[0]; flash = null; renderPanel(); } }, [t[1]]));
    });
    ui.panel.appendChild(tabs);

    if (flash) {
      body.appendChild(el('div', { class: 'flash ' + flash.kind }, [flash.text]));
      flash = null;
    }
    if (dataTouched[id] && tab !== 'data') {
      body.appendChild(el('div', { class: 'flash warn' }, [
        'You changed this chart’s data. Check that the title still says what the chart shows.',
        el('button', { onclick: function () { delete dataTouched[id]; renderPanel(); } }, ['OK'])
      ]));
    }
    if (tab === 'type') typeTab(body, id, entry);
    else if (tab === 'text') textTab(body, id, entry);
    else dataTab(body, id, entry);
    ui.panel.appendChild(body);
  }

  function lostText(lost) {
    return lost.map(function (l) {
      if (l.indexOf('plotOptions.') === 0) return name(l.slice(12)) + ' settings';
      if (l === 'yAxis') return 'value axis settings';
      if (l === 'xAxis.type') return 'the date axis';
      if (l.indexOf('xAxis.') === 0) return 'axis ' + l.slice(6);
      if (l.indexOf('chart.') === 0) return l.slice(6);
      return l;
    }).join(', ');
  }

  function typeTab(body, id, entry) {
    var alts = Page.alternatives(id);
    if (!alts.length) {
      body.appendChild(el('p', { class: 'hint', text: 'A ' + name(entry.type).toLowerCase() +
        ' can’t be shown as another kind of chart. You can still change its title on the Text tab.' }));
      return;
    }
    body.appendChild(el('p', { class: 'hint', text: 'Show the same data as:' }));
    var grid = el('div', { class: 'types' });
    alts.forEach(function (a) {
      var note = a.current ? el('small', { text: 'Current' })
        : !a.ok ? el('small', { text: a.reason })
        : a.warnings.length ? el('small', { class: 'w', text: a.warnings.join(' ') })
        : null;
      grid.appendChild(el('button', {
        class: 'type' + (a.current ? ' cur' : ''),
        disabled: !a.ok || a.current,
        'aria-pressed': String(!!a.current),
        onclick: function () {
          var res;
          change(function () { res = Page.switchType(id, a.type); return res.ok; });
          flash = res.ok
            ? (res.lost.length ? { kind: 'info', text: 'Some settings don’t apply to a ' +
                name(a.type).toLowerCase() + ' and were left out: ' + lostText(res.lost) + '. Undo brings them back.' } : null)
            : { kind: 'err', text: res.error };
          renderPanel();
          place();
        }
      }, [el('b', { text: name(a.type) }), note]));
    });
    body.appendChild(grid);
  }

  function textTab(body, id, entry) {
    [['title', 'Title'], ['subtitle', 'Subtitle']].forEach(function (f) {
      var input = el('input', { type: 'text', value: entry.config[f[0]] || '' });
      input.addEventListener('change', function () {
        var cur = Page.getChart(id);
        var v = input.value.trim();
        if ((cur.config[f[0]] || '') === v) return;
        if (v) cur.config[f[0]] = v; else delete cur.config[f[0]];
        change(function () { return Page.setChart(id, { config: cur.config }).ok; });
        if (f[0] === 'title') delete dataTouched[id];
        place();
      });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });
      body.appendChild(el('label', { class: 'f' }, [f[1], input]));
    });
  }

  // ── data grid ──────────────────────────────────────────────────────
  function fmt(v) { return v === null || v === undefined ? '' : String(v); }
  function parseNum(s) {
    var t = String(s).trim().replace(/[\s,]/g, '');
    if (t === '') return null;
    var n = Number(t);
    return isFinite(n) ? n : NaN;
  }

  function dataTab(body, id, entry) {
    var CC = window.ChartConvert;
    var ds = CC && CC.extract(entry.type, entry.config);
    if (!ds) {
      body.appendChild(el('p', { class: 'hint', text: 'This chart’s data can’t be edited here yet. You can change its title on the Text tab.' }));
      return;
    }
    body.appendChild(el('p', { class: 'hint', text: ds.kind === 'categorical'
      ? 'Change names and numbers. Leave a cell empty for a missing value. You can paste cells copied from a spreadsheet.'
      : 'Change the numbers; every cell needs one. You can paste cells copied from a spreadsheet.' }));
    var table = el('table');
    var cells = [];   // rows of inputs, for Enter and paste navigation

    function cell(value, opts) {
      var input = el('input', { type: 'text', value: fmt(value), class: opts.num ? 'num' : '',
        inputmode: opts.num ? 'decimal' : null, disabled: !!opts.disabled,
        title: opts.title || null, 'aria-label': opts.label || null });
      input._read = opts.read;
      return input;
    }

    if (ds.kind === 'categorical') {
      var hr = el('tr', {}, [el('th', {}, [el('input', { type: 'text', value: 'Name', disabled: true })])]);
      var heads = ds.series.map(function (s, i) {
        var inp = cell(s.name || ('Series ' + (i + 1)), { label: 'Series name' });
        hr.appendChild(el('th', {}, [inp]));
        return inp;
      });
      table.appendChild(hr);
      ds.categories.forEach(function (c, j) {
        var tr = el('tr');
        var row = [cell(c, { disabled: !ds.categoryEditable, label: 'Name',
          title: ds.categoryEditable ? null : 'These are positions on the axis, not names' })];
        ds.series.forEach(function (s) {
          var locked = s.locked && s.locked[j];
          row.push(cell(locked ? '' : s.values[j], { num: true, disabled: locked,
            title: locked ? 'A total is worked out from the steps above it' : null }));
          if (locked) row[row.length - 1].placeholder = 'total';
        });
        row.forEach(function (i) { tr.appendChild(el('td', {}, [i])); });
        table.appendChild(tr);
        cells.push(row);
      });
      ds._read = function () {
        var next = JSON.parse(JSON.stringify(ds));
        next.series.forEach(function (s, i) { s.name = heads[i].value.trim() || s.name; });
        cells.forEach(function (row, j) {
          next.categories[j] = row[0].value;
          next.series.forEach(function (s, i) {
            if (s.locked && s.locked[j]) return;
            s.values[j] = parseNum(row[i + 1].value);
          });
        });
        return next;
      };
    } else if (ds.kind === 'values') {
      table.appendChild(el('tr', {}, [el('th', { text: '#' }), el('th', { text: ds.name || 'Value' })]));
      ds.values.forEach(function (v, j) {
        var inp = cell(v, { num: true });
        table.appendChild(el('tr', {}, [el('td', {}, [el('input', { type: 'text', value: String(j + 1), disabled: true })]), el('td', {}, [inp])]));
        cells.push([inp]);
      });
      ds._read = function () {
        var next = JSON.parse(JSON.stringify(ds));
        next.values = cells.map(function (row) { return parseNum(row[0].value); });
        return next;
      };
    } else {
      var z = entry.type === 'bubble';
      var nameInputs = [];
      ds.series.forEach(function (s, i) {
        var nm = cell(s.name || ('Series ' + (i + 1)), { label: 'Series name' });
        nameInputs.push(nm);
        var grp = el('tr', { class: 'grp' }, [el('td', { colspan: z ? 3 : 2 }, [nm])]);
        table.appendChild(grp);
        table.appendChild(el('tr', {}, [el('th', { text: 'x' }), el('th', { text: 'y' }), z ? el('th', { text: 'size' }) : null]));
        s.points.forEach(function (p) {
          var row = [cell(p.x, { num: true }), cell(p.y, { num: true })];
          if (z) row.push(cell(p.z, { num: true }));
          row._series = i;
          table.appendChild(el('tr', {}, row.map(function (c) { return el('td', {}, [c]); })));
          cells.push(row);
        });
      });
      ds._read = function () {
        var next = JSON.parse(JSON.stringify(ds));
        var k = {};
        next.series.forEach(function (s, i) { s.name = nameInputs[i].value.trim() || s.name; });
        cells.forEach(function (row) {
          var s = next.series[row._series];
          var j = k[row._series] = (k[row._series] || 0);
          k[row._series]++;
          s.points[j].x = parseNum(row[0].value);
          s.points[j].y = parseNum(row[1].value);
          if (row[2]) s.points[j].z = parseNum(row[2].value);
        });
        return next;
      };
    }

    function inputs() { return Array.prototype.slice.call(table.querySelectorAll('input:not(:disabled)')); }

    function commit() {
      var next = ds._read();
      var bad = false;
      inputs().forEach(function (i) {
        var isBad = i.classList.contains('num') && (Number.isNaN(parseNum(i.value)) ||
          (ds.kind !== 'categorical' && parseNum(i.value) === null));
        i.classList.toggle('bad', isBad);
        if (isBad) bad = true;
      });
      if (bad) {
        showInline('err', ds.kind === 'categorical'
          ? 'Some cells aren’t numbers. Fix the highlighted cells.'
          : 'Every cell here needs a number. Fix the highlighted cells.');
        return;
      }
      var cur = Page.getChart(id);
      var out = window.ChartConvert.withData(cur.type, cur.config, next);
      if (out.error) { showInline('err', out.error); return; }
      if (JSON.stringify(out.config) === JSON.stringify(cur.config)) return;
      var res;
      change(function () { res = Page.setChart(id, { config: out.config }); return res.ok; });
      if (!res.ok) { showInline('err', 'The chart can’t show that: ' + res.error + ' Your change was undone.'); return; }
      dataTouched[id] = true;
      clearInline();
      place();
    }

    var inline = el('div');
    function showInline(kind, text) { inline.textContent = ''; inline.appendChild(el('div', { class: 'flash ' + kind }, [text])); }
    function clearInline() { inline.textContent = ''; }

    table.addEventListener('change', commit);
    table.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var all = inputs(), i = all.indexOf(e.target);
      // Down a column, like a spreadsheet.
      var r = -1, c = -1;
      cells.forEach(function (row, ri) { var ci = row.indexOf(e.target); if (ci >= 0) { r = ri; c = ci; } });
      var target = r >= 0 && cells[r + 1] && cells[r + 1][c] && !cells[r + 1][c].disabled ? cells[r + 1][c] : all[i + 1];
      e.target.blur();
      if (target) target.focus();
    });
    table.addEventListener('paste', function (e) {
      var text = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\t\n]/.test(text)) return;
      var r = -1, c = -1;
      cells.forEach(function (row, ri) { var ci = row.indexOf(e.target); if (ci >= 0) { r = ri; c = ci; } });
      if (r < 0) return;
      e.preventDefault();
      text.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach(function (line, dr) {
        line.split('\t').forEach(function (v, dc) {
          var row = cells[r + dr];
          var inp = row && row[c + dc];
          if (inp && !inp.disabled) inp.value = v;
        });
      });
      commit();
    });

    body.appendChild(inline);
    body.appendChild(el('div', { class: 'scroll' }, [table]));
  }

  // ── bar ────────────────────────────────────────────────────────────
  function setMessage(text) {
    ui.msg.textContent = text || 'Click a chart or any text to change it';
  }
  function refreshBar() {
    ui.undo.disabled = !undoStack.length;
    ui.redo.disabled = !redoStack.length;
    var dirty = unsaved();
    ui.status.textContent = dirty ? 'Unsaved changes' : (savedOnce ? 'Saved' : '');
    ui.status.classList.toggle('unsaved', dirty);
    ui.save.disabled = saving;
  }

  // ── saving ─────────────────────────────────────────────────────────
  // "Unsaved" means the page differs from the last state that was written
  // out (or from how it opened), not that the undo stack is non-empty: undo
  // back to the saved state and there is nothing to save.
  var savedState = null, savedOnce = false, saving = false, fileHandle = null;
  function stateKey() { return JSON.stringify(Page.snapshot()); }
  function unsaved() { return savedState !== null && stateKey() !== savedState; }

  function fileName(suffix) {
    var base = decodeURIComponent((location.pathname || '').split('/').pop() || '') || 'page.html';
    if (!/\.html?$/i.test(base)) base += '.html';
    return suffix ? base.replace(/(\.html?)$/i, ' ' + suffix + '$1') : base;
  }

  // The editor script in the saved HTML: inlined (its header comment) or
  // still a staged <script src>.
  function isEditorScript(node) {
    return /page-editor\.js$/.test(node.getAttribute('src') || '') ||
      /^\s*\/\*!\s*\n?\s*\*\s*page-editor\.js/.test(node.textContent || '');
  }
  function withoutEditor(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    Array.prototype.slice.call(doc.querySelectorAll('script')).forEach(function (sc) {
      if (isEditorScript(sc)) sc.parentNode.removeChild(sc);
    });
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  // Open the HTML about to be written in a hidden frame and check it draws
  // the same charts. A save that silently produced a broken page would lose
  // the reader's work at the moment they believe it is safe.
  function verify(html) {
    return new Promise(function (resolve) {
      var frame = document.createElement('iframe');
      frame.setAttribute('data-page-ui', '');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:' +
        Math.max(1024, window.innerWidth) + 'px;height:800px;border:0;visibility:hidden';
      var done = function (problem) {
        clearTimeout(timer);
        if (frame.parentNode) frame.parentNode.removeChild(frame);
        resolve(problem);
      };
      var timer = setTimeout(function () { done('the saved page took too long to open'); }, 15000);
      frame.onload = function () {
        setTimeout(function () {
          try {
            var w = frame.contentWindow, d = frame.contentDocument;
            if (!w.Page) return done('the saved page has no chart runtime');
            var want = Page.snapshot(), got = w.Page.snapshot();
            if (JSON.stringify(want.charts) !== JSON.stringify(got.charts)) return done('the saved charts differ from the page');
            var blank = Object.keys(got.charts).filter(function (id) {
              var box = d.getElementById(id);
              return !box || !box.querySelector('svg');
            });
            if (blank.length) return done('these charts did not draw: ' + blank.join(', '));
            done(null);
          } catch (e) { done(e.message); }
        }, 60);
      };
      frame.srcdoc = html;
      document.body.appendChild(frame);
    });
  }

  function download(html, name) {
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    var a = el('a', { href: url, download: name });
    root.appendChild(a);
    a.click();
    root.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  }

  function save(clean) {
    if (saving) return;
    if (textEdit) finishText(true);
    saving = true;
    refreshBar();
    closeMenu();
    var state = stateKey();
    var html = Page.serialize();
    if (clean) html = withoutEditor(html);
    verify(html).then(function (problem) {
      if (problem) throw new Error('Nothing was saved: ' + problem + '.');
      var name = fileName(clean ? '(clean copy)' : '');
      var picker = window.showSaveFilePicker;
      // A clean copy is always a new file; a save reuses the file chosen
      // the first time, so later saves are one click.
      if (!clean && fileHandle) return writeTo(fileHandle, html).then(function () { return 'file'; });
      if (typeof picker === 'function') {
        return picker({ suggestedName: name, types: [{ description: 'Web page', accept: { 'text/html': ['.html', '.htm'] } }] })
          .then(function (handle) {
            return writeTo(handle, html).then(function () { if (!clean) fileHandle = handle; return 'file'; });
          }, function (err) {
            if (err && err.name === 'AbortError') return 'cancelled';
            // Not allowed here (a sandboxed frame, a policy): fall back.
            download(html, name);
            return 'download';
          });
      }
      download(html, name);
      return 'download';
    }).then(function (how) {
      saving = false;
      if (how === 'cancelled') { refreshBar(); return; }
      if (!clean) {
        savedState = state;
        savedOnce = true;
        clearDraft();
      }
      refreshBar();
      toast(how === 'file'
        ? (clean ? 'Clean copy saved.' : 'Saved.')
        : (clean ? 'Clean copy downloaded as ' : 'Downloaded as ') + fileName(clean ? '(clean copy)' : '') +
          '. If nothing downloaded, this viewer blocks saving: open the file directly in a browser.');
    }).catch(function (e) {
      saving = false;
      refreshBar();
      toast(e.message, true);
    });
  }
  function writeTo(handle, html) {
    return handle.createWritable().then(function (w) {
      return w.write(html).then(function () { return w.close(); });
    });
  }

  var toastTimer = 0;
  function toast(text, isError) {
    ui.toast.textContent = text;
    ui.toast.className = 'toast' + (isError ? ' err' : '');
    ui.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { ui.toast.hidden = true; }, isError ? 9000 : 5000);
  }

  function closeMenu() { if (ui.list) ui.list.hidden = true; }

  // ── draft ──────────────────────────────────────────────────────────
  // Kept per file path and tied to how the page looked when it opened, so a
  // draft from an older version of the file is never laid over a newer one.
  var draftKey = 'page-editor-draft:' + location.pathname;
  var openedAs = null, draftTimer = 0;
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }
  function readDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch (e) { return null; }
  }
  function clearDraft() {
    try { localStorage.removeItem(draftKey); } catch (e) { /* storage blocked */ }
  }
  function keepDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      try {
        if (!unsaved()) { clearDraft(); return; }
        localStorage.setItem(draftKey, JSON.stringify({ base: openedAs, at: Date.now(), snapshot: Page.snapshot() }));
      } catch (e) { /* storage full or blocked: the draft is a convenience */ }
    }, 600);
  }
  function offerDraft() {
    var d = readDraft();
    if (!d || !d.snapshot) return;
    if (d.base !== openedAs || JSON.stringify(d.snapshot) === savedState) { clearDraft(); return; }
    var when = new Date(d.at);
    var card = el('div', { class: 'card', role: 'dialog', 'aria-label': 'Unsaved edits' }, [
      el('b', { text: 'You have unsaved edits' }),
      el('div', { text: 'Made in this browser on ' + when.toLocaleDateString() + ' at ' +
        when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '. Restore them?' }),
      el('div', { class: 'acts' }, [
        el('button', { onclick: function () { clearDraft(); card.parentNode.removeChild(card); } }, ['Discard']),
        el('button', { class: 'primary', onclick: function () {
          card.parentNode.removeChild(card);
          start();
          change(function () { Page.restore(d.snapshot); return true; });
          toast('Edits restored. Save to keep them in the file.');
        } }, ['Restore'])
      ])
    ]);
    root.appendChild(card);
  }

  function start() {
    if (editing) return;
    editing = true;
    ui.toggle.hidden = true;
    ui.bar.hidden = false;
    setMessage(null);
    refreshBar();
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('click', onClick, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
  }
  function stop() {
    if (!editing) return;
    select(null);
    editing = false;
    hovered = null;
    place();
    ui.bar.hidden = true;
    ui.toggle.hidden = false;
    window.removeEventListener('mousemove', onMove, true);
    window.removeEventListener('mousedown', onDown, true);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', onScroll);
  }

  function init() {
    if (!window.Page) return;
    host = document.createElement('div');
    host.setAttribute('data-page-ui', '');
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000';
    root = host.attachShadow({ mode: 'open' });
    root.appendChild(el('style', { text: CSS }));

    ui.toggle = el('button', { class: 'toggle', onclick: start }, ['✎ Edit page']);
    ui.msg = el('span', { class: 'msg' });
    ui.status = el('span', { class: 'status' });
    ui.undo = el('button', { title: 'Undo (Ctrl+Z)', onmousedown: function (e) { e.preventDefault(); }, onclick: undo }, ['Undo']);
    ui.redo = el('button', { title: 'Redo (Ctrl+Shift+Z)', onmousedown: function (e) { e.preventDefault(); }, onclick: redo }, ['Redo']);
    ui.save = el('button', { class: 'save', title: 'Save (Ctrl+S)', onmousedown: function (e) { e.preventDefault(); },
      onclick: function () { save(false); } }, ['Save']);
    ui.list = el('div', { class: 'list', hidden: true }, [
      el('button', { onclick: function () { save(true); } }, ['Save clean copy',
        el('small', { text: 'Without the Edit page button, for sending on' })])
    ]);
    ui.bar = el('div', { class: 'bar', hidden: true, role: 'toolbar', 'aria-label': 'Page editor' }, [
      ui.msg, ui.status, ui.undo, ui.redo, ui.save,
      el('div', { class: 'menu' }, [
        el('button', { class: 'more', title: 'More', 'aria-label': 'More save options', onmousedown: function (e) { e.preventDefault(); },
          onclick: function () { ui.list.hidden = !ui.list.hidden; } }, ['\u22EF']),
        ui.list
      ]),
      el('button', { class: 'done', onclick: stop }, ['Done'])
    ]);
    ui.toast = el('div', { class: 'toast', hidden: true, role: 'status' });
    ui.tag = el('span', { class: 'tag' });
    ui.hl = el('div', { class: 'hl', hidden: true }, [ui.tag]);
    ui.sel = el('div', { class: 'sel', hidden: true });
    ui.panel = el('aside', { class: 'panel', hidden: true, 'aria-label': 'Chart settings' });
    [ui.hl, ui.sel, ui.panel, ui.bar, ui.toggle, ui.toast].forEach(function (n) { root.appendChild(n); });
    root.appendChild(el('style', { text: '[hidden]{display:none!important}' }));
    document.body.appendChild(host);
    document.addEventListener('keydown', onKey, true);

    savedState = stateKey();
    openedAs = hash(savedState);
    Page.on(function () { if (!textEdit) { refreshBar(); keepDraft(); } });
    window.addEventListener('beforeunload', function (e) {
      if (textEdit) finishText(true);
      if (!unsaved()) return;
      e.preventDefault();
      e.returnValue = '';
    });
    offerDraft();

    window.PageEditor = { start: start, stop: stop, undo: undo, redo: redo, save: save,
      isEditing: function () { return editing; }, isUnsaved: unsaved };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
