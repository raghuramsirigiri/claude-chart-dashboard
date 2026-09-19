# charts-lib: changes to apply upstream

The skill ships a copy of `charts-lib` in
`skills/chart-dashboard/assets/charts-lib/`, built from
`svg-charts/charts-lib`. That copy currently carries a change the upstream
library doesn't have yet. Apply it in `svg-charts`, rebuild, and re-sync the
copy, so that syncing the library again doesn't silently remove behaviour
the skill depends on.

| # | Change | Engine file | Needed by |
|---|--------|-------------|-----------|
| 1 | Packed bubbles honour a point's own `color` | `engines/scatter.js` | Editor Style tab, "Bubble colours" |

---

## 1. Packed bubbles honour a point's own `color`

### Problem

`Charts.packedBubble` ignores `color` on a data point. With one series,
every bubble is shaded from the size gradient (`gradientStart` →
`gradientEnd`). With several series, every bubble takes its series colour.
So this config draws "a" in the gradient colour, not red:

```js
Charts.packedBubble('el', {
  series: [{ name: 'Mentions', data: [{ name: 'a', y: 5, color: '#B31B38' }, ['b', 9]] }]
});
```

Every other per-mark chart already honours a point's `color`: donut and pie
slices, waffle panels, bar list rows, and column and bar points.

### Why the skill needs it

The editable-page editor (`assets/page-editor.js`) offers per-bubble colours
on the Style tab. `ChartConvert.style.markColour('packedBubble', …)` writes
`{ name, y, color }` onto the point. Without this change the config is saved
but the drawn bubble doesn't change colour.

### Change

`charts-lib/engines/scatter.js`, in the packed-bubble layout, where each
bubble's fill is chosen:

```diff
       flat.forEach(b => {
         const t = (maxV === minV) ? 1 : Math.sqrt((b.p.y - minV) / (maxV - minV));
         b.r = minR + t * (maxR - minR);
-        b._fillColor = (n === 1) ? grad[Math.min(99, Math.floor(t * 99))] : b.s.color;
+        // A bubble's own color wins; otherwise one series is shaded by size
+        // and several series take their series color.
+        b._fillColor = b.p.color || ((n === 1) ? grad[Math.min(99, Math.floor(t * 99))] : b.s.color);
       });
```

`b.p` is the point as normalised earlier in the same file. An object point
is copied with `Object.assign({}, d)`, so `color` is already on it. Array
points (`[name, value]`) have no colour and keep today's behaviour.

### Apply and verify

1. Make the edit above in `svg-charts/charts-lib/engines/scatter.js`.
2. Rebuild and run the library tests:
   ```bash
   cd svg-charts/charts-lib
   node _build.js
   node --test test/*.test.js
   ```
   All 270 tests passed with this change applied.
3. Suggested new test: a single-series packed bubble with one point carrying
   `color` draws that bubble's `<circle>` with that fill. The other bubbles
   keep their gradient fills.
4. Worth adding to the README's packed-bubble section: *a point's `color`
   overrides the size gradient (one series) or the series colour (several)*.
5. Re-sync the skill's copy and confirm it matches:
   ```bash
   cp svg-charts/charts-lib/charts.js claude-chart-dashboard/skills/chart-dashboard/assets/charts-lib/charts.js
   ```
   After that, `diff -rq` between the two `charts-lib` folders should report
   only the files that exist upstream alone (README, engines, tests, and so
   on).
6. Remove this section from this note.

### Current state

- **Skill copy** (`skills/chart-dashboard/assets/charts-lib/charts.js`):
  includes the change, committed on `feat/editable-pages` as `7582126`.
- **`svg-charts`**: unchanged. Rebuilding there and copying `charts.js` into
  the skill before applying this change would remove per-bubble colours.
