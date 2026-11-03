import { CONFIG } from './pricing-config.js';

const DAY_MS = 86400000;

export function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== str) return null;
  return d;
}

export function businessDaysBetween(from, to) {
  let count = 0;
  for (let t = from.getTime() + DAY_MS; t <= to.getTime(); t += DAY_MS) {
    if (!CONFIG.closedWeekdays.includes(new Date(t).getUTCDay())) count++;
  }
  return count;
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const fail = (errors, needsQuote = false) => ({
  ok: false, errors, needsQuote, lines: [], subtotal: 0, discountRate: 0, total: 0, perBag: 0, rush: false,
});

export function calculateQuote(input, today) {
  const { size, quantity, flavors, options = [], fulfillment, date } = input;
  const errors = [];

  const sizeCfg = CONFIG.sizes[size];
  if (!sizeCfg) errors.push('Choose a bag size.');

  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push('Enter a whole number of bags.');
  } else if (quantity > CONFIG.maxQuantity) {
    return fail([`Orders over ${CONFIG.maxQuantity.toLocaleString()} bags are custom-quoted. Call 919-484-7677.`], true);
  } else if (quantity < CONFIG.minQuantity) {
    errors.push(`Corporate orders start at ${CONFIG.minQuantity} bags.`);
  }

  if (!Number.isInteger(flavors) || flavors < 1 || flavors > CONFIG.maxFlavors) {
    errors.push(`Choose between 1 and ${CONFIG.maxFlavors} flavors.`);
  }
  for (const o of options) {
    if (!CONFIG.options[o]) errors.push(`Unknown option: ${o}.`);
  }
  const zone = CONFIG.delivery.zones[fulfillment];
  if (fulfillment !== 'pickup' && !zone) errors.push('Choose pickup or a local business delivery zone.');

  const dateObj = parseDate(date);
  const todayObj = parseDate(today);
  let rush = false;
  if (!dateObj) {
    errors.push('Pick the date you need your order.');
  } else {
    const days = Math.round((dateObj - todayObj) / DAY_MS);
    if (days <= 0) errors.push('Pick a future date.');
    else if (days > CONFIG.maxAdvanceDays) errors.push('Pick a date within the next year.');
    else if (CONFIG.closedWeekdays.includes(dateObj.getUTCDay())) errors.push('We are closed Sundays. Pick another day.');
    else {
      const bd = businessDaysBetween(todayObj, dateObj);
      if (bd < CONFIG.rush.minBusinessDays) {
        errors.push(`We need at least ${CONFIG.rush.minBusinessDays} business days. Call us for same-week needs.`);
      } else if (bd < CONFIG.leadTimeBusinessDays) {
        rush = true;
      }
    }
  }
  if (errors.length) return fail(errors);

  const lines = [];
  const base = sizeCfg.unitPrice * quantity;
  lines.push({ label: `${quantity} × ${sizeCfg.label} @ $${sizeCfg.unitPrice.toFixed(2)}`, amount: round2(base) });

  const discountRate = CONFIG.tiers.find((t) => quantity >= t.min).discount;
  const discount = base * discountRate;
  if (discount > 0) lines.push({ label: `Volume discount (${Math.round(discountRate * 100)}%)`, amount: -round2(discount) });

  const discounted = base - discount;
  let total = discounted;

  if (rush) {
    const fee = discounted * CONFIG.rush.surcharge;
    lines.push({ label: `Rush fee (${Math.round(CONFIG.rush.surcharge * 100)}%, under ${CONFIG.leadTimeBusinessDays} business days)`, amount: round2(fee) });
    total += fee;
  }
  for (const key of options) {
    const o = CONFIG.options[key];
    const fee = o.perBag * quantity;
    lines.push({ label: `${o.label} ($${o.perBag.toFixed(2)}/bag)`, amount: round2(fee) });
    total += fee;
    if (o.setup) {
      lines.push({ label: `${o.label}: one-time setup`, amount: o.setup });
      total += o.setup;
    }
  }
  if (flavors > CONFIG.includedFlavors) {
    const fee = (flavors - CONFIG.includedFlavors) * CONFIG.extraFlavorFee;
    lines.push({ label: `${flavors - CONFIG.includedFlavors} extra flavor(s)`, amount: fee });
    total += fee;
  }
  if (zone && zone.fee) {
    lines.push({ label: `Delivery: ${zone.label}`, amount: zone.fee });
    total += zone.fee;
  }

  total = round2(total);
  return { ok: true, errors: [], needsQuote: false, lines, subtotal: round2(base), discountRate, total, perBag: round2(total / quantity), rush };
}
