import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import { Compass, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/api/errors'

/** The catch-all `*` route. */
export const NotFoundPage = () => (
  <div className="page-container flex flex-col items-center justify-center py-20 text-center">
    <span className="bg-brand-50 text-brand-700 mb-5 flex size-16 items-center justify-center rounded-full">
      <Compass className="size-8" aria-hidden="true" />
    </span>
    <h1 className="text-2xl font-bold">این صفحه پیدا نشد</h1>
    <p className="text-ink-500 mt-3 max-w-md text-sm leading-7">
      ممکن است نشانی را اشتباه وارد کرده باشید یا صفحه حذف شده باشد.
    </p>
    <div className="mt-7 flex flex-wrap justify-center gap-3">
      <Link to="/">
        <Button>بازگشت به صفحه اصلی</Button>
      </Link>
      <Link to="/products">
        <Button variant="outline">مشاهده محصولات</Button>
      </Link>
    </div>
  </div>
)

/**
 * The router's error element — what renders when a route throws during render
 * rather than inside a React Query hook.
 *
 * React Query's own errors are handled per page, with a retry button, so this
 * is the last resort: a genuine bug, a chunk that failed to load after a
 * redeploy, or a 404 from the router itself. It is deliberately plain and does
 * not show a stack trace.
 */
export const RouteError = () => {
  const error = useRouteError()

  // A 404 thrown by the router is just a missing page, not a failure.
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  const message =
    error instanceof ApiError
      ? error.messages.join(' ')
      : isRouteErrorResponse(error)
        ? error.statusText
        : 'خطای پیش‌بینی‌نشده‌ای رخ داد.'

  return (
    <div className="page-container flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-2xl font-bold">مشکلی در نمایش این صفحه پیش آمد</h1>
      <p className="text-ink-600 mt-3 max-w-md text-sm leading-7">{message}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button
          onClick={() => window.location.reload()}
          icon={<RotateCcw className="size-4" aria-hidden="true" />}
        >
          بارگذاری مجدد صفحه
        </Button>
        <Link to="/">
          <Button variant="outline">صفحه اصلی</Button>
        </Link>
      </div>
    </div>
  )
}
