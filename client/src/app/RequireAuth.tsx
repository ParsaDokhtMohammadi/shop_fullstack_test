import { Navigate, Outlet, useLocation } from 'react-router'
import { LoadingState } from '@/components/ui/states'
import { useSession } from '@/features/auth/queries'

/**
 * Keeps logged-out visitors off the pages that need a session, and sends them
 * back where they were going once they log in.
 *
 * **This is a usability measure, not a security boundary.** Every route it
 * guards is also behind `AuthGuard` on the server, which is what actually
 * protects the data — a 401 is returned whatever this component decides. The
 * value here is that a customer sees a login form instead of an error page.
 *
 * It waits for the session query to resolve before deciding. Without that it
 * would redirect on the first render, every time, because `user` is null until
 * `GET /api/auth/me` answers — so a logged-in customer refreshing the checkout
 * page would be bounced to login and straight back again.
 */
export const RequireAuth = () => {
  const { isLoggedIn, isResolved } = useSession()
  const location = useLocation()

  if (!isResolved) return <LoadingState label="در حال بررسی حساب…" />

  if (!isLoggedIn) {
    // The full path including the query, so a filtered page resumes exactly.
    const next = `${location.pathname}${location.search}`

    return (
      <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
    )
  }

  return <Outlet />
}
