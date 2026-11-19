// The ABAP release the class is for: the same select, with the same four
// entries (RELEASES in src/family.js), in every abap2UI5 tool that writes
// code, remembered across them under RELEASE_KEY.
//
// The generator knows two classes (design.release): one for 7.02, one for
// 7.40 and later. "v702" writes the first; 7.40, 7.50+ and ABAP Cloud the
// second. A design keeps its own release - one opened from a file or a link
// shows its own, and only a change in the select is remembered for the next.
import { RELEASES, RELEASE_KEY, DEFAULT_RELEASE } from '../family.js';

const known = (v) => RELEASES.some((r) => r.version === v);

export function storedRelease() {
  try {
    const v = localStorage.getItem(RELEASE_KEY);
    return known(v) ? v : DEFAULT_RELEASE;
  } catch { return DEFAULT_RELEASE; }
}

export function rememberRelease(version) {
  if (!known(version)) return;
  try { localStorage.setItem(RELEASE_KEY, version); } catch { /* private mode */ }
}

// the select's value for a design: its own 7.02, or - for a 7.40+ class -
// the release remembered, when that is one the class is written for
export function releaseOfDesign(d) {
  if (d.release === '702') return 'v702';
  const stored = storedRelease();
  return stored === 'v702' ? DEFAULT_RELEASE : stored;
}

// the generator's release for an entry of the select
export const designRelease = (version) => (version === 'v702' ? '702' : '');

// a new design (a template, the first visit) is written for the release
// remembered
export function withStoredRelease(d) {
  if (storedRelease() === 'v702') d.release = '702'; else delete d.release;
  return d;
}

export function fillReleaseSelect(select) {
  select.replaceChildren(...RELEASES.map((r) => {
    const o = document.createElement('option');
    o.value = r.version;
    o.textContent = r.label;
    return o;
  }));
}
