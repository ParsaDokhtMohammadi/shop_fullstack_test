import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { Header } from './Header'
import { Footer } from './Footer'
import { useSettings } from '@/features/settings/queries'

/**
 * The shell every page renders inside. The router nests all routes under this,
 * so the header and footer mount once and stay mounted across navigation —
 * which is what keeps the category tree and shop settings from being refetched
 * on every click.
 */
export const RootLayout = () => {
  const { data: settings } = useSettings()
  const location = useLocation()

  // The shop names itself, so the tab title comes from the settings row rather
  // than being hardcoded in index.html. The static title there is the
  // fallback shown before this resolves.
  useEffect(() => {
    if (settings?.name) document.title = settings.name
  }, [settings?.name])

  // Move focus to the top of the page on navigation. Without it a screen
  // reader stays where it was and a keyboard user carries on tabbing from the
  // middle of the previous page, because a client-side route change does not
  // reset focus the way a real page load does.
  useEffect(() => {
    const main = document.getElementById('main')
    main?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Restores the scroll position when the user goes back, and starts at
          the top on a new navigation. */}
      <ScrollRestoration />
      <Header />
      {/* tabIndex={-1} makes this focusable by script without adding it to the
          tab order, which is what the skip link and the effect above need. */}
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
