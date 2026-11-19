// The other abap2UI5 tools, from TOOLS in src/family.js: the menu behind the
// tool's name in the bar, and the "Open in" section of the Export menu. The
// list is the playground's, byte for byte - nothing about the tools is
// written here.
import { TOOLS, PLAYGROUND_ROOT, toolUrl } from '../family.js';
import { $, h } from './dom.js';

const HERE = 'layout';

export function fillToolMenu() {
  const menu = $('#toolMenu');
  menu.replaceChildren(
    h('span', { class: 'tool-menu-head', text: 'abap2UI5 tools' }),
    ...TOOLS.map((t) => {
      const a = h('a', { href: t.id === HERE ? './' : toolUrl(t.id, PLAYGROUND_ROOT), 'data-tool': t.id },
        h('b', { text: t.name }), h('span', { text: t.blurb }));
      if (t.id === HERE) {
        a.setAttribute('aria-current', 'page');
        // the tool on screen: going to it again would only reload the editor
        a.addEventListener('click', (e) => e.preventDefault());
      }
      return a;
    }));
}

// `open(id)`: hands the class to the tool `id` (src/ui/files.js)
export function fillOpenIn(open) {
  $('#openInList').replaceChildren(...TOOLS.filter((t) => t.id !== HERE).map((t) => h('button', {
    role: 'menuitem',
    'data-open-in': t.id,
    title: t.blurb,
    onclick: () => open(t.id),
  }, t.name)));
}
