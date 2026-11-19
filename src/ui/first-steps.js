// The hint strip a first visit gets over the canvas: four things worth
// trying, each a button that does it, and a way to close it for good -
// the playground's first-steps strip (src/shell/first-steps.mjs in
// abap2UI5/browser-playground), with the same heading (FIRST_STEPS) and
// the same look.
//
// It hangs off the bottom of the canvas pane and is drawn over the
// canvas, so it never moves the view under the reader's eye. Not on a
// design that came from a link or an opened class: whoever sent it had
// something to show, not a tour.
import { FIRST_STEPS } from '../family.js';
import { $, h } from './dom.js';

const KEY = 'abap2ui5-designer:first-steps';

function closedBefore() {
  try { return localStorage.getItem(KEY) === 'closed'; } catch { return false; }
}
function rememberClosed() {
  try { localStorage.setItem(KEY, 'closed'); } catch { /* private mode: shown again next time */ }
}

export function closeFirstSteps(remember = true) {
  const anchor = $('#firstSteps');
  if (!anchor || anchor.hidden) return;
  anchor.hidden = true;
  anchor.replaceChildren();
  if (remember) rememberClosed();
}

// `steps`: { controls, tryView, template, exportMenu } - what each chip does
export function showFirstSteps(steps) {
  const anchor = $('#firstSteps');
  if (!anchor || closedBefore()) return;
  const chip = (id, long, short, title, run) => h('li', {}, h('button', {
    type: 'button', 'data-step': id, title,
    onclick: (e) => { e.stopPropagation(); run(); },
  }, h('span', { class: 'is-long', text: long }), h('span', { class: 'is-short', text: short })));
  anchor.replaceChildren(h('section', { id: 'first-steps', class: 'first-steps', 'aria-label': 'First steps' },
    h('span', { class: 'first-steps-lead', text: FIRST_STEPS }),
    h('ul', { class: 'first-steps-list' },
      chip('controls', 'Drag a control onto the page', 'Add a control', 'The controls and building blocks - drag one onto the canvas, or click it', steps.controls),
      chip('try', 'Try the view', 'Try it', 'Use the view as a user would - the events show what the class gets', steps.tryView),
      chip('template', 'Open a template', 'Template', 'Start from a form, a list, a dialog…', steps.template),
      chip('export', 'Export the class', 'Export', 'One ABAP class - to abapGit, the clipboard or another tool', steps.exportMenu)),
    h('button', {
      type: 'button', class: 'first-steps-close ghost', title: 'Close - not shown again', 'aria-label': 'Close the first steps',
      onclick: () => closeFirstSteps(),
    }, '✕')));
  anchor.hidden = false;
}
