// node --test skills/chart-dashboard/tests/chart-convert.test.js
//
// Every switch chart-convert offers must produce a config the library accepts,
// carry the numbers across unchanged, and survive a round trip back.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

global.window = global;
global.self = global;
const ASSETS = path.join(__dirname, '..', 'assets');
require(path.join(ASSETS, 'charts-lib', 'theme.js'));
require(path.join(ASSETS, 'charts-lib', 'charts.js'));
const CC = require(path.join(ASSETS, 'chart-convert.js'));

const FIXTURES = {
  column: { title: 'Revenue by region', subtitle: '$M', legend: { enabled: true },
    plotOptions: { column: { stacking: 'normal' }, series: { dataLabels: { enabled: true } } },
    yAxis: { title: { text: '$M' }, min: 0 },
    xAxis: { categories: ['North', 'South', 'East', 'West'] },
    series: [{ name: '2025', data: [{ y: 10, color: '#2323FF' }, 8, 6, 4] }, { name: '2026', data: [12, 9, 5, 3] }] },
  bar: { title: 'Units', xAxis: { categories: ['A', 'B', 'C'] }, series: [{ name: 'Units', data: [5, 3, 1] }] },
  line: { title: 'Monthly', xAxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr'] },
    series: [{ name: 'Visits', data: [1, 2, 3, 4] }] },
  lineDates: { title: 'Daily', xAxis: { type: 'datetime' },
    series: [{ name: 'a', data: [[Date.UTC(2026, 0, 1), 1], [Date.UTC(2026, 0, 2), 2], [Date.UTC(2026, 0, 3), 4]] }] },
  radar: { title: 'Skills', xAxis: { categories: ['x', 'y', 'z'] }, series: [{ name: 'p', data: [1, 2, 3] }] },
  dumbbell: { title: 'Gap', xAxis: { categories: ['a', 'b'] }, series: [{ name: 'Before', data: [1, 2] }, { name: 'After', data: [3, 4] }] },
  table: { title: 'Scores', columns: [{ key: 'q1', name: 'Q1' }, { key: 'note', name: 'Note' }, { key: 'q2', name: 'Q2' }],
    rows: [{ name: 'A', q1: 1, note: 'x', q2: 2 }, { name: 'B', q1: 3, note: 'y', q2: null }] },
  barList: { title: 'Editors', plotOptions: { barList: { sort: 'desc' } },
    series: [{ name: 'Share', data: [{ name: 'VS Code', y: 73.6 }, { name: 'Vim', y: 20 }] }] },
  donut: { title: 'Mix', series: [{ name: 'Channel', data: [['Direct', 38], ['Paid', 24], ['Organic', 20]] }] },
  pie: { title: 'Device', series: [{ name: 'Device', data: [{ name: 'Mobile', y: 62 }, { name: 'Desktop', y: 38 }] }] },
  waffle: { title: 'Priorities', series: [{ name: 'Share', data: [{ name: 'Growth', y: 29, description: 'd1' }, { name: 'Ops', y: 30, description: 'd2' }] }] },
  packedBubble: { title: 'Topics', series: [{ name: 'Mentions', data: [['a', 5], ['b', 9]] }] },
  waterfall: { title: 'Bridge', series: [{ name: 'Profit', data: [{ name: 'Start', y: 100 }, { name: 'Price', y: 20 }, { name: 'Cost', y: -30 }, { name: 'End', isSum: true }] }] },
  histogram: { title: 'Latency', data: [1, 2, 2, 3, 3, 3, 4, 8] },
  scatter: { title: 'Fit', series: [{ name: 's', data: [[1, 2], [2, 3], [3, 5]] }] },
  bubble: { title: 'Size', series: [{ name: 'b', data: [[1, 2, 3], [2, 3, 4]] }] },
  sankey: { title: 'Flow', series: [{ data: [['a', 'b', 3]] }] }
};
const typeOf = k => (k === 'lineDates' ? 'line' : k);
const numbers = (type, cfg) => {
  const ds = CC.extract(type, cfg);
  if (ds.kind === 'values') return ds.values;
  if (ds.kind === 'xy') return ds.series.map(s => s.points.map(p => [p.x, p.y]));
  return { categories: ds.categories, series: ds.series.map(s => s.values) };
};

