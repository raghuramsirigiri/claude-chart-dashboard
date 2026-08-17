#!/usr/bin/env node
/**
 * extract-theme.js — derive a Charts.theme override from a reference design.
 *
 * Usage:
 *   node extract-theme.js <file-or-dir> [more files…]
 *
 * Give it a brand's CSS and/or HTML (a saved page, an exported stylesheet, a
 * directory containing them) and it prints:
 *   1. what it found, so you can sanity-check the mapping
 *   2. a Charts.theme override block ready to paste
 *   3. a contrast report flagging anything unreadable
 *
 * It proposes; you decide. Reading the report matters more than pasting the
 * block — an extractor cannot know that a brand's "--accent-2" is reserved for
 * error states, and a palette that passes every ratio can still be wrong.
 *
 * No dependencies. Works on any Node 14+.
 */
const fs = require('fs');
const path = require('path');

// ── colour parsing ───────────────────────────────────────────────────
const NAMED = { white: '#ffffff', black: '#000000' };

function toRgb(raw) {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length < 6) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(s);
  if (m) return hslToRgb(+m[1], +m[2] / 100, +m[3] / 100);
  return null;
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255) };
}

const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

function luminance(c) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

const contrast = (a, b) => {
  const l1 = luminance(a), l2 = luminance(b);
  return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
};

const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
const saturation = c => {
  const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};

// ── gather source text ───────────────────────────────────────────────
function collectFiles(target) {
  const st = fs.statSync(target);
  if (st.isFile()) return [target];
  return fs.readdirSync(target)
    .map(f => path.join(target, f))
    .filter(f => fs.statSync(f).isFile() && /\.(css|html?)$/i.test(f));
}

const inputs = process.argv.slice(2);
if (!inputs.length) {
  console.error('usage: node extract-theme.js <file-or-dir> [more files…]');
  process.exit(2);
}
const files = inputs.flatMap(collectFiles);
if (!files.length) { console.error('No .css/.html files found.'); process.exit(2); }
const css = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

// ── harvest ──────────────────────────────────────────────────────────
// 1. Custom properties: the brand has already named the roles for us.
const vars = new Map();
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)[;}]/g)) {
  const rgb = toRgb(m[2]);
  if (rgb) vars.set(m[1].toLowerCase(), { hex: hex(rgb), rgb });
}

// 2. Declared colours by property context and frequency.
const ctx = { bg: new Map(), text: new Map(), border: new Map() };
const bump = (map, k) => map.set(k, (map.get(k) || 0) + 1);
for (const m of css.matchAll(/([\w-]*background[\w-]*|color|border[\w-]*|fill)\s*:\s*([^;}{]+)[;}]/gi)) {
  const prop = m[1].toLowerCase(), val = m[2];
  for (const tok of val.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/g) || []) {
    const rgb = toRgb(tok);
    if (!rgb) continue;
    const h = hex(rgb);
    if (/background/.test(prop)) bump(ctx.bg, h);
    else if (prop === 'color' || prop === 'fill') bump(ctx.text, h);
    else bump(ctx.border, h);
  }
}

const byCount = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([h, n]) => ({ hex: h, n, rgb: toRgb(h) }));
const bgs = byCount(ctx.bg), texts = byCount(ctx.text), borders = byCount(ctx.border);

// Names are only a hint. "--ink" means body text in most design systems and the
// page background in others, so every name-based pick is validated against the
// role's actual requirement (contrast, saturation) and discarded if it fails.
const pickVar = (...names) => {
  for (const n of names) for (const [k, v] of vars) if (k.includes(n)) return v;
  return null;
};
const validate = (cand, test) => (cand && test(cand) ? cand : null);

const all = [...vars.values(), ...bgs, ...texts, ...borders].filter(c => c && c.rgb);
const uniq = new Map(all.map(c => [c.hex, c]));
const pool = [...uniq.values()];

// Canvas: what charts sit on. Trust the most-declared background before any name.
const surface = bgs[0] || pickVar('surface', 'card', 'panel') || { hex: '#f4f3f0', rgb: toRgb('#f4f3f0') };
const dark = luminance(surface.rgb) < 0.35;

