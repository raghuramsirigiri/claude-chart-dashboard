#!/usr/bin/env node
/**
 * check-page.js — the static checks worth running before you call a page done.
 *
 *   node <skill-dir>/scripts/check-page.js index.html [--final]
 *
 * These are the failures that survive a confident-looking build, because none
 * of them throws: a panel whose chart was never wired renders as an empty box,
 * a line over unordered categories renders an error panel *inside* the chart,
 * and a page that still links `charts-lib/` looks perfect right up until it is
 * emailed to someone. Each one reads as a styling problem rather than the
 * missing wiring it is, which is why they need a checker rather than a glance.
 *
 * Run it during the build to catch wiring mistakes, and again with `--final`
 * on the page you are about to hand over. The difference is how it treats a
 * page that still links `charts-lib/`: mid-build that is simply where you are
 * (the library is inlined last), so it is reported and not counted; with
 * `--final` it is a failure, because a page that ships that way is broken for
 * everyone who opens it somewhere else.
 *
 * Exit code is 0 when everything passes and 1 when anything fails, so this
 * works as a gate in a script. Every check names the panel it is unhappy
 * about — the point is to tell you where to look, not to score the page.
 *
 * This does not replace opening the page. It cannot see overlap, a chart that
 * overflows its cell, or a colour that vanishes on the canvas. Where browser
 * tooling exists, use it as well; where it doesn't, this is the floor.
 *
 * No dependencies. Works on any Node 14+.
 */
'use strict';
const fs = require('fs');

const argv = process.argv.slice(2);
const isFinal = argv.includes('--final');
const target = argv.find(a => !a.startsWith('--'));
if (!target) {
  console.error('usage: node check-page.js <page.html> [--final]');
  process.exit(2);
}
if (!fs.existsSync(target)) {
  console.error('no such file: ' + target);
  process.exit(2);
}
const html = fs.readFileSync(target, 'utf8');

const results = [];
const ok = (name, detail) => results.push({ name, passed: true, detail });
const bad = (name, detail) => results.push({ name, passed: false, detail });
const note = (name, detail) => results.push({ name, passed: true, note: true, detail });

