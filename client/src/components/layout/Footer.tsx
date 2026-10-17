import { Link } from 'react-router'
import { Mail, MapPin, Phone, Store } from 'lucide-react'
import { assetUrl } from '@/lib/env'
import { formatPhone, formatPrice } from '@/lib/format'
import { useSettings } from '@/features/settings/queries'
import { useCategoryTree } from '@/features/catalog/queries'

/**
 * The footer. Contact details, socials and the shipping rule all come from
 * `GET /api/settings`, and the category links from the category tree — so
 * every row is either real data or omitted.
 *
 * There are no "About us", "Terms" or "FAQ" links: the backend has no static
 * pages (it was a deliberate scope decision), and a link to a page that does
 * not exist is worse than no link.
 */
export const Footer = () => {
  const { data: settings } = useSettings()
  const { data: categories } = useCategoryTree()

  const logo = assetUrl(settings?.logoUrl)
  const shopName = settings?.name ?? 'فروشگاه'
  const socials = Object.entries(settings?.socials ?? {})

  return (
    <footer className="border-ink-200 mt-auto border-t bg-white">
      <div className="page-container py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
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
              <span className="text-lg font-bold">{shopName}</span>
            </div>

            {settings?.freeShippingThreshold && (
              <p className="text-ink-600 mt-4 max-w-sm text-sm leading-7">
                ارسال سفارش‌های بالای{' '}
                <span className="text-ink-900 font-medium">
                  {formatPrice(settings.freeShippingThreshold)}
                </span>{' '}
                رایگان است.
              </p>
            )}

            {socials.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {socials.map(([network, url]) => (
                  <li key={network}>
                    <a
                      href={url}
                      target="_blank"
                      // noreferrer alongside noopener: the first stops the new
                      // tab reaching back into this one, the second stops the
                      // shop's URL leaking as a Referer.
                      rel="noopener noreferrer"
                      className="border-ink-200 text-ink-700 hover:border-brand-300 hover:text-brand-700 inline-flex items-center rounded-control border px-3 py-1.5 text-xs transition-colors"
                    >
                      {/* The settings row stores arbitrary network names, so
                          the key is shown as-is rather than mapped to an icon
                          set that may not have it. */}
                      {network}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {categories && categories.length > 0 && (
            <nav aria-labelledby="footer-categories">
              <h2
                id="footer-categories"
                className="text-ink-900 text-sm font-semibold"
              >
                دسته‌بندی‌ها
              </h2>
              <ul className="mt-3.5 space-y-2.5">
                {categories.slice(0, 6).map((category) => (
                  <li key={category.id}>
                    <Link
                      to={`/category/${category.slug}`}
                      className="text-ink-600 hover:text-brand-700 text-sm transition-colors"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div>
            <h2 className="text-ink-900 text-sm font-semibold">تماس با ما</h2>
            <ul className="text-ink-600 mt-3.5 space-y-3 text-sm">
              {settings?.supportNumber && (
                <li className="flex items-start gap-2.5">
                  <Phone className="text-ink-400 mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <a
                    href={`tel:${settings.supportNumber}`}
                    className="hover:text-brand-700 ltr transition-colors"
                  >
                    {formatPhone(settings.supportNumber)}
                  </a>
                </li>
              )}
              {settings?.supportEmail && (
                <li className="flex items-start gap-2.5">
                  <Mail className="text-ink-400 mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <a
                    href={`mailto:${settings.supportEmail}`}
                    className="hover:text-brand-700 ltr break-all transition-colors"
                  >
                    {settings.supportEmail}
                  </a>
                </li>
              )}
              {settings?.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="text-ink-400 mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="leading-6">{settings.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-ink-100 border-t">
        <div className="page-container text-ink-500 py-4 text-center text-xs">
          تمام حقوق این وب‌سایت برای {shopName} محفوظ است.
        </div>
      </div>
    </footer>
  )
}
