// Browser tests of what the editor shares with the other abap2UI5 tools
// (the Playground, the AI App Builder, the AI Agent): the help on ?, one
// pane at a time on a phone, the status in the bar, a canvas that follows
// the editor's appearance, the first visit's hint strip, the UI5 releases
// of the preview and the palette that reaches all of it.
import { test, expect, waitRendered } from './fixtures.mjs';

const canvasTheme = (page) => page.evaluate(() => {
  const w = document.querySelector('#preview').contentWindow;
  return w.sap && w.sap.ui.getCore().getConfiguration().getTheme();
});
const canvasVersion = (page) => page.evaluate(() => document.querySelector('#preview').contentWindow.sap.ui.version);

test('the help says what the editor does, then its keys - from ?, the File menu and the palette', async ({ designer: page }) => {
  await page.locator('#crumbs').click();
  await page.keyboard.press('?');
  const dlg = page.locator('#dlg');
  await expect(dlg.locator('header')).toHaveText('Layout Editor - help');
  await expect(dlg.locator('h3')).toHaveText(['What this tool does', 'Keyboard shortcuts']);
  await expect(dlg.locator('.help p').first()).toContainText('drag and drop');
  await expect(dlg.locator('table.keys')).toContainText('Ctrl+K');
  await expect(dlg.locator('table.keys')).toContainText('This help');
  await page.keyboard.press('Escape');
  await page.locator('#btnFile').click();
  await page.locator('#btnHelp').click();
  await expect(dlg.locator('header')).toHaveText('Layout Editor - help');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await page.locator('#cmdkInput').fill('help');
  await page.keyboard.press('Enter');
  await expect(dlg.locator('header')).toHaveText('Layout Editor - help');
});

