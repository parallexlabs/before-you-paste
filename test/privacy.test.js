import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith('.js') || name.endsWith('.html')) files.push(p);
  }
  return files;
}

const forbidden = [
  /fetch\s*\([^)]*,\s*\{[^}]*body\s*:/,
  /XMLHttpRequest/,
  /sendBeacon/,
  /new\s+WebSocket/,
  /navigator\.clipboard\.read/,
  /localStorage\.setItem/,
  /sessionStorage\.setItem/,
  /indexedDB\.open/
];

describe('privacy', () => {
  it('web code does not exfiltrate user text', () => {
    const files = walk(web);
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const pattern of forbidden) {
        assert.doesNotMatch(src, pattern, `forbidden pattern in ${file}`);
      }
    }
  });

  it('HTML pages have CSP', () => {
    const pages = readdirSync(web).filter((f) => f.endsWith('.html'));
    for (const page of pages) {
      const html = readFileSync(join(web, page), 'utf8');
      assert.match(html, /Content-Security-Policy/, `${page} missing CSP`);
    }
  });

  it('data-flow page lists Transformers.js CDN as residual risk', () => {
    const html = readFileSync(join(web, 'data-flow.html'), 'utf8');
    assert.match(html, /@huggingface\/transformers@4\.3\.0/);
    assert.match(html, /cdn\.jsdelivr\.net/);
    assert.match(html, /Subresource integrity cannot be applied/i);
    assert.match(html, /L'intégrité de sous-ressource ne peut pas s'appliquer/i);
  });
});
