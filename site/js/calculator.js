import { CONFIG } from './pricing-config.js';
import { calculateQuote } from './pricing.js';

const SHOP_EMAIL = 'themadpopper259@gmail.com';
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
  $('date').min = todayStr();
}

function readInput() {
  return {
    size: $('size').value,
    quantity: Number($('quantity').value),
    flavors: Number($('flavors').value),
    options: [...document.querySelectorAll('.option:checked')].map((c) => c.value),
    fulfillment: $('fulfillment').value,
    date: $('date').value,
  };
}

function render() {
  const input = readInput();
  const q = calculateQuote(input, todayStr());
  const box = $('result');
  if (!q.ok) {
    const quoteCta = q.needsQuote ? `<p><a class="btn" href="${SHOP_PHONE}">Call for a custom quote</a></p>` : '';
    box.innerHTML = `<h2>Your price</h2><ul class="errors">${q.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>${quoteCta}`;
    return;
  }
  const rows = q.lines.map((l) => `<tr><td>${escapeHtml(l.label)}</td><td class="num">${money(l.amount)}</td></tr>`).join('');
  const subject = encodeURIComponent('Corporate order request');
  const body = encodeURIComponent(
    `Size: ${CONFIG.sizes[input.size].label}\nBags: ${input.quantity}\nFlavors: ${input.flavors}\n` +
    `Options: ${input.options.join(', ') || 'none'}\nFulfillment: ${input.fulfillment}\nDate: ${input.date}\nEstimate: ${money(q.total)}`);
  box.innerHTML = `
    <h2>Your price</h2>
    <p class="total">${money(q.total)}</p>
    <p class="muted">about ${money(q.perBag)} per bag</p>
    <table><tbody>${rows}</tbody></table>
    <p><a class="btn" href="mailto:${SHOP_EMAIL}?subject=${subject}&amp;body=${body}">Request this order</a></p>
    <p class="muted">Prices shown are estimates; final quote confirmed by The Mad Popper.</p>`;
}

init();
$('calc').addEventListener('input', render);
$('calc').addEventListener('change', render);
render();
