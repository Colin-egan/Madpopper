# Mad Popper Site Clone + Corporate Orders Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild themadpopper.com as a static site and add a Corporate Orders page whose calculator takes bag quantity, bag size, customization options and desired date, and returns an instant price.

**Architecture:** A dependency-free static site (HTML/CSS/vanilla ES modules) in `site/`. All pricing rules live in one pure, unit-tested module (`site/js/pricing.js`) with no DOM access; a thin UI module (`site/js/calculator.js`) reads the form, calls `calculateQuote`, and renders the result. Shared header/footer are injected by a tiny `layout.js` so the 10 pages stay DRY.

**Tech Stack:** HTML5, CSS3, vanilla JS (ES modules), Node 20+ built-in `node:test` for unit tests, `npx serve` for local preview. No build step, no npm dependencies.

## Global Constraints

- Context: this is a prototype for the BUSI 554H "Mad Popper" case (final presentation 2026-11-12). It is a demo, not the client's production site; do not deploy to themadpopper.com.
- Business-site rules from the case: pickup or single local business delivery only; **no shipping** (heat), no individual-home delivery.
- Retail price ladder (published, copy exactly): Mini <1 cup $1.25; Cone/treat 1–2 cups $3.00; Snack 4 cups $5.95; Mine 6 cups $8.50; Ours 14 cups $15.00; Family 22 cups $21.50; Party 35 cups $31.50; Big ol' popper 74 cups $58.00.
- Store facts: Homestead Market, 105 W. NC-54, Suite 259, Durham NC; phone 919-484-7677; Mon–Fri 11–6, Sat 11–5, closed Sunday; 100% nut-free, non-GMO corn.
- Nav items (match live site): Flavors, Sizes, Allergens, Fundraisers, Popcorn Day, Gallery, About Us, FAQ, plus new **Corporate**.
- Logo: `https://themadpopper.com/wp-content/uploads/2018/02/Logo-white.png` (white logo, so header is a dark background).
- Corporate pricing numbers (volume tiers, custom fees, rush, delivery, minimum) are **assumptions, not client data** (the case says no corporate price list exists). They live only in `site/js/pricing-config.js` so they can be changed in one place and are labelled as assumptions on the page.
- Dates are `YYYY-MM-DD` strings handled in UTC to avoid timezone bugs. No external libraries.

## File Structure

```
site/
  index.html, flavors.html, sizes.html, allergens.html, fundraisers.html,
  popcorn-day.html, gallery.html, about.html, faq.html, corporate.html
  css/styles.css            # shared styles
  js/layout.js              # injects header/footer into every page
  js/pricing-config.js      # ALL numbers/rules (data only)
  js/pricing.js             # pure calculateQuote() + date helpers
  js/calculator.js          # DOM wiring for corporate.html
  assets/                   # downloaded images
tests/
  pricing.test.js           # node:test unit tests
package.json                # "test", "start" scripts
README.md
```

---

### Task 1: Project scaffold and pricing config

**Files:**
- Create: `package.json`, `.gitignore`, `site/js/pricing-config.js`

