// The keyboard shortcuts of the editor - also reached from the canvas.
import { state, select, undo, redo, selectedIds } from './store.js';
import { openPalette } from './palette.js';
import { copySelection, pasteSelection } from './edit.js';
import { saveToBrowser } from './files.js';
import { deleteSelection, duplicateSelection, moveSelection, selectParent } from './actions.js';
import { openContextMenuAtSelection } from './context.js';
import { h, dialog } from './dom.js';
import { HELP, KEYS } from '../family.js';

// every shortcut, for the help ? opens - the one place they are listed
export const SHORTCUTS = [
  [KEYS.palette, 'Command palette: insert, jump to or run anything'],
  ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / redo'],
  [KEYS.save, 'Save as draft - keep the design in this browser (File, Drafts… lists them)'],
  ['Delete', 'Delete the selection'],
  ['Ctrl+D', 'Duplicate the selection'],
  ['Ctrl+C / Ctrl+X / Ctrl+V', 'Copy, cut, paste the selection'],
  ['Ctrl+↑ / Ctrl+↓', 'Move the selection among its siblings'],
  ['Alt+↑', 'Select the parent'],
  ['Escape', 'Select the view (with several selected: only the last)'],
  ['Ctrl+click / Shift+click', 'Add a control to the selection, or take it out'],
  ['Shift+F10, right-click', 'Context menu of the selection'],
  ['Double-click', 'Edit the text of a control on the canvas'],
  ['↑ ↓ ← → Home End', 'Walk the outline; a letter jumps to the next control of that name'],
  ['Enter', 'From the outline into the properties; in the control search: insert the first match'],
  [KEYS.help, 'This help'],
];

// What the editor does, in the words the help gives first
export const ABOUT = [
  'Lay out a UI5 view by drag and drop: controls and building blocks from the left onto the canvas, their properties, bindings and events on the right. The canvas is real UI5, and Try uses the view as a user would.',
  'The product is one abap2UI5 app class, written beside the canvas as you go - the view chain, the data it binds and the events it handles - for ABAP 7.02 or 7.40 and later.',
  'Export takes it to abapGit as a zip, to the clipboard, or on to the Playground, the AI App Builder, the AI Agent or VS Code. The design is kept in this browser; Ctrl+S keeps a named draft.',
];

// The help every abap2UI5 tool opens on ?: what the tool does, then its
// keys - the same shape, title and headings (HELP in src/family.js) as the
// playground's, the AI App Builder's and the AI Agent's
export function helpDialog() {
  dialog(HELP.title('Layout Editor'), h('div', { class: 'help' },
    h('h3', { class: 'dlg-sub', text: HELP.about }),
    ABOUT.map((t) => h('p', { text: t })),
    h('h3', { class: 'dlg-sub', text: HELP.keys }),
    h('table', { class: 'keys' },
      SHORTCUTS.map(([k, t]) => h('tr', {}, h('td', {}, k.split(' / ').flatMap((x, i) => [i ? ' / ' : null, h('kbd', { text: x })])), h('td', { text: t }))))),
  [{ text: 'Close', action: () => true }]);
}


export function onKey(e) {
  // a dialog has the keys: Escape closes it, nothing reaches the design
  if (document.querySelector('dialog[open]')) return;
  const t = e.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openPalette(); return; }
  // a draft in this browser, as in every abap2UI5 tool - never a download,
  // never the browser's "Save page as"
  if (ctrl && (e.key === 's' || e.key === 'S')) { e.preventDefault(); saveToBrowser(); return; }
  if (ctrl && !typing && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (ctrl && !typing && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
  if (typing) return;
  if (e.key === '?' && !ctrl) { e.preventDefault(); helpDialog(); return; }
  const any = selectedIds().length > 0;
  if (ctrl && !e.shiftKey && (e.key === 'c' || e.key === 'C') && any && !getSelection().toString()) { e.preventDefault(); copySelection(false); return; }
  if (ctrl && (e.key === 'x' || e.key === 'X') && any) { e.preventDefault(); copySelection(true); return; }
  if (ctrl && (e.key === 'v' || e.key === 'V')) { e.preventDefault(); pasteSelection(); return; }
  if ((e.key === 'Delete' || e.key === 'Backspace') && any) { e.preventDefault(); deleteSelection(); return; }
  if (ctrl && (e.key === 'd' || e.key === 'D') && any) { e.preventDefault(); duplicateSelection(); return; }
  // Ctrl+↑ / Ctrl+↓ move the selection among its siblings
  if (ctrl && !e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && any) { e.preventDefault(); moveSelection(e.key === 'ArrowUp' ? -1 : 1); return; }
  if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); selectParent(); return; }
  if ((e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) && any) { e.preventDefault(); openContextMenuAtSelection(); return; }
  if (e.key === 'Escape') select(state.also.length ? state.selected : 'root');
}
