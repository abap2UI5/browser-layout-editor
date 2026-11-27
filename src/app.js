// The layout editor UI, after the pattern of the SAP Web IDE layout editor
// and styled after SAP Fiori Horizon. One idea of its own shapes it: the
// class is the product, so the code is never hidden - canvas and class sit
// side by side, a control and its lines in the chain are selected together.
//
// Left: controls, outline, data and problems as tabs. Middle: the canvas (real
// UI5 in a frame) and the class. Right: the properties. All state is the
// design document (model.js) in src/ui/store.js; every edit goes through
// commit( ), which records undo, saves to localStorage and tells this
// module, which renders the panels (src/ui/*.js).
import { validate, checkClassName, normalizeDesign } from './model.js';
import { generateClass, fileName } from './abap.js';
import { generateClassSource } from './clas.js';
import { toXml } from './xml.js';
import { state, on, loadPrefs, savePrefs, loadDesign, designFromLink, replaceDesign, commit, undo, redo, select, showPanel, labelOfSelection, onOtherTab } from './ui/store.js';
import { $, toast, download } from './ui/dom.js';
import { renderInsert, renderInsertTarget, onInsertKey } from './ui/insert.js';
import { renderLayers, onLayersKey, clearDropMarks, renderCrumbs } from './ui/layers.js';
import { renderInspector } from './ui/inspector.js';
import { renderData, renderIssues } from './ui/data.js';
import { renderCode, highlightCode, setCode, setView, copyText, codeText } from './ui/code.js';
import { loadPreview, postPreview, sendPreview, renderEventLog, themePreview } from './ui/preview.js';
import { handleDrop, copySelection, pasteSelection, addControlByName, addControl } from './ui/edit.js';
import { openPalette } from './ui/palette.js';
import { newDialog, importDialog, openClassDialog, openClassFromUrl, openClassFromPlayground, recentDialog, shareLink, openFile, saveDesign, saveToBrowser, exportZip, openIn, openInVscode } from './ui/files.js';
import { onKey, helpDialog } from './ui/keys.js';
import { wireAppearance, wireFullscreen } from './ui/appearance.js';
import { fillToolMenu, fillOpenIn } from './ui/tools.js';
import { fillReleaseSelect, releaseOfDesign, designRelease, rememberRelease } from './ui/release.js';
import { followAppearance } from './ui/canvas-theme.js';
import { fillUi5List, readUi5, minorOf } from './ui/ui5field.js';
import { wirePhoneTabs, showPane, onPhone } from './ui/phone.js';
import { showFirstSteps, closeFirstSteps } from './ui/first-steps.js';


// every menu closes the others when it opens - and says so to a screen reader
const menus = [];
function wireMenu(button, menu) {
  const close = () => { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); };
  menus.push(close);
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.hidden;
    for (const c of menus) c();
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', close);
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) close(); });
  // Escape closes the menu and gives the focus back to its button
  const onEscape = (e) => { if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); close(); button.focus(); } };
  menu.addEventListener('keydown', onEscape);
  button.addEventListener('keydown', onEscape);
}


function applyWidths() {
  const ws = $('.workspace');
  for (const [key, prop] of [['drawerW', '--drawer-w'], ['inspectorW', '--inspector-w']]) {
    if (state.prefs[key]) ws.style.setProperty(prop, `${state.prefs[key]}px`); else ws.style.removeProperty(prop);
  }
}

