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
  ok: false, errors, needsQuote, lines: [], subtotal: 0, discountRate: 0, total: 0, perBag: 0, code: null,
});

// Looks up a discount code. Returns { code, rate } for a valid code, or null.
export function findCode(raw) {
  const code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  return code && Object.hasOwn(CONFIG.discountCodes, code) ? { code, rate: CONFIG.discountCodes[code] } : null;
}

export function calculateQuote(input, today) {
  if (input === null || typeof input !== 'object') return fail(['Missing order details.']);
  const { size, quantity, flavors, fulfillment, date, code } = input;
  const errors = [];

  const sizeCfg = Object.hasOwn(CONFIG.sizes, size) ? CONFIG.sizes[size] : undefined;
  if (!sizeCfg) errors.push('Choose a bag size.');

  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push('Enter a whole number of bags.');
  } else if (quantity > CONFIG.maxQuantity) {
    return fail([`Orders over ${CONFIG.maxQuantity.toLocaleString()} bags are custom-quoted. Call 919-484-7677.`], true);
  } else if (quantity < CONFIG.minQuantity) {
    errors.push(`Hospital orders start at ${CONFIG.minQuantity} bags.`);
  }

  if (!Number.isInteger(flavors) || flavors < 1 || flavors > CONFIG.maxFlavors) {
    errors.push(`Choose 1 or ${CONFIG.maxFlavors} flavors.`);
  }
  const zone = Object.hasOwn(CONFIG.delivery.zones, fulfillment) ? CONFIG.delivery.zones[fulfillment] : undefined;
  if (fulfillment !== 'pickup' && !zone) errors.push('Choose pickup or a local delivery zone.');

  const dateObj = parseDate(date);
  const todayObj = parseDate(today);
  if (!todayObj) {
    errors.push('Internal error: invalid current date.');
  } else if (!dateObj) {
    errors.push('Pick the date you need your order.');
  } else {
    const days = Math.round((dateObj - todayObj) / DAY_MS);
    if (days <= 0) errors.push('Pick a future date.');
    else if (days > CONFIG.maxAdvanceDays) errors.push('Pick a date within the next year.');
    else if (CONFIG.closedWeekdays.includes(dateObj.getUTCDay())) errors.push('We are closed Sundays. Pick another day.');
    else {
      const bd = businessDaysBetween(todayObj, dateObj);
      if (bd < CONFIG.leadTimeBusinessDays) {
        errors.push(`We need at least ${CONFIG.leadTimeBusinessDays} business days. Call us for same-week needs.`);
      }
    }
  }
  if (errors.length) return fail(errors);

  // Every line is rounded to cents and the total is the sum of the rounded lines,
  // so the displayed breakdown always foots to the displayed total.
  const lines = [];
  const base = sizeCfg.unitPrice * quantity;
  lines.push({ label: `${quantity} × ${sizeCfg.label} @ $${sizeCfg.unitPrice.toFixed(2)}`, amount: round2(base) });

  const discountRate = CONFIG.tiers.find((t) => quantity >= t.min).discount;
  const discount = base * discountRate;
  if (discount > 0) lines.push({ label: `Volume discount (${Math.round(discountRate * 100)}%)`, amount: -round2(discount) });

  // An unknown code never blocks a price; the page tells the customer it didn't apply.
  const applied = findCode(code);
  if (applied) {
    const off = (base - discount) * applied.rate;
    lines.push({ label: `Discount code ${applied.code} (${Math.round(applied.rate * 100)}%)`, amount: -round2(off) });
  }


  const total = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  return { ok: true, errors: [], needsQuote: false, lines, subtotal: round2(base), discountRate, total, perBag: round2(total / quantity), code: applied ? applied.code : null };
}
