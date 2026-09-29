# Evaluation results (pattern-only)

Date: 2026-09-29

Passages: 13 | Answer key items: 69 (unique: 66)

| Category | n (unique) | TP | FN | FP | Recall | Precision |
|----------|------------|----|----|-----|--------|----------|
| person | 11 (8) | 0 | 11 | 0 | 0.000 | 0 |
| age | 4 (4) | 2 | 2 | 1 | 0.500 | 0.667 |
| camp_address | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| place | 2 (2) | 0 | 2 | 0 | 0.000 | 0 |
| email | 4 (4) | 4 | 0 | 0 | 1.000 | 1.000 |
| phone | 6 (6) | 6 | 0 | 0 | 1.000 | 1.000 |
| gps | 3 (3) | 1 | 2 | 0 | 0.333 | 1.000 |
| date_of_birth | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| address | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| postal_code | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| payment_card | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| ip | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| context | 13 (13) | 12 | 1 | 1 | 0.923 | 0.923 |
| passport_mrz | 1 (1) | 1 | 0 | 0 | 1.000 | 1.000 |
| id_number | 5 (5) | 5 | 0 | 0 | 1.000 | 1.000 |
| imei | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| sin | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |
| organization | 2 (2) | 0 | 2 | 0 | 0.000 | 0 |
| iban | 2 (2) | 2 | 0 | 0 | 1.000 | 1.000 |

**Overall recall:** 49/69 = 0.710
**Overall precision:** 49/51 = 0.961

**Repeated-entity detection:**

| Passage | Text | Type | Expected | Detected |
|---------|------|------|----------|----------|
| en-repeated | elena vasquez | person | 4 | 0 |

**Near misses:** 2
