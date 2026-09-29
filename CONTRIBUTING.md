# Contributing

Thank you for helping improve Before You Paste.

## Setup

```bash
npm ci
npm run lint
npm test
npm run eval
npx playwright install chromium
npm run test:browser
npm run check:site
```

`npm run test:model` adds the browser test that downloads the pinned name-recognition model (about 129 MB).

## Guidelines

- Keep user text in memory only; no analytics, trackers or persistence of pasted content.
- Cite public sources for factual claims; use synthetic labelled examples only.
- Match kit colour tokens and bilingual i18n keys (`web/i18n/en.json` and `fr.json` must stay in sync).
- Run the full CI script sequence before opening a pull request.

## Security

Report vulnerabilities privately to info@parallexlabs.ca (see SECURITY.md).
