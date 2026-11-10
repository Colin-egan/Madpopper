// ASSUMPTIONS: hospital-order numbers below are placeholders for the case study.
export const CONFIG = {
  // Hospital orders come in one size: the mini bag, branded with the hospital's logo.
  sizes: {
    mini: { label: 'Mini bag (<1 cup)', unitPrice: 2.0 },
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
  // Only flavors on sale now (checked themadpopper.com on 2026-11-03): the all-year menu, the
  // fall/winter seasonal, and this week's rotating flavors. Update when the shop's menu changes.
  flavorGroups: [
    { label: 'All year', flavors: ['Classic', 'Yellow Cheddar Cheese', 'Caramel', 'The Mad Popper Blend', '"Q-Corn" BarBQ', 'White Cheddar', 'Jalapeno Cheddar', 'Confetti'] },
    { label: 'Seasonal (fall and winter)', flavors: ['Maple'] },
    { label: 'This week', flavors: ['Apple Pie', 'Sour Cream and Onion'] },
  ],
  defaultFlavors: ['Classic', 'Caramel'],
  maxFlavors: 6,
  delivery: {
    pickup: { label: 'Pickup at the shop', fee: 0 },
    zones: {
      durham: { label: 'Durham / Chapel Hill / RTP (hospital or business address)', fee: 35 },
      wake:   { label: 'Raleigh / Cary / Morrisville (hospital or business address)', fee: 55 },
    },
  },
  leadTimeBusinessDays: 5, // standard
  rush: { minBusinessDays: 2, surcharge: 0.25 }, // 2-4 business days: +25% of bag subtotal
  maxAdvanceDays: 365,
  closedWeekdays: [0], // Sunday (0). No orders ready on closed days.
};
