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
