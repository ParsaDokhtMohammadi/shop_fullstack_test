import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'

/** A white panel. The app's one container style, so panels cannot drift apart. */
export const Card = ({
  children,
  className,
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) => (
  <div
    className={cn(
      'border-ink-200 rounded-card border bg-white shadow-card',
      padded && 'p-5 sm:p-6',
      className,
    )}
  >
    {children}
  </div>
)

/**
 * A homepage or listing section heading, with an optional "see all" link.
 *
 * The chevron points left because that is "forward" in an RTL layout — the
 * same reason the pagination arrows are mirrored.
 */
export const SectionHeader = ({
  title,
  description,
  moreHref,
  moreLabel = 'مشاهده همه',
}: {
  title: string
  description?: string
  moreHref?: string
  moreLabel?: string
}) => (
  <div className="mb-5 flex items-end justify-between gap-4">
    <div>
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      {description && <p className="text-ink-500 mt-1 text-sm">{description}</p>}
    </div>
    {moreHref && (
      <Link
        to={moreHref}
        className="text-brand-700 hover:text-brand-800 group inline-flex shrink-0 items-center gap-1 text-sm font-medium transition-colors"
      >
        {moreLabel}
        <ChevronLeft
          className="size-4 transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    )}
  </div>
)

/** Vertical rhythm between homepage sections, in one place. */
export const Section = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => <section className={cn('py-8 sm:py-10', className)}>{children}</section>
