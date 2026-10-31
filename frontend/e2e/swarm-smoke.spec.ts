import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const appOrigin = process.env.E2E_APP_ORIGIN ?? 'http://127.0.0.1:5173';
const screenshotDirectory = resolve('..', 'evidence/arq-swarm-2026-10-30/screenshots');
test.beforeAll(() => mkdirSync(screenshotDirectory, { recursive: true }));

const screens = [
  { id: 'command', label: 'Command', heading: 'Command center' },
  { id: 'map', label: 'Live map', heading: /^(Live map|Fleet map)$/ },
  { id: 'dispatch', label: 'Dispatch', heading: 'Dispatch planning' },
  { id: 'compare', label: 'Compare', heading: 'Route comparison' },
  { id: 'fleet', label: 'Fleet', heading: 'Fleet' },
  { id: 'driver', label: 'Drivers', heading: 'Drivers' },
  { id: 'orders', label: 'Orders', heading: 'Orders' },
  { id: 'analytics', label: 'Analytics', heading: 'Analytics' },
  { id: 'diagnostics', label: 'Diagnostics', heading: 'Diagnostics' },
  { id: 'recovery', label: 'Recovery', heading: 'Incidents & audit' },
] as const;

async function visitScreen(page: Page, screen: (typeof screens)[number]) {
  const nav = page.getByRole('complementary', { name: 'Main navigation' });
  const item = nav.getByRole('button', { name: screen.label, exact: true });
  const menuButton = page.locator('.arq-menu-button');
  if (await menuButton.isVisible() && (await menuButton.getAttribute('aria-expanded')) !== 'true') {
    await menuButton.click();
  }
  await item.click();
  if (await menuButton.isVisible()) {
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(async () => (await nav.boundingBox())?.right ?? 0).toBeLessThanOrEqual(0);
  }
  await expect(page.getByRole('heading', { level: 1, name: screen.heading })).toBeVisible();
}

async function selectFirstLiveRoute(page: Page, screenshotName: string) {
  const rows = page.locator('.arq-route-row');
  if (await rows.count() === 0) return;
  const geometry = page.locator('svg[data-testid="route-map-geometry"] polyline[data-route-id]');
  await expect(geometry.first()).toBeVisible({ timeout: 9000 });
  const row = rows.first();
  const vehicleId = (await row.locator('.arq-route-info strong').textContent())?.trim();
  expect(vehicleId, 'live dispatcher route should expose its vehicle identifier').toBeTruthy();
  await row.click();
  await expect(page.locator('.arq-selected-card')).toContainText(vehicleId!);
  const routeId = (await page.locator('.arq-selected-stats > div').first().locator('b').textContent())?.trim();
  expect(routeId, 'selected vehicle should expose its route identifier').toBeTruthy();
  await expect.poll(async () => geometry.evaluateAll((lines, expected) => lines.some((line) => line.getAttribute('data-route-id') === expected), routeId)).toBe(true);
  await page.screenshot({ path: resolve(screenshotDirectory, screenshotName), fullPage: true });
}

test('10 web screens render at desktop size and dispatch route selection works', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${appOrigin}/#/command`);

  for (const screen of screens) {
    await visitScreen(page, screen);
    await page.screenshot({
      path: resolve(screenshotDirectory, `desktop-${screen.id}.png`),
      fullPage: true,
    });
  }

  await visitScreen(page, screens[1]);
  await selectFirstLiveRoute(page, 'desktop-map.png');
  await visitScreen(page, screens[2]);
  await expect(page).toHaveURL(/#\/dispatch$/);
  await expect(page.getByLabel('Planning algorithm')).toHaveValue('exact');
  await page.getByLabel('Planning algorithm').selectOption('qaoa');
  await expect(page.getByText(/Bounded backend settings: seed 7/)).toBeVisible();
  await page.getByLabel('Planning algorithm').selectOption('exact');
  await page.getByRole('button', { name: 'Validate and run optimization' }).click();
  await expect(page.getByText('Scenario valid')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Backend job (succeeded|failed|infeasible|timed_out)/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Backend job succeeded.')).toBeVisible();
  await expect(page.getByText('Independent validation passed')).toBeVisible();
  await page.screenshot({
    path: resolve(screenshotDirectory, 'desktop-dispatch-live-job.png'),
    fullPage: true,
  });
});

test('10 web screens remain reachable and fit the mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${appOrigin}/#/command`);

  for (const screen of screens) {
    await visitScreen(page, screen);
    await expect(page.locator('#main-content')).toBeVisible();
    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(widths.document, `${screen.id} should not overflow horizontally at 390px`).toBeLessThanOrEqual(widths.viewport);
    await page.screenshot({
      path: resolve(screenshotDirectory, `mobile-${screen.id}.png`),
      fullPage: true,
    });
  }

  await visitScreen(page, screens[1]);
  await selectFirstLiveRoute(page, 'mobile-map.png');
  await visitScreen(page, screens[2]);
  await expect(page).toHaveURL(/#\/dispatch$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Dispatch planning' })).toBeVisible();
  await page.screenshot({
    path: resolve(screenshotDirectory, 'mobile-dispatch-selection.png'),
    fullPage: true,
  });
});

test('review and explicitly publish the live pending route proposal', async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(`${appOrigin}/#/compare`);
  const proposal = page.locator('.arq-route-row').filter({ hasText: 'vehicle_1' }).first();
  await expect(proposal).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Route comparison' })).toBeVisible();
  await expect(page.getByText('Current route vs candidate')).toBeVisible();
  await expect(page.getByText('Travel duration')).toBeVisible();
  await expect(page.getByRole('rowheader', { name: 'Feasibility' })).toBeVisible();
  await expect(page.getByText(/No speed-up claimed/)).toBeVisible();
  await page.screenshot({ path: resolve(screenshotDirectory, 'desktop-proposal-review.png'), fullPage: true });

  await page.getByRole('button', { name: 'Review approval' }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm route approval' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('rechecks proposal validity and route version');
  await page.screenshot({ path: resolve(screenshotDirectory, 'desktop-proposal-confirmation.png'), fullPage: true });
  await dialog.getByRole('button', { name: 'Confirm & publish' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'backend accepted the approval' })).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: resolve(screenshotDirectory, 'desktop-proposal-published.png'), fullPage: true });
});
