export const TALLY_COLORS = Object.freeze({
  gold: '#d4af37',
  blue: '#2f80ed',
  green: '#27ae60',
  red: '#eb5757',
  purple: '#9b51e0',
  orange: '#f2994a',
  gray: '#828282'
});

export function normalizeTallyColor(value) {
  const key = String(value || 'gold').toLowerCase();
  return Object.prototype.hasOwnProperty.call(TALLY_COLORS, key) ? key : 'gold';
}

export function applyTallyColor(element, value) {
  if (!element) return;
  const key = normalizeTallyColor(value);
  element.dataset.tallyColor = key;
  element.style.setProperty('--tally-color', TALLY_COLORS[key]);
}
