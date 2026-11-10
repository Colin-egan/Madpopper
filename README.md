# Mad Popper — Hospital Orders Calculator (Case Study)

A static HTML clone of [themadpopper.com](https://www.themadpopper.com) with a **hospital orders page**: pick UNC Health, Duke Health or WakeMed to preview its branded bag, then price a bulk order live in the browser.

**Case study, not the official site.** This is a university prototype. It is not affiliated with or endorsed by The Mad Popper. Everything in the hospital pricing (the $2 mini bag price, volume discounts, lead time, limits) is a hypothetical case-study assumption defined in `site/js/pricing-config.js`. The calculator's quotes are not The Mad Popper's price list.

## Quick start

There are no dependencies and nothing to install. Node 22 is recommended (the test glob `tests/**/*.test.js` needs Node 21+ to expand).

```bash
npm test     # runs tests/pricing.test.js with node:test
npm start    # serves site/ at http://localhost:3000 (via npx serve)
```

Open `http://localhost:3000/hospitals` for the calculator.

## Project layout

```
site/                         # deployable root (Vercel root directory)
├── index.html, about.html, sizes.html, flavors.html, gallery.html,
│   faq.html, allergens.html, popcorn-day.html, fundraisers.html,
│   hospitals.html            # ten pages; hospitals.html hosts the calculator
├── css/styles.css            # all styles
├── js/
│   ├── layout.js             # shared header/footer and nav highlighting
│   ├── pricing-config.js     # SINGLE SOURCE of every price and rule
│   ├── pricing.js            # pure logic: calculateQuote, parseDate, businessDaysBetween
│   └── calculator.js         # DOM wiring for hospitals.html (hospitals.js runs the hospital picker)
└── vercel.json               # cleanUrls, no trailing slash
tests/pricing.test.js         # node:test suite for pricing.js
docs/superpowers/plans/       # implementation plan
```

`calculateQuote(input, today)` lives in `site/js/pricing.js`. It validates the input and returns line items, `subtotal`, `discountRate`, `total`, and `perBag`. Each line is rounded to cents and the total is the sum of the rounded lines, so the breakdown always foots to the total.

## Pricing assumptions

Edit all pricing in `site/js/pricing-config.js`. Values below match that file.

**Bag size:** hospital orders use one size, the mini bag (<1 cup), at $2.00 each. Branding with the hospital's logo is part of every bag.

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

**Flavors:** up to 2 per order.

**Fulfillment:** pickup at the shop, or delivery to a Durham / Chapel Hill / RTP or Raleigh / Cary / Morrisville address, all at no charge. No shipping.

**Lead time:** orders need at least 2 business days' notice (Sundays are closed and do not count). There is no rush fee.

## Deploy

The site is static, with no build step. On Vercel, import the repository and set the **Root Directory** to `site/`. Leave the build command and output directory empty. `site/vercel.json` enables clean URLs (`/hospitals`; the old `/corporate` URL redirects there) and disables trailing slashes. All pages carry `noindex`, since this is a prototype.

## Editing prices on the live site

The hospitals page has an **Edit pricing** button (bottom left). Changes preview instantly for the person editing. **Publish to public site** saves them for every visitor, and needs the edit password.

- Settings are stored in a Vercel Blob store (`madpopper-pricing`) and served by `site/api/pricing.js`. The server re-checks every number with `site/js/pricing-settings.js`, so a bad value can't be published.
- The edit password is the `PRICING_EDIT_PASSWORD` environment variable in the Vercel project. Change it with `vercel env rm PRICING_EDIT_PASSWORD` and `vercel env add PRICING_EDIT_PASSWORD production`, then redeploy.
- Published settings override the defaults in `site/js/pricing-config.js`. A new publish can take a few seconds to reach other visitors.
