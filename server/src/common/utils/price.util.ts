// The ONE place a discount is applied. Cart, orders and the product endpoints
// all call this, so a variant can never be priced differently in two places.
// Money is a digits-only string of Toman, so the maths happens on numbers
// and the result goes back to a string.
export const finalPrice = (price: string, discountPercent: string): string => {
  const percent = Number(discountPercent);
  if (!percent) return price;

  const value = Number(price);

  return String(Math.round(value - (value * percent) / 100));
};

// Cheapest active variant, for the "from ..." price on a product card.
export const lowestPrice = (
  varients: { price: string; discountPercent: string }[],
): string | null => {
  const prices = varients.map((varient) =>
    Number(finalPrice(varient.price, varient.discountPercent)),
  );

  return prices.length ? String(Math.min(...prices)) : null;
};

// Shipping for a subtotal, from the shop settings. Free above the threshold —
// the comparison is against the subtotal AFTER the coupon, so a code can be
// what tips an order into free shipping. Lives here with the other money maths
// so the cart and the order can never disagree about it.
export const shippingFor = (
  payableSubtotal: string,
  settings: { shippingCost: string; freeShippingThreshold: string | null },
): string => {
  const threshold = settings.freeShippingThreshold;
  if (threshold && Number(payableSubtotal) >= Number(threshold)) return '0';

  return settings.shippingCost;
};
