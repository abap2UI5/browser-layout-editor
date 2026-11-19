// The editor's own appearance - as the system, light or dark - and full
// screen: the two controls at the right end of every abap2UI5 tool's bar.
//
// The appearance is ONE setting for all four tools: they share the origin
// abap2ui5.github.io, so THEME_KEY in localStorage (src/family.js) carries
// it from the playground to this editor and back, and a change in another
// tab arrives here as a `storage` event. "light" or "dark"; absent means as
// the system. The canvas keeps the UI5 theme chosen for it.
import { THEME_KEY, THEME_KEYS_BEFORE, APPEARANCE_GLYPH, appearanceTitle, nextAppearance } from '../family.js';
import { state, savePrefs } from './store.js';
import { $ } from './dom.js';

const valid = (v) => (v === 'light' || v === 'dark' ? v : '');

// Before the setting was shared it lived in the editor's preferences
// (prefs.appearance) and, in the playground, under its own key: read once
// into THEME_KEY, then dropped.
function migrate() {
  const fromPrefs = valid(state.prefs.appearance);
  let fromPlayground = '';
  try {
    if (localStorage.getItem(THEME_KEY) === null) {
      for (const k of THEME_KEYS_BEFORE) fromPlayground = fromPlayground || valid(localStorage.getItem(k));
      const old = fromPrefs || fromPlayground;
      if (old) localStorage.setItem(THEME_KEY, old);
    }
    for (const k of THEME_KEYS_BEFORE) localStorage.removeItem(k);
  } catch { /* storage off: the preference below still holds for this visit */ }
  if ('appearance' in state.prefs) {
    delete state.prefs.appearance;
    savePrefs();
  }
  return fromPrefs;
}

// what the switch shows when the storage cannot be read: the visit's choice
let held = '';

export function appearance() {
  try { return valid(localStorage.getItem(THEME_KEY)); } catch { return held; }
}

function setAppearance(a) {
  held = a;
  try {
    if (a) localStorage.setItem(THEME_KEY, a); else localStorage.removeItem(THEME_KEY);
  } catch { /* private mode: kept for this visit */ }
  applyAppearance();
}

export function applyAppearance() {
  const a = appearance();
  if (a) document.documentElement.dataset.theme = a; else delete document.documentElement.dataset.theme;
  const b = $('#btnTheme');
  b.title = appearanceTitle(a);
  b.textContent = APPEARANCE_GLYPH[a];
}

export function wireAppearance() {
  held = migrate();
  $('#btnTheme').onclick = () => setAppearance(nextAppearance(appearance()));
  // another tab - this editor or another abap2UI5 tool - changed it
  window.addEventListener('storage', (e) => { if (e.key === THEME_KEY || e.key === null) applyAppearance(); });
  applyAppearance();
}

// Full screen: the whole editor, not the canvas - where the browser has it
export function wireFullscreen() {
  const b = $('#btnFullscreen');
  b.hidden = !document.fullscreenEnabled;
  b.onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };
  document.addEventListener('fullscreenchange', () => {
    const on = !!document.fullscreenElement;
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? 'Leave full screen' : 'Full screen';
  });
}
