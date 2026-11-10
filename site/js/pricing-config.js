// ASSUMPTIONS: hospital-order numbers below are placeholders for the case study.
export const CONFIG = {
  // Hospital orders come in one size: the mini bag, branded with the hospital's logo.
  sizes: {
    mini: { label: 'Mini bag (<1 cup)', unitPrice: 2.0 },
  },
  // Volume discount on the bag subtotal. First tier whose `min` <= quantity (checked high to low).
  tiers: [
    { min: 2000, discount: 0.10 },
    { min: 1000, discount: 0.05 },
    { min: 1,    discount: 0 },
  ],
  minQuantity: 25,
  maxQuantity: 5000, // above this, show "request a custom quote" (kept above 2000 so the 10% tier is reachable)
  // Discount codes: code -> share off the bag subtotal after the volume discount.
  // Write keys in lowercase without the '#'; customers can type any capitals, with or without '#'.
  discountCodes: {
    popforapurpose: 0.10, // #popforapurpose
  },
  // Only flavors on sale now (checked themadpopper.com on 2026-11-03): the all-year menu, the
  // fall/winter seasonal, and this week's rotating flavors. Update when the shop's menu changes.
  flavorGroups: [
    { label: 'All year', flavors: ['Classic', 'Yellow Cheddar Cheese', 'Caramel', 'The Mad Popper Blend', '"Q-Corn" BarBQ', 'White Cheddar', 'Jalapeno Cheddar', 'Confetti'] },
    { label: 'Seasonal (fall and winter)', flavors: ['Maple'] },
    { label: 'This week', flavors: ['Apple Pie', 'Sour Cream and Onion'] },
  ],
  defaultFlavors: ['Classic', 'Caramel'],
  maxFlavors: 2, // hospital orders allow two flavors; not editable in the pricing panel
  delivery: {
    pickup: { label: 'Pickup at the shop' },
    zones: {
      durham: { label: 'Durham / Chapel Hill / RTP (hospital or business address)' },
      wake:   { label: 'Raleigh / Cary / Morrisville (hospital or business address)' },
    },
  },
  leadTimeBusinessDays: 2, // shortest notice we accept; there is no rush fee
  maxAdvanceDays: 365,
  closedWeekdays: [0], // Sunday (0). No orders ready on closed days.
};
