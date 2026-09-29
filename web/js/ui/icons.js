/**
 * @param {string} layer
 * @returns {string}
 */
export function layerClass(layer) {
  return `layer-${layer}`;
}

/**
 * @param {string} layer
 * @returns {string}
 */
export function badgeClass(layer) {
  const map = { pattern: 'badge-pattern', ner: 'badge-ner', context: 'badge-context', mosaic: 'badge-mosaic' };
  return map[layer] || 'badge-pattern';
}
