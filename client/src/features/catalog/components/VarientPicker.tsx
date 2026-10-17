import { cn } from '@/lib/cn'
import type { ProductVarient } from '@/types'
import { findVarient } from '../varient-options'

export const ColourPicker = ({
  options,
  selected,
  onSelect,
  varients,
}: {
  options: { color: string; colorCode: string | null }[]
  selected: string | null
  onSelect: (colour: string) => void
  varients: ProductVarient[]
}) => (
  <fieldset>
    <legend className="text-ink-800 mb-2.5 text-sm font-medium">رنگ</legend>
    <div className="flex flex-wrap gap-2">
      {options.map(({ color, colorCode }) => {
        // Greyed out when nothing in this colour is in stock, in any size.
        const anyInStock = varients.some(
          (varient) => varient.color === color && varient.stock > 0,
        )
        const isSelected = selected === color

        return (
          <button
            key={color}
            type="button"
            onClick={() => onSelect(color)}
            aria-pressed={isSelected}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-control border px-3 py-2 text-sm transition-colors',
              isSelected
                ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600'
                : 'border-ink-300 text-ink-700 hover:border-ink-400 hover:bg-ink-50',
              !anyInStock && 'opacity-55',
            )}
          >
            {/* colorCode is nullable — and is always cleared when the colour
                is, so a swatch is only drawn when there is a real value. */}
            {colorCode && (
              <span
                className="border-ink-300/70 size-4 shrink-0 rounded-full border"
                style={{ backgroundColor: colorCode }}
                aria-hidden="true"
              />
            )}
            {color}
            {!anyInStock && <span className="text-ink-400 text-xs">(ناموجود)</span>}
          </button>
        )
      })}
    </div>
  </fieldset>
)

export const SizePicker = ({
  sizes,
  selected,
  onSelect,
  varients,
  colour,
}: {
  sizes: string[]
  selected: string | null
  onSelect: (size: string) => void
  varients: ProductVarient[]
  colour: string | null
}) => (
  <fieldset>
    <legend className="text-ink-800 mb-2.5 text-sm font-medium">اندازه</legend>
    <div className="flex flex-wrap gap-2">
      {sizes.map((size) => {
        const varient = findVarient(varients, colour, size)
        const isAvailable = (varient?.stock ?? 0) > 0
        const isSelected = selected === size

        return (
          <button
            key={size}
            type="button"
            onClick={() => onSelect(size)}
            // A size with no stock stays visible but unclickable: it tells the
            // customer the size exists and is sold out, which a hidden button
            // does not.
            disabled={!isAvailable}
            aria-pressed={isSelected}
            className={cn(
              'min-w-12 cursor-pointer rounded-control border px-3 py-2 text-sm transition-colors',
              isSelected
                ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600'
                : 'border-ink-300 text-ink-700 hover:border-ink-400 hover:bg-ink-50',
              !isAvailable &&
                'text-ink-400 cursor-not-allowed line-through hover:bg-transparent hover:border-ink-300',
            )}
          >
            {size}
          </button>
        )
      })}
    </div>
  </fieldset>
)
