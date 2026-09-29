import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const webRoot = join(root, 'web');
const BASE = '/before-you-paste';
const PORT = 4174;

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json'
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath === BASE || urlPath === `${BASE}/`) urlPath = `${BASE}/index.html`;
      if (!urlPath.startsWith(BASE)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const rel = urlPath.slice(BASE.length) || '/index.html';
      const filePath = join(webRoot, rel);
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
      res.end(readFileSync(filePath));
    });
    server.listen(PORT, () => resolve(server));
  });
}

describe('browser (Playwright)', () => {
  /** @type {import('http').Server} */
  let server;
  /** @type {import('playwright').Browser} */
  let browser;

  before(async () => {
    server = await startServer();
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
  });

  after(async () => {
    await browser?.close();
    await new Promise((resolve) => server?.close(resolve));
  });

  it('loads index without console errors', async () => {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(`http://127.0.0.1:${PORT}${BASE}/index.html`, { waitUntil: 'networkidle' });
    assert.equal(errors.length, 0, errors.join('; '));
    await page.close();
  });

  it('prepare replaces all occurrences without per-finding clicks', async () => {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}${BASE}/index.html`, { waitUntil: 'networkidle' });

    await page.click('#btn-start-check');
    await page.click('#perm-personal-no');
    await page.click('#btn-perm-continue');

    const sample = 'Email user@example.com or user@example.com for updates.';
    await page.fill('#check-input', sample);
    await page.click('#btn-run-check');

    await page.waitForSelector('#finding-list .finding-item');
    await page.click('#btn-prepare');

    const prepared = await page.inputValue('#prepared-output');
    assert.ok(!prepared.includes('user@example.com'));
    assert.equal((prepared.match(/\[EMAIL 1\]/g) || []).length, 2);

    const counts = await page.textContent('#output-counts');
    assert.match(counts, /Replaced: [1-9]/);

    await page.close();
  });

  it('permission radios have associated legend text', async () => {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}${BASE}/index.html`);
    await page.click('#btn-start-check');
    const legend = await page.textContent('fieldset legend');
    assert.ok(legend?.includes('personal data'));
    const labels = await page.locator('fieldset label').count();
    assert.ok(labels >= 3);
    await page.close();
  });

  it('expands truncated NER spans and prepares full names with the pinned model', { timeout: 600_000, skip: process.env.RUN_MODEL_TESTS === '1' ? false : 'downloads the pinned model; run with npm run test:model' }, async () => {
    const page = await browser.newPage();
    const sample = 'Field note (synthetic). Amina Keller met Jean Tremblay from Northfield Relief at Riverside camp near Lakeview. Call +1 604 555 0142. Amina Keller will visit again on Friday. The minority report is attached.';

    await page.goto(`http://127.0.0.1:${PORT}${BASE}/index.html`, { waitUntil: 'networkidle' });
    await page.click('#btn-start-check');
    await page.click('#perm-personal-no');
    await page.click('#btn-perm-continue');

    await page.click('#btn-enable-ner');
    await page.waitForFunction(() => {
      const btn = document.getElementById('btn-enable-ner');
      return btn?.textContent?.includes('ready') || btn?.textContent?.includes('Ready');
    }, { timeout: 540_000 });

    await page.fill('#check-input', sample);
    await page.click('#btn-run-check');
    await page.waitForSelector('#finding-list .finding-item', { timeout: 120_000 });

    const aminaRows = await page.locator('#finding-list .finding-item').filter({ hasText: 'Amina Keller' }).count();
    assert.ok(aminaRows <= 1, 'expected one grouped row for Amina Keller');

    await page.click('#btn-prepare');
    const prepared = await page.inputValue('#prepared-output');
    assert.ok(!prepared.includes('Jean Tremblay'), 'Jean Tremblay should be replaced');
    assert.ok(!prepared.includes('Lakeview'), 'Lakeview should be replaced');
    assert.ok(!prepared.includes('Amina Keller'), 'Amina Keller should be replaced');

    const errorVisible = await page.locator('#prepare-error').isVisible();
    assert.equal(errorVisible, false, 'prepare invariant should pass');

    const copyDisabled = await page.locator('#btn-copy').isDisabled();
    assert.equal(copyDisabled, false, 'copy should be enabled when invariant passes');

    await page.close();
  });

  it('does not flag gai inside again in context detection flow', async () => {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}${BASE}/index.html`);
    await page.click('#btn-start-check');
    await page.click('#perm-personal-no');
    await page.click('#btn-perm-continue');
    await page.fill('#check-input', 'She will visit again on Friday.');
    await page.click('#btn-run-check');
    await page.waitForSelector('#finding-list');
    const items = await page.locator('#finding-list .finding-item.layer-context').count();
    assert.equal(items, 0);
    await page.close();
  });
});
