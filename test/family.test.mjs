// The Layout Editor is one of four abap2UI5 tools; the other three are
// abap2UI5/browser-playground. Two things are kept the same in both
// repositories, and this test notices when they are not:
//
// - src/family.js is the playground's src/shell/family.mjs byte for byte
//   (the tools, the shared storage keys, the ABAP releases, the words and
//   the Export menu's labels). Change it over there and copy it here.
// - the palette in styles.css is the playground's src/shell/shell.css: the
//   same colours and the same face, light and dark. The two stylesheets name
//   their tokens differently (the playground's --bg is the white of a card,
//   here --panel), so PALETTE below says which token is which - a token
//   renamed on either side fails here rather than going unchecked.
//
// The playground's files come from PLAYGROUND_DIR (a local checkout), else
// from its main branch on GitHub. Where neither can be read - offline, or a
// main that does not have the file yet - the test is skipped and says so.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const RAW = 'https://raw.githubusercontent.com/abap2UI5/browser-playground/main/';

// the playground's token -> the same colour's token here
const PALETTE = {
  '--bg': '--panel',
  '--bg-sunken': '--bg',
  '--fg': '--text',
  '--fg-dim': '--muted',
  '--line': '--line',
  '--accent': '--accent',
  '--accent-text': '--accent-text',
  '--accent-fg': '--accent-fg',
  '--danger': '--error',
  '--ok': '--ok',
  '--font-ui': '--font',
  '--font-mono': '--mono',
};

// the playground's file, and where it came from - or null and why not
async function playground(path) {
  const dir = process.env.PLAYGROUND_DIR;
  if (dir) {
    const file = `${dir}/${path}`;
    if (!existsSync(file)) return { text: null, why: `PLAYGROUND_DIR=${dir} has no ${path}` };
    return { text: readFileSync(file, 'utf8'), from: file };
  }
  try {
    const res = await fetch(RAW + path, { signal: AbortSignal.timeout(15000) });
    if (res.status === 404) return { text: null, why: `${RAW}${path} is not there (yet) - set PLAYGROUND_DIR to a checkout to compare` };
    if (!res.ok) return { text: null, why: `${RAW}${path} answered ${res.status}` };
    return { text: await res.text(), from: RAW + path };
  } catch (err) {
    return { text: null, why: `neither PLAYGROUND_DIR nor ${RAW} can be read (${err.message})` };
  }
}

const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// the declarations of the first rule whose selector is `selector`
function block(css, selector) {
  const at = css.indexOf(`${selector} {`);
  if (at < 0) return null;
  const open = css.indexOf('{', at);
  const body = css.slice(open + 1, css.indexOf('}', open));
  const out = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim().replace(/\s+/g, ' ');
  return out;
}

function compare(theirs, ours, which) {
  assert.ok(theirs, `the playground's shell.css has no ${which} block`);
  assert.ok(ours, `styles.css has no ${which} block`);
  for (const [t, o] of Object.entries(PALETTE)) {
    if (!(t in theirs) && which !== 'light') continue; // dark leaves the faces alone
    assert.ok(t in theirs, `the playground's shell.css has no ${t} (${which}) - renamed? Change PALETTE`);
    assert.ok(o in ours, `styles.css has no ${o} (${which}), the playground's ${t}`);
    assert.equal(ours[o], theirs[t], `${o} here is the playground's ${t} (${which})`);
  }
}

test('src/family.js is the playground\'s src/shell/family.mjs, byte for byte', async (t) => {
  const p = await playground('src/shell/family.mjs');
  if (p.text === null) { t.skip(p.why); return; }
  assert.equal(readFileSync(`${root}/src/family.js`, 'utf8'), p.text, `src/family.js differs from ${p.from} - copy it over unchanged`);
});

test('the palette is the playground\'s, light and dark', async (t) => {
  const p = await playground('src/shell/shell.css');
  if (p.text === null) { t.skip(p.why); return; }
  const theirs = noComments(p.text);
  const ours = noComments(readFileSync(`${root}/styles.css`, 'utf8'));
  compare(block(theirs, ':root'), block(ours, ':root'), 'light');
  compare(block(theirs, ':root:not([data-theme="light"])'), block(ours, ':root:not([data-theme="light"])'), 'dark, as the system');
  compare(block(theirs, ':root[data-theme="dark"]'), block(ours, ':root[data-theme="dark"]'), 'dark, chosen');
});