// ── 1. every panel has a chart, and every chart has a panel ──────────
// The template's cells carry id="c1"/"f1"; a factory call names the id it
// draws into. A mismatch in either direction is silent: an unclaimed cell is
// blank space, and a chart aimed at an id that isn't there throws inside a
// handler you may never read.
// Block comments are stripped first. Once the library is inlined the page
// contains charts.js's own header, whose usage example calls
// Charts.line('chart', …) — scanning raw text counts that as a chart aimed at
// a panel that doesn't exist. A commented-out call shouldn't count either.
const code = html.replace(/\/\*[\s\S]*?\*\//g, ' ');
const ids = [...code.matchAll(/id="(c\d+|f\d+)"/g)].map(m => m[1]);
const calls = [...code.matchAll(/Charts\.\w+\(\s*'([^']+)'/g)].map(m => m[1]);
const orphan = ids.filter(i => !calls.includes(i));
const ghost = calls.filter(c => !ids.includes(c));
if (!ids.length && !calls.length) {
  bad('panels wired to charts', 'no panels and no chart calls found — is this the right file?');
} else if (orphan.length || ghost.length) {
  bad('panels wired to charts',
    (orphan.length ? 'panels with no chart: ' + orphan.join(', ') : '') +
    (orphan.length && ghost.length ? ' | ' : '') +
    (ghost.length ? 'charts with no panel: ' + ghost.join(', ') : ''));
} else {
  ok('panels wired to charts', ids.length + ' panels, all wired');
}

// ── 2. line charts have an x-axis the engine will accept ─────────────
// Mirrors the guard in the line engine: a category axis is drawable when every
// label parses as a date, or when the labels form a strictly rising sequence
// (month names, weekday names, or one stem numbered upwards). Anything else
// draws "Line charts need a continuous or temporal x-axis" where the chart
// should be — a full-size panel that looks styled and says nothing.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const parsesAsDate = c => /\d{4}|\d{1,2}[\/-]\d{1,2}/.test(c) && !isNaN(Date.parse(c));
const rising = vals => vals.every((v, k) => v !== null && (k === 0 || v > vals[k - 1]));
const seqIndex = c => {
  const t = String(c).trim().toLowerCase();
  if (!/^[a-z]+\.?$/.test(t)) return null;
  const m = MONTHS.indexOf(t.slice(0, 3));
  if (m >= 0) return m;
  const d = DAYS.indexOf(t.slice(0, 3));
  return d >= 0 ? d : null;
};
const numbered = c => {
  const m = /^(\D*?)(-?\d+(?:\.\d+)?)(\D*)$/.exec(String(c).trim());
  return m ? { pre: m[1].toLowerCase(), post: m[3].toLowerCase(), n: +m[2] } : null;
};
const orderedCats = cats => {
  if (cats.length < 2) return true;
  if (cats.every(parsesAsDate)) return true;
  if (rising(cats.map(seqIndex))) return true;
  const nums = cats.map(numbered);
  if (nums.every(Boolean) &&
      nums.every(x => x.pre === nums[0].pre && x.post === nums[0].post) &&
      rising(nums.map(x => x.n))) return true;
  return false;
};

const badAxes = [];
let lineCount = 0;
for (const chunk of code.split('Charts.').slice(1)) {
  if (!/^line\s*\(/.test(chunk)) continue;
  lineCount++;
  const id = (chunk.match(/^line\s*\(\s*'([^']+)'/) || [])[1] || '?';
  const upToSeries = chunk.slice(0, chunk.indexOf('series:') + 1 || undefined);
  const m = upToSeries.match(/categories:\s*\[([^\]]*)\]/);
  if (!m) continue;                       // numeric or datetime x — nothing to check
  const cats = m[1].split(',').map(c => c.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  if (!orderedCats(cats)) badAxes.push(id + ': ' + cats.slice(0, 4).join(', '));
}
if (!lineCount) ok('line x-axes ordered', 'no line charts on the page');
else if (badAxes.length) {
  bad('line x-axes ordered',
    badAxes.join(' | ') + '  → use a column chart, or give each category its own series over a date axis');
} else ok('line x-axes ordered', lineCount + ' line chart(s), all ordered');

// ── 3. the page is standalone ────────────────────────────────────────
// A page that still points at charts-lib/ works perfectly in the folder it was
// built in and nowhere else. It is the failure that travels.
const refs = [...html.matchAll(/(?:src|href)="([^"]*charts-lib[^"]*)"/g)].map(m => m[1]);
if (refs.length && !isFinal) {
  note('standalone', 'not inlined yet — expected mid-build; run scripts/inline-lib.js before shipping');
} else if (refs.length) {
  bad('standalone', 'still loads: ' + [...new Set(refs)].join(', ') + '  → run scripts/inline-lib.js');
} else if (!/Charts\s*=|Charts\.line|applyPalette|function/.test(html)) {
  bad('standalone', 'no library found in the page at all');
} else {
  ok('standalone', Math.round(Buffer.byteLength(html) / 1024) + ' KB, no external references');
}

// ── 4. nothing else reaches the network ──────────────────────────────
// Same rule, wider net: a CDN font or icon set breaks the page for an offline
// reader just as thoroughly as a missing chart library, and is easier to add
// by reflex.
const external = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
  .map(m => m[1])
  .filter(u => !/^https?:\/\/(www\.)?w3\.org/.test(u));   // schema URLs are not fetched
if (external.length) {
  bad('no network dependencies', [...new Set(external)].slice(0, 4).join(', ') +
    '  → inline it as a data: URI, or drop it and use a system fallback');
} else {
  ok('no network dependencies', 'nothing is fetched at open time');
}

// ── report ───────────────────────────────────────────────────────────
const width = Math.max(...results.map(r => r.name.length));
console.log('');
for (const r of results) {
  console.log((r.note ? '  ----  ' : r.passed ? '  PASS  ' : '  FAIL  ') + r.name.padEnd(width + 2) + r.detail);
}
const failed = results.filter(r => !r.passed).length;
console.log(failed
  ? '\n' + failed + ' check(s) failed. Fix these before opening the page — they are the ones that look like styling bugs.\n'
  : '\nAll static checks pass. Now look at the rendered page: this cannot see overlap, overflow, or a colour that vanishes.\n');
process.exit(failed ? 1 : 0);
