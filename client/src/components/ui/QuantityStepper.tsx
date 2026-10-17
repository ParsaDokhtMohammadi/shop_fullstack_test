import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'

/**
 * A quantity control, capped at what is actually on the shelf.
 *
 * The cap matters: `POST /api/cart/items` refuses a quantity above stock with
 * a 400 that names the available number, so stopping the button here turns a
 * server-side rejection into a control the customer simply cannot push
 * further. The backend remains the authority — this is only there so the
 * common case does not need an error message.
 */
export const QuantityStepper = ({
  value,
  onChange,
  max,
  min = 1,
  isDisabled = false,
  size = 'md',
}: {
  value: number
  onChange: (next: number) => void
  /** Current stock. The backend also caps the field itself at 100. */
  max: number
  min?: number
  isDisabled?: boolean
  size?: 'sm' | 'md'
}) => {
  const ceiling = Math.min(max, 100)
  const canDecrease = !isDisabled && value > min
  const canIncrease = !isDisabled && value < ceiling

  const button = size === 'sm' ? 'size-8' : 'size-10'

  return (
    <div
      className={cn(
        'border-ink-300 inline-flex items-center rounded-control border bg-white',
        isDisabled && 'opacity-55',
      )}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label="کاهش تعداد"
        className={cn(
          'text-ink-700 hover:bg-ink-100 flex cursor-pointer items-center justify-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
          button,
        )}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>

      {/* A live region so a screen reader announces the new quantity after a
          press, rather than leaving the change silent. */}
      <span
        aria-live="polite"
        className={cn(
          'min-w-10 text-center text-sm font-medium tabular-nums',
          size === 'sm' && 'min-w-8',
        )}
      >
        {formatNumber(value)}
      </span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label="افزایش تعداد"
        className={cn(
          'text-ink-700 hover:bg-ink-100 flex cursor-pointer items-center justify-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
          button,
        )}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
