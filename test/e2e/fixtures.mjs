import { test as base, expect } from '@playwright/test';

// `ui5`: the version the preview boots (project option, see the config)
export const test = base.extend({
  ui5: ['', { option: true }],
  designer: async ({ page, ui5 }, use) => {
    // a fresh browser, but past the first visit: the first-steps strip lies
    // over the canvas's bottom edge (test/e2e/tools.spec.mjs tests it)
    // (the editor's page only: the canvas frame shares its storage, and a
    // canvas that loads again must not wipe what the editor stored since)
    await page.addInitScript(() => {
      if (window.top !== window) return;
      try { localStorage.clear(); localStorage.setItem('abap2ui5-designer:first-steps', 'closed'); } catch { /* fresh context */ }
    });
    await page.goto(`/index.html?ui5=${encodeURIComponent(ui5)}`);
    await waitRendered(page);
    await use(page);
  },
});

// the preview reports every render; a design is shown once its controls are in the frame
export async function waitRendered(page) {
  await expect(page.frameLocator('#preview').locator('[id^="dsg"][id*="--n"]').first()).toBeAttached({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => document.body.dataset.previewError || '')).toBe('');
}

export async function abapOf(page) {
  return page.evaluate(() => window.designer.generateClass(window.designer.state.design));
}

export { expect };
