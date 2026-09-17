# Editable pages

Read this only when the user has asked for an editable page. An editable page
is a normal dashboard, report or deck whose content is stored as data, so a
person with no tooling can later switch a chart's type, fix a title, correct
a number or reword a paragraph, and save the file, without asking you again.
It edits what the page already has: nothing is added or removed.

The page carries its own editor: an **Edit page** button in the corner opens
it (see [The editor](#the-editor)). Readers who never press it see an ordinary
page, and the button doesn't print.

## When to build one

- **Not by default.** A static page is the normal deliverable. Build an
  editable one only when the user asks for it, either up front ("make it
  editable", "so my team can tweak it") or after you offered it.
- **Offer it once, on the first build.** When you hand over the first page in
  a conversation, end with one line such as: *"Want an editable version, so
  you can switch chart types and change the text or numbers yourself without
  rerunning this?"* Don't offer it again after a no, and don't offer it on
  later revisions of the same page.
- **Converting an existing page** means rebuilding it in this format, with
  the same charts, text and layout. Follow the same rules below.

## The format

Three parts, all in the one HTML file:

1. **Charts in one JSON block**, keyed by the id of the element each chart
   draws into:
   ```html
   <script type="application/json" id="page-spec">
   {
     "version": 1,
     "charts": {
       "c1": { "type": "bar", "config": { "title": "…", "series": [ … ] } }
     }
   }
   </script>
   ```
   `type` is a key of `charts.manifest.json` (`line`, `column`, `donut`,
   `reportTable`, …). `config` is exactly what you would have passed to
   `Charts.<type>('c1', config)`.
2. **Text marked in place**, with a kind and a key that is unique on the page:
   ```html
   <h1 data-edit="text" data-key="title">Q4 review</h1>
   <p data-edit="rich" data-key="finding-1">Revenue <b>rose 12%</b> …</p>
   ```
   - `text`: plain text. Headings, labels, KPI values, captions.
   - `rich`: a paragraph that may keep `<b>`, `<strong>`, `<i>`, `<em>` and
     `<br>`. Anything else pasted in is stripped when it is edited.
3. **The runtime and editor**, after `charts.js` and after any
   `Charts.applyPalette`, in this order:
   ```html
   <script src="charts-lib/chart-convert.js"></script>
   <script src="charts-lib/page-runtime.js"></script>
   <script src="charts-lib/page-editor.js"></script>
   ```
   - `chart-convert.js` lets a chart switch type (see below).
   - `page-runtime.js` draws every chart in the spec and exposes
     `window.Page`.
   - `page-editor.js` adds the Edit page button and the editor.

   Like the other placeholder tags, `finalize.js` stages all three and then
   inlines them.

`templates/dashboard-editable.html` is the dashboard template already in this
format. For a report or a deck, start from `report.html` or `slides.html`,
apply the rules below, and add the spec block and runtime tag in the same
positions as in the editable dashboard.

## Authoring rules

These exist because the config is saved and reloaded as JSON, and because
someone other than you will change the numbers later.

- **Plain JSON only.** No functions (formatter callbacks), no `Charts.theme`
  lookups, no values computed in script. Use the library's string options
  instead (`format: '{y}%'`, `valueSuffix`, `decimals`). Colours are written
  as literal hex: resolve `T.colors[1]` and `T.muted` from the theme that is in
  use, *after* any `applyPalette`, and write those values.
- **No chart code.** Don't add `Charts.<type>(…)` calls or a `render()`
  function. A chart drawn by code is *locked*: it still renders, but the
  editor can't change it, and `check-page.js` lists it. The same goes for
  text a script writes on load: a KPI value that code sets would overwrite
  the reader's edit every time the page opens.
- **No filter controls.** A filter recomputes charts in code, which locks
  them. If the user wants both filters and editing, tell them this and let
  them choose. Where filters would help, small multiples in the spec usually
  do the job.
- **Action titles are still findings**, written as literal text. They don't
  recompute when someone edits the data, so the editor will flag a title
  whose chart data has changed. That check belongs to the editor; you just
  write the title.
- **Write chart data in the plain shapes**, so the chart can switch type:
  `xAxis.categories` plus `series[].data` as numbers (or `{ y, color }`) for
  category charts; `[name, value]` or `{ name, y }` for one-series charts;
  `[x, y]` for scatter. Use `null` for a missing value, never `0`. The
  converter reads the other accepted shapes too, but these are the ones it
  keeps intact.
- **Mark every piece of text a reader might reasonably change**, and only
  those:

  | Page | Mark as `text` | Mark as `rich` |
  |:-----|:---------------|:---------------|
  | All | page title, scope line, reporting window, KPI label/value/context, note headings, figure captions | notes, footer (sources, definitions) |
  | Report | section headings, abstract heading | abstract, body paragraphs, callouts |
  | Deck | slide titles, kickers, agenda parts, statement headline, footer context | statement body, bullet text (one key per bullet) |

  Don't mark structural chrome the reader would never edit (the deck's slide
  counter, template labels that are not content).
- **Keys are stable, readable and unique**: `title`, `k1-value`,
  `s4-title`, `finding-2`. They name the element, not its current wording,
  so a key still makes sense after the text changes.
- **One spec entry per chart element**, and every `.chart` element on the
  page has one. `check-page.js` fails both an orphan cell and an entry with
  no cell.

## Build and verify

The steps are the same as for any page (SKILL.md steps 7–8):

1. `node <skill-dir>/scripts/finalize.js index.html --stage` stages
   `charts-lib/` with the three editable-page files in it.
2. Open the page and verify it as usual. Also run these in the console, or
   through your browser tooling:
   ```js
   Page.list()                       // every chart and text element, none unexpectedly locked
   Page.alternatives('c1')           // sensible types offered, and the reasons others are refused
   Page.switchType('c1', 'column')   // → { ok: true } for an offered type
   Page.setText('title', 'Test')     // → { ok: true }, and the heading changes
   Page.serialize()                  // the page as it would be saved
   ```
   Reload afterwards; these edits are not saved to disk. Then press **Edit
   page**, click a chart and a heading, and check that the panel opens and
   the text becomes editable.
3. `node <skill-dir>/scripts/finalize.js index.html` checks, inlines the
   runtime with the library, and re-checks. The **editable page** check fails
   on:
   - a spec that doesn't parse
   - an unknown chart type
   - a chart drawn by both the spec and code
   - a missing `page-runtime.js`, `chart-convert.js` or `page-editor.js`
   - a bad `data-edit` kind
   - a missing or duplicate `data-key`

When you hand it over, say it is editable, and that any chart drawn by code is
locked (there should be none).

## The editor

`page-editor.js` is written for someone who has never seen the code.

- **Edit page** (bottom-right) enters edit mode. A toolbar holds a hint,
  the number of changes, **Undo**, **Redo** and **Done**. It sits at the
  bottom of the screen, or the top on a phone.
- **Hovering** outlines anything editable and names it: Edit text, Edit
  paragraph, Edit chart, or Locked chart for one drawn by page code. In edit
  mode, clicks on charts select them instead of toggling legends.
- **Text** is edited in place, in the page's own styling.
  - A heading or label is selected whole on click, so typing replaces it.
    Enter finishes, Esc cancels.
  - A paragraph puts the cursor where it was clicked. Ctrl+B and Ctrl+I
    work, and clicking outside finishes.
  - Pasted markup is cleaned (see the `rich` kind above).
- **A chart** opens a side panel (a bottom sheet on a phone):
  - **Type**: the switchable types as buttons. Refused ones are greyed out
    with their reason, and warnings are shown under the others. After a
    switch, the panel says which settings were left out; Undo brings them
    back.
  - **Text**: title and subtitle.
  - **Data**: a grid of the chart's existing names and values (a column of
    values for a histogram, x/y/size rows for scatter and bubble).
    - Enter moves down the column, and cells pasted from a spreadsheet fill
      from the chosen cell.
    - A cell that isn't a number is marked and not applied.
    - Waterfall totals are read-only, and axis positions on a dated line
      can't be renamed.
    - The chart's other settings are kept.
    - Sankey, report tables, bar insight tables, panels and map grids show
      only the Text tab's fields as editable.
- **Stale titles.** Once a chart's data changes, its panel warns that the
  title may no longer describe it, until the title is edited or the warning
  is dismissed.
- **Undo/redo** (Ctrl+Z, Ctrl+Shift+Z or Ctrl+Y) covers every text, type
  and data change, 200 steps deep.
- **Nothing is added or removed**: no new charts, text blocks, rows or series.

### Saving

- **Save** (Ctrl+S) writes the whole page, edits included, as one standalone
  HTML file that is still editable.
  - In Chrome and Edge the first save asks where to save it, suggesting the
    current file name. Later saves write to the same file without asking.
  - Other browsers, and viewers that block the file picker, download the
    file instead, and a message says so.
- **Save clean copy** (the ⋯ menu, or Ctrl+Shift+S) writes the same page
  without the editor script and its button, for sending on. It is always a
  new file.
- **Verified before writing.** The HTML is opened in a hidden frame first, and
  nothing is written unless its charts match the page and every one draws.
  A failed check says what went wrong.
- **Status.** The toolbar shows *Unsaved changes* or *Saved*, measured
  against the last saved state, so undoing back to it counts as saved.
- **Drafts.** Every change is also kept in this browser's `localStorage`,
  keyed by the file's path and tied to how the page looked when it opened. If
  the tab closes before saving, reopening the page offers *Restore* or
  *Discard*. A draft from an older version of the file is dropped, not laid
  over a newer one. Saving clears the draft.
- **Leaving** with unsaved changes triggers the browser's own "leave site?"
  prompt.

A page opened from inside a sandboxed viewer (such as an artifact preview)
may not be allowed to save at all. Tell users to open the `.html` file
directly in a browser to edit it.

The editor's UI lives in a shadow root on a `data-page-ui` host, so page CSS
can't restyle it and `Page.serialize()` leaves it out. A saved page carries
the editor script and stays editable. `window.PageEditor` has `start()`,
`stop()`, `undo()`, `redo()`, `save(clean)`, `isEditing()` and `isUnsaved()`, which are useful when
verifying through browser tooling.

## Switching a chart's type

`chart-convert.js` reads a chart's data into a neutral shape and builds
another type's config from it. Only types that make sense for the same data
are offered:

| Data | Can switch between |
|:-----|:-------------------|
| Categories × series | column, bar, line, radar, dumbbell, table, barList, donut, pie, waffle, packedBubble |
| Bridge steps | waterfall → any type above (totals become plain values); never back |
| Raw values | histogram, histogramPercent, histogramCumulative |
| Points | scatter ↔ bubble (bubble only when every point has a size) |
| — | sankey, reportTable, barInsightTable, panels, geofacet: edit in place, no switching |

A candidate is refused, with a reason the editor shows, when:
- the data's shape rules it out: one-series charts need one series, a dumbbell
  needs exactly 2, a radar needs 3+ categories, parts of a whole can't be
  negative, a waffle's values must be at most 100, and blanks rule out types
  that would draw them as zero;
- or the library itself refuses it. Each candidate is drawn off screen at the
  chart's size, so a line over named categories is refused in the library's
  own words.

Warnings flag a pie with more than 6 slices, a card narrower than the new
type needs, and a table put into a fixed-height card. Each candidate also
lists the settings the switch would drop (`plotOptions.column`, point colours
on a table, `xAxis.type`). Titles, subtitles, legend, tooltip,
`plotOptions.series` and the value axis carry across. Switching back restores
the earlier type's config exactly, until the chart's data is set directly.

Tests: `node --test skills/chart-dashboard/tests/chart-convert.test.js`. Every
switch offered for every chart type must produce a config the library's
validator accepts, with the same categories and numbers.

## `window.Page`

For the editor, and for verifying a page.

| Call | Does |
|:-----|:-----|
| `list()` | `[{ kind: 'chart', id, type, locked } \| { kind: 'text' \| 'rich', id }]` |
| `chartTypes()` | every type the inlined library can draw |
| `getChart(id)` / `setChart(id, { type?, config? })` | read or replace an existing spec chart and redraw it. Returns `{ ok, error }`; `error` is the library's own refusal (such as a line chart over unordered names) |
| `getText(key)` / `setText(key, value)` | read or replace marked text; `rich` is sanitised |
| `alternatives(id)` | `[{ type, current, ok, reason, warnings, lost }]`: the types this chart can switch to, checked as described above |
| `switchType(id, type)` | convert and redraw. Returns `{ ok, error, lost }`; a refused switch leaves the chart unchanged |
| `snapshot()` / `restore(snap)` | every spec chart and marked text, for undo; `restore` redraws only what differs |
| `redraw(id?)` | redraw one chart or all of them |
| `on(fn)` / `isDirty()` | notified on each change; whether anything changed |
| `serialize()` | the whole page as standalone HTML with the edits: chart cells emptied, spec rewritten, tooltips and editor UI (`data-page-ui`) dropped. Opening the result and serializing again gives the same bytes |
