import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { assetUrl } from '@/lib/env'
import { formatNumber } from '@/lib/format'
import type { Banner } from '@/types'

/**
 * The homepage slider.
 *
 * Deliberately not autoplaying. An auto-advancing carousel moves content out
 * from under the reader, is a known accessibility problem, and the banners
 * here are navigation rather than a story — the customer should move at their
 * own pace. So it slides on demand, with keyboard-reachable controls.
 *
 * `linkUrl` is nullable in the API, so a banner without one renders as a plain
 * image instead of a link that goes nowhere.
 */
export const BannerSlider = ({ banners }: { banners: Banner[] }) => {
  const [index, setIndex] = useState(0)

  if (banners.length === 0) return null

  const count = banners.length
  // Wraps in both directions, so the arrows never dead-end.
  const go = (next: number) => setIndex(((next % count) + count) % count)

  return (
    <div className="relative overflow-hidden rounded-card bg-ink-100">
      <div
        className="flex transition-transform duration-500 ease-out"
        // RTL: the track is laid out right-to-left, so advancing moves it in
        // the positive X direction, the mirror of what an LTR carousel does.
        style={{ transform: `translateX(${index * 100}%)` }}
      >
        {banners.map((banner, position) => (
          <div key={banner.id} className="w-full shrink-0">
            <BannerSlide banner={banner} priority={position === 0} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <SliderButton side="start" onClick={() => go(index - 1)} label="بنر پیشین">
            <ChevronRight className="size-5" aria-hidden="true" />
          </SliderButton>
          <SliderButton side="end" onClick={() => go(index + 1)} label="بنر بعدی">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </SliderButton>

          <div className="absolute bottom-3 start-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((banner, position) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => go(position)}
                aria-label={`رفتن به بنر ${formatNumber(position + 1)}`}
                aria-current={position === index ? 'true' : undefined}
                className={cn(
                  'h-2 cursor-pointer rounded-pill transition-all',
                  position === index
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/60 hover:bg-white/90',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const BannerSlide = ({
  banner,
  priority,
}: {
  banner: Banner
  priority: boolean
}) => {
  const url = assetUrl(banner.imageUrl)

  const image = (
    <div className="relative aspect-[16/7] sm:aspect-[21/7]">
      {url ? (
        <img
          src={url}
          alt={banner.title ?? ''}
          loading={priority ? 'eager' : 'lazy'}
          className="size-full object-cover"
        />
      ) : (
        <div className="bg-ink-200 size-full" aria-hidden="true" />
      )}

      {banner.title && (
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink-950/65 to-transparent p-5 sm:p-8">
          <h2 className="max-w-lg text-lg font-bold text-white sm:text-2xl">
            {banner.title}
          </h2>
        </div>
      )}
    </div>
  )

  if (!banner.linkUrl) return image

  // The admin can store either an internal path or an absolute URL, and the
  // two need different elements: a router Link for in-app navigation, a plain
  // anchor for anything off-site.
  const isExternal = /^https?:\/\//i.test(banner.linkUrl)
  if (isExternal)
    return (
      <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer">
        {image}
      </a>
    )

  return <Link to={banner.linkUrl}>{image}</Link>
}

const SliderButton = ({
  side,
  onClick,
  label,
  children,
}: {
  side: 'start' | 'end'
  onClick: () => void
  label: string
  children: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={cn(
      'absolute top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full',
      'bg-white/85 text-ink-800 shadow-card backdrop-blur transition-colors hover:bg-white',
      side === 'start' ? 'start-3' : 'end-3',
    )}
  >
    {children}
  </button>
)
