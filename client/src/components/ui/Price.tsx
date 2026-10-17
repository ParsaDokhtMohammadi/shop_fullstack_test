import { cn } from '@/lib/cn'
import { discountPercentOf, formatAmount, formatNumber } from '@/lib/format'
import type { Money } from '@/types'

/**
 * A price. Always rendered through this component so the unit, the digits and
 * the way a discount is shown are identical everywhere.
 *
 * The amount and the unit are separate elements on purpose: "تومان" at a
 * smaller size and lighter weight lets the number itself carry the hierarchy,
 * which is how Persian shops typeset prices.
 */
export const Price = ({
  amount,
  size = 'md',
  className,
}: {
  amount: Money | null | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
  } as const

  return (
    <span className={cn('inline-flex items-baseline gap-1', sizes[size], className)}>
      <span className="font-bold tabular-nums">{formatAmount(amount)}</span>
      <span className="text-ink-500 text-[0.7em] font-normal">تومان</span>
    </span>
  )
}

/**
 * A discounted price: the old price struck through, the new one emphasised,
 * and a percentage badge.
 *
 * Falls back to a plain price when there is no discount, so callers do not
 * have to branch — `discountPercentOf` returns null when `finalPrice` is not
 * actually lower, which also covers the "0" discountPercent case.
 */
export const DiscountedPrice = ({
  price,
  finalPrice,
  size = 'md',
  className,
}: {
  /** The list price. */
  price: Money
  /** What it actually sells for, as computed by the backend. */
  finalPrice: Money
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) => {
  const percent = discountPercentOf(price, finalPrice)

  if (percent === null)
    return <Price amount={finalPrice} size={size} className={className} />

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2.5 gap-y-1', className)}>
      <Price amount={finalPrice} size={size} />
      <div className="flex items-center gap-2">
        {/* The old price is secondary information: smaller, lighter, struck
            through. aria-label spells out what the strikethrough means, which
            a screen reader would otherwise read as a bare number. */}
        <span
          className="text-ink-400 text-sm line-through tabular-nums"
          aria-label={`قیمت پیشین ${formatAmount(price)} تومان`}
        >
          {formatAmount(price)}
        </span>
        <span className="bg-sale-600 rounded-pill px-2 py-0.5 text-xs font-bold text-white tabular-nums">
          {formatNumber(percent)}٪
        </span>
      </div>
    </div>
  )
}

/**
 * The "from" price on a product card. A product's variants can differ in
 * price, so the list endpoint sends the lowest one and the card has to say
 * that it is a starting point rather than the price.
 */
export const PriceFrom = ({
  amount,
  className,
}: {
  amount: Money
  className?: string
}) => (
  <div className={cn('flex items-baseline gap-1.5', className)}>
    <span className="text-ink-500 text-xs">از</span>
    <Price amount={amount} />
  </div>
)