**Interfaces:**
- Produces: `export const CONFIG` with keys `sizes`, `tiers`, `minQuantity`, `maxQuantity`, `options`, `extraFlavorFee`, `includedFlavors`, `maxFlavors`, `delivery`, `rush`, `leadTimeBusinessDays`, `maxAdvanceDays`, `closedWeekdays`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "madpopper-corporate",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "start": "npx serve site -l 3000"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.DS_Store
```

- [ ] **Step 3: Create `site/js/pricing-config.js`**

```js
// ASSUMPTIONS: corporate numbers below are placeholders for the case study.
// Retail unit prices are the published prices on themadpopper.com.
export const CONFIG = {
  sizes: {
    mini:   { label: 'Mini bag (<1 cup)',        unitPrice: 1.25 },
    cone:   { label: 'Cone / treat bag (1–2 cups)', unitPrice: 3.0 },
    snack:  { label: 'Snack bag (4 cups)',       unitPrice: 5.95 },
    mine:   { label: '"Mine" (6 cups)',          unitPrice: 8.5 },
    ours:   { label: '"Ours" (14 cups)',         unitPrice: 15.0 },
    family: { label: '"Family" (22 cups)',       unitPrice: 21.5 },
    party:  { label: '"Party" (35 cups)',        unitPrice: 31.5 },
    big:    { label: '"Big ol\' popper" (74 cups)', unitPrice: 58.0 },
  },
  // Volume discount on the bag subtotal. First tier whose `min` <= quantity (checked high to low).
  tiers: [
    { min: 1000, discount: 0.25 },
    { min: 300,  discount: 0.20 },
    { min: 100,  discount: 0.15 },
    { min: 25,   discount: 0.10 },
    { min: 1,    discount: 0 },
  ],
  minQuantity: 25,
  maxQuantity: 2000, // above this, show "request a custom quote"
  options: {
    brandedLabel: { label: 'Custom-branded label (your logo)', perBag: 0.30, setup: 75 },
    giftTag:      { label: 'Personalized thank-you tag',       perBag: 0.20, setup: 0 },
    sealedPack:   { label: 'Individually sealed (5-week shelf life packaging)', perBag: 0.15, setup: 0 },
  },
  includedFlavors: 2,
  extraFlavorFee: 25, // per flavor beyond included
  maxFlavors: 6,
  delivery: {
    pickup: { label: 'Pickup at the shop', fee: 0 },
    zones: {
      durham: { label: 'Durham / Chapel Hill / RTP (business address)', fee: 35 },
      wake:   { label: 'Raleigh / Cary / Morrisville (business address)', fee: 55 },
    },
  },
  leadTimeBusinessDays: 5, // standard
  rush: { minBusinessDays: 2, surcharge: 0.25 }, // 2-4 business days: +25% of bag subtotal
  maxAdvanceDays: 365,
  closedWeekdays: [0], // Sunday (0). No orders ready on closed days.
};
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore site/js/pricing-config.js
git commit -m "chore: scaffold project and corporate pricing config"
```

---

### Task 2: Date helpers (TDD)

**Files:**
- Create: `site/js/pricing.js` (date helpers only in this task), `tests/pricing.test.js`

**Interfaces:**
- Produces from `pricing.js`:
  - `parseDate(str: 'YYYY-MM-DD'): Date | null` (UTC midnight, null if invalid)
  - `businessDaysBetween(from: Date, to: Date): number` — count of Mon–Sat days in `(from, to]`; Sunday excluded (matches `closedWeekdays`)

- [ ] **Step 1: Write the failing tests** in `tests/pricing.test.js`

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, businessDaysBetween } from '../site/js/pricing.js';

test('parseDate accepts valid and rejects invalid dates', () => {
  assert.equal(parseDate('2027-06-15').toISOString(), '2027-06-15T00:00:00.000Z');
  assert.equal(parseDate('2027-02-30'), null);
  assert.equal(parseDate('nope'), null);
  assert.equal(parseDate(''), null);
});

test('businessDaysBetween skips Sundays and excludes the start day', () => {
  // Mon 2027-06-14 -> Mon 2027-06-21: Tue,Wed,Thu,Fri,Sat,(Sun skipped),Mon = 6
  assert.equal(businessDaysBetween(parseDate('2027-06-14'), parseDate('2027-06-21')), 6);
  assert.equal(businessDaysBetween(parseDate('2027-06-14'), parseDate('2027-06-14')), 0);
});
```

- [ ] **Step 2: Run** `npm test` — Expected: FAIL (cannot find `pricing.js` exports).

- [ ] **Step 3: Implement** in `site/js/pricing.js`

```js
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
```

