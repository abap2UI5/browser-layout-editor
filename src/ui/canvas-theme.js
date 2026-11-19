// The UI5 theme of the canvas. 'auto' (the default) follows the editor's
// appearance - light or dark, chosen in the bar or as the system - as the
// app frames of the playground, the AI App Builder and the AI Agent do;
// any other value is a UI5 theme picked in the Theme select and kept.
//
// Horizon exists from UI5 1.102 on: an older canvas gets Quartz, light or
// dark - preview.html at boot, src/preview/init.js on a switch.
import { state } from './store.js';

const darkMedia = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

// what the editor shows: its data-theme (set by src/ui/appearance.js), or
// the system's when it follows the system
export function editorIsDark() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return !!(darkMedia && darkMedia.matches);
}

// the UI5 theme the canvas boots or switches to
export function canvasTheme() {
  const t = state.prefs.theme;
  if (t && t !== 'auto') return t;
  return editorIsDark() ? 'sap_horizon_dark' : 'sap_horizon';
}

// `apply(theme)`: the canvas takes another theme. Called when the editor's
// appearance changes - in the bar, in another tab or tool (the shared key),
// or in the system - and only while the canvas follows it.
export function followAppearance(apply) {
  let last = canvasTheme();
  const check = () => {
    if (state.prefs.theme && state.prefs.theme !== 'auto') return;
    const now = canvasTheme();
    if (now === last) return;
    last = now;
    apply(now);
  };
  new MutationObserver(check).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (darkMedia) darkMedia.addEventListener('change', check);
  // the select changed: what the canvas shows now is the new starting point
  return () => { last = canvasTheme(); };
}
