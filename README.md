# Mad Popper — Corporate Orders Calculator (Case Study)

A static HTML clone of [themadpopper.com](https://www.themadpopper.com) with a **corporate orders calculator** that prices a bulk order live in the browser.

**Case study, not the official site.** This is a university prototype. It is not affiliated with or endorsed by The Mad Popper. Only the retail bag price ladder is real data copied from the shop's site. Everything corporate (volume discounts, add-on fees, rush surcharge, delivery fees, lead times, limits) is a hypothetical case-study assumption defined in `site/js/pricing-config.js`. The calculator's quotes are not The Mad Popper's price list.

## Quick start

There are no dependencies and nothing to install. Node 22 is recommended (the test glob `tests/**/*.test.js` needs Node 21+ to expand).

```bash
npm test     # runs tests/pricing.test.js with node:test
npm start    # serves site/ at http://localhost:3000 (via npx serve)
```

Open `http://localhost:3000/corporate` for the calculator.

## Project layout

```
site/                         # deployable root (Vercel root directory)
├── index.html, about.html, sizes.html, flavors.html, gallery.html,
│   faq.html, allergens.html, popcorn-day.html, fundraisers.html,
│   corporate.html            # ten pages; corporate.html hosts the calculator
├── css/styles.css            # all styles
├── js/
│   ├── layout.js             # shared header/footer and nav highlighting
│   ├── pricing-config.js     # SINGLE SOURCE of every price and rule
│   ├── pricing.js            # pure logic: calculateQuote, parseDate, businessDaysBetween
│   └── calculator.js         # DOM wiring for corporate.html
└── vercel.json               # cleanUrls, no trailing slash
tests/pricing.test.js         # node:test suite for pricing.js
docs/superpowers/plans/       # implementation plan
```

`calculateQuote(input, today)` lives in `site/js/pricing.js`. It validates the input and returns line items, `subtotal`, `discountRate`, `total`, `perBag` and a `rush` flag. Each line is rounded to cents and the total is the sum of the rounded lines, so the breakdown always foots to the total.

## Pricing assumptions

Edit all pricing in `site/js/pricing-config.js`. Values below match that file.

**Bag sizes (retail ladder, the only real data):**

| Size | Unit price |
|---|---|
| Mini bag (<1 cup) | $1.25 |
| Cone / treat bag (1–2 cups) | $3.00 |
| Snack bag (4 cups) | $5.95 |
| "Mine" (6 cups) | $8.50 |
| "Ours" (14 cups) | $15.00 |
| "Family" (22 cups) | $21.50 |
| "Party" (35 cups) | $31.50 |
| "Big ol' popper" (74 cups) | $58.00 |

**Volume discount** (case-study assumption, applied to the bag subtotal; the highest matching tier wins):

| Bags | Discount |
|---|---|
| 1000+ | 25% |
| 300–999 | 20% |
| 100–299 | 15% |
| 25–99 | 10% |
| 1–24 | 0% |

The 1–24 tier never applies, because the minimum order is 25 bags.

**Limits:** minimum 25 bags; maximum 2000 bags (above that the calculator offers a custom quote by phone).

**Options** (not discounted; charged per bag plus a one-time setup):

| Option | Per bag | Setup |
|---|---|---|
| Custom-branded label (your logo) | $0.30 | $75.00 |

**Flavors:** 2 included, $25 for each additional flavor, up to 6 total.

**Fulfillment:** pickup at the shop $0.00; Durham / Chapel Hill / RTP business address $35.00; Raleigh / Cary / Morrisville business address $55.00. No shipping.

**Lead time and rush:**
- Standard lead time is 5 business days (Sundays are closed and do not count).
- Rush is 2–4 business days and adds 25% of the *discounted* bag subtotal (not of add-ons, flavors or delivery).
- Under 2 business days, the calculator asks the customer to call.
- Orders can be placed up to 365 days ahead; Sunday pickup dates are rejected.

## Deploy

The site is static, with no build step. On Vercel, import the repository and set the **Root Directory** to `site/`. Leave the build command and output directory empty. `site/vercel.json` enables clean URLs (`/corporate`) and disables trailing slashes. All pages carry `noindex`, since this is a prototype.

## Editing prices on the live site

The corporate page has an **Edit pricing** button (bottom left). Changes preview instantly for the person editing. **Publish to public site** saves them for every visitor, and needs the edit password.

- Settings are stored in a Vercel Blob store (`madpopper-pricing`) and served by `site/api/pricing.js`. The server re-checks every number with `site/js/pricing-settings.js`, so a bad value can't be published.
- The edit password is the `PRICING_EDIT_PASSWORD` environment variable in the Vercel project. Change it with `vercel env rm PRICING_EDIT_PASSWORD` and `vercel env add PRICING_EDIT_PASSWORD production`, then redeploy.
- Published settings override the defaults in `site/js/pricing-config.js`. A new publish can take a few seconds to reach other visitors.
