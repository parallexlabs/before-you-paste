import { FINDING_TYPES } from './types.js';
import { findWholePhraseMatches } from './word-boundary.js';

/** @type {Record<string, { en: string[], fr: string[] }>} */
export const CONTEXT_CATEGORIES = {
  health: {
    en: ['diabetes', 'hiv', 'aids', 'pregnant', 'pregnancy', 'disability', 'wheelchair', 'mental health', 'psychiatric', 'medication', 'diagnosis', 'hospitalized', 'injury', 'wounded'],
    fr: ['diabète', 'vih', 'sida', 'enceinte', 'grossesse', 'handicap', 'fauteuil roulant', 'santé mentale', 'psychiatrique', 'médicament', 'diagnostic', 'hospitalisé', 'blessure', 'blessé']
  },
  gbv: {
    en: ['assault', 'rape', 'sexual violence', 'gbv', 'domestic violence', 'beaten', 'harassment'],
    fr: ['agression', 'viol', 'violence sexuelle', 'vbg', 'violence conjugale', 'battu', 'harcèlement']
  },
  children: {
    en: ['unaccompanied minor', 'child soldier', 'orphan', 'foster', 'underage', 'minor child'],
    fr: ['mineur non accompagné', 'enfant soldat', 'orphelin', 'placement familial', 'mineur', 'enfant mineur']
  },
  ethnicity: {
    en: ['ethnicity', 'tribe', 'tribal', 'indigenous', 'roma', 'ethnic group'],
    fr: ['ethnicité', 'tribu', 'tribal', 'autochtone', 'groupe ethnique']
  },
  religion: {
    en: ['muslim', 'christian', 'hindu', 'buddhist', 'jewish', 'sikh', 'religion', 'mosque', 'church', 'temple'],
    fr: ['musulman', 'chrétien', 'hindou', 'bouddhiste', 'juif', 'sikh', 'religion', 'mosquée', 'église', 'temple']
  },
  political: {
    en: ['political opinion', 'activist', 'opposition party', 'political affiliation'],
    fr: ['opinion politique', 'activiste', 'parti d\'opposition', 'affiliation politique']
  },
  sogi: {
    en: ['lgbtq', 'transgender', 'gay', 'lesbian', 'bisexual', 'sexual orientation', 'gender identity'],
    fr: ['lgbtq', 'transgenre', 'gai', 'lesbienne', 'bisexuel', 'orientation sexuelle', 'identité de genre']
  },
  migration: {
    en: ['asylum seeker', 'undocumented', 'irregular migrant', 'deportation', 'refugee status', 'visa overstay', 'without papers'],
    fr: ['demandeur d\'asile', 'sans papiers', 'migrant irrégulier', 'expulsion', 'statut de réfugié', 'visa expiré']
  },
  criminal: {
    en: ['arrested', 'convicted', 'alleged perpetrator', 'criminal charge', 'detained', 'suspect'],
    fr: ['arrêté', 'condamné', 'auteur présumé', 'accusation criminelle', 'détenu', 'suspect']
  },
  biometrics: {
    en: ['fingerprint', 'iris scan', 'facial recognition', 'biometric', 'dna sample'],
    fr: ['empreinte digitale', 'scan iris', 'reconnaissance faciale', 'biométrique', 'échantillon adn']
  }
};

let ctxId = 0;

/**
 * @param {string} text
 * @returns {import('./types.js').Finding[]}
 */
export function detectContextFlags(text) {
  const findings = [];
  const terms = [];

  for (const [category, lists] of Object.entries(CONTEXT_CATEGORIES)) {
    for (const term of [...lists.en, ...lists.fr]) {
      terms.push({ term, category });
    }
  }

  terms.sort((a, b) => b.term.length - a.term.length);

  for (const { term, category } of terms) {
    for (const match of findWholePhraseMatches(text, term)) {
      ctxId += 1;
      findings.push({
        id: `c-${ctxId}`,
        start: match.start,
        end: match.end,
        text: match.text,
        type: FINDING_TYPES.CONTEXT,
        layer: 'context',
        category,
        explanationKey: `context.${category}`,
        action: 'keep'
      });
    }
  }

  return dedupeContext(findings);
}

/**
 * @param {import('./types.js').Finding[]} findings
 * @returns {import('./types.js').Finding[]}
 */
function dedupeContext(findings) {
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  const kept = [];
  for (const f of sorted) {
    if (!kept.some((k) => f.start < k.end && f.end > k.start)) kept.push(f);
  }
  return kept;
}
