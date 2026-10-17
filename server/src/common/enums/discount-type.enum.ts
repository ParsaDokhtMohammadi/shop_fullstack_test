// How to discount. `percent` takes value% off the subtotal, `fixed` takes
// value Toman off it. Two kinds covers every coupon a shop actually
// runs — anything else is a paid add-on, not core.
export enum DiscountType {
  Percent = 'percent',
  Fixed = 'fixed',
}
