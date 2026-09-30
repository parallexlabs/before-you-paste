<p align="center" class="brand-mark">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/brand/parallex-mark-dark.png">
    <img src=".github/brand/parallex-mark.png" alt="ParalleX Labs" width="120">
  </picture>
</p>

# Before You Paste

Before You Paste is a bilingual (English and French) practice lab for Session 1 (responsible foundations) of the [Humanitarian AI Training Kit](https://parallexlabs.github.io/humanitarian-ai-training-kit/). It helps people check text for personal and sensitive details before they paste it into a generative AI tool. It asks permission questions first, finds likely personal details on the device, lets a person review each finding and replace it with a placeholder, and later restores the original details in the AI tool's reply. The text never goes to a server.

It is a practice lab and a human-review training environment, not a privacy protection or anonymization tool. It cannot make prohibited data safe: if your organization's rules forbid putting beneficiary, protection or health information into AI tools, placeholders do not change that.

## Try it

**Live:** https://parallexlabs.github.io/before-you-paste/

## How it works

```
Your text (browser only)
    |
    v
[Pattern checks] ---- always on (email, phone, address, IDs, ...)
    |
    +-- [Optional NER model] ---- people, orgs, places (~129 MB download)
    |
    +-- [Context flags] ---- sensitive terms (review only, never auto-removed)
    |
    +-- [Mosaic warning] ---- combined details that may re-identify someone
    |
    v
You review: replace | generalize | keep
    |
    v
Prepared text with placeholders --> copy to AI tool
    |
    v
Paste AI reply --> restore originals in memory (mapping never saved)
```

## Privacy

**Not sent to a remote server:** text you type or paste, detection results, placeholder mappings and restored output. No analytics, cookies, trackers or external fonts. User text lives only in browser memory and is cleared when you close the tab or press Clear everything.

**Does leave the browser or device:** copying prepared or restored text writes to your operating system clipboard (which may keep history). Optional Transformers.js library from `cdn.jsdelivr.net`; optional model weights from `huggingface.co` when you press the download button (Hugging Face sees the download request, not your text).

**No export feature:** this lab has no CSV or Markdown export. If export is added later, cells and rendered output must be escaped to prevent formula or HTML injection.

## Limitations

The lab may miss nicknames, unusual spellings, transliterated names and indirect identifiers. Word lists are not exhaustive. The on-device model can be wrong in either direction. This is not a compliance or anonymization guarantee. A person must review every result. Redaction does not make data permitted if your organizational rules forbid using it with AI tools.

## Evaluation

Run on 2026-09-29 against 13 synthetic practice passages with 69 answer-key items (66 unique: one repeated-entity passage names the same person four times). Wrong-use scenarios are scored separately.

**Pattern-only** (`npm run eval`, exact span and type matching):

| Metric | Value |
|--------|-------|
| Overall recall | 49/69 = 0.710 |
| Overall precision | 49/51 = 0.961 |

Per category (n = answer-key items): email 4/4 recall; phone 6/6; address 2/2; camp_address 2/2; postal_code 2/2; payment_card 2/2; ip 2/2; sin 2/2; iban 2/2; imei 2/2; passport_mrz 1/1; id_number 5/5; date_of_birth 2/2; context 12/13; age 2/4; gps 1/3; person 0/11; place 0/2; organization 0/2.

Repeated-entity passage (`en-repeated`): the name Elena Vasquez appears 4 times and pattern checks alone find none of them, because names need the optional model. Its two phone-number formats are both found.

**Pattern + model** (`npm run eval:model`, Xenova/distilbert-base-multilingual-cased-ner-hrl, revision `c2a4dbf593c57f47004c5bc2d3770d311aee9c43`):

| Metric | Value |
|--------|-------|
| Overall recall | 62/69 = 0.899 |
| Overall precision | 62/70 = 0.886 |

Person recall improves to 10/11; organization 2/2; place 1/2. Repeated-entity passage: Elena Vasquez detected 4/4 with the model. Full tables in `eval/results.json` and `eval/results-model.json`.

## Using it in a training session

See [web/facilitator.html](web/facilitator.html) for a 20 to 30 minute remote activity plan, debrief questions and low-bandwidth notes. Pair with kit Session 1 and the [Humanitarian AI Risk Screen](https://github.com/parallexlabs/humanitarian-ai-risk-screen).

## Languages

English and French interface (`web/i18n/`). French prepared with machine assistance; not yet reviewed by a professional translator.

## Related ParalleX work

- [Humanitarian AI Training Kit](https://parallexlabs.github.io/humanitarian-ai-training-kit/)
- [Humanitarian AI Risk Screen](https://github.com/parallexlabs/humanitarian-ai-risk-screen)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Run `npm ci`, `npm run lint`, `npm test`, `npm run eval`, `npx playwright install chromium`, `npm run test:browser` and `npm run check:site` before submitting changes. `npm run test:model` also runs the browser test that downloads the pinned name-recognition model.

## Licence

- **Code:** Apache-2.0 ([LICENSE](LICENSE)), Copyright 2026 ParalleX Labs Inc.
- **Practice content and written materials:** CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT))

## Citation

See [CITATION.cff](CITATION.cff).

## Open by design

**We build in the open.** ParalleX Labs Inc. publishes its tools, methods and learning materials under open licences, so public-interest teams can use them, check how they work and adapt them freely. Open work is easier to trust, because anyone can see exactly how a result is produced.

**Our own work, and only ours.** Everything in this repository was created by ParalleX Labs Inc. from public guidance and synthetic examples. It contains no client data, no client projects, and no one else's confidential information or intellectual property.
