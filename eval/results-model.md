# Evaluation results (pattern-and-model)

Date: 2026-09-29

Model: Xenova/distilbert-base-multilingual-cased-ner-hrl @ c2a4dbf593c57f47004c5bc2d3770d311aee9c43

Passages: 13 | Answer key items: 69 (unique: 66)

| Category | n (unique) | TP | FN | FP | Recall | Precision |
|----------|------------|----|----|-----|--------|----------|
| person | 11 (8) | 10 | 1 | 1 | 0.909 | 0.909 |
| age | 4 (4) | 2 | 2 | 1 | 0.500 | 0.667 |
| camp_address | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| place | 2 (2) | 1 | 1 | 3 | 0.500 | 0.250 |
| email | 4 (4) | 4 | 0 | 0 | 1.000 | 1.000 |
| phone | 6 (6) | 6 | 0 | 0 | 1.000 | 1.000 |
| gps | 3 (3) | 1 | 2 | 0 | 0.333 | 1.000 |
| date_of_birth | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| address | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| postal_code | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| payment_card | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| ip | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| organization | 2 (2) | 2 | 0 | 2 | 1.000 | 0.500 |
| context | 13 (13) | 12 | 1 | 1 | 0.923 | 0.923 |
| passport_mrz | 1 (1) | 1 | 0 | 0 | 1.000 | 1.000 |
| id_number | 5 (5) | 5 | 0 | 0 | 1.000 | 1.000 |
| imei | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| sin | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| iban | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |

**Overall recall:** 62/69 = 0.899
**Overall precision:** 62/70 = 0.886

**Repeated-entity detection:**

| Passage | Text | Type | Expected | Detected |
|---------|------|------|----------|----------|
| en-repeated | elena vasquez | person | 4 | 4 |

**Near misses:** 3
