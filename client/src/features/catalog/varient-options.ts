import type { ProductVarient } from '@/types'

/**
 * Colour and size selection.
 *
 * The API models a variant as a (colour, size) pair, both nullable, with price
 * and stock on the variant itself. So the picker cannot be two independent
 * dropdowns: a product may have blue in size 42 but not blue in 40, and
 * offering a combination that has no variant would mean an "add to basket"
 * button that 404s.
 *
 * Instead, choosing a colour narrows the sizes to the ones that exist with it,
 * and a size that exists but is out of stock is shown disabled rather than
 * hidden — "sold out in your size" is more useful than a size that silently
 * vanishes.
 */

/** Distinct colours across the variants, in first-seen order. */
export const colourOptions = (varients: ProductVarient[]) => {
  const seen = new Map<string, string | null>()
  for (const varient of varients) {
    if (varient.color && !seen.has(varient.color))
      seen.set(varient.color, varient.colorCode)
  }

  return [...seen].map(([color, colorCode]) => ({ color, colorCode }))
}

/** Distinct sizes, optionally restricted to those available in one colour. */
export const sizeOptions = (
  varients: ProductVarient[],
  colour: string | null,
): string[] => {
  const sizes = new Set<string>()
  for (const varient of varients) {
    if (colour !== null && varient.color !== colour) continue
    if (varient.size) sizes.add(varient.size)
  }

  return [...sizes]
}

/**
 * Finds the one variant matching a selection. Returns null when the
 * combination does not exist, which is what disables the buy button.
 */
export const findVarient = (
  varients: ProductVarient[],
  colour: string | null,
  size: string | null,
): ProductVarient | null =>
  varients.find(
    (varient) => varient.color === colour && varient.size === size,
  ) ?? null

/** True when a product has no options at all — one variant, no picker needed. */
export const isSingleVarient = (varients: ProductVarient[]): boolean =>
  varients.length === 1 &&
  varients[0]?.color === null &&
  varients[0]?.size === null