// Ink: readable against the canvas, and the *least* saturated such colour —
// brand accents are usually readable too, but they are not body text.
const inkCandidates = pool.filter(c => contrast(c.rgb, surface.rgb) >= 4.5)
  .sort((a, b) => saturation(a.rgb) - saturation(b.rgb) || (b.n || 0) - (a.n || 0));
const textPrimary = validate(pickVar('text', 'foreground'), c => contrast(c.rgb, surface.rgb) >= 4.5 && saturation(c.rgb) < 0.5)
  || inkCandidates[0] || { hex: dark ? '#ffffff' : '#111111', rgb: toRgb(dark ? '#ffffff' : '#111111') };

const mutedFallback = mix(textPrimary.rgb, surface.rgb, 0.42);
const textMuted = validate(pickVar('muted', 'secondary', 'dim', 'subtle'),
    c => { const r = contrast(c.rgb, surface.rgb); return r >= 2.2 && r < contrast(textPrimary.rgb, surface.rgb); })
  || pool.filter(c => { const r = contrast(c.rgb, surface.rgb); return r >= 2.5 && r < 4.5; })
         .sort((a, b) => saturation(a.rgb) - saturation(b.rgb))[0]
  || { hex: hex(mutedFallback), rgb: mutedFallback };

const lineFallback = mix(textPrimary.rgb, surface.rgb, 0.82);
const line = validate(pickVar('line', 'border', 'divider', 'hairline'),
    c => contrast(c.rgb, surface.rgb) <= 2.4)
  || pool.filter(c => { const r = contrast(c.rgb, surface.rgb); return r >= 1.05 && r <= 2.0; })
         .sort((a, b) => saturation(a.rgb) - saturation(b.rgb))[0]
  || { hex: hex(lineFallback), rgb: lineFallback };

// Accent: the most saturated colour that is neither canvas nor body text.
const taken = new Set([surface.hex, textPrimary.hex, textMuted.hex, line.hex]);
const accentPool = pool.filter(c => !taken.has(c.hex) && saturation(c.rgb) > 0.3 && contrast(c.rgb, surface.rgb) > 1.6);
const accent = validate(pickVar('accent', 'signal', 'primary', 'brand'), c => saturation(c.rgb) > 0.25)
  || accentPool.sort((a, b) => saturation(b.rgb) - saturation(a.rgb))[0]
  || { hex: '#2323FF', rgb: toRgb('#2323FF') };

// Page ground: a background near the canvas, not the ink that happens to be dark.
const groundFallback = mix(surface.rgb, toRgb(dark ? '#000000' : '#000000'), dark ? 0.35 : 0.06);
const pageBg = bgs.find(c => c.hex !== surface.hex && contrast(c.rgb, surface.rgb) < 2)
  || { hex: hex(groundFallback), rgb: groundFallback };

const danger = validate(pickVar('bad', 'danger', 'error', 'negative'), c => saturation(c.rgb) > 0.25);
const warn = validate(pickVar('warn', 'warning', 'alert', 'attention'), c => saturation(c.rgb) > 0.25);

// ── series ramp ──────────────────────────────────────────────────────
// Keep the default palette's shape: an anchor stepping into the accent, then the
// accent fading toward the canvas. Seven ordered, distinguishable steps.
const anchor = dark ? textPrimary.rgb : mix(textPrimary.rgb, accent.rgb, 0.15);
let ramp = dark
  ? [accent.rgb, mix(accent.rgb, anchor, 0.28), mix(accent.rgb, anchor, 0.5),
     mix(accent.rgb, surface.rgb, 0.55), mix(accent.rgb, surface.rgb, 0.7),
     mix(textMuted.rgb, surface.rgb, 0.45), mix(textMuted.rgb, surface.rgb, 0.65)]
  : [anchor, accent.rgb, mix(accent.rgb, surface.rgb, 0.22), mix(accent.rgb, surface.rgb, 0.4),
     mix(accent.rgb, surface.rgb, 0.56), mix(accent.rgb, surface.rgb, 0.7), mix(accent.rgb, surface.rgb, 0.82)];

