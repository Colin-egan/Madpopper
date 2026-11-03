# Mad Popper — University Case Study

A static HTML site clone of [themadpopper.com](https://www.themadpopper.com) featuring a **corporate orders calculator** with live pricing.

**⚠️ Case Study:** This is a university prototype, not the official Mad Popper site. All content (pages, branding, pricing data) is copied from the original for educational purposes.

## Quick Start

### Install dependencies
```bash
npm install
```

### Run tests
```bash
npm test
```

Expected result: **17 pass, 0 fail**.

### Start local dev server
```bash
npm start
```

Then open `http://localhost:8000` and navigate the 10 pages using the header menu. The Corporate page includes a live pricing calculator.

## Site Structure

**Static pages (deployable to Vercel as `site/` directory):**

1. **Home** (`index.html`) — Main landing page
2. **About** (`about.html`) — About Mad Popper
3. **Sizes** (`sizes.html`) — Bag size options and retail pricing
4. **Flavors** (`flavors.html`) — Available popcorn flavors
5. **Gallery** (`gallery.html`) — Photo gallery
6. **FAQ** (`faq.html`) — Frequently asked questions
7. **Allergens** (`allergens.html`) — Allergen information
8. **Popcorn Day** (`popcorn-day.html`) — Community event
9. **Fundraisers** (`fundraisers.html`) — Fundraising info
10. **Corporate** (`corporate.html`) — **NEW:** Corporate orders calculator with live pricing

## Corporate Calculator

The corporate pricing calculator on `/corporate.html` uses a **single configuration file** for all pricing logic.

### Pricing Assumptions

All assumptions below are **case-study placeholders** (editable in one file). Retail unit prices are published prices from themadpopper.com.

**Edit all pricing here:** `site/js/pricing-config.js`

#### Bag Sizes & Unit Prices
- Mini bag (<1 cup): **$1.25**
- Cone / treat bag (1–2 cups): **$3.00**
- Snack bag (4 cups): **$5.95**
- "Mine" (6 cups): **$8.50**
- "Ours" (14 cups): **$15.00**
- "Family" (22 cups): **$21.50**
- "Party" (35 cups): **$31.50**
- "Big ol' popper" (74 cups): **$58.00**

#### Volume Discount Tiers
Applied to bag subtotal (highest tier matching quantity wins):

| Quantity Range | Discount |
|---|---|
| 1000+ | 25% |
| 300–999 | 20% |
| 100–299 | 15% |
| 25–99 | 10% |
| 1–24 | 0% |

#### Order Constraints
- **Minimum order:** 25 bags
- **Maximum order:** 2000 bags (above this, calculator suggests "request a custom quote")

#### Add-on Fees
Custom options, charged per bag + one-time setup:

| Option | Per Bag | Setup |
|---|---|---|
| Custom-branded label (your logo) | $0.30 | $75.00 |
| Personalized thank-you tag | $0.20 | $0.00 |
| Individually sealed (5-week shelf life packaging) | $0.15 | $0.00 |

#### Flavors
- **Included:** 2 flavors (in bag subtotal)
- **Extra flavors:** $25 per flavor (up to 6 total)
- **Max flavors:** 6

#### Delivery Options
- **Pickup at shop:** $0.00
- **Durham / Chapel Hill / RTP (business address):** $35.00
- **Raleigh / Cary / Morrisville (business address):** $55.00

#### Lead Time & Rush Orders
- **Standard lead time:** 5 business days
- **Rush orders:** 2–4 business days, +25% surcharge on bag subtotal
- **Max advance order:** 365 days
- **Closed:** Sundays (no order fulfillment)

---

## Development

### Project Layout
```
site/
├── index.html                     # Static pages
├── corporate.html                 # Corporate calculator page
├── *.html                         # Other pages
├── css/
│   ├── shared-styles.css         # Shared layout & typography
│   └── corporate.css             # Corporate page styles
├── js/
│   ├── pricing-config.js         # SINGLE SOURCE: all pricing config
│   ├── calculator.js             # Pricing logic & form handling
│   ├── header-footer.js          # Navigation & layout
│   └── date-utils.js             # Date calculations (lead time, rush)
└── assets/                        # Images & static files

tests/
├── pricing-config.test.js         # Config validation
├── calculator.test.js              # Pricing formula tests
└── date-utils.test.js             # Date/lead-time tests
```

### Key Files
- **Config (single source of truth):** `site/js/pricing-config.js`
- **Calculator engine:** `site/js/calculator.js` (exports `calculateQuote`)
- **Date utilities:** `site/js/date-utils.js` (exports `parseDate`, `businessDaysBetween`)

### Running Tests
```bash
npm test
```

Tests cover:
- Pricing configuration validation
- Quote calculations (all tier/option/delivery/rush combinations)
- Business day calculations (excluding Sundays)
- Input edge cases and constraints

## Deployment

This is a **static site** deployable to any host (Vercel, Netlify, GitHub Pages, etc.).

### Deploy to Vercel
```bash
vercel --prod --cwd site/
```

The `site/` directory is the root for deployment.

---

**Case Study Details:** Content and pricing are from themadpopper.com; this project is a university prototype to demonstrate corporate order calculator patterns. Not affiliated with or endorsed by Mad Popper.
