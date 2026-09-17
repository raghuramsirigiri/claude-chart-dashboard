# Editable pages

Read this only when the user has asked for an editable page. An editable page
is a normal dashboard, report or deck whose content is stored as data, so a
person with no tooling can later switch a chart's type, fix a title, correct
a number or reword a paragraph, and save the file, without asking you again.
It edits what the page already has: nothing is added or removed.

This file covers the page format. The editor UI that sits on top of it is
built separately. Everything here works on its own: the page renders, and
`window.Page` can already read, change and save it.

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
3. **The runtime**, after `charts.js` and after any `Charts.applyPalette`:
   ```html
   <script src="charts-lib/page-runtime.js"></script>
   ```
   It draws every chart in the spec and exposes `window.Page`. Like the other
   placeholder tags, `finalize.js` stages it and then inlines it.

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
   `charts-lib/` with `page-runtime.js` in it.
2. Open the page and verify it as usual. Also run these in the console, or
   through your browser tooling:
   ```js
   Page.list()                       // every chart and text element, none unexpectedly locked
   Page.setChart('c1', { type: 'column' })   // → { ok: true } for a sensible alternative
   Page.setText('title', 'Test')     // → { ok: true }, and the heading changes
   Page.serialize()                  // the page as it would be saved
   ```
   Reload afterwards; these edits are not saved to disk.
3. `node <skill-dir>/scripts/finalize.js index.html` checks, inlines the
   runtime with the library, and re-checks. The **editable page** check fails
   on:
   - a spec that doesn't parse
   - an unknown chart type
   - a chart drawn by both the spec and code
   - a missing runtime
   - a bad `data-edit` kind
   - a missing or duplicate `data-key`

When you hand it over, say it is editable, and that any chart drawn by code is
locked (there should be none).

## `window.Page`

For the editor, and for verifying a page.

| Call | Does |
|:-----|:-----|
| `list()` | `[{ kind: 'chart', id, type, locked } \| { kind: 'text' \| 'rich', id }]` |
| `chartTypes()` | every type the inlined library can draw |
| `getChart(id)` / `setChart(id, { type?, config? })` | read or replace an existing spec chart and redraw it. Returns `{ ok, error }`; `error` is the library's own refusal (such as a line chart over unordered names) |
| `getText(key)` / `setText(key, value)` | read or replace marked text; `rich` is sanitised |
| `redraw(id?)` | redraw one chart or all of them |
| `on(fn)` / `isDirty()` | notified on each change; whether anything changed |
| `serialize()` | the whole page as standalone HTML with the edits: chart cells emptied, spec rewritten, tooltips and editor UI (`data-page-ui`) dropped. Opening the result and serializing again gives the same bytes |
