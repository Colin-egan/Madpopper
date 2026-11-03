import { CONFIG } from './pricing-config.js';

// The numbers an editor may change. Labels, flavor lists and date rules stay in pricing-config.js.
// Used by the browser (calculator and editor) and by the publish API, so both enforce the same rules.
export function snapshot() {
  return {
    sizes: Object.fromEntries(Object.entries(CONFIG.sizes).map(([k, s]) => [k, s.unitPrice])),
    tiers: CONFIG.tiers.map((t) => ({ min: t.min, discount: t.discount })),
    minQuantity: CONFIG.minQuantity,
    maxQuantity: CONFIG.maxQuantity,
    options: Object.fromEntries(Object.entries(CONFIG.options).map(([k, o]) => [k, { perBag: o.perBag, setup: o.setup }])),
    includedFlavors: CONFIG.includedFlavors,
    extraFlavorFee: CONFIG.extraFlavorFee,
    maxFlavors: CONFIG.maxFlavors,
    zones: Object.fromEntries(Object.entries(CONFIG.delivery.zones).map(([k, z]) => [k, z.fee])),
    leadTimeBusinessDays: CONFIG.leadTimeBusinessDays,
    rushMinBusinessDays: CONFIG.rush.minBusinessDays,
    rushSurcharge: CONFIG.rush.surcharge,
  };
}

export const DEFAULTS = snapshot();

export function apply(s) {
  for (const [k, v] of Object.entries(s.sizes)) CONFIG.sizes[k].unitPrice = v;
  CONFIG.tiers.splice(0, CONFIG.tiers.length, ...s.tiers.map((t) => ({ ...t })).sort((a, b) => b.min - a.min));
  CONFIG.minQuantity = s.minQuantity;
  CONFIG.maxQuantity = s.maxQuantity;
  for (const [k, o] of Object.entries(s.options)) Object.assign(CONFIG.options[k], o);
  CONFIG.includedFlavors = s.includedFlavors;
  CONFIG.extraFlavorFee = s.extraFlavorFee;
  CONFIG.maxFlavors = s.maxFlavors;
  for (const [k, fee] of Object.entries(s.zones)) CONFIG.delivery.zones[k].fee = fee;
  CONFIG.leadTimeBusinessDays = s.leadTimeBusinessDays;
  CONFIG.rush.minBusinessDays = s.rushMinBusinessDays;
  CONFIG.rush.surcharge = s.rushSurcharge;
}

// Fills any missing field from the original numbers. Unknown keys are dropped.
export function merge(saved) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const merged = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) if (key in s) merged[key] = s[key];
  for (const key of ['sizes', 'zones']) {
    merged[key] = Object.fromEntries(Object.keys(DEFAULTS[key]).map((k) => [k, (s[key] || {})[k] ?? DEFAULTS[key][k]]));
  }
  merged.options = Object.fromEntries(Object.keys(DEFAULTS.options).map((k) => [k, { ...DEFAULTS.options[k], ...((s.options || {})[k] || {}) }]));
  merged.options = Object.fromEntries(Object.entries(merged.options).map(([k, o]) => [k, { perBag: o.perBag, setup: o.setup }]));
  if (!Array.isArray(merged.tiers)) merged.tiers = DEFAULTS.tiers;
  merged.tiers = merged.tiers.map((t) => ({ min: t?.min, discount: t?.discount }));
  return merged;
}

// Returns an error message, or '' when the settings are safe to use.
export function validate(s) {
  const nums = [...Object.values(s.sizes), ...s.tiers.flatMap((t) => [t.min, t.discount]), s.minQuantity, s.maxQuantity,
    ...Object.values(s.options).flatMap((o) => [o.perBag, o.setup]), s.includedFlavors, s.extraFlavorFee, s.maxFlavors,
    ...Object.values(s.zones), s.leadTimeBusinessDays, s.rushMinBusinessDays, s.rushSurcharge];
  if (nums.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0)) return 'Every field needs a number of 0 or more.';
  if (Object.values(s.sizes).some((p) => p <= 0)) return 'Bag prices must be above $0.';
  if (!Number.isInteger(s.minQuantity) || s.minQuantity < 1) return 'Minimum order must be a whole number of bags, at least 1.';
  if (!Number.isInteger(s.maxQuantity) || s.maxQuantity < s.minQuantity) return 'Max order before custom pricing must be a whole number at least as large as the minimum order.';
  if (s.tiers.length > 20) return 'Use 20 discount tiers or fewer.';
  if (s.tiers.some((t) => t.discount > 1)) return 'Discounts cannot be above 100%.';
  if (!s.tiers.some((t) => t.min <= 1)) return 'Keep one tier that starts at 1 bag.';
  if (new Set(s.tiers.map((t) => t.min)).size !== s.tiers.length) return 'Two discount tiers start at the same bag count.';
  if (s.maxFlavors < 1 || s.includedFlavors > s.maxFlavors) return 'Included flavors cannot be more than the maximum flavors.';
  if (s.rushMinBusinessDays > s.leadTimeBusinessDays) return 'The rush cutoff cannot be longer than the standard lead time.';
  return '';
}