for (const [key, cfg] of Object.entries(FIXTURES)) {
  const from = typeOf(key);

  test(key + ': every offered switch is accepted by the library and keeps the numbers', () => {
    const offered = CC.targets(from, cfg);
    if (CC.FIXED.includes(from)) { assert.deepStrictEqual(offered, []); return; }
    assert.ok(offered.some(t => t.current), 'the current type is listed');
    for (const t of offered.filter(t => t.ok && !t.current)) {
      const out = CC.convert(from, cfg, t.type);
      assert.ok(!out.error, t.type + ': ' + out.error);
      const v = Charts.validate(t.type, out.config);
      // A line over named categories is the library's call, not ours: the
      // runtime draws it off screen and reports the refusal.
      if (t.type === 'line' && !v.ok) continue;
      assert.ok(v.ok, from + ' → ' + t.type + ': ' + v.errors.join('; '));
      assert.strictEqual(out.config.title, cfg.title, 'title carried');
      if (from !== 'waterfall' && from !== 'table') {
        const a = numbers(from, cfg), b = numbers(t.type, out.config);
        if (a.series && b.series) {
          assert.deepStrictEqual(b.categories, a.categories);
          assert.deepStrictEqual(b.series, a.series.slice(0, b.series.length));
        } else {
          assert.deepStrictEqual(b, a);
        }
      }
    }
  });
}

test('rules: why a type is refused', () => {
  const reason = (from, to) => CC.targets(from, FIXTURES[from]).find(t => t.type === to).reason;
  assert.match(reason('column', 'donut'), /one series/);
  assert.match(reason('dumbbell', 'radar'), /3 categories/);
  assert.match(reason('bar', 'dumbbell'), /exactly 2 series/);
  assert.match(reason('scatter', 'bubble'), /size/);
  assert.match(reason('waterfall', 'donut'), /Negative/);
  assert.ok(CC.targets('bar', FIXTURES.bar).find(t => t.type === 'donut').ok);
  assert.match(reason('table', 'dumbbell'), /blank/, 'a blank is not drawn as zero');
  assert.ok(CC.targets('table', FIXTURES.table).find(t => t.type === 'column').ok, 'column leaves a gap');
});

test('lost settings are named', () => {
  const out = CC.convert('column', FIXTURES.column, 'table');
  assert.ok(out.lost.includes('plotOptions.column'));
  assert.ok(out.lost.includes('point colours'));
  assert.deepStrictEqual(out.config.plotOptions, { series: { dataLabels: { enabled: true } } });
  assert.ok(CC.convert('table', FIXTURES.table, 'column').lost.some(l => /non-numeric/.test(l)));
});

test('a waterfall becomes columns of its totals and steps', () => {
  const out = CC.convert('waterfall', FIXTURES.waterfall, 'column');
  assert.deepStrictEqual(out.config.xAxis.categories, ['Start', 'Price', 'Cost', 'End']);
  assert.deepStrictEqual(out.config.series[0].data, [100, 20, -30, 90]);
  assert.ok(!CC.targets('column', FIXTURES.column).some(t => t.type === 'waterfall'), 'never offered as a target');
});

test('a dated line becomes date categories', () => {
  const out = CC.convert('line', FIXTURES.lineDates, 'column');
  assert.deepStrictEqual(out.config.xAxis.categories, ['2026-01-01', '2026-01-02', '2026-01-03']);
  assert.ok(out.lost.includes('xAxis.type'));
});

test('round trip bar → donut → bar keeps the data', () => {
  const donut = CC.convert('bar', FIXTURES.bar, 'donut').config;
  const back = CC.convert('donut', donut, 'bar').config;
  assert.deepStrictEqual(numbers('bar', back), numbers('bar', FIXTURES.bar));
});

test('point colours survive across types that draw them', () => {
  const out = CC.convert('column', FIXTURES.column, 'bar');
  assert.deepStrictEqual(out.config.series[0].data[0], { y: 10, color: '#2323FF' });
});

for (const [key, cfg] of Object.entries(FIXTURES)) {
  const type = typeOf(key);
  if (CC.FIXED.includes(type)) continue;
  test(key + ': writing the unchanged data back gives the same config', () => {
    const ds = CC.extract(type, cfg);
    const out = CC.withData(type, cfg, ds);
    assert.ok(!out.error, out.error);
    assert.deepStrictEqual(out.config, cfg);
  });
}

test('withData changes a value and a name and keeps everything else', () => {
  const ds = CC.extract('column', FIXTURES.column);
  ds.series[0].values[0] = 99;
  ds.categories[1] = 'Southwest';
  ds.series[1].name = 'Plan';
  const out = CC.withData('column', FIXTURES.column, ds).config;
  assert.deepStrictEqual(out.series[0].data[0], { y: 99, color: '#2323FF' });
  assert.strictEqual(out.xAxis.categories[1], 'Southwest');
  assert.strictEqual(out.series[1].name, 'Plan');
  assert.deepStrictEqual(out.plotOptions, FIXTURES.column.plotOptions);
});

