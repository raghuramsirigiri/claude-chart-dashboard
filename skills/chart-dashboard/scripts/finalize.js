#!/usr/bin/env node
/**
 * finalize.js — the two ends of the build, so neither gets half-done.
 *
 *   node <skill-dir>/scripts/finalize.js <page.html> --stage
 *   node <skill-dir>/scripts/finalize.js <page.html>
 *
 * Between writing the page and handing it over there are four steps that
 * always run in the same order: stage the library beside the page so it can
 * actually be opened, check it, fold the library in, delete the staged copy,
 * check again as the thing you are about to ship. Done by hand they are four
 * commands, and the one that gets forgotten is the delete — which leaves a
 * `charts-lib/` folder next to a page that no longer needs it, so the next
 * person to look assumes the page depends on it.
 *
 * `--stage` does the first half: copies `assets/charts-lib` next to the page
 * so browser verification has something to load. Nothing else — verifying is
 * yours to do, and it is the part no script can replace.
 *
 * With no flag it does the second half: static checks, inline, remove the
 * staged copy, then re-check with `--final`, which insists the page is
 * standalone. Exit code is 0 only when the final checks pass, so this works
 * as the gate before you report done.
 *
 * The delete is deliberately timid: it removes a sibling `charts-lib/` only
 * when it holds exactly the three files this skill stages. Anything else is
 * someone's own folder that happens to share a name, and it is left alone
 * with a note. The individual scripts (`inline-lib.js`, `check-page.js`)
 * still work on their own for the split-form exception, where the page keeps
 * its `charts-lib/` references on purpose.
 *
 * No dependencies. Works on any Node 14+.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = __dirname;
const LIB = path.join(SCRIPTS, '..', 'assets', 'charts-lib');
const LIB_FILES = ['charts.css', 'charts.js', 'theme.js'];

const argv = process.argv.slice(2);
const stageOnly = argv.includes('--stage');
const target = argv.find(a => !a.startsWith('--'));
if (!target) {
  console.error('usage: node finalize.js <page.html> [--stage]');
  process.exit(2);
}
if (!fs.existsSync(target)) {
  console.error('no such file: ' + target);
  process.exit(2);
}

const staged = path.join(path.dirname(path.resolve(target)), 'charts-lib');

const run = (script, args) => spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args],
  { stdio: 'inherit' });

// ── stage: put the library beside the page so it can be opened ───────
if (stageOnly) {
  fs.mkdirSync(staged, { recursive: true });
  for (const f of LIB_FILES) fs.copyFileSync(path.join(LIB, f), path.join(staged, f));
  console.log('staged charts-lib/ beside ' + path.basename(target) +
    ' — open the page and verify it, then run this without --stage to ship it.');
  process.exit(0);
}

// ── 1. check the page as built ───────────────────────────────────────
const built = run('check-page.js', [target]);
if (built.status !== 0) {
  console.error('Static checks failed on the page as built. Fix those before inlining — ' +
    'inlining a broken page just makes it a bigger broken page.');
  process.exit(1);
}

// ── 2. fold the library into the page ────────────────────────────────
if (run('inline-lib.js', [target]).status !== 0) process.exit(1);

// ── 3. remove the staged copy, if it is ours to remove ───────────────
if (fs.existsSync(staged)) {
  const found = fs.readdirSync(staged).sort();
  if (found.length === LIB_FILES.length && found.every((f, i) => f === [...LIB_FILES].sort()[i])) {
    fs.rmSync(staged, { recursive: true, force: true });
    console.log('removed the staged charts-lib/ — nothing references it now.');
  } else {
    console.log('left charts-lib/ alone: it holds ' + found.join(', ') +
      ', which is not what this skill stages. Delete it yourself if it is a leftover.');
  }
}

// ── 4. check again, as the file you are about to hand over ───────────
process.exit(run('check-page.js', [target, '--final']).status === 0 ? 0 : 1);
