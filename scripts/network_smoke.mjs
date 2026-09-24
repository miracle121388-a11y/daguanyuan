// Run the real site with ordinary DNS/TLS, optionally through the user's proxy.
// This deliberately has no pinned address or HTTP-version compatibility flags.
import {chromium} from 'playwright';
import {mkdirSync, writeFileSync} from 'node:fs';
const url = process.env.APP_URL || 'https://daguanyuan-rumeng.zeabur.app/';
const output = process.env.NETWORK_REPORT_DIR || 'reports/acceptance/network-20260924';
mkdirSync(output, {recursive: true});
const modes = [{name: 'system'}, ...(process.env.GARDEN_TEST_PROXY ? [{name: 'explicit-proxy', proxy: {server: process.env.GARDEN_TEST_PROXY}}] : [])];
const checks = [];
for (const mode of modes) {
  const browser = await chromium.launch({channel: process.env.GARDEN_BROWSER_CHANNEL || 'msedge', headless: true, ...(mode.proxy ? {proxy: mode.proxy} : {})});
  try {
    const page = await browser.newPage({viewport: mode.proxy ? {width: 390, height: 844} : {width: 1440, height: 900}, ...(mode.proxy ? {isMobile: true, hasTouch: true} : {})});
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('requestfailed', req => failures.push(`${new URL(req.url()).pathname}: ${req.failure()?.errorText}`));
    page.on('response', res => { if (res.status() >= 400) failures.push(`${new URL(res.url()).pathname}: ${res.status()}`); });
    const start = Date.now();
    await page.goto(url, {timeout: 90000});
    await page.locator('.canvas-wrap[data-scene-ready="true"]').waitFor({timeout: 120000});
    const health = await page.evaluate(() => fetch('/healthz').then(r => r.json()));
    await page.screenshot({path: `${output}/${mode.name}.png`});
    checks.push({mode: mode.name, readyMs: Date.now() - start, health, failures, dnsOverride: false, tlsVerified: true, httpVersionOverride: false});
    if (health.status !== 'ok' || failures.length) throw Error(JSON.stringify(checks.at(-1)));
  } finally { await browser.close(); }
}
writeFileSync(`${output}/report.json`, JSON.stringify({at: new Date().toISOString(), url, checks}, null, 2));
console.log(`Network browser checks passed: ${checks.length}`);
