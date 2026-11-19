// Below 820px the editor shows one pane at a time, as the other abap2UI5
// tools do on a phone (the playground's Code / App, the AI App Builder's
// Chat / App / Code): Controls (the drawer with its own tabs), Design (the
// canvas), Code (the class) and Properties. The pills are the same `.seg`
// as everywhere; the stylesheet hides the panes that are not chosen
// (`.workspace[data-pane]`), so nothing of the design or of the view
// setting changes - wider again, the editor is as it was.
import { $ } from './dom.js';

export const PHONE = '(max-width: 820px)';
export const PANES = [
  { id: 'drawer', name: 'Controls' },
  { id: 'canvas', name: 'Design' },
  { id: 'code', name: 'Code' },
  { id: 'inspector', name: 'Properties' },
];

const media = typeof matchMedia === 'function' ? matchMedia(PHONE) : null;
export const onPhone = () => !!(media && media.matches);

export function showPane(id) {
  if (!PANES.some((p) => p.id === id)) return;
  $('#workspace').dataset.pane = id;
  for (const b of document.querySelectorAll('#phoneTabs [data-pane]')) {
    const on = b.dataset.pane === id;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  }
}

// `onShow(id)`: a pane came on screen (it may need rendering)
export function wirePhoneTabs(onShow) {
  const tabs = [...document.querySelectorAll('#phoneTabs [data-pane]')];
  for (const b of tabs) {
    b.addEventListener('click', () => { showPane(b.dataset.pane); onShow(b.dataset.pane); });
  }
  // arrow keys from tab to tab, as a tablist does
  $('#phoneTabs').addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    t.click();
    t.focus();
  });
  // a control inserted from the list: on a phone the design is where it
  // landed, so the Design pane comes forward (a click on the canvas never
  // changes the pane)
  $('#insertList').addEventListener('click', (e) => {
    if (onPhone() && e.target.closest('.ins-item')) { showPane('canvas'); onShow('canvas'); }
  });
  showPane($('#workspace').dataset.pane || 'canvas');
}
