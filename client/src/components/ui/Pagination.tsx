import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import type { PaginationMeta } from '@/types'

/**
 * Page navigation for the API's `meta` object.
 *
 * The arrow directions are the detail that matters in RTL: "next" moves
 * leftwards, so it gets ChevronLeft, and "previous" gets ChevronRight. Using
 * the logical-looking icon here would point users the wrong way.
 */
export const Pagination = ({
  meta,
  onPageChange,
  /** True while the next page is loading, to stop double-clicks. */
  isLoading = false,
  className,
}: {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  isLoading?: boolean
  className?: string
}) => {
  // pageCount is at least 1 even for an empty list, so a single page means
  // there is nothing to navigate.
  if (meta.pageCount <= 1) return null

  const pages = pageWindow(meta.page, meta.pageCount)
  const isFirst = meta.page <= 1
  const isLast = meta.page >= meta.pageCount

  return (
    <nav
      className={cn('flex items-center justify-center gap-1.5', className)}
      aria-label="صفحه‌بندی"
    >
      <PageButton
        onClick={() => onPageChange(meta.page - 1)}
        disabled={isFirst || isLoading}
        label="صفحه پیشین"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </PageButton>

      {pages.map((page, index) =>
        page === null ? (
          <span
            // The gap positions are stable for a given page, so the index is a
            // safe key here.
            key={`gap-${index}`}
            className="text-ink-400 px-1 select-none"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <PageButton
            key={page}
            onClick={() => onPageChange(page)}
            disabled={isLoading}
            isActive={page === meta.page}
            label={`صفحه ${formatNumber(page)}`}
          >
            {formatNumber(page)}
          </PageButton>
        ),
      )}

      <PageButton
        onClick={() => onPageChange(meta.page + 1)}
        disabled={isLast || isLoading}
        label="صفحه بعد"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </PageButton>
    </nav>
  )
}

const PageButton = ({
  children,
  onClick,
  disabled,
  isActive = false,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  isActive?: boolean
  label: string
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    // Tells assistive technology which page is the current one.
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      'inline-flex size-10 cursor-pointer items-center justify-center rounded-control text-sm font-medium tabular-nums transition-colors',
      isActive
        ? 'bg-brand-600 text-white'
        : 'text-ink-700 border border-ink-200 bg-white hover:bg-ink-50 hover:border-ink-300',
      'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white',
    )}
  >
    {children}
  </button>
)

/**
 * Which page numbers to show. Always the first and last page, the current one
 * and its neighbours, with `null` standing for a gap — so a 50-page result
 * renders nine controls rather than fifty.
 */
const pageWindow = (current: number, total: number): (number | null)[] => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const pages = new Set<number>([1, total, current])
  if (current - 1 > 1) pages.add(current - 1)
  if (current + 1 < total) pages.add(current + 1)
  // Keep the row a stable width near the ends, where the window would
  // otherwise be one shorter and make the controls shift.
  if (current <= 3) pages.add(2).add(3).add(4)
  if (current >= total - 2) pages.add(total - 1).add(total - 2).add(total - 3)

  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)

  const withGaps: (number | null)[] = []
  let previous = 0
  for (const page of sorted) {
    if (previous && page - previous > 1) withGaps.push(null)
    withGaps.push(page)
    previous = page
  }

  return withGaps
}

/** "نمایش ۱ تا ۲۰ از ۱۶ مورد" — the count line that sits above a grid. */
export const ResultCount = ({ meta }: { meta: PaginationMeta }) => {
  if (meta.total === 0) return null
  const first = (meta.page - 1) * meta.limit + 1
  const last = Math.min(meta.page * meta.limit, meta.total)

  return (
    <p className="text-ink-500 text-sm">
      نمایش {formatNumber(first)} تا {formatNumber(last)} از{' '}
      <span className="text-ink-800 font-medium">{formatNumber(meta.total)}</span> مورد
    </p>
  )
}
