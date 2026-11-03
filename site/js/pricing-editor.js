import { CONFIG } from './pricing-config.js';

const STORAGE_KEY = 'madpopper-pricing-v1';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The numbers an editor may change. Labels, flavor lists and date rules stay in pricing-config.js.
function snapshot() {
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

const DEFAULTS = snapshot();

function apply(s) {
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

// Returns an error message, or '' when the settings are safe to use.
function validate(s) {
  const nums = [...Object.values(s.sizes), ...s.tiers.flatMap((t) => [t.min, t.discount]), s.minQuantity, s.maxQuantity,
    ...Object.values(s.options).flatMap((o) => [o.perBag, o.setup]), s.includedFlavors, s.extraFlavorFee, s.maxFlavors,
    ...Object.values(s.zones), s.leadTimeBusinessDays, s.rushMinBusinessDays, s.rushSurcharge];
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return 'Every field needs a number of 0 or more.';
  if (Object.values(s.sizes).some((p) => p <= 0)) return 'Bag prices must be above $0.';
  if (!Number.isInteger(s.minQuantity) || s.minQuantity < 1) return 'Minimum order must be a whole number of bags, at least 1.';
  if (!Number.isInteger(s.maxQuantity) || s.maxQuantity < s.minQuantity) return 'Max order before custom pricing must be a whole number at least as large as the minimum order.';
  if (s.tiers.some((t) => t.discount > 1)) return 'Discounts cannot be above 100%.';
  if (!s.tiers.some((t) => t.min <= 1)) return 'Keep one tier that starts at 1 bag.';
  if (new Set(s.tiers.map((t) => t.min)).size !== s.tiers.length) return 'Two discount tiers start at the same bag count.';
  if (s.maxFlavors < 1 || s.includedFlavors > s.maxFlavors) return 'Included flavors cannot be more than the maximum flavors.';
  if (s.rushMinBusinessDays > s.leadTimeBusinessDays) return 'The rush cutoff cannot be longer than the standard lead time.';
  return '';
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot())); } catch { /* private mode: edits last for this visit */ }
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    const merged = { ...DEFAULTS, ...s };
    for (const key of ['sizes', 'options', 'zones']) merged[key] = { ...DEFAULTS[key], ...(s[key] || {}) };
    if (!Array.isArray(merged.tiers)) merged.tiers = DEFAULTS.tiers;
    if (!validate(merged)) apply(merged);
  } catch { /* ignore a corrupt saved value */ }
}

const num = (id, label, value, opts = '') =>
  `<label class="pe-field" for="${id}"><span>${esc(label)}</span><input id="${id}" type="number" inputmode="decimal" value="${value}" ${opts}></label>`;

function tierRow(t, locked) {
  return `<div class="pe-tier" data-tier>
    <label>From bags<input type="number" step="1" min="1" data-tier-min value="${t.min}" ${locked ? 'readonly aria-readonly="true"' : ''}></label>
    <label>Discount %<input type="number" step="0.5" min="0" max="100" data-tier-discount value="${+(t.discount * 100).toFixed(2)}"></label>
    ${locked ? '<span class="pe-lock">base</span>' : '<button type="button" class="pe-x" data-tier-remove aria-label="Remove this tier">&times;</button>'}
  </div>`;
}

