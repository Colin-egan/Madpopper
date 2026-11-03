import { CONFIG } from './pricing-config.js';
import { calculateQuote } from './pricing.js';

const SHOP_PHONE = 'tel:+19194847677';

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(n).toFixed(2);
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function init() {
  $('size').innerHTML = Object.entries(CONFIG.sizes)
    .map(([k, s]) => `<option value="${escapeHtml(k)}">${escapeHtml(s.label)}, $${s.unitPrice.toFixed(2)} each</option>`).join('');
  $('size').value = 'mini';
  $('options').innerHTML = Object.entries(CONFIG.options)
    .map(([k, o]) => `<label class="check"><input type="checkbox" class="option" value="${escapeHtml(k)}"> ${escapeHtml(o.label)}</label>`).join('');
  $('fulfillment').innerHTML = `<option value="pickup">${escapeHtml(CONFIG.delivery.pickup.label)}</option>` +
    Object.entries(CONFIG.delivery.zones).map(([k, z]) => `<option value="${escapeHtml(k)}">${escapeHtml(z.label)}</option>`).join('');
  $('quantity').min = CONFIG.minQuantity;
  $('quantity').max = CONFIG.maxQuantity;
  const range = $('quantity-range');
  range.min = CONFIG.minQuantity;
  range.max = CONFIG.maxQuantity;
  range.step = 5;
  range.value = $('quantity').value;
  $('quantity-hint').textContent = `${CONFIG.minQuantity} to ${CONFIG.maxQuantity.toLocaleString()} bags. Larger orders are custom-quoted.`;

  $('flavor-list').innerHTML = CONFIG.flavorGroups.map((g, gi) =>
    `<div class="flavor-group"><p class="flavor-group-title">${escapeHtml(g.label)}</p>` +
    g.flavors.map((f, fi) => `<label class="check"><input type="checkbox" class="flavor" id="fl-${gi}-${fi}" value="${escapeHtml(f)}"${CONFIG.defaultFlavors.includes(f) ? ' checked' : ''}> ${escapeHtml(f)}</label>`).join('') +
    '</div>').join('');

  $('date').min = todayStr();
  $('date-hint').textContent = `Standard lead time is ${CONFIG.leadTimeBusinessDays} business days. Sooner orders carry a rush fee.`;
}

const selectedFlavors = () => [...document.querySelectorAll('.flavor:checked')].map((c) => c.value);

function syncFlavors() {
  const names = selectedFlavors();
  const atMax = names.length >= CONFIG.maxFlavors;
  document.querySelectorAll('.flavor').forEach((c) => { c.disabled = atMax && !c.checked; });
  $('flavor-summary').textContent = names.length ? names.join(', ') : 'Choose flavors';
  const extra = Math.max(0, names.length - CONFIG.includedFlavors);
  $('flavor-hint').textContent = `${names.length} of ${CONFIG.maxFlavors} chosen. ${CONFIG.includedFlavors} included; each extra adds $${CONFIG.extraFlavorFee}` +
    (extra ? ` (${extra} extra).` : '.');
}

// Keep the bag slider and number input showing the same value.
function wireSliders() {
  const q = $('quantity'), qr = $('quantity-range');
  qr.addEventListener('input', () => { q.value = qr.value; });
  q.addEventListener('input', () => { qr.value = Math.min(Math.max(Number(q.value) || 0, qr.min), qr.max); });
}

function readInput() {
  return {
    size: $('size').value,
    quantity: Number($('quantity').value),
    flavors: selectedFlavors().length,
    options: [...document.querySelectorAll('.option:checked')].map((c) => c.value),
    fulfillment: $('fulfillment').value,
    date: $('date').value,
  };
}

function render() {
  const input = readInput();
  const q = calculateQuote(input, todayStr());
  const box = $('result');
  $('price-bar-total').textContent = q.ok ? money(q.total)
    : q.needsQuote ? 'Call for a quote' : !input.date ? 'Pick a date' : 'Check your details';
  if (!q.ok) {
    if (!input.date && q.errors.length === 1 && q.errors[0] === 'Pick the date you need your order.') {
      box.innerHTML = '<h2>Your price</h2><p class="muted">Pick the date you need your order to see your price.</p>';
      return;
    }
    const quoteCta = q.needsQuote ? `<p><a class="btn" href="${SHOP_PHONE}">Call for a custom quote</a></p>` : '';
    box.innerHTML = `<h2>Your price</h2><ul class="errors">${q.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>${quoteCta}`;
    return;
  }
  const rows = q.lines.map((l) => `<tr><td>${escapeHtml(l.label)}</td><td class="num">${money(l.amount)}</td></tr>`).join('');
  const fulfillmentLabel = input.fulfillment === 'pickup'
    ? CONFIG.delivery.pickup.label : CONFIG.delivery.zones[input.fulfillment].label;
  const optionLabels = input.options.map((k) => CONFIG.options[k].label).join(', ') || 'none';
  const subject = encodeURIComponent('Corporate order request (prototype)');
  const body = encodeURIComponent(
    'Prototype estimate (case-study pricing, hypothetical). ' +
    `Size: ${CONFIG.sizes[input.size].label}\nBags: ${input.quantity}\nFlavors (${input.flavors}): ${selectedFlavors().join(', ')}\n` +
    `Options: ${optionLabels}\nFulfillment: ${fulfillmentLabel}\nDate: ${input.date}\nEstimate: ${money(q.total)}`);
  box.innerHTML = `
    <h2>Your price</h2>
    <p class="total">${money(q.total)}</p>
    <p class="muted">about ${money(q.perBag)} per bag</p>
    <table><tbody>${rows}</tbody></table>
    <p><a class="btn" href="mailto:?subject=${subject}&amp;body=${body}">Request this order</a></p>`;
}

init();
wireSliders();
syncFlavors();
$('calc').addEventListener('input', () => { syncFlavors(); render(); });
$('calc').addEventListener('change', () => { syncFlavors(); render(); });
document.addEventListener('click', (e) => {
  const dd = $('flavor-dd');
  if (dd.open && !dd.contains(e.target)) dd.open = false;
});
render();