- [ ] **Step 4: Run** `npm test` — Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add site/js/pricing.js tests/pricing.test.js
git commit -m "feat: date helpers for lead-time calculation"
```

---

### Task 3: `calculateQuote` (TDD)

**Files:**
- Modify: `site/js/pricing.js` (append), `tests/pricing.test.js` (append)

**Interfaces:**
- Consumes: `CONFIG`, `parseDate`, `businessDaysBetween`.
- Produces: `calculateQuote(input, today)` where
  - `input = { size: string, quantity: number, flavors: number, options: string[], fulfillment: 'pickup' | string /* zone key */, date: 'YYYY-MM-DD' }`
  - `today: 'YYYY-MM-DD'` (injected for testability; UI passes the current date)
  - returns `{ ok: boolean, errors: string[], needsQuote: boolean, lines: {label: string, amount: number}[], subtotal: number, discountRate: number, total: number, perBag: number, rush: boolean }`; money rounded to cents via `round2`.
  - When `ok` is false, `lines` is `[]` and `total` is `0`.

Formula: `base = unitPrice × qty`; `discount = base × tier`; `rush = (base − discount) × 0.25` if 2–4 business days; per-bag option fees are added **after** discount (no discount on add-ons); setup fees one-time; extra flavors `(flavors − 2) × 25`; delivery flat fee. `perBag = total / qty`.

- [ ] **Step 1: Write the failing tests** (append)

```js
import { calculateQuote } from '../site/js/pricing.js';

const TODAY = '2027-06-14'; // Monday
const base = { size: 'mini', quantity: 100, flavors: 2, options: [], fulfillment: 'pickup', date: '2027-06-25' };

test('100 minis, pickup, standard lead time: 15% volume discount', () => {
  const q = calculateQuote(base, TODAY);
  assert.equal(q.ok, true);
  assert.equal(q.discountRate, 0.15);
  assert.equal(q.total, 106.25); // 125 - 18.75
  assert.equal(q.perBag, 1.06); // 106.25/100 rounded to cents
});

test('add-ons are not discounted; setup is one-time', () => {
  const q = calculateQuote({ ...base, options: ['brandedLabel', 'giftTag'] }, TODAY);
  // 106.25 + 100*0.30 + 75 + 100*0.20 = 231.25
  assert.equal(q.total, 231.25);
});

test('extra flavors beyond 2 cost $25 each', () => {
  assert.equal(calculateQuote({ ...base, flavors: 4 }, TODAY).total, 156.25);
});

test('delivery zones add a flat fee', () => {
  assert.equal(calculateQuote({ ...base, fulfillment: 'durham' }, TODAY).total, 141.25);
  assert.equal(calculateQuote({ ...base, fulfillment: 'wake' }, TODAY).total, 161.25);
});

test('rush (3 business days out) adds 25% of discounted bag subtotal', () => {
  // 2027-06-17 is 3 business days after Mon 06-14
  const q = calculateQuote({ ...base, date: '2027-06-17' }, TODAY);
  assert.equal(q.rush, true);
  assert.equal(q.total, 132.81); // 106.25 + 26.5625 -> 132.8125 -> 132.81
});

test('rejects too-soon dates, Sundays, past dates, and far-future dates', () => {
  assert.equal(calculateQuote({ ...base, date: '2027-06-15' }, TODAY).ok, false); // 1 business day
  assert.equal(calculateQuote({ ...base, date: '2027-06-27' }, TODAY).ok, false); // Sunday
  assert.equal(calculateQuote({ ...base, date: '2027-06-01' }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, date: '2029-01-01' }, TODAY).ok, false);
});

test('validates quantity, size, flavors, options, fulfillment', () => {
  assert.equal(calculateQuote({ ...base, quantity: 10 }, TODAY).ok, false);      // below minimum
  assert.equal(calculateQuote({ ...base, quantity: 12.5 }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, size: 'huge' }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, flavors: 0 }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, flavors: 7 }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, options: ['glitter'] }, TODAY).ok, false);
  assert.equal(calculateQuote({ ...base, fulfillment: 'ship' }, TODAY).ok, false); // no shipping
});

