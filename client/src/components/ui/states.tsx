import type { ReactNode } from 'react'
import { AlertCircle, Inbox, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ApiError } from '@/api/errors'
import { Button } from './Button'

/**
 * The four states every screen that loads data has to handle: loading, empty,
 * error and success. Having them as components rather than inline JSX is what
 * makes them consistent — otherwise one page gets a spinner, another gets
 * "Loading..." and a third gets nothing at all.
 */

/** A centred spinner, for a region whose height is already established. */
export const Spinner = ({ className }: { className?: string }) => (
  <Loader2
    className={cn('text-brand-600 size-6 animate-spin', className)}
    aria-hidden="true"
  />
)

/** A full-region loading state with an accessible label. */
export const LoadingState = ({ label = 'در حال بارگذاری…' }: { label?: string }) => (
  <div
    className="flex flex-col items-center justify-center gap-3 py-16"
    // Announced once when it appears, instead of the screen reader saying
    // nothing while the user waits.
    role="status"
  >
    <Spinner className="size-7" />
    <p className="text-ink-500 text-sm">{label}</p>
  </div>
)

/** A grey block standing in for content that has not arrived. */
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skeleton', className)} aria-hidden="true" />
)

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

/**
 * Nothing to show, and that is not a failure — an empty cart, no orders yet,
 * a search with no matches. It says what happened and offers a way forward,
 * because a bare "no results" leaves the user stuck.
 */
export const EmptyState = ({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div className="bg-ink-100 text-ink-400 mb-4 flex size-14 items-center justify-center rounded-full">
      {icon ?? <Inbox className="size-7" aria-hidden="true" />}
    </div>
    <h3 className="text-ink-900 text-base font-semibold">{title}</h3>
    {description && (
      <p className="text-ink-500 mt-1.5 max-w-sm text-sm">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
)

interface ErrorStateProps {
  error: unknown
  /** Omit to render without a retry button, e.g. when there is nothing to retry. */
  onRetry?: () => void
  /** Shown instead of the server's message — only when ours is more useful. */
  title?: string
}

/**
 * A failed request. The backend's messages are already user-facing Persian, so
 * they are shown as they are rather than replaced with a generic apology — a
 * customer being told "این کد تخفیف معتبر نیست" can act on it, and
 * "خطایی رخ داد" cannot.
 *
 * A validation failure can carry several messages at once, so all of them are
 * listed rather than only the first.
 */
export const ErrorState = ({ error, onRetry, title }: ErrorStateProps) => {
  const apiError = error instanceof ApiError ? error : null
  const isOffline = apiError?.isNetworkError ?? false
  const messages = apiError?.messages ?? [
    error instanceof Error ? error.message : 'خطای ناشناخته',
  ]

  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
      role="alert"
    >
      <div className="bg-sale-50 text-sale-600 mb-4 flex size-14 items-center justify-center rounded-full">
        {isOffline ? (
          <WifiOff className="size-7" aria-hidden="true" />
        ) : (
          <AlertCircle className="size-7" aria-hidden="true" />
        )}
      </div>
      <h3 className="text-ink-900 text-base font-semibold">
        {title ?? (isOffline ? 'ارتباط با سرور برقرار نشد' : 'مشکلی پیش آمد')}
      </h3>
      <div className="text-ink-600 mt-1.5 max-w-md space-y-1 text-sm">
        {messages.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </div>
      {onRetry && (
        <Button
          variant="outline"
          className="mt-5"
          onClick={onRetry}
          icon={<RefreshCw className="size-4" aria-hidden="true" />}
        >
          تلاش مجدد
        </Button>
      )}
    </div>
  )
}

type AlertTone = 'info' | 'success' | 'warn' | 'error'

const ALERT_TONES: Record<AlertTone, string> = {
  info: 'bg-info-50 text-info-700 border-info-100',
  success: 'bg-success-50 text-success-700 border-success-100',
  warn: 'bg-warn-50 text-warn-700 border-warn-100',
  error: 'bg-sale-50 text-sale-700 border-sale-100',
}

/**
 * An inline message within a page — a failed mutation above a form, a notice
 * that some cart lines are unavailable. Not for whole-page failures; that is
 * ErrorState.
 */
export const Alert = ({
  tone = 'info',
  children,
  className,
}: {
  tone?: AlertTone
  children: ReactNode
  className?: string
}) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cn(
      'rounded-control border px-4 py-3 text-sm',
      ALERT_TONES[tone],
      className,
    )}
  >
    {children}
  </div>
)

/**
 * Renders an ApiError's messages inline, for a failed form submission. Returns
 * null when there is no error, so a form can render it unconditionally.
 */
export const FormError = ({ error }: { error: unknown }) => {
  if (!error) return null
  const messages =
    error instanceof ApiError
      ? error.messages
      : [error instanceof Error ? error.message : 'خطای ناشناخته']

  return (
    <Alert tone="error">
      <ul className={messages.length > 1 ? 'list-inside list-disc space-y-1' : ''}>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </Alert>
  )
}