function wireResizer(handle, pane, min, max) {
  if (!handle) return;
  const key = `${pane}W`;
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const start = e.clientX;
    const from = state.prefs[key] || (pane === 'drawer' ? 280 : 320);
    const move = (ev) => {
      const delta = pane === 'drawer' ? ev.clientX - start : start - ev.clientX;
      state.prefs[key] = Math.round(Math.max(min, Math.min(max, from + delta)));
      applyWidths();
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      savePrefs();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
  handle.addEventListener('dblclick', () => { delete state.prefs[key]; applyWidths(); savePrefs(); });
}


// Every change renders once per frame: a burst of edits (a paste of many
// nodes, typing) is one pass over the panels; the focus is kept only when
// every edit of the burst asked for it
let pendingRender = null;
function scheduleRender(opts = {}) {
  if (pendingRender) { pendingRender.keepFocus = pendingRender.keepFocus && !!opts.keepFocus; return; }
  pendingRender = { keepFocus: !!opts.keepFocus };
  requestAnimationFrame(() => { const o = pendingRender; pendingRender = null; renderAll(o); });
}

function renderAll(opts = {}) {
  const d = state.design;
  const cn = $('#className');
  if (document.activeElement !== cn) cn.value = d.className;
  cn.classList.toggle('invalid', !!checkClassName(d.className));
  if (document.activeElement !== $('#description')) $('#description').value = d.description || '';
  $('#abapRelease').value = releaseOfDesign(d);
  // what is not on screen renders when it comes on screen (renderPanel,
  // setView) - the outline, the data and the class of a large design are
  // the cost of every keystroke otherwise
  if (state.panel === 'layers') renderLayers();
  // keep the input being typed into: re-rendering its panel would drop it
  if (!opts.keepFocus || !$('#inspector').contains(document.activeElement)) renderInspector();
  if (state.panel === 'data' && (!opts.keepFocus || !$('#dataPanel').contains(document.activeElement))) renderData();
  renderIssues();
  renderCrumbs();
  renderInsertTarget();
  if (state.view !== 'canvas') renderCode();
  sendPreview();
  $('#btnUndo').disabled = !state.undo.length;
  $('#btnRedo').disabled = !state.redo.length;
}


// the tab of the drawer that just opened shows the design as it is now
function renderPanel() {
  if (state.panel === 'layers') renderLayers();
  else if (state.panel === 'data') renderData();
  else if (state.panel === 'issues') renderIssues();
}

// the tabs of the drawer: arrow keys go from tab to tab, Home and End to
// the first and the last, as a tablist does
function onRailKey(e) {
  const tabs = [...document.querySelectorAll('.rail-btn')];
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
  if (next === undefined) return;
  e.preventDefault();
  const t = tabs[(next + tabs.length) % tabs.length];
  showPanel(t.dataset.panel);
  t.focus();
}

function wire() {
  $('#insertSearch').addEventListener('input', renderInsert);
  $('#panel-insert').addEventListener('keydown', onInsertKey);
  $('#className').addEventListener('input', (e) => {
    const v = e.target.value.toUpperCase().replace(/\s/g, '');
    // the field shows the name the class gets, the caret stays in place
    if (e.target.value !== v) {
      const at = Math.max(0, e.target.selectionStart - (e.target.value.length - v.length));
      e.target.value = v;
      e.target.setSelectionRange(at, at);
    }
    commit((d) => { d.className = v; }, { mergeKey: 'className', keepFocus: true });
  });
  $('#description').addEventListener('input', (e) => commit((d) => { d.description = e.target.value; }, { mergeKey: 'description', keepFocus: true }));
  // the release chosen is remembered for every abap2UI5 tool (RELEASE_KEY)
  fillReleaseSelect($('#abapRelease'));
  $('#abapRelease').addEventListener('change', (e) => {
    rememberRelease(e.target.value);
    const r = designRelease(e.target.value);
    commit((d) => { if (r) d.release = r; else delete d.release; });
  });
  wireMenu($('#btnFile'), $('#fileMenu'));
  wireMenu($('#btnExport'), $('#exportMenu'));
  // the menu of the four abap2UI5 tools behind the tool's name; the one on
  // screen is not opened again - that would only reload the editor
  fillToolMenu();
  wireMenu($('#btnTools'), $('#toolMenu'));
  $('#btnNew').onclick = newDialog;
  $('#btnOpen').onclick = () => openFile('.json,.xml,.abap');
  $('#btnOpenClass').onclick = openClassDialog;
  fillOpenIn(openIn);
  $('#btnVscode').onclick = openInVscode;
  $('#btnSave').onclick = saveDesign;
  $('#btnSaveBrowser').onclick = saveToBrowser;
  $('#btnImport').onclick = importDialog;
  $('#btnRecent').onclick = recentDialog;
  $('#btnHelp').onclick = helpDialog;
  $('#btnShare').onclick = shareLink;
  $('#btnUndo').onclick = undo;
  wireAppearance();
  wireFullscreen();
  $('#btnRedo').onclick = redo;
  $('#btnCmd').onclick = openPalette;
  $('#btnZip').onclick = exportZip;
  $('#btnCopy').onclick = () => copyText(generateClassSource(state.design), 'ABAP');
  $('#btnCopyXml').onclick = () => copyText(toXml(state.design), 'XML');
  $('#btnCopyCode').onclick = () => { const c = codeText(); copyText(c.text, c.what); };
  $('#btnDownloadAbap').onclick = () => download(fileName(state.design.className, 'clas.abap'), generateClassSource(state.design), 'text/plain');
  for (const b of document.querySelectorAll('.rail-btn')) b.onclick = () => showPanel(b.dataset.panel);
  $('.rail').addEventListener('keydown', onRailKey);
  $('#layersFilter').addEventListener('input', (e) => { state.layersFilter = e.target.value; renderLayers(); });
  for (const b of document.querySelectorAll('[data-view]')) b.onclick = () => setView(b.dataset.view);
  for (const b of document.querySelectorAll('[data-code]')) b.onclick = () => setCode(b.dataset.code);
  for (const b of document.querySelectorAll('[data-mode]')) {
    b.onclick = () => {
      state.mode = b.dataset.mode;
      for (const x of document.querySelectorAll('[data-mode]')) x.classList.toggle('active', x === b);
      postPreview({ type: 'mode', mode: state.mode });
      renderEventLog();
    };
  }
  // a click on a line of the class selects the control it writes
  $('#code').addEventListener('click', (e) => {
    const ln = e.target.closest('.ln[data-node]');
    if (ln && !getSelection().toString()) select(ln.dataset.node, { fromCode: true, extend: e.ctrlKey || e.metaKey || e.shiftKey });
  });
  // a device width is the width the view gets: zoomed out, the frame on
  // screen is that much narrower, the view inside as wide as before
  const setDevice = (w) => {
    state.prefs.device = w;
    const z = Number(state.prefs.zoom) || 1;
    $('#deviceFrame').style.width = w.endsWith('px') ? `${parseFloat(w) * z}px` : w;
    const f = $('#preview');
    f.style.zoom = z === 1 ? '' : String(z);
    f.style.width = z === 1 ? '' : `${100 / z}%`;
    f.style.height = z === 1 ? '' : `${100 / z}%`;
    for (const b of document.querySelectorAll('[data-device]')) b.classList.toggle('active', b.dataset.device === w);
  };
  setDevice(state.prefs.device);
  for (const b of document.querySelectorAll('[data-device]')) b.onclick = () => { setDevice(b.dataset.device); savePrefs(); };
  const zoom = $('#zoom');
  zoom.value = String(Number(state.prefs.zoom) || 1);
  zoom.onchange = () => { state.prefs.zoom = Number(zoom.value); setDevice(state.prefs.device); savePrefs(); };
  // the canvas theme: Auto follows the editor's appearance (src/ui/canvas-theme.js)
  const theme = $('#theme');
  theme.value = state.prefs.theme || 'auto';
  const themeChosen = followAppearance(themePreview);
  theme.onchange = () => { state.prefs.theme = theme.value; savePrefs(); themeChosen(); loadPreview(); };
  // the UI5 of the canvas: a release of the list, any version or a URL
  const ver = $('#ui5version');
  fillUi5List($('#ui5versions'));
  ver.value = state.prefs.ui5 && !state.prefs.ui5.startsWith('local') ? state.prefs.ui5 : '';
  ver.onchange = () => {
    const v = readUi5(ver.value);
    if (v === null) { ver.classList.add('invalid'); toast('A version like 1.71 or 1.71.80, the URL of a UI5 of your own, or latest'); return; }
    ver.classList.remove('invalid');
    ver.value = v;
    state.prefs.ui5 = v;
    const minor = minorOf(v);
    if (minor !== null && minor < 102 && /^sap_horizon/.test(state.prefs.theme)) {
      state.prefs.theme = state.prefs.theme === 'sap_horizon_dark' ? 'sap_fiori_3_dark' : 'sap_fiori_3';
      theme.value = state.prefs.theme;
    }
    savePrefs();
    loadPreview();
  };
  // the problems the status names: a click opens their list (on a phone,
  // the Controls pane that holds it)
  $('#statusProblems').onclick = () => { showPanel('issues'); if (onPhone()) showPane('drawer'); };
  // one pane at a time below 820px; a pane that comes on screen shows the
  // design as it is now
  wirePhoneTabs((pane) => {
    if (pane === 'code') renderCode();
    else if (pane === 'drawer') renderPanel();
  });
  document.addEventListener('keydown', onKey);

  // the drawer and the properties can be dragged wider or narrower
  wireResizer($('#resizeDrawer'), 'drawer', 200, 480);
  wireResizer($('#resizeInspector'), 'inspector', 240, 560);
  applyWidths();

  // the canvas around the frame takes drops too
  const pane = $('#canvasPane');
  pane.addEventListener('dragover', (e) => e.preventDefault());
  pane.addEventListener('drop', (e) => { e.preventDefault(); handleDrop(e.dataTransfer.getData('text/plain'), 'root'); });
  $('#layers').addEventListener('keydown', onLayersKey);
  $('#layers').addEventListener('dragover', (e) => e.preventDefault());
  $('#layers').addEventListener('drop', (e) => { e.preventDefault(); clearDropMarks(); handleDrop(e.dataTransfer.getData('text/plain'), 'root'); });
}

// ------------------------------------------------------------- start

on('change', scheduleRender);
// two tabs of the editor share one browser store: the last edit wins
onOtherTab((json) => toast('Another tab of the editor saved its design over this one - your next edit here wins', {
  label: 'Load theirs',
  run: () => { try { replaceDesign(normalizeDesign(JSON.parse(json))); } catch { /* not a design */ } },
}));
on('panel', renderPanel);
on('select', (opts) => {
  if (state.panel === 'layers') renderLayers();
  renderInspector();
  renderCrumbs();
  renderInsertTarget();
  highlightCode(!opts.fromCode);
  postPreview({ type: 'select', selected: state.selected, also: state.also, label: labelOfSelection() });
});

loadPrefs();
state.design = loadDesign();
state.selected = state.design.root.aggs.content && state.design.root.aggs.content[0] ? state.design.root.aggs.content[0].id : 'root';
wire();
setView(state.view);
renderInsert();
renderAll();
loadPreview();

// a class to open: ?src=<raw GitHub URL> (the playground's parameter) or
// ?class=<name>&repo=<owner/repo>[&ref=<branch>][&path=<folder>]
openClassFromUrl(new URLSearchParams(location.search));
if (state.refusedUi5) toast(`The link named a UI5 on another host (${state.refusedUi5}); it is not loaded from a link. Type it into the UI5 field to use it.`);
if (state.refusedPlayground) toast(`The link named a playground on another host (${state.refusedPlayground}); Open in goes to the published one.`);

// a shared link: its design replaces the current one (Recent keeps that) -
// on load, and when a link is pasted into the address of an open editor
function openLinkedDesign() {
  if (!location.hash.startsWith('#d=')) return;
  designFromLink(location.hash).then((d) => {
    if (d) { replaceDesign(d); toast(`Opened ${d.className} from the link`); }
  }).catch((err) => toast(`The link holds no design: ${err.message}`))
    .finally(() => history.replaceState(null, '', location.pathname + location.search));
}
openLinkedDesign();
window.addEventListener('hashchange', openLinkedDesign);

// a class the playground handed over: #playground=<its share fragment>
openClassFromPlayground();
window.addEventListener('hashchange', openClassFromPlayground);

// the first visit's hint strip - not over a design a link or a class brought
const fromLink = location.hash.startsWith('#d=') || location.hash.startsWith('#playground=') || new URLSearchParams(location.search).has('src') || new URLSearchParams(location.search).has('class');
if (!fromLink) {
  showFirstSteps({
    controls: () => { showPanel('insert'); if (onPhone()) showPane('drawer'); const list = $('#insertList'); list.classList.add('is-pointed'); setTimeout(() => list.classList.remove('is-pointed'), 1600); $('#insertSearch').focus(); },
    tryView: () => { if (onPhone()) showPane('canvas'); $('[data-mode="interact"]').click(); },
    template: newDialog,
    exportMenu: () => { $('#btnExport').click(); },
  });
}
// a design that arrives later by link takes the strip away for this visit
window.addEventListener('hashchange', () => closeFirstSteps(false));

// for the browser tests and the curious: the state and the generators
window.designer = { state, generateClass, generateClassSource, toXml, validate, select, commit, handleDrop, openPalette, copySelection, pasteSelection, addControlByName, addControl };