test('above max quantity returns needsQuote instead of a price', () => {
  const q = calculateQuote({ ...base, quantity: 2500 }, TODAY);
  assert.equal(q.ok, false);
  assert.equal(q.needsQuote, true);
});

test('WakeMed-scale: 6000 minis is a custom-quote order', () => {
  assert.equal(calculateQuote({ ...base, quantity: 6000 }, TODAY).needsQuote, true);
});

test('1000 minis hits the 25% tier', () => {
  const q = calculateQuote({ ...base, quantity: 1000, date: '2027-07-20' }, TODAY);
  assert.equal(q.discountRate, 0.25);
  assert.equal(q.total, 937.5);
});
```

- [ ] **Step 2: Run** `npm test` — Expected: FAIL (`calculateQuote` not exported).

- [ ] **Step 3: Implement** (append to `site/js/pricing.js`)

```js
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
```

- [ ] **Step 4: Run** `npm test` — Expected: all tests PASS. If the rush test shows 132.82 or 132.81 mismatches, fix the *test expectation only after* checking the arithmetic: 106.25 × 1.25 = 132.8125 → 132.81.

- [ ] **Step 5: Commit**

```bash
git add site/js/pricing.js tests/pricing.test.js
git commit -m "feat: calculateQuote with tiers, add-ons, rush, delivery, validation"
```

---

### Task 4: Shared styles and layout (header/footer)

**Files:**
- Create: `site/css/styles.css`, `site/js/layout.js`

**Interfaces:**
- Produces: `layout.js` (loaded as `<script type="module" src="js/layout.js">`) replaces `<div id="site-header"></div>` and `<div id="site-footer"></div>`, and marks the nav link whose `href` matches the current page with `aria-current="page"`.
- CSS custom properties: `--bg-dark`, `--accent`, `--cream`, `--text`; classes `.container`, `.btn`, `.card`, `.page-hero`.

- [ ] **Step 1: Create `site/js/layout.js`**

```js
const NAV = [
  ['flavors.html', 'Flavors'], ['sizes.html', 'Sizes'], ['allergens.html', 'Allergens'],
  ['fundraisers.html', 'Fundraisers'], ['popcorn-day.html', 'Popcorn Day'], ['gallery.html', 'Gallery'],
  ['about.html', 'About Us'], ['faq.html', 'FAQ'], ['corporate.html', 'Corporate'],
];
const page = location.pathname.split('/').pop() || 'index.html';