test('withData keeps shapes: pairs, objects with descriptions, tables, waterfall totals', () => {
  let ds = CC.extract('donut', FIXTURES.donut); ds.series[0].values[2] = 1; ds.categories[2] = 'SEO';
  assert.deepStrictEqual(CC.withData('donut', FIXTURES.donut, ds).config.series[0].data[2], ['SEO', 1]);

  ds = CC.extract('waffle', FIXTURES.waffle); ds.series[0].values[0] = 50;
  assert.deepStrictEqual(CC.withData('waffle', FIXTURES.waffle, ds).config.series[0].data[0], { name: 'Growth', y: 50, description: 'd1' });

  ds = CC.extract('table', FIXTURES.table); ds.series[1].values[1] = 7;
  const tbl = CC.withData('table', FIXTURES.table, ds).config;
  assert.strictEqual(tbl.rows[1].q2, 7);
  assert.strictEqual(tbl.rows[1].note, 'y', 'text column untouched');

  ds = CC.extract('waterfall', FIXTURES.waterfall);
  assert.deepStrictEqual(ds.series[0].locked, [false, false, false, true]);
  ds.series[0].values[1] = 25; ds.series[0].values[3] = 12345;
  const wf = CC.withData('waterfall', FIXTURES.waterfall, ds).config;
  assert.deepStrictEqual(wf.series[0].data[1], { name: 'Price', y: 25 });
  assert.deepStrictEqual(wf.series[0].data[3], { name: 'End', isSum: true }, 'a total stays computed');
  assert.ok(Charts.validate('waterfall', wf).ok);
});

test('withData refuses added rows and keeps x-position categories', () => {
  const ds = CC.extract('bar', FIXTURES.bar);
  ds.categories.push('D'); ds.series[0].values.push(1);
  assert.match(CC.withData('bar', FIXTURES.bar, ds).error, /added or removed/);
  const dated = CC.extract('line', FIXTURES.lineDates);
  assert.strictEqual(dated.categoryEditable, false);
  dated.categories[0] = 'renamed';
  const out = CC.withData('line', FIXTURES.lineDates, dated).config;
  assert.strictEqual(out.series[0].data[0][0], Date.UTC(2026, 0, 1));
});

test('style options follow the chart', () => {
  const o = (k, t) => CC.style.options(t || typeOf(k), FIXTURES[k]);
  assert.deepStrictEqual(o('bar'), { sort: true, highlight: true, labels: true, colours: true, marks: true });
  assert.strictEqual(o('column').sort, false, 'two series: no single order');
  assert.strictEqual(o('column').highlight, false);
  assert.strictEqual(o('line').sort, false, 'a line keeps its order');
  assert.strictEqual(o('donut').sort, true);
  assert.strictEqual(o('donut').colours, false);
  assert.deepStrictEqual(o('sankey'), { sort: false, highlight: false, labels: false, colours: false, marks: true });
});

