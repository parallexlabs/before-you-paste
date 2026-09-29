/** @type {{ text: string, findings: import('../core/types.js').Finding[], placeholderMap: Record<string, string>, preparedText: string, dirty: boolean, nerEnabled: boolean, nerStatus: string }} */
export const appState = {
  text: '',
  findings: [],
  placeholderMap: {},
  preparedText: '',
  dirty: false,
  nerEnabled: false,
  nerStatus: 'off'
};

export function clearAll() {
  appState.text = '';
  appState.findings = [];
  appState.placeholderMap = {};
  appState.preparedText = '';
  appState.dirty = false;
}

export function setDirty(value = true) {
  appState.dirty = value;
}
