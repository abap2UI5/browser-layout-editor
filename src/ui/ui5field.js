// The UI5 the canvas runs on: a field with suggestions, not a select - a
// version of the list, any other version (1.71.80), or the URL of a UI5 of
// your own. The suggestions are UI5_RELEASES of src/family.js, the releases
// the playground's UI5 check offers too, named the same way (ui5Label);
// "latest" (or nothing) is the newest from the OpenUI5 CDN.
import { UI5_RELEASES, ui5Label } from '../family.js';
import { isUi5Url } from './store.js';
import { h } from './dom.js';

export const LATEST = 'latest';

export function fillUi5List(datalist) {
  datalist.replaceChildren(
    h('option', { value: LATEST, label: 'latest - the newest from the OpenUI5 CDN' }),
    ...UI5_RELEASES.map((v) => h('option', { value: v, label: ui5Label(v) })),
  );
}

// what the field holds, as the canvas takes it: '' for the latest, a
// version (1.71 or 1.71.80), a URL - or null when it is none of them
export function readUi5(text) {
  const v = String(text || '').trim();
  if (!v || v.toLowerCase() === LATEST) return '';
  if (/^\d+\.\d+(\.\d+)?$/.test(v) || isUi5Url(v)) return v;
  return null;
}

// a release older than 1.102 has no Horizon
export function minorOf(v) {
  const m = /^1\.(\d+)(?:\.|$)/.exec(v || '');
  return m ? Number(m[1]) : null;
}