test('sort moves names, values and point colours together', () => {
  const cfg = { xAxis: { categories: ['a', 'b', 'c', 'd'] },
    series: [{ name: 's', data: [2, { y: 9, color: '#f00' }, null, 5] }] };
  const out = CC.style.sort('bar', cfg, 'desc').config;
  assert.deepStrictEqual(out.xAxis.categories, ['b', 'd', 'a', 'c']);
  assert.deepStrictEqual(out.series[0].data, [{ y: 9, color: '#f00' }, 5, 2, null]);
  assert.deepStrictEqual(CC.style.sort('bar', cfg, 'asc').config.xAxis.categories, ['a', 'd', 'b', 'c'], 'blanks last');
  assert.deepStrictEqual(cfg.xAxis.categories, ['a', 'b', 'c', 'd'], 'input untouched');
  const donut = CC.style.sort('donut', FIXTURES.donut, 'asc').config;
  assert.deepStrictEqual(donut.series[0].data.map(p => p[0]), ['Organic', 'Paid', 'Direct']);
  assert.match(CC.style.sort('line', FIXTURES.line, 'desc').error, /can't be sorted/);
});

test('highlight colours chosen points and clears back to plain values', () => {
  const on = CC.style.highlight('bar', FIXTURES.bar, [1], '#2323FF', '#8f8d87').config;
  assert.deepStrictEqual(on.series[0].data, [{ y: 5, color: '#8f8d87' }, { y: 3, color: '#2323FF' }, { y: 1, color: '#8f8d87' }]);
  assert.deepStrictEqual(CC.style.highlighted(on, '#2323ff'), [1]);
  const off = CC.style.highlight('bar', on, [], '#2323FF', '#8f8d87').config;
  assert.deepStrictEqual(off.series[0].data, [5, 3, 1]);
  const list = CC.style.highlight('barList', FIXTURES.barList, [0], '#2323FF', '#8f8d87').config;
  assert.deepStrictEqual(list.series[0].data[0], { name: 'VS Code', y: 73.6, color: '#2323FF' });
  assert.ok(Charts.validate('bar', on).ok);
});

test('labels and series colours', () => {
  const off = CC.style.labels('column', FIXTURES.column, false).config;
  assert.deepStrictEqual(off.plotOptions.series.dataLabels, { enabled: false });
  assert.deepStrictEqual(off.plotOptions.column, { stacking: 'normal' });
  const red = CC.style.seriesColour('column', FIXTURES.column, 1, '#4949FF').config;
  assert.strictEqual(red.series[1].color, '#4949FF');
  assert.ok(!('color' in CC.style.seriesColour('column', red, 1, null).config.series[1]));
  assert.match(CC.style.labels('donut', FIXTURES.donut, true).error, /can't be changed/);
});

test('marks: per-slice, per-row, per-bubble, waterfall roles, sankey nodes', () => {
  assert.deepStrictEqual(CC.style.marks('donut', FIXTURES.donut).map(m => m.name), ['Direct', 'Paid', 'Organic']);
  assert.deepStrictEqual(CC.style.marks('packedBubble', FIXTURES.packedBubble).map(m => m.name), ['a', 'b']);
  assert.deepStrictEqual(CC.style.marks('waterfall', FIXTURES.waterfall).map(m => m.key), ['upColor', 'downColor', 'sumColor']);
  assert.deepStrictEqual(CC.style.marks('sankey', FIXTURES.sankey).map(m => m.key), ['a', 'b']);
  assert.strictEqual(CC.style.marks('column', FIXTURES.column), null, 'two series colour by series');
  assert.strictEqual(CC.style.marks('line', FIXTURES.line), null);
  assert.strictEqual(CC.style.options('pie', FIXTURES.pie).marks, true);
});

test('markColour keeps each point shape and clears back to it', () => {
  const on = CC.style.markColour('donut', FIXTURES.donut, 1, '#B31B38').config;
  assert.deepStrictEqual(on.series[0].data[1], { name: 'Paid', y: 24, color: '#B31B38' });
  assert.deepStrictEqual(CC.style.marks('donut', on)[1].color, '#B31B38');
  const off = CC.style.markColour('donut', on, 1, null).config;
  assert.deepStrictEqual(off.series[0].data[1], { name: 'Paid', y: 24 });
  const bar = CC.style.markColour('bar', FIXTURES.bar, 0, '#243E63').config;
  assert.deepStrictEqual(bar.series[0].data[0], { y: 5, color: '#243E63' });
  assert.strictEqual(CC.style.markColour('bar', bar, 0, null).config.series[0].data[0], 5);
  const bubble = CC.style.markColour('packedBubble', FIXTURES.packedBubble, 0, '#9a0060').config;
  assert.deepStrictEqual(bubble.series[0].data[0], { name: 'a', y: 5, color: '#9a0060' });
  assert.deepStrictEqual(CC.extract('packedBubble', bubble).series[0].values, [5, 9], 'values unchanged');
});

test('markColour on waterfall roles and sankey nodes', () => {
  const wf = CC.style.markColour('waterfall', FIXTURES.waterfall, 'downColor', '#9a0060').config;
  assert.strictEqual(wf.plotOptions.waterfall.downColor, '#9a0060');
  assert.ok(Charts.validate('waterfall', wf).ok);
  const sk = CC.style.markColour('sankey', FIXTURES.sankey, 'b', '#243E63').config;
  assert.deepStrictEqual(sk.series[0].nodes, [{ id: 'b', color: '#243E63' }]);
  assert.ok(Charts.validate('sankey', sk).ok);
  const cleared = CC.style.markColour('sankey', sk, 'b', null).config;
  assert.ok(!('nodes' in cleared.series[0]), 'an empty node entry is removed');
  assert.match(CC.style.markColour('sankey', FIXTURES.sankey, 'zzz', '#000').error, /can't be recoloured/);
});
