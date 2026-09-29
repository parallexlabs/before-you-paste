# On-device models

Verified 2026-09-29.

## Xenova/distilbert-base-multilingual-cased-ner-hrl

| Field | Value |
|-------|-------|
| **Model ID** | `Xenova/distilbert-base-multilingual-cased-ner-hrl` |
| **Revision (pinned)** | `c2a4dbf593c57f47004c5bc2d3770d311aee9c43` |
| **Revision date** | 2025-07-11 (per Hugging Face API `lastModified` on Xenova mirror) |
| **Upstream** | `Davlan/distilbert-base-multilingual-cased-ner-hrl` |
| **Licence** | AFL-3.0 |
| **Licence URL** | https://opensource.org/licenses/AFL-3.0 |
| **Quantized weights** | `onnx/model_quantized.onnx` (135,359,829 bytes, ~129 MB) |
| **Languages** | 10 high-resource languages: Arabic, German, English, Spanish, French, Italian, Latvian, Dutch, Portuguese and Chinese (per upstream Davlan model card, https://huggingface.co/Davlan/distilbert-base-multilingual-cased-ner-hrl) |
| **Use in this lab** | Optional token-classification for person, organization and location spans |
| **Transformers.js** | 4.3.0 (pinned), loaded from `https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0` |
| **Transformers.js licence** | Apache-2.0 (https://github.com/huggingface/transformers.js/blob/main/LICENSE) |

### Verification notes

- Hugging Face API (`sha: c2a4dbf593c57f47004c5bc2d3770d311aee9c43`) confirms ONNX siblings including `model_quantized.onnx`.
- Measured download size via HEAD on resolve URL: 135,359,829 bytes.
- Upstream licence `afl-3.0` is permissive (not NC or ND).
- `revision` option passed to Transformers.js `pipeline()` in `web/js/workers/ner-worker.js` and `scripts/eval.mjs`.
- Evaluation pipeline pins the same revision as the browser worker.

### ICAO Doc 9303 (passport MRZ check digits)

- Public specification: [ICAO Doc 9303 Part 3 (PDF)](https://www.icao.int/sites/default/files/publications/DocSeries/9303_p3_cons_en.pdf) (verified HTTP 200, 2026-09-29).
- MRZ check-digit algorithm implemented in `web/js/core/validators.js` per Section 4.9.
