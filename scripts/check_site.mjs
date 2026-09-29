#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const webRoot = join(root, 'web');
const BASE = '/before-you-paste';
const PORT = 4173;

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
};

function serve(req, res) {
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
}

function extractRefs(html, file) {
  const refs = [];
  const attrRe = /\b(?:href|src)=["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    refs.push({ attr: m[0].startsWith('href') ? 'href' : 'src', value: m[1], file });
  }
  return refs;
}

function crawl() {
  const errors = [];
  const visited = new Set();
  const queue = [
    `${BASE}/index.html`,
    `${BASE}/why.html`,
    `${BASE}/practice.html`,
    `${BASE}/facilitator.html`,
    `${BASE}/data-flow.html`
  ];

  while (queue.length) {
    const urlPath = queue.shift();
    if (visited.has(urlPath)) continue;
    visited.add(urlPath);

    const rel = urlPath.slice(BASE.length) || '/index.html';
    const filePath = join(webRoot, rel);

    if (!existsSync(filePath)) {
      errors.push(`Missing page: ${urlPath}`);
      continue;
    }

    const html = readFileSync(filePath, 'utf8');
    if (/\b(?:href|src)=["']\/(?!\/)/.test(html)) {
      errors.push(`Root-absolute path in ${rel}`);
    }

    const refs = extractRefs(html, rel);
    for (const ref of refs) {
      const v = ref.value;
      if (v.startsWith('http') || v.startsWith('mailto:') || v.startsWith('#') || v.startsWith('data:')) continue;
      if (v.startsWith('/')) {
        errors.push(`Root-absolute ${ref.attr} in ${rel}: ${v}`);
        continue;
      }
      const targetPath = resolve(dirname(join(webRoot, rel)), v).split(webRoot)[1];
      const abs = join(webRoot, targetPath.replace(/^\//, ''));
      if (!existsSync(abs)) {
        errors.push(`Broken ${ref.attr} in ${rel}: ${v} -> ${abs}`);
      } else if (v.endsWith('.html') || v.endsWith('/')) {
        const pageUrl = `${BASE}/${targetPath.replace(/^\//, '')}`;
        queue.push(pageUrl);
      }
    }
  }

  return { errors, pageCount: visited.size, pages: [...visited] };
}

function checkModuleGraph() {
  const errors = [];
  const jsFiles = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.js')) jsFiles.push(p);
    }
  }
  walk(join(webRoot, 'js'));
  for (const file of jsFiles) {
    const src = readFileSync(file, 'utf8');
    const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)];
    for (const imp of imports) {
      const spec = imp[1];
      if (spec.startsWith('http') || spec.startsWith('.')) {
        if (spec.startsWith('.')) {
          const resolved = resolve(dirname(file), spec);
          const candidates = [resolved, `${resolved}.js`];
          if (!candidates.some((c) => existsSync(c))) {
            errors.push(`Broken import in ${file}: ${spec}`);
          }
        }
      }
    }
  }
  return errors;
}

async function checkWithPlaywright(pages) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return { ok: false, method: 'module-graph', errors: ['Playwright not installed; used module graph check only'] };
  }

  const errors = [];
  const consoleErrors = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  for (const urlPath of pages) {
    consoleErrors.length = 0;
    await page.goto(`http://127.0.0.1:${PORT}${urlPath}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);
    if (consoleErrors.length) {
      errors.push(`${urlPath}: ${consoleErrors.join('; ')}`);
    }
  }

  await browser.close();
  return { ok: errors.length === 0, method: 'playwright-chromium', errors };
}

const server = createServer(serve);

server.listen(PORT, async () => {
  const { errors: crawlErrors, pageCount, pages } = crawl();
  const graphErrors = checkModuleGraph();
  const allErrors = [...crawlErrors, ...graphErrors];

  let browserResult = { ok: true, method: 'none', errors: [] };
  if (!allErrors.length) {
    browserResult = await checkWithPlaywright(pages);
    if (!browserResult.ok && browserResult.method === 'module-graph') {
      // Playwright unavailable; module graph already checked
      browserResult.ok = graphErrors.length === 0;
    } else {
      allErrors.push(...browserResult.errors);
    }
  }

  server.close();

  if (allErrors.length) {
    console.error('check:site FAILED\n' + allErrors.join('\n'));
    process.exit(1);
  }
  console.log(`check:site OK (${pageCount} pages at ${BASE}, browser check: ${browserResult.method})`);
});
