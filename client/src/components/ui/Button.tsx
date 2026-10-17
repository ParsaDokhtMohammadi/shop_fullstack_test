import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

/**
 * Every clickable action in the app. Variants exist so a page picks an
 * intent — primary, secondary, danger — rather than inventing colours, which
 * is what keeps buttons consistent across twenty screens.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
  outline:
    'border border-ink-300 bg-white text-ink-800 hover:bg-ink-50 hover:border-ink-400 active:bg-ink-100',
  ghost: 'text-ink-700 hover:bg-ink-100 active:bg-ink-200',
  danger: 'bg-sale-600 text-white hover:bg-sale-700 active:bg-sale-700 shadow-sm',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Shows a spinner and blocks clicks. Use for a pending mutation. */
  isLoading?: boolean
  /** Replaces the label while loading, e.g. "در حال ثبت…". */
  loadingText?: string
  fullWidth?: boolean
  /** Rendered before the label — which in RTL means to its right. */
  icon?: ReactNode
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    // Defaulting to "button" rather than the HTML default of "submit" stops a
    // stray button inside a form from submitting it by accident.
    type={type}
    // A loading button must not be clickable twice: the mutation is already in
    // flight, and the second click would place a second order.
    disabled={disabled || isLoading}
    // Tells assistive technology the control is busy, which `disabled` alone
    // does not convey.
    aria-busy={isLoading || undefined}
    className={cn(
      'inline-flex cursor-pointer items-center justify-center rounded-control font-medium',
      'transition-colors duration-150 select-none',
      // A disabled button keeps its shape and loses its affordance, rather
      // than disappearing into the background.
      'disabled:cursor-not-allowed disabled:opacity-55',
      VARIANTS[variant],
      SIZES[size],
      fullWidth && 'w-full',
      className,
    )}
    {...props}
  >
    {isLoading ? (
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
    ) : (
      icon
    )}
    <span>{isLoading && loadingText ? loadingText : children}</span>
  </button>
)
