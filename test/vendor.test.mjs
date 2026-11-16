// The chain writer in src/vendor/linter/ is the abap2UI5 linter's, copied
// unchanged (tools/vendor-linter.mjs): the copies hash to source.json, and
// they are the files of the pinned @abap2ui5/linter (0.10.0 is the first
// release that ships the writer), so the designer writes the layout the
// linter in package.json checks (npm run check:abap).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('the vendored chain writer hashes to its record', () => {
  execFileSync(process.execPath, ['tools/vendor-linter.mjs', '--check'], { cwd: root, stdio: 'pipe' });
});

test('the vendored chain writer is the pinned linter\'s', () => {
  const record = JSON.parse(readFileSync(`${root}/src/vendor/linter/source.json`, 'utf8'));
  // the pin is 0.10.0 or later, and every such release ships the writer: a
  // missing file is a broken install or a pin moved back, not a pass
  assert.ok(existsSync(`${root}/node_modules/@abap2ui5/linter/lib/chain-write.mjs`), '@abap2ui5/linter ships lib/chain-write.mjs');
  for (const [to, { from }] of Object.entries(record.files)) {
    const pinned = `${root}/node_modules/@abap2ui5/linter/${from}`;
    const copy = readFileSync(`${root}/${to}`, 'utf8').replace(/^\/\*\n \* VENDORED[\s\S]*?\*\/\n/, '');
    assert.equal(copy, readFileSync(pinned, 'utf8').replace(/\r\n/g, '\n'), `${to} is ${from} of the pinned linter`);
  }
});