const header = `
<header class="site-header"><div class="container header-inner">
  <a href="index.html" class="logo"><img src="https://themadpopper.com/wp-content/uploads/2018/02/Logo-white.png" alt="The Mad Popper"></a>
  <button class="nav-toggle" aria-label="Menu" aria-expanded="false">☰</button>
  <nav class="nav">${NAV.map(([href, label]) =>
    `<a href="${href}"${href === page ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
</div></header>`;

const footer = `
<footer class="site-footer"><div class="container footer-grid">
  <div><h3>The Mad Popper</h3><p>Durham's Local Gourmet Popcorn Shop</p><p>100% nut-free · non-GMO corn</p></div>
  <div><h3>Visit</h3><p>Homestead Market<br>105 W. NC-54, Suite 259<br>Durham, NC</p><p>919-484-7677</p></div>
  <div><h3>Hours</h3><p>Mon–Fri 11am–6pm<br>Sat 11am–5pm<br>Closed Sunday</p></div>
</div>
<p class="container fineprint">Prototype built for a university case study. Not the official Mad Popper website.</p>
</footer>`;

document.getElementById('site-header').outerHTML = header;
document.getElementById('site-footer').outerHTML = footer;
document.querySelector('.nav-toggle').addEventListener('click', (e) => {
  const open = document.querySelector('.nav').classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', String(open));
});
```

- [ ] **Step 2: Create `site/css/styles.css`** (mobile-first; header is dark because the logo is white)

```css
:root { --bg-dark:#1f1a17; --accent:#e8412c; --cream:#fff8ec; --text:#2b2522; --muted:#6f655f; --radius:12px; }
*{box-sizing:border-box} body{margin:0;font:16px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:var(--text);background:var(--cream)}
img{max-width:100%;height:auto} a{color:var(--accent)}
.container{width:min(1100px,100% - 32px);margin-inline:auto}
.site-header{background:var(--bg-dark);position:sticky;top:0;z-index:10}
.header-inner{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 0}
.logo img{height:48px;display:block}
.nav-toggle{background:none;border:0;color:#fff;font-size:1.6rem;cursor:pointer}
.nav{display:none;width:100%;flex-direction:column}
.nav.open{display:flex}
.nav a{color:#fff;text-decoration:none;padding:10px 4px}
.nav a[aria-current="page"]{color:var(--accent);font-weight:700}
@media(min-width:900px){.nav-toggle{display:none}.nav{display:flex;flex-direction:row;width:auto;gap:18px}}
.page-hero{background:var(--bg-dark);color:#fff;padding:48px 0}
.page-hero h1{margin:0 0 8px;font-size:clamp(1.8rem,5vw,2.8rem)}
.btn{display:inline-block;background:var(--accent);color:#fff;border:0;border-radius:999px;padding:12px 24px;font-weight:700;text-decoration:none;cursor:pointer}
.card{background:#fff;border-radius:var(--radius);padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
main{padding:32px 0 64px}
.site-footer{background:var(--bg-dark);color:#ddd;padding:32px 0 16px}
.footer-grid{display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.site-footer h3{color:#fff;margin-top:0}.fineprint{font-size:.8rem;color:#999}
table{border-collapse:collapse;width:100%} th,td{padding:8px 10px;border-bottom:1px solid #eadfd0;text-align:left}
```

- [ ] **Step 3: Commit**

```bash
git add site/css/styles.css site/js/layout.js
git commit -m "feat: shared styles and header/footer layout"
```

---

### Task 5: Clone the existing pages

**Files:**
- Create: `site/index.html`, `flavors.html`, `sizes.html`, `allergens.html`, `fundraisers.html`, `popcorn-day.html`, `gallery.html`, `about.html`, `faq.html` (all under `site/`)

**Interfaces:**
- Consumes: `layout.js`, `styles.css`.
- Produces: nine pages sharing the page template below; `sizes.html` links to `corporate.html`.

- [ ] **Step 1: Gather real content.** For each of `/`, `/flavors`, `/sizes`, `/allergens`, `/fundraisers`, `/popcorn-day`, `/gallery`, `/about-us`, `/faq` on themadpopper.com, run WebFetch with the prompt "Return all visible text, headings, image URLs and prices verbatim." Save notes in the scratchpad, not the repo.

- [ ] **Step 2: Create each page from this template** (change `<title>`, hero text and `<main>` content; `index.html` hero: "Durham's Local Gourmet Popcorn Shop" with CTAs "Order online" → `https://themadpopper.square.site` and "Corporate orders" → `corporate.html`):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sizes | The Mad Popper</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <div id="site-header"></div>
  <section class="page-hero"><div class="container"><h1>Sizes</h1><p>Popped fresh in-shop every day.</p></div></section>
  <main class="container">
    <!-- page content copied from the live site -->
  </main>
  <div id="site-footer"></div>
  <script type="module" src="js/layout.js"></script>
</body>
</html>
```

- [ ] **Step 3: `sizes.html` must contain the exact price table** from Global Constraints plus tins (Snack tin 11 cups $16.95; All-occasion tin 2 gal $38.00; Party tin 3.5 gal $60.00). Add a callout: "Ordering for your team? → Corporate orders".

- [ ] **Step 4: Images.** Prefer hotlinking the live site's image URLs found in step 1. Do not commit downloaded copies unless the client permits it (this is a case-study prototype).

- [ ] **Step 5: Preview and check.** Run `npm start`, open each page at http://localhost:3000/<page>.html. Expected: header shows logo and nav, current page highlighted, footer present, no console errors, readable at 375px width.

- [ ] **Step 6: Commit**

```bash
git add site/*.html
git commit -m "feat: clone existing site pages"
```

---

### Task 6: Corporate orders page and calculator UI

**Files:**
- Create: `site/corporate.html`, `site/js/calculator.js`
- Modify: `site/css/styles.css` (append calculator styles)

**Interfaces:**
- Consumes: `calculateQuote(input, today)` and `CONFIG` (sizes, options, delivery zones, limits).
- Produces: a form with these ids: `size` (select), `quantity` (number), `flavors` (number), `fulfillment` (select), `date` (date), checkbox group `.option` (value = option key), results container `#result`.

- [ ] **Step 1: Create `site/corporate.html`** using the Task 5 template. Hero: "Corporate Orders: popcorn for your whole team." `<main>` layout: a two-column `.calc` grid (form left, sticky result card right) plus a "How it works" list: 1) pick size, quantity, date 2) see your price instantly 3) we pop it fresh and you pick up or we deliver to your business. Include notes: pickup or local business delivery only, **no shipping**; 100% nut-free. Form markup (the selects/checkboxes are filled by JS from `CONFIG` so prices never drift):

```html
<form id="calc" class="card" novalidate>
  <label>Bag size <select id="size"></select></label>
  <label>Number of bags <input id="quantity" type="number" min="1" step="1" value="100"></label>
  <label>Number of flavors <input id="flavors" type="number" min="1" max="6" step="1" value="2"></label>
  <fieldset><legend>Customization</legend><div id="options"></div></fieldset>
  <label>Pickup or delivery <select id="fulfillment"></select></label>
  <label>Date needed <input id="date" type="date"></label>
</form>
<aside id="result" class="card result" aria-live="polite"></aside>
```

Add a visible footnote under the result: "Prices shown are estimates; final quote confirmed by The Mad Popper." and a "Request this order" button linking to `mailto:` with the summary (Step 3).

- [ ] **Step 2: Create `site/js/calculator.js`**

```js
import { CONFIG } from './pricing-config.js';
import { calculateQuote } from './pricing.js';

const $ = (id) => document.getElementById(id);
const money = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(n).toFixed(2);
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function init() {
  $('size').innerHTML = Object.entries(CONFIG.sizes)
    .map(([k, s]) => `<option value="${k}">${s.label}, $${s.unitPrice.toFixed(2)} each</option>`).join('');
  $('size').value = 'mini';
  $('options').innerHTML = Object.entries(CONFIG.options)
    .map(([k, o]) => `<label class="check"><input type="checkbox" class="option" value="${k}"> ${o.label}</label>`).join('');
  $('fulfillment').innerHTML = `<option value="pickup">${CONFIG.delivery.pickup.label}</option>` +
    Object.entries(CONFIG.delivery.zones).map(([k, z]) => `<option value="${k}">${z.label}</option>`).join('');
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
    const quoteCta = q.needsQuote ? '<p><a class="btn" href="tel:+19194847677">Call for a custom quote</a></p>' : '';
    box.innerHTML = `<h2>Your price</h2><ul class="errors">${q.errors.map((e) => `<li>${e}</li>`).join('')}</ul>${quoteCta}`;
    return;
  }
  const rows = q.lines.map((l) => `<tr><td>${l.label}</td><td class="num">${money(l.amount)}</td></tr>`).join('');
  const subject = encodeURIComponent('Corporate order request');
  const body = encodeURIComponent(
    `Size: ${CONFIG.sizes[input.size].label}\nBags: ${input.quantity}\nFlavors: ${input.flavors}\n` +
    `Options: ${input.options.join(', ') || 'none'}\nFulfillment: ${input.fulfillment}\nDate: ${input.date}\nEstimate: ${money(q.total)}`);
  box.innerHTML = `
    <h2>Your price</h2>
    <p class="total">${money(q.total)}</p>
    <p class="muted">about ${money(q.perBag)} per bag</p>
    <table><tbody>${rows}</tbody></table>
    <p><a class="btn" href="mailto:?subject=${subject}&body=${body}">Request this order</a></p>
    <p class="muted">Estimate only. Final quote confirmed by The Mad Popper.</p>`;
}

init();
$('calc').addEventListener('input', render);
$('calc').addEventListener('change', render);
render();
```

(Fill the `mailto:` recipient with the shop's email once confirmed; the live site footer lists it.)

- [ ] **Step 3: Append calculator CSS** to `styles.css`

```css
.calc{display:grid;gap:24px}
@media(min-width:900px){.calc{grid-template-columns:1.2fr 1fr;align-items:start}.result{position:sticky;top:90px}}
#calc label{display:block;margin-bottom:14px;font-weight:600}
#calc input[type=number],#calc input[type=date],#calc select{display:block;width:100%;margin-top:4px;padding:10px;border:1px solid #d8cbb8;border-radius:8px;font:inherit}
#calc fieldset{border:1px solid #eadfd0;border-radius:8px;margin:0 0 14px}
.check{font-weight:400!important}.check input{margin-right:8px}
.total{font-size:2.4rem;font-weight:800;margin:0}.muted{color:var(--muted);font-size:.9rem}
.num{text-align:right;white-space:nowrap}.errors{color:#b3261e;padding-left:18px}
```

- [ ] **Step 4: Manual verification.** `npm start`, open /corporate.html and check:
  - Defaults (100 mini, 2 flavors, pickup, no date) show "Pick the date you need your order."
  - Pick a date ≥ 8 days out: total `$106.25`, per bag `$1.06`.
  - Tick "Custom-branded label": total increases by `$105.00` (100 × 0.30 + 75 setup).
  - Quantity 10: error "Corporate orders start at 25 bags."; quantity 2500: "Call for a custom quote" button.
  - Choose a Sunday: "We are closed Sundays."
  - 375px width: form stacks above result, no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add site/corporate.html site/js/calculator.js site/css/styles.css
git commit -m "feat: corporate orders page with live pricing calculator"
```

---

### Task 7: README and final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`** covering: purpose (case prototype, not official), `npm test`, `npm start`, and a section "Pricing assumptions" listing the tiers/fees/lead times with a pointer to `site/js/pricing-config.js` as the single place to edit them.

- [ ] **Step 2: Run full verification**

Run: `npm test`
Expected: all tests pass, 0 failures.

Run: `npm start`, click through all 10 pages from the nav.
Expected: no 404s, no console errors, Corporate link highlighted on corporate.html.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README with pricing assumptions"
```

---

## Self-Review

- **Spec coverage:** duplicate site → Tasks 4–5; corporate page → Task 6; calculator inputs: bag count (`quantity`), bag size (`size`), customization (`options`, `flavors`, delivery), date (`date`, lead time/rush/Sunday rules) → Tasks 3 and 6; returns a price → `#result`. Case constraints (no shipping, business-only drops, minimums, lead times, published retail ladder) → Global Constraints, Task 3 validation.
- **Placeholders:** none; the only open item is the shop email for `mailto:`, flagged in Task 6.
- **Type consistency:** `calculateQuote`, `parseDate`, `businessDaysBetween`, `CONFIG` keys (`sizes`, `tiers`, `options`, `delivery.zones`, `rush`, `closedWeekdays`) match across Tasks 1–6.
