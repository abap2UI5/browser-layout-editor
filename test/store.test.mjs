// ?ui5= from a link (isLinkableUi5( ) in src/ui/store.js) takes only this
// server, localhost and SAP's CDNs - judged by where the browser resolves
// the value, so a "path" that names another host is refused.
// ?playground= (isLinkablePlayground( )) takes only the family's origin,
// this server and localhost - for the visit, never remembered.
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location ??= new URL('http://127.0.0.1:8080/index.html');
const { isLinkableUi5, isLinkablePlayground, loadPrefs, state } = await import('../src/ui/store.js');

test('a link may name a version, local, a path on this server or a trusted host', () => {
  for (const v of ['1.71.80', 'local', 'local:1.71.80', '/ui5/mine/resources', './ui5/', '../ui5',
    'https://ui5.sap.com/1.71.80/', 'https://sdk.openui5.org/1.120.0', 'http://localhost:9999/ui5/', 'http://127.0.0.1:9999/ui5/']) {
    assert.equal(isLinkableUi5(v), true, v);
  }
});

test('a link may not name another host, also not dressed as a path', () => {
  for (const v of ['https://evil.example/ui5', '//evil.example/ui5', '/\\evil.example/ui5', '\\\\evil.example/ui5',
    '\\/evil.example/ui5', ' //evil.example/ui5', '/\t/evil.example/ui5', 'javascript:alert(1)']) {
    assert.equal(isLinkableUi5(v), false, JSON.stringify(v));
  }
});

test('a link may point Open in at the family, this server or localhost', () => {
  for (const v of ['https://abap2ui5.github.io/browser-playground/', 'https://abap2ui5.github.io/other-deployment/',
    'http://127.0.0.1:8080/pg/', 'http://localhost:4173/', 'http://[::1]:8080/', '/browser-playground/', './pg/']) {
    assert.equal(isLinkablePlayground(v), true, v);
  }
});

test('a link may not send the class to another host, also not dressed as a path', () => {
  for (const v of ['https://evil.example/', 'http://abap2ui5.github.io/browser-playground/', 'https://abap2ui5.github.io.evil.example/',
    'https://user:pw@abap2ui5.github.io/', '//evil.example/', '/\\evil.example/', ' //evil.example/', 'javascript:alert(1)',
    'data:text/html,x', '', 'https://evil.example/#https://abap2ui5.github.io/']) {
    assert.equal(isLinkablePlayground(v), false, JSON.stringify(v));
  }
});

test('?playground= from a link holds for the visit and is never written to the preferences', () => {
  const store = new Map([['abap2ui5-designer:prefs', JSON.stringify({ playground: 'https://evil.example/' })]]);
  const was = { location: globalThis.location, localStorage: globalThis.localStorage };
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  try {
    // a remembered one, from an editor before, is forgotten
    globalThis.location = new URL('http://127.0.0.1:8080/index.html');
    loadPrefs();
    assert.equal(state.prefs.playground, undefined);
    assert.equal(state.playground, undefined);
    globalThis.location = new URL('http://127.0.0.1:8080/index.html?playground=https%3A%2F%2Fabap2ui5.github.io%2Fpg-test%2F');
    loadPrefs();
    assert.equal(state.playground, 'https://abap2ui5.github.io/pg-test/');
    assert.equal(state.prefs.playground, undefined);
    for (const v of store.values()) assert.doesNotMatch(v, /pg-test|evil/);
    delete state.playground;
    globalThis.location = new URL('http://127.0.0.1:8080/index.html?playground=https%3A%2F%2Fevil.example%2F');
    loadPrefs();
    assert.equal(state.playground, undefined);
    assert.equal(state.refusedPlayground, 'https://evil.example/');
  } finally {
    globalThis.location = was.location;
    globalThis.localStorage = was.localStorage;
  }
});