// The tail of the ramp fades toward the canvas, and on a light brand the last
// step can fade past the point of being visible. Pull any step that drops below
// the readability floor back toward its source colour until it clears.
const SERIES_MIN = 1.7;
ramp = ramp.map(c => {
  let out = c, guard = 0;
  while (contrast(out, surface.rgb) < SERIES_MIN && guard++ < 12) {
    out = mix(out, dark ? textPrimary.rgb : anchor, 0.18);
  }
  return out;
});

// ── report ───────────────────────────────────────────────────────────
const pad = s => String(s).padEnd(15);
console.log(`\nRead ${files.length} file(s): ${files.map(f => path.basename(f)).join(', ')}`);
console.log(`Custom properties with colours: ${vars.size} | distinct declared colours: ${bgs.length + texts.length + borders.length}`);
console.log(`Design reads as: ${dark ? 'DARK' : 'LIGHT'} (canvas luminance ${luminance(surface.rgb).toFixed(3)})\n`);

console.log('Role mapping');
console.log('  ' + pad('canvas') + surface.hex);
console.log('  ' + pad('page ground') + pageBg.hex);
console.log('  ' + pad('ink') + textPrimary.hex);
console.log('  ' + pad('quiet text') + textMuted.hex);
console.log('  ' + pad('structure') + line.hex);
console.log('  ' + pad('accent') + accent.hex);
if (danger) console.log('  ' + pad('negative') + danger.hex);
if (warn) console.log('  ' + pad('callout') + warn.hex);

const inverse = dark ? pageBg.hex : '#FFFFFF';
const block = `Object.assign(Charts.theme, {
  bg:             '${surface.hex}',
  grid:           '${line.hex}',
  axis:           '${hex(mix(textPrimary.rgb, surface.rgb, dark ? 0.45 : 0.1))}',
  titleColor:     '${textPrimary.hex}',
  categoryColor:  '${textPrimary.hex}',
  valueColor:     '${textPrimary.hex}',
  subtitleColor:  '${textMuted.hex}',
  labelColor:     '${textMuted.hex}',
  tickColor:      '${textMuted.hex}',
  secondaryColor: '${textMuted.hex}',
  connectorLabel: '${textMuted.hex}',
  connectorLine:  '${hex(mix(textPrimary.rgb, surface.rgb, 0.35))}',
  inverseText:    '${inverse}',
  colors:         [${ramp.map(c => `'${hex(c)}'`).join(', ')}],
  defaultColor:   '${accent.hex}',
  gradientStart:  '${accent.hex}',
  gradientEnd:    '${hex(mix(accent.rgb, surface.rgb, 0.75))}',
  positive:       '${accent.hex}',
  negative:       '${danger ? danger.hex : '#D1107A'}',
  callout:        '${warn ? warn.hex : '#e3120b'}',
  highlight:      '${accent.hex}',
  trend:          '${accent.hex}'
});`;

console.log('\nPaste this after theme.js loads and before the first chart call:\n');
console.log(block);

console.log('\nContrast report (against the canvas)');
const check = (label, c, min, max) => {
  const r = contrast(c, surface.rgb);
  const ok = r >= min && (max === undefined || r <= max);
  const want = max === undefined ? `>= ${min}` : `${min}–${max}`;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${pad(label)} ${r.toFixed(2)}:1  (want ${want})`);
  return ok;
};
let allOk = true;
allOk &= check('title/value', textPrimary.rgb, 4.5);
allOk &= check('tick/subtitle', textMuted.rgb, 3);
allOk &= check('gridline', line.rgb, 1.1, 1.6);
ramp.forEach((c, i) => { if (contrast(c, surface.rgb) < 1.6) { console.log(`  FAIL series[${i}] ${hex(c)} is too close to the canvas (${contrast(c, surface.rgb).toFixed(2)}:1)`); allOk = false; } });
const darkest = ramp.reduce((a, b) => luminance(a) < luminance(b) ? a : b);
console.log(`  ${contrast(darkest, toRgb(inverse)) >= 3 ? 'ok  ' : 'warn'} ${pad('label-on-bar')} darkest series vs inverseText ${contrast(darkest, toRgb(inverse)).toFixed(2)}:1`);

console.log(allOk
  ? '\nAll required ratios pass. Still look at the rendered page before shipping.'
  : '\nFix the FAIL rows above before using this palette - adjust the offending token by hand.');
