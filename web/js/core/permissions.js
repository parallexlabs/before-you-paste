/** @typedef {'yes' | 'no' | 'unknown'} PermissionAnswer */

/**
 * @typedef {Object} PermissionResponses
 * @property {PermissionAnswer} personalData
 * @property {PermissionAnswer} toolApproved
 * @property {PermissionAnswer} purposeAllowed
 */

/**
 * Whether the lab may scan text given permission answers.
 * Practice mode bypasses this check.
 * @param {PermissionResponses} answers
 * @returns {{ allowed: boolean, reasonKey: string | null }}
 */
export function evaluatePermissions(answers) {
  if (answers.personalData === 'no') {
    return { allowed: true, reasonKey: null };
  }

  if (answers.personalData === 'yes' || answers.personalData === 'unknown') {
    const toolBlocked = answers.toolApproved === 'no' || answers.toolApproved === 'unknown';
    const purposeBlocked = answers.purposeAllowed === 'no' || answers.purposeAllowed === 'unknown';
    if (toolBlocked || purposeBlocked) {
      return { allowed: false, reasonKey: 'permission.blocked' };
    }
    return { allowed: true, reasonKey: null };
  }

  return { allowed: false, reasonKey: 'permission.needAnswer' };
}
