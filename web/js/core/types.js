/** @typedef {'pattern' | 'ner' | 'context' | 'mosaic'} DetectionLayer */

/** @typedef {'replace' | 'generalize' | 'keep' | 'pending'} FindingAction */

/**
 * @typedef {Object} Finding
 * @property {string} id
 * @property {number} start
 * @property {number} end
 * @property {string} text
 * @property {string} type
 * @property {DetectionLayer} layer
 * @property {string} [category]
 * @property {string} [explanationKey]
 * @property {FindingAction} [action]
 * @property {string} [placeholder]
 * @property {string} [generalizedText]
 * @property {string} [entityKey]
 * @property {boolean} [userAdded]
 */

export const FINDING_TYPES = {
  EMAIL: 'email',
  PHONE: 'phone',
  ADDRESS: 'address',
  CAMP_ADDRESS: 'camp_address',
  POSTAL_CODE: 'postal_code',
  DATE_OF_BIRTH: 'date_of_birth',
  AGE: 'age',
  GPS: 'gps',
  IP: 'ip',
  PAYMENT_CARD: 'payment_card',
  SIN: 'sin',
  IBAN: 'iban',
  ID_NUMBER: 'id_number',
  IMEI: 'imei',
  PASSPORT_MRZ: 'passport_mrz',
  PERSON: 'person',
  ORGANIZATION: 'organization',
  PLACE: 'place',
  CONTEXT: 'context',
  MOSAIC: 'mosaic'
};

export const LAYER_LABELS = {
  pattern: 'pattern',
  ner: 'ner',
  context: 'context',
  mosaic: 'mosaic'
};
