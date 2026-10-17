import { Link } from 'react-router'
import { Headphones, PackageCheck, ShieldCheck, Truck } from 'lucide-react'
import { Section, SectionHeader } from '@/components/ui/Surface'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { formatPrice } from '@/lib/format'
import { assetUrl } from '@/lib/env'
import { useBanners, useCategoryTree, useProducts } from '@/features/catalog/queries'
import { useSettings } from '@/features/settings/queries'
import { BannerSlider } from '@/features/catalog/components/BannerSlider'
import {
  ProductCard,
  ProductGrid,
  ProductGridSkeleton,
} from '@/features/catalog/components/ProductCard'
import { BannerPosition, ProductSort } from '@/types'

/**
 * The homepage. Every section is backed by a real endpoint, and each one
 * disappears rather than showing a placeholder when its data is empty — a shop
 * with no banners configured should look deliberate, not broken.
 */
export const HomePage = () => {
  const banners = useBanners()
  const categories = useCategoryTree()
  const newest = useProducts({ limit: 10, sort: ProductSort.Newest })
  const { data: settings } = useSettings()

  const sliderBanners =
    banners.data?.filter((banner) => banner.position === BannerPosition.HomeSlider) ??
    []
  const midBanners =
    banners.data?.filter((banner) => banner.position === BannerPosition.HomeBanner) ??
    []

  return (
    <div className="page-container">
      <Section>
        {banners.isPending ? (
          <Skeleton className="aspect-[16/7] rounded-card sm:aspect-[21/7]" />
        ) : (
          <BannerSlider banners={sliderBanners} />
        )}
      </Section>

      <ServicePromises
        shippingCost={settings?.shippingCost}
        freeShippingThreshold={settings?.freeShippingThreshold ?? null}
      />

      {categories.data && categories.data.length > 0 && (
        <Section>
          <SectionHeader title="خرید بر اساس دسته‌بندی" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.data.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/category/${category.slug}`}
                  className="group border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 flex h-full flex-col items-center justify-center gap-2 rounded-card border bg-white p-4 text-center transition-colors"
                >
                  <span className="bg-brand-50 text-brand-700 group-hover:bg-brand-100 flex size-11 items-center justify-center rounded-full transition-colors">
                    <PackageCheck className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium">{category.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section>
        <SectionHeader
          title="جدیدترین محصولات"
          description="تازه‌ترین کالاهایی که به فروشگاه اضافه شده‌اند"
          moreHref="/products"
        />

        {newest.isPending ? (
          <ProductGridSkeleton count={10} />
        ) : newest.isError ? (
          <ErrorState error={newest.error} onRetry={() => void newest.refetch()} />
        ) : newest.data.items.length === 0 ? (
          <p className="text-ink-500 py-10 text-center text-sm">
            هنوز محصولی در فروشگاه ثبت نشده است.
          </p>
        ) : (
          <ProductGrid>
            {newest.data.items.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                // The first row is above the fold, so it loads eagerly.
                priority={index < 5}
              />
            ))}
          </ProductGrid>
        )}
      </Section>

      {midBanners.length > 0 && (
        <Section>
          <div className="grid gap-4 sm:grid-cols-2">
            {midBanners.slice(0, 2).map((banner) => (
              <MidBanner key={banner.id} title={banner.title} url={banner.imageUrl} link={banner.linkUrl} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

/**
 * The four promises strip. Three of these are genuinely static copy about how
 * the shop operates; the shipping one reads the real rule out of the settings
 * row, so it cannot claim free shipping the backend will not honour.
 */
const ServicePromises = ({
  shippingCost,
  freeShippingThreshold,
}: {
  shippingCost: string | undefined
  freeShippingThreshold: string | null
}) => {
  const shippingText = freeShippingThreshold
    ? `ارسال رایگان برای خرید بالای ${formatPrice(freeShippingThreshold)}`
    : shippingCost && Number(shippingCost) === 0
      ? 'ارسال رایگان برای همه سفارش‌ها'
      : shippingCost
        ? `هزینه ارسال ${formatPrice(shippingCost)}`
        : 'ارسال به سراسر کشور'

  const promises = [
    { icon: Truck, title: 'ارسال سریع', text: shippingText },
    { icon: ShieldCheck, title: 'پرداخت امن', text: 'پرداخت از طریق درگاه بانکی معتبر' },
    { icon: PackageCheck, title: 'اصالت کالا', text: 'تضمین اصل بودن همه محصولات' },
    { icon: Headphones, title: 'پشتیبانی', text: 'پاسخ‌گویی در روزهای کاری' },
  ]

  return (
    <ul className="border-ink-200 grid grid-cols-2 gap-px overflow-hidden rounded-card border bg-ink-200 lg:grid-cols-4">
      {promises.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-3 bg-white p-4">
          <span className="bg-brand-50 text-brand-700 flex size-10 shrink-0 items-center justify-center rounded-full">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-ink-500 mt-0.5 text-xs leading-5">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

const MidBanner = ({
  title,
  url,
  link,
}: {
  title: string | null
  url: string
  link: string | null
}) => {
  const src = assetUrl(url)

  const content = (
    <div className="relative aspect-[16/7] overflow-hidden rounded-card">
      {src ? (
        <img src={src} alt={title ?? ''} loading="lazy" className="size-full object-cover" />
      ) : (
        <div className="bg-ink-200 size-full" aria-hidden="true" />
      )}
      {title && (
        <div className="from-ink-950/65 absolute inset-0 flex items-end bg-gradient-to-t to-transparent p-5">
          <h3 className="font-bold text-white">{title}</h3>
        </div>
      )}
    </div>
  )

  if (!link) return content
  if (/^https?:\/\//i.test(link))
    return (
      <a href={link} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )

  return <Link to={link}>{content}</Link>
}
