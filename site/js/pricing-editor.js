import { CONFIG } from './pricing-config.js';
import { snapshot, apply, validate, merge, DEFAULTS } from './pricing-settings.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const API = '/api/pricing';
const PASSWORD_KEY = 'madpopper-edit-password';

// Loads the settings the owner published (if any) so every visitor sees the same prices.
export async function loadPublishedSettings() {
  try {
    const res = await fetch(API, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const { settings } = await res.json();
    if (!settings) return null;
    const merged = merge(settings);
    if (validate(merged)) return null;
    apply(merged);
    return merged;
  } catch { return null; /* offline or no API: the original numbers still work */ }
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
  const zones = Object.entries(CONFIG.delivery.zones).map(([k, z]) =>
    num(`pe-zone-${k}`, `Delivery: ${z.label} ($)`, z.fee, 'step="1" min="0" data-zone="' + k + '"')).join('');
  const tiers = s.tiers.slice().sort((a, b) => b.min - a.min).map((t) => tierRow(t, t.min <= 1)).join('');
  form.innerHTML = `
    <fieldset><legend>Order size</legend>
      ${num('pe-min', 'Minimum order (bags)', s.minQuantity, 'step="1" min="1"')}
      ${num('pe-max', 'Max order before custom pricing (bags)', s.maxQuantity, 'step="1" min="1"')}
      <p class="hint">Orders above the max show "Call for a custom quote" instead of a price.</p>
    </fieldset>
    <fieldset><legend>Bag price (each)</legend>${sizes}</fieldset>
    <fieldset><legend>Volume discounts</legend>
      <div id="pe-tiers">${tiers}</div>
      <button type="button" class="pe-add" id="pe-add-tier">+ Add a tier</button>
      <p class="hint">Applies to the bag subtotal. The highest tier the order reaches is used.</p>
    </fieldset>
    <fieldset><legend>Flavors</legend>
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
    sizes: {}, zones: {},
    tiers: [...form.querySelectorAll('[data-tier]')].map((row) => ({
      min: Number(row.querySelector('[data-tier-min]').value),
      discount: Number(row.querySelector('[data-tier-discount]').value) / 100,
    })),
    minQuantity: v('#pe-min'), maxQuantity: v('#pe-max'),
    maxFlavors: v('#pe-maxfl'),
    leadTimeBusinessDays: v('#pe-lead'), rushMinBusinessDays: v('#pe-rushmin'), rushSurcharge: v('#pe-rush') / 100,
  };
  for (const k of Object.keys(s.sizes)) out.sizes[k] = v(`[data-size="${k}"]`);
  for (const k of Object.keys(s.zones)) out.zones[k] = v(`[data-zone="${k}"]`);
  // An emptied box reads as 0, so flag it rather than silently pricing at $0.
  const blank = [...form.querySelectorAll('input[type=number]')].some((i) => i.value.trim() === '');
  return { settings: out, blank, filled };
}

export function initPricingEditor(onChange, published) {
  const dialog = document.getElementById('pricing-editor');
  const form = document.getElementById('pricing-form');
  const msg = document.getElementById('pricing-msg');
  const open = document.getElementById('pricing-editor-open');
  const pw = document.getElementById('pricing-password');
  const publishBtn = document.getElementById('pricing-publish');
  if (!dialog || !form || !open) return;

  let publishedSettings = published || DEFAULTS;
  const say = (text, isError = false) => { msg.textContent = text; msg.classList.toggle('is-error', isError); };
  const render = () => { buildForm(form); say(''); };
  render();
  try { pw.value = sessionStorage.getItem(PASSWORD_KEY) || ''; } catch { /* private mode */ }

  open.addEventListener('click', () => { render(); dialog.showModal(); });
  document.getElementById('pricing-editor-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  form.addEventListener('input', () => {
    const { settings, blank } = readForm(form);
    const error = blank ? 'Fill in every field.' : validate(settings);
    if (error) { say(error, true); return; }
    apply(settings);
    say('Previewing your changes. Only you see them until you publish.');
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

  // Throw away unpublished edits and go back to what the public site is showing.
  document.getElementById('pricing-reset').addEventListener('click', () => {
    apply(publishedSettings);
    render();
    say('Back to the published numbers.');
    onChange();
  });

  publishBtn.addEventListener('click', async () => {
    const { settings, blank } = readForm(form);
    const error = blank ? 'Fill in every field.' : validate(settings);
    if (error) { say(error, true); return; }
    if (!pw.value) { say('Enter the edit password to publish.', true); pw.focus(); return; }
    publishBtn.disabled = true;
    say('Publishing...');
    try {
      const res = await fetch(API, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-edit-password': pw.value },
        body: JSON.stringify({ settings }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { say(body.error || 'Could not publish. Try again.', true); return; }
      publishedSettings = merge(body.settings);
      try { sessionStorage.setItem(PASSWORD_KEY, pw.value); } catch { /* private mode */ }
      say('Published. Everyone who opens this page now sees these prices.');
    } catch {
      say('Could not reach the server. Check your connection and try again.', true);
    } finally {
      publishBtn.disabled = false;
    }
  });
}
