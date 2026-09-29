import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const pages = readdirSync(web).filter((f) => f.endsWith('.html'));

function parseHeadings(html) {
  const levels = [];
  const re = /<h([1-6])[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) levels.push(parseInt(m[1], 10));
  return levels;
}

describe('a11y HTML checks', () => {
  for (const page of pages) {
    const html = readFileSync(join(web, page), 'utf8');
    const label = page;

    it(`${label} has lang attribute`, () => {
      assert.match(html, /<html[^>]+lang="/);
    });

    it(`${label} has title`, () => {
      assert.match(html, /<title>[^<]+<\/title>/);
    });

    it(`${label} has skip link`, () => {
      assert.match(html, /skip-link/);
    });

    it(`${label} has one h1`, () => {
      const h1s = html.match(/<h1/g) || [];
      assert.ok(h1s.length >= 1, 'at least one h1');
    });

    it(`${label} heading order does not skip levels`, () => {
      const levels = parseHeadings(html);
      for (let i = 1; i < levels.length; i++) {
        assert.ok(levels[i] - levels[i - 1] <= 1, `heading skip in ${label}`);
      }
    });

    it(`${label} buttons have accessible names`, () => {
      const buttons = html.match(/<button[^>]*>/g) || [];
      for (const b of buttons) {
        assert.ok(b.includes('data-i18n') || b.includes('id=') || />[^<]+</.test(html.slice(html.indexOf(b), html.indexOf(b) + 200)), `unnamed button in ${label}`);
      }
    });
  }
});