function buildForm(form) {
  const s = snapshot();
  const sizes = Object.entries(CONFIG.sizes).map(([k, z]) =>
    num(`pe-size-${k}`, z.label, s.sizes[k], 'step="0.05" min="0" data-size="' + k + '"')).join('');
  const options = Object.entries(CONFIG.options).map(([k, o]) => `
    <div class="pe-pair"><strong>${esc(o.label)}</strong>
      ${num(`pe-opt-${k}-bag`, 'Per bag ($)', o.perBag, 'step="0.05" min="0" data-opt-bag="' + k + '"')}
      ${num(`pe-opt-${k}-setup`, 'One-time setup ($)', o.setup, 'step="1" min="0" data-opt-setup="' + k + '"')}
    </div>`).join('');
  const zones = Object.entries(CONFIG.delivery.zones).map(([k, z]) =>
    num(`pe-zone-${k}`, `Delivery: ${z.label} ($)`, z.fee, 'step="1" min="0" data-zone="' + k + '"')).join('');
  const tiers = s.tiers.slice().sort((a, b) => b.min - a.min).map((t) => tierRow(t, t.min <= 1)).join('');
  form.innerHTML = `
    <fieldset><legend>Order size</legend>
      ${num('pe-min', 'Minimum order (bags)', s.minQuantity, 'step="1" min="1"')}
      ${num('pe-max', 'Max order before custom pricing (bags)', s.maxQuantity, 'step="1" min="1"')}
      <p class="hint">Orders above the max show "Call for a custom quote" instead of a price.</p>
    </fieldset>
    <fieldset><legend>Bag prices (each)</legend>${sizes}</fieldset>
    <fieldset><legend>Volume discounts</legend>
      <div id="pe-tiers">${tiers}</div>
      <button type="button" class="pe-add" id="pe-add-tier">+ Add a tier</button>
      <p class="hint">Applies to the bag subtotal. The highest tier the order reaches is used.</p>
    </fieldset>
    <fieldset><legend>Customization fees</legend>${options}</fieldset>
    <fieldset><legend>Flavors</legend>
      ${num('pe-incl', 'Flavors included free', s.includedFlavors, 'step="1" min="0"')}
      ${num('pe-extra', 'Fee per extra flavor ($)', s.extraFlavorFee, 'step="1" min="0"')}
      ${num('pe-maxfl', 'Most flavors per order', s.maxFlavors, 'step="1" min="1"')}
    </fieldset>
    <fieldset><legend>Delivery</legend>${zones}<p class="hint">Pickup is always free.</p></fieldset>
    <fieldset><legend>Lead time and rush</legend>
      ${num('pe-lead', 'Standard lead time (business days)', s.leadTimeBusinessDays, 'step="1" min="0"')}
      ${num('pe-rushmin', 'Shortest order accepted (business days)', s.rushMinBusinessDays, 'step="1" min="0"')}
      ${num('pe-rush', 'Rush fee (% of discounted bags)', +(s.rushSurcharge * 100).toFixed(2), 'step="0.5" min="0"')}
      <p class="hint">Orders between the shortest and the standard lead time pay the rush fee.</p>
    </fieldset>`;
}

function readForm(form) {
  const v = (sel) => Number(form.querySelector(sel).value);
  const filled = (sel) => form.querySelector(sel).value.trim() !== '';
  const s = snapshot();
  const out = {
    sizes: {}, options: {}, zones: {},
    tiers: [...form.querySelectorAll('[data-tier]')].map((row) => ({
      min: Number(row.querySelector('[data-tier-min]').value),
      discount: Number(row.querySelector('[data-tier-discount]').value) / 100,
    })),
    minQuantity: v('#pe-min'), maxQuantity: v('#pe-max'),
    includedFlavors: v('#pe-incl'), extraFlavorFee: v('#pe-extra'), maxFlavors: v('#pe-maxfl'),
    leadTimeBusinessDays: v('#pe-lead'), rushMinBusinessDays: v('#pe-rushmin'), rushSurcharge: v('#pe-rush') / 100,
  };
  for (const k of Object.keys(s.sizes)) out.sizes[k] = v(`[data-size="${k}"]`);
  for (const k of Object.keys(s.options)) out.options[k] = { perBag: v(`[data-opt-bag="${k}"]`), setup: v(`[data-opt-setup="${k}"]`) };
  for (const k of Object.keys(s.zones)) out.zones[k] = v(`[data-zone="${k}"]`);
  // An emptied box reads as 0, so flag it rather than silently pricing at $0.
  const blank = [...form.querySelectorAll('input[type=number]')].some((i) => i.value.trim() === '');
  return { settings: out, blank, filled };
}

export function initPricingEditor(onChange) {
  loadSaved();
  const dialog = document.getElementById('pricing-editor');
  const form = document.getElementById('pricing-form');
  const msg = document.getElementById('pricing-msg');
  const open = document.getElementById('pricing-editor-open');
  if (!dialog || !form || !open) return;

  const render = () => { buildForm(form); msg.textContent = ''; };
  render();

  open.addEventListener('click', () => { render(); dialog.showModal(); });
  document.getElementById('pricing-editor-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  form.addEventListener('input', () => {
    const { settings, blank } = readForm(form);
    const error = blank ? 'Fill in every field.' : validate(settings);
    msg.textContent = error;
    msg.classList.toggle('is-error', Boolean(error));
    if (error) return;
    apply(settings);
    save();
    onChange();
  });

  form.addEventListener('click', (e) => {
    if (e.target.id === 'pe-add-tier') {
      form.querySelector('#pe-tiers').insertAdjacentHTML('beforeend', tierRow({ min: CONFIG.maxQuantity, discount: 0 }, false));
      form.querySelector('#pe-tiers').lastElementChild.querySelector('[data-tier-min]').focus();
      form.dispatchEvent(new Event('input'));
    }
    const rm = e.target.closest('[data-tier-remove]');
    if (rm) { rm.closest('[data-tier]').remove(); form.dispatchEvent(new Event('input')); }
  });

  document.getElementById('pricing-reset').addEventListener('click', () => {
    apply(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* nothing saved */ }
    render();
    msg.textContent = 'Back to the original numbers.';
    msg.classList.remove('is-error');
    onChange();
  });
}