test('on a phone one pane at a time: Controls, Design, Code, Properties', async ({ designer: page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const tabs = page.locator('#phoneTabs');
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole('tab')).toHaveText(['Controls', 'Design', 'Code', 'Properties']);
  await expect(tabs.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#canvasPane')).toBeVisible();
  await expect(page.locator('#drawer')).toBeHidden();
  await expect(page.locator('#inspector')).toBeHidden();
  // the word beside the mark goes, as in the other tools
  await expect(page.locator('.brand .word')).toBeHidden();

  await tabs.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('#codePane')).toBeVisible();
  await expect(page.locator('#canvasPane')).toBeHidden();
  await expect(page.locator('#code')).toContainText('CLASS');

  await tabs.getByRole('tab', { name: 'Properties' }).click();
  await expect(page.locator('#inspector')).toBeVisible();
  await expect(page.locator('#inspector input[placeholder="Filter properties…"]')).toBeVisible();

  await tabs.getByRole('tab', { name: 'Controls' }).click();
  await expect(page.locator('#drawer')).toBeVisible();
  // a control inserted from the list: the design comes forward
  await page.locator('#insertSearch').fill('Button');
  await page.locator('#insertList .ins-item').first().click();
  await expect(tabs.getByRole('tab', { name: 'Design' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#canvasPane')).toBeVisible();

  // wider again, every pane is back
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(tabs).toBeHidden();
  for (const id of ['#drawer', '#canvasPane', '#inspector']) await expect(page.locator(id)).toBeVisible();
});

test('the status in the bar says what was done, and names the problems', async ({ designer: page }) => {
  const status = page.locator('#statusText');
  await page.evaluate(() => window.designer.commit((d) => { d.className = 'ZCL_STATUS'; }));
  await expect(status).toHaveText('saved in this browser');
  await page.keyboard.press('Control+s');
  await expect(status).toContainText('ZCL_STATUS kept as a draft in this browser');
  // the toast goes, the status stays
  await expect(page.locator('#toast')).not.toHaveClass(/show/, { timeout: 10_000 });
  await expect(status).toContainText('kept as a draft');

  const problems = page.locator('#statusProblems');
  await expect(problems).toBeHidden();
  await page.evaluate(() => window.designer.commit((d) => { d.className = '1BAD'; }));
  await expect(problems).toBeVisible();
  await expect(problems).toHaveText(/^\d+ problems?$/);
  await problems.click();
  await expect(page.getByRole('tab', { name: 'Problems' })).toHaveClass(/active/);
});

test('@render the canvas on Auto follows the editor\'s appearance - Quartz where UI5 has no Horizon', async ({ designer: page }) => {
  await expect(page.locator('#theme')).toHaveValue('auto');
  const old = Number(/^1\.(\d+)\./.exec(await canvasVersion(page))[1]) < 102;
  const light = old ? 'sap_fiori_3' : 'sap_horizon';
  const dark = old ? 'sap_fiori_3_dark' : 'sap_horizon_dark';
  await expect.poll(() => canvasTheme(page)).toBe(light);
  // system -> light -> dark: the canvas switches in place, UI5 does not boot again
  const renders = await page.evaluate(() => document.body.dataset.renders);
  await page.locator('#btnTheme').click();
  await page.locator('#btnTheme').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  await expect.poll(() => canvasTheme(page)).toBe(dark);
  expect(await page.evaluate(() => window.designer.state.previewReady)).toBe(true);
  expect(await page.evaluate(() => document.body.dataset.renders)).toBe(renders);
  // a theme picked in the select stays, whatever the appearance
  await page.locator('#theme').selectOption('sap_fiori_3');
  await waitRendered(page);
  await expect.poll(() => canvasTheme(page)).toBe('sap_fiori_3');
  await page.locator('#btnTheme').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme || '')).toBe('');
  await page.waitForTimeout(300);
  expect(await canvasTheme(page)).toBe('sap_fiori_3');
});

test('a stored Horizon - the old default - becomes Auto once, a theme picked otherwise stays', async ({ page }) => {
  await page.addInitScript(() => {
    if (window.top !== window || sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('abap2ui5-designer:first-steps', 'closed');
    localStorage.setItem('abap2ui5-designer:prefs', JSON.stringify({ theme: 'sap_horizon', zoom: 1 }));
  });
  await page.goto('/index.html');
  await expect(page.locator('#theme')).toHaveValue('auto');
  await page.locator('#theme').selectOption('sap_horizon');
  await page.reload();
  await expect(page.locator('#theme')).toHaveValue('sap_horizon');
  await page.evaluate(() => localStorage.setItem('abap2ui5-designer:prefs', JSON.stringify({ theme: 'sap_belize' })));
  await page.reload();
  await expect(page.locator('#theme')).toHaveValue('sap_belize');
});

test('a first visit gets the hint strip: four steps that act, closed for good', async ({ page }) => {
  await page.addInitScript(() => {
    if (window.top !== window || sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
  });
  await page.goto('/index.html');
  await waitRendered(page);
  const strip = page.locator('#first-steps');
  await expect(strip).toBeVisible();
  await expect(strip).toContainText('New here? Try:');

  await strip.locator('[data-step="try"]').click();
  await expect(page.locator('[data-mode="interact"]')).toHaveClass(/active/);
  await page.locator('[data-mode="design"]').click();

  await page.getByRole('tab', { name: 'Outline' }).click();
  await strip.locator('[data-step="controls"]').click();
  await expect(page.getByRole('tab', { name: 'Controls' })).toHaveClass(/active/);
  await expect(page.locator('#insertSearch')).toBeFocused();

  await strip.locator('[data-step="export"]').click();
  await expect(page.locator('#exportMenu')).toBeVisible();
  await page.keyboard.press('Escape');

  await strip.locator('[data-step="template"]').click();
  await expect(page.locator('#dlg header')).toHaveText('Start from a template');
  await page.keyboard.press('Escape');

  await strip.getByRole('button', { name: 'Close the first steps' }).click();
  await expect(strip).toBeHidden();
  await page.reload();
  await waitRendered(page);
  await expect(page.locator('#first-steps')).toHaveCount(0);
});

test('a design that came by link gets no hint strip', async ({ page }) => {
  await page.addInitScript(() => { if (window.top === window) try { localStorage.clear(); } catch { /* fresh */ } });
  await page.goto('/index.html');
  await waitRendered(page);
  const link = await page.evaluate(async () => {
    const { designToLink } = await import('./src/ui/store.js');
    return designToLink(window.designer.state.design);
  });
  const page2 = await page.context().newPage();
  await page2.addInitScript(() => { if (window.top === window) try { localStorage.clear(); } catch { /* fresh */ } });
  await page2.goto(link);
  await waitRendered(page2);
  await expect(page2.locator('#toast')).toContainText('from the link');
  await expect(page2.locator('#first-steps')).toHaveCount(0);
});

test('the UI5 of the preview: the releases every tool offers, any version, a URL or latest', async ({ designer: page }) => {
  await expect(page.locator('label[for="ui5version"]')).toHaveText('UI5 preview');
  const opts = await page.locator('#ui5versions option').evaluateAll((os) => os.map((o) => [o.value, o.label]));
  expect(opts.map((o) => o[0])).toEqual(['latest', '1.71', '1.84', '1.96', '1.108', '1.120', '1.136']);
  expect(opts[1][1]).toBe('1.71 (oldest supported)');
  const field = page.locator('#ui5version');
  await field.fill('nonsense');
  await field.dispatchEvent('change');
  await expect(field).toHaveClass(/invalid/);
  await field.fill('1.84');
  await field.dispatchEvent('change');
  await expect(field).not.toHaveClass(/invalid/);
  expect(await page.evaluate(() => window.designer.state.prefs.ui5)).toBe('1.84');
  await expect(page.locator('#preview')).toHaveAttribute('src', /ui5=1\.84/);
  await field.fill('latest');
  await field.dispatchEvent('change');
  await expect(field).toHaveValue('');
  expect(await page.evaluate(() => window.designer.state.prefs.ui5)).toBe('');
});

test('the palette reaches the Export entries, the other tools, the appearance and the help', async ({ designer: page }) => {
  await page.keyboard.press('Control+k');
  const titles = () => page.locator('#cmdkList .cmdk-item').allTextContents();
  for (const q of ['Download for abapGit', 'Copy share link', 'Open in Playground', 'Open in AI App Builder', 'Open in AI Agent', 'Open in VS Code', 'Copy XML view', 'Appearance: dark', 'Help']) {
    await page.locator('#cmdkInput').fill(q);
    expect((await titles()).join('\n')).toContain(q);
  }
  await page.locator('#cmdkInput').fill('Appearance: dark');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  // the panes, where they are shown
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press('Control+k');
  await page.locator('#cmdkInput').fill('Show Properties');
  await page.keyboard.press('Enter');
  await expect(page.locator('#inspector')).toBeVisible();
});
