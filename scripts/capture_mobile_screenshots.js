import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  console.log('Navigating to http://localhost:8081...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'docs/screenshots/10_driver_mobile_today.png' });
  console.log('Captured 10_driver_mobile_today.png');

  // Click on Live Route tab
  const liveRouteTab = await page.getByText('Live Route', { exact: false }).first();
  if (liveRouteTab) {
    await liveRouteTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/screenshots/11_driver_mobile_route.png' });
    console.log('Captured 11_driver_mobile_route.png');
  }

  // Click on Loads tab
  const loadsTab = await page.getByText('Loads', { exact: false }).first();
  if (loadsTab) {
    await loadsTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/screenshots/12_driver_mobile_loads.png' });
    console.log('Captured 12_driver_mobile_loads.png');
  }

  // Click on Profile tab
  const profileTab = await page.getByText('Profile', { exact: false }).first();
  if (profileTab) {
    await profileTab.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'docs/screenshots/13_driver_mobile_profile.png' });
    console.log('Captured 13_driver_mobile_profile.png');
  }

  await browser.close();
  console.log('All mobile screenshots captured successfully!');
}

capture().catch((e) => {
  console.error('Capture failed:', e);
  process.exit(1);
});
