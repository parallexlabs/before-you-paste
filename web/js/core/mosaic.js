import { FINDING_TYPES } from './types.js';

const SMALL_PLACE_RE = /\b(?:village|hamlet|hamlet of|settlement|camp section|block [A-Z0-9]+|secteur|hameau|localité|quartier)\s+(?:of\s+|de\s+)?[A-ZÀ-ÿ][\wÀ-ÿ'-]{2,}\b/gi;

const CAMP_RE = /\b(?:Block|Bloc|Secteur|Sector)\s+[A-Z0-9]+(?:,?\s+(?:Shelter|Abri)\s+\d+)?\b/gi;

const ROLE_RE = /\b(?:teacher|nurse|midwife|volunteer|beneficiary|caseworker|chef de famille|enseignant|infirmier|sage-femme|bénéficiaire)\b/gi;

const SEX_RE = /\b(?:male|female|man|woman|homme|femme|garçon|fille)\b/gi;

const ETHNICITY_RE = /\b(?:ethnicity|ethnic group|nationality|nationalité|ethnie)\b/gi;

const GROUP_AGE_RE = /\b(?:men|women|boys|girls|hommes|femmes|garçons|filles)\s+(?:aged\s+\d{1,2}|âgés?\s+de\s+\d{1,2})(?:\s*[-–]\s*\d{1,2})?\b/gi;

let mosaicId = 0;

/**
 * @param {string} text
 * @param {RegExp} re
 * @returns {Array<{ start: number, end: number, text: string }>}
 */
function collectMatches(text, re) {
  const out = [];
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  let m;
  while ((m = r.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}

/**
 * Detect mosaic-effect combinations from existing findings and text.
 * @param {string} text
 * @param {import('./types.js').Finding[]} findings
 * @returns {import('./types.js').Finding[]}
 */
export function detectMosaicWarnings(text, findings) {
  const warnings = [];
  const ageFinding = findings.find((f) => f.type === FINDING_TYPES.AGE);
  const dobFinding = findings.find((f) => f.type === FINDING_TYPES.DATE_OF_BIRTH);
  const hasAge = Boolean(ageFinding);
  const hasDob = Boolean(dobFinding);
  const hasCondition = findings.some((f) => f.layer === 'context' && (f.category === 'health' || f.category === 'gbv'));
  const hasPlace = findings.some((f) => f.type === FINDING_TYPES.PLACE || f.type === FINDING_TYPES.ADDRESS || f.type === FINDING_TYPES.CAMP_ADDRESS);
  const hasEthnicity = findings.some((f) => f.layer === 'context' && f.category === 'ethnicity') ||
    collectMatches(text, ETHNICITY_RE).length > 0;

  const smallPlaces = collectMatches(text, SMALL_PLACE_RE);
  const camps = collectMatches(text, CAMP_RE);
  const roles = collectMatches(text, ROLE_RE);
  const sexes = collectMatches(text, SEX_RE);
  const groupAges = collectMatches(text, GROUP_AGE_RE);
  const dates = findings.filter((f) => f.type === FINDING_TYPES.DATE_OF_BIRTH);

  const locationPresent = smallPlaces.length > 0 || camps.length > 0 || hasPlace;
  const locationLabel = camps[0]?.text || smallPlaces[0]?.text ||
    findings.find((f) => f.type === FINDING_TYPES.CAMP_ADDRESS || f.type === FINDING_TYPES.PLACE || f.type === FINDING_TYPES.ADDRESS)?.text;

  const pairings = [];

  if (hasAge && locationPresent) {
    pairings.push({
      key: 'mosaic.pair.ageLocation',
      items: [ageFinding?.text, locationLabel].filter(Boolean)
    });
  }
  if (hasAge && sexes.length) {
    pairings.push({
      key: 'mosaic.pair.ageSex',
      items: [ageFinding?.text, sexes[0]?.text].filter(Boolean)
    });
  }
  if (hasDob && locationPresent) {
    pairings.push({
      key: 'mosaic.pair.dobLocation',
      items: [dobFinding?.text, locationLabel].filter(Boolean)
    });
  }
  if (roles.length && locationPresent) {
    pairings.push({
      key: 'mosaic.pair.roleLocation',
      items: [roles[0]?.text, locationLabel].filter(Boolean)
    });
  }
  if (roles.length && hasAge) {
    pairings.push({
      key: 'mosaic.pair.roleAge',
      items: [roles[0]?.text, ageFinding?.text].filter(Boolean)
    });
  }
  if (dates.length && locationPresent) {
    pairings.push({
      key: 'mosaic.pair.dateLocation',
      items: [dates[0]?.text, locationLabel].filter(Boolean)
    });
  }
  if (hasEthnicity && locationPresent) {
    const eth = findings.find((f) => f.layer === 'context' && f.category === 'ethnicity')?.text ||
      collectMatches(text, ETHNICITY_RE)[0]?.text;
    pairings.push({
      key: 'mosaic.pair.ethnicityLocation',
      items: [eth, locationLabel].filter(Boolean)
    });
  }
  if (hasCondition && (hasAge || locationPresent)) {
    const cond = findings.find((f) => f.layer === 'context' && (f.category === 'health' || f.category === 'gbv'))?.text;
    pairings.push({
      key: 'mosaic.pair.conditionContext',
      items: [cond, ageFinding?.text || locationLabel].filter(Boolean)
    });
  }
  if (groupAges.length && (camps.length || smallPlaces.length)) {
    pairings.push({
      key: 'mosaic.pair.groupMatch',
      items: [groupAges[0]?.text, camps[0]?.text || smallPlaces[0]?.text].filter(Boolean),
      group: true
    });
  }

  for (const pair of pairings) {
    mosaicId += 1;
    warnings.push({
      id: `m-${mosaicId}`,
      start: 0,
      end: text.length,
      text: pair.items.join(' + '),
      type: FINDING_TYPES.MOSAIC,
      layer: 'mosaic',
      explanationKey: pair.key,
      mosaicItems: pair.items,
      groupRisk: Boolean(pair.group),
      action: 'keep'
    });
  }

  return warnings;
}

export function resetMosaicIds() {
  mosaicId = 0;
}
