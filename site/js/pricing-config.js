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
  // Only flavors on sale now (checked themadpopper.com on 2026-11-03): the all-year menu, the
  // fall/winter seasonal, and this week's rotating flavors. Update when the shop's menu changes.
  flavorGroups: [
    { label: 'All year', flavors: ['Classic', 'Yellow Cheddar Cheese', 'Caramel', 'The Mad Popper Blend', '"Q-Corn" BarBQ', 'White Cheddar', 'Jalapeno Cheddar', 'Confetti'] },
    { label: 'Seasonal (fall and winter)', flavors: ['Maple'] },
    { label: 'This week', flavors: ['Apple Pie', 'Sour Cream and Onion'] },
  ],
  defaultFlavors: ['Classic', 'Caramel'],
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
