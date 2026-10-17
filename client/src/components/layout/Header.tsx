import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import {
  ChevronDown,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Store,
  User as UserIcon,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { assetUrl } from '@/lib/env'
import { formatNumber } from '@/lib/format'
import { useSettings } from '@/features/settings/queries'
import { useCategoryTree } from '@/features/catalog/queries'
import { useLogout, useSession } from '@/features/auth/queries'
import { useCartCount } from '@/features/cart/queries'
import { SearchBox } from './SearchBox'
import type { Category } from '@/types'

/**
 * The site header: branding from the shop settings, search, the category
 * navigation, and the account and basket controls.
 *
 * Everything in it comes from a real endpoint — the name and logo from
 * `GET /api/settings`, the navigation from `GET /api/categories`, the basket
 * count from the cart — so there are no placeholder links.
 */
export const Header = () => {
  const { data: settings } = useSettings()
  const { data: categories } = useCategoryTree()
  const { user, isLoggedIn } = useSession()
  const cartCount = useCartCount()
  const location = useLocation()

  /**
   * The drawer remembers *which* navigation it was opened on, rather than a
   * plain boolean plus an effect that closes it when the route changes.
   *
   * `location.key` is a fresh value per history entry, so the moment the user
   * navigates the comparison below stops matching and the drawer is closed —
   * derived from the current route instead of being pushed there by an effect
   * after an extra render.
   */
  const [openedAtKey, setOpenedAtKey] = useState<string | null>(null)
  const isDrawerOpen = openedAtKey !== null && openedAtKey === location.key
  const setDrawerOpen = (open: boolean) =>
    setOpenedAtKey(open ? location.key : null)

  // Stop the page behind the drawer from scrolling while it is open.
  useEffect(() => {
    if (!isDrawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [isDrawerOpen])

  const logo = assetUrl(settings?.logoUrl)
  const shopName = settings?.name ?? 'فروشگاه'

  return (
    <header className="border-ink-200 sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      {/* Keyboard users land here first; it jumps past the navigation. */}
      <a
        href="#main"
        className="focus:bg-brand-600 sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:rounded-control focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        رفتن به محتوای اصلی
      </a>

      <div className="page-container">
        <div className="flex h-16 items-center gap-3 lg:h-20 lg:gap-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="باز کردن منو"
            aria-expanded={isDrawerOpen}
            className="text-ink-700 hover:bg-ink-100 -ms-2 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-control lg:hidden"
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>

          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label={`${shopName} — صفحه اصلی`}
          >
            {logo ? (
              <img
                src={logo}
                alt=""
                className="size-10 rounded-control bg-transparent object-contain"
              />
            ) : (
              <span className="bg-brand-600 flex size-10 items-center justify-center rounded-control text-white">
                <Store className="size-5" aria-hidden="true" />
              </span>
            )}
            <span className="text-base font-bold whitespace-nowrap lg:text-lg">
              {shopName}
            </span>
          </Link>

          <SearchBox className="hidden flex-1 lg:block" />

          <div className="flex flex-1 items-center justify-end gap-1.5 lg:flex-none lg:gap-2">
            {isLoggedIn ? (
              <AccountMenu
                name={user?.fullName}
                phone={user?.phoneNumber ?? ''}
              />
            ) : (
              <Link
                to="/login"
                className="text-ink-700 hover:bg-ink-100 border-ink-200 inline-flex h-10 items-center gap-2 rounded-control border px-3 text-sm font-medium transition-colors"
              >
                <UserIcon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">ورود | ثبت‌نام</span>
              </Link>
            )}

            <Link
              to="/cart"
              className="bg-brand-600 hover:bg-brand-700 relative inline-flex h-10 items-center gap-2 rounded-control px-3 text-sm font-medium text-white transition-colors"
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">سبد خرید</span>
              {cartCount > 0 && (
                <span
                  className="bg-sale-600 absolute -top-1.5 -start-1.5 flex min-w-5 items-center justify-center rounded-pill px-1.5 text-[0.7rem] font-bold text-white tabular-nums"
                  aria-label={`${formatNumber(cartCount)} کالا در سبد خرید`}
                >
                  {formatNumber(cartCount)}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search sits on its own row: there is no space for it beside
            the logo, and hiding it behind the menu would bury the main way
            people find a product. */}
        <div className="pb-3 lg:hidden">
          <SearchBox />
        </div>
      </div>

      <CategoryBar categories={categories ?? []} />

      {isDrawerOpen && (
        <MobileDrawer
          categories={categories ?? []}
          shopName={shopName}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </header>
  )
}

/**
 * The desktop category row. Root categories are links; one with children also
 * opens a panel listing them.
 *
 * The panel is CSS hover plus focus-within rather than JavaScript state, so it
 * works for keyboard users without a click handler and cannot get stuck open.
 */
const CategoryBar = ({ categories }: { categories: Category[] }) => {
  if (categories.length === 0) return null

  return (
    <nav
      aria-label="دسته‌بندی محصولات"
      className="border-ink-100 hidden border-t lg:block"
    >
      <div className="page-container">
        <ul className="flex items-center gap-1">
          <li>
            <NavLink
              to="/products"
              end
              className={({ isActive }) =>
                cn(
                  'inline-flex h-11 items-center rounded-control px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-brand-700 bg-brand-50'
                    : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
                )
              }
            >
              همه محصولات
            </NavLink>
          </li>

          {categories.map((category) => (
            <li key={category.id} className="group relative">
              <Link
                to={`/category/${category.slug}`}
                className="text-ink-700 hover:bg-ink-50 hover:text-ink-900 group-focus-within:bg-ink-50 inline-flex h-11 items-center gap-1 rounded-control px-3 text-sm font-medium transition-colors"
              >
                {category.name}
                {category.children.length > 0 && (
                  <ChevronDown
                    className="text-ink-400 size-3.5 transition-transform group-hover:rotate-180"
                    aria-hidden="true"
                  />
                )}
              </Link>

              {category.children.length > 0 && (
                <div className="invisible absolute start-0 top-full z-50 opacity-0 transition-[opacity,visibility] group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <ul className="border-ink-200 mt-1 min-w-52 rounded-card border bg-white p-2 shadow-panel">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          to={`/category/${child.slug}`}
                          className="text-ink-700 hover:bg-ink-50 hover:text-brand-700 block rounded-control px-3 py-2 text-sm transition-colors"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

/** The account dropdown. Admin gets an extra entry, shown only to admins. */
const AccountMenu = ({
  name,
  phone,
}: {
  name: string | null | undefined
  phone: string
}) => {
  const logout = useLogout()

  return (
    <div className="group relative">
      <button
        type="button"
        className="text-ink-700 hover:bg-ink-100 border-ink-200 inline-flex h-10 cursor-pointer items-center gap-2 rounded-control border px-3 text-sm font-medium transition-colors"
        aria-haspopup="true"
      >
        <UserIcon className="size-4" aria-hidden="true" />
        <span className="hidden max-w-28 truncate sm:inline">
          {name?.trim() || 'حساب من'}
        </span>
        <ChevronDown className="text-ink-400 size-3.5" aria-hidden="true" />
      </button>

      <div className="invisible absolute end-0 top-full z-50 pt-1 opacity-0 transition-[opacity,visibility] group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="border-ink-200 min-w-56 rounded-card border bg-white p-2 shadow-panel">
          <div className="border-ink-100 mb-1 border-b px-3 pb-2.5">
            <p className="text-ink-900 truncate text-sm font-medium">
              {name?.trim() || 'کاربر فروشگاه'}
            </p>
            {/* A phone number is Latin digits inside an RTL page, so it needs
                its own direction or the bidi algorithm reorders it. */}
            <p className="text-ink-500 ltr mt-0.5 text-xs">{phone}</p>
          </div>

          <MenuLink to="/account" icon={<UserIcon className="size-4" />}>
            حساب کاربری
          </MenuLink>
          <MenuLink to="/orders" icon={<Package className="size-4" />}>
            سفارش‌های من
          </MenuLink>
          {/* TODO(admin panel): the admin entry goes here, shown only when
              `isAdmin`. Left out until the panel's routes exist, so the menu
              never offers a link to a page that is not there. Note that when
              it is added, hiding it is a usability choice and not a security
              boundary — the backend's AdminGuard is the real one. */}

          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-sale-700 hover:bg-sale-50 mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {logout.isPending ? 'در حال خروج…' : 'خروج از حساب'}
          </button>
        </div>
      </div>
    </div>
  )
}

const MenuLink = ({
  to,
  icon,
  children,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}) => (
  <Link
    to={to}
    className="text-ink-700 hover:bg-ink-50 hover:text-brand-700 flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors"
  >
    <span aria-hidden="true">{icon}</span>
    {children}
  </Link>
)

/** The mobile navigation drawer. Slides in from the start edge (right, in RTL). */
const MobileDrawer = ({
  categories,
  shopName,
  onClose,
}: {
  categories: Category[]
  shopName: string
  onClose: () => void
}) => {
  const { isLoggedIn } = useSession()

  // Escape closes it, which is what a keyboard user will try first.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* The backdrop is a button so a tap anywhere outside closes the drawer,
          and so it is reachable by keyboard rather than being a dead div. */}
      <button
        type="button"
        aria-label="بستن منو"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/45"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="منوی اصلی"
        className="absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col bg-white shadow-panel"
      >
        <div className="border-ink-200 flex h-16 items-center justify-between border-b px-4">
          <span className="font-bold">{shopName}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن منو"
            className="text-ink-600 hover:bg-ink-100 flex size-9 cursor-pointer items-center justify-center rounded-control"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4" aria-label="منوی موبایل">
          <ul className="space-y-0.5">
            <li>
              <DrawerLink to="/products">همه محصولات</DrawerLink>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <DrawerLink to={`/category/${category.slug}`}>
                  {category.name}
                </DrawerLink>
                {category.children.length > 0 && (
                  <ul className="border-ink-100 me-3 border-s ps-3">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <DrawerLink to={`/category/${child.slug}`} subtle>
                          {child.name}
                        </DrawerLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <div className="border-ink-200 mt-4 space-y-0.5 border-t pt-4">
            {isLoggedIn ? (
              <>
                <DrawerLink to="/account">حساب کاربری</DrawerLink>
                <DrawerLink to="/orders">سفارش‌های من</DrawerLink>
              </>
            ) : (
              <DrawerLink to="/login">ورود | ثبت‌نام</DrawerLink>
            )}
          </div>
        </nav>
      </div>
    </div>
  )
}

const DrawerLink = ({
  to,
  children,
  subtle = false,
}: {
  to: string
  children: React.ReactNode
  subtle?: boolean
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        'block rounded-control px-3 py-2.5 transition-colors',
        subtle ? 'text-sm' : 'font-medium',
        isActive
          ? 'bg-brand-50 text-brand-700'
          : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
      )
    }
  >
    {children}
  </NavLink>
)
