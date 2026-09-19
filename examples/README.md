# Examples

Finished output from the skill. Each folder is fully self-contained — open
`index.html` directly in a browser, no server and no network required.

| Folder | Format | What it shows |
|:--|:--|:--|
| [`q4-ecommerce/`](q4-ecommerce/) | Dashboard | 20-panel bento grid: revenue trend with annotated spikes, channel and device mix, category comparisons, funnel and cohort views, full-width composition. |
| [`ev-retrospective/`](ev-retrospective/) | Report | Narrative analysis in a paper column — numbered sections, figures with interpretive captions, pull quotes, source notes. |

Both predate the single-file output and carry their own copy of `charts-lib/`
beside the page. The skill now inlines the library (`scripts/finalize.js`), so a
fresh build is one standalone HTML file with no sibling folder.
