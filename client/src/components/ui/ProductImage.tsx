import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { assetUrl } from '@/lib/env'

/**
 * A product image, with the two failures this API makes likely handled in one
 * place:
 *
 *  1. `coverImage` is null — a product can legitimately have no images, and
 *     several of the seeded ones do not.
 *  2. The path exists but the file does not. The backend deletes the row
 *     before the file, so the opposite is rare, but a restored database with
 *     an empty uploads folder produces exactly this.
 *
 * Both land on the same neutral placeholder rather than the browser's broken
 * image icon, which would otherwise punch a hole in a tidy product grid.
 */
export const ProductImage = ({
  src,
  alt,
  /** Tailwind aspect ratio class. Square for cards, 4/5 for the detail page. */
  ratio = 'aspect-square',
  className,
  sizes,
  priority = false,
}: {
  src: string | null | undefined
  alt: string
  ratio?: string
  className?: string
  sizes?: string
  /** True for above-the-fold images, which should not be lazy-loaded. */
  priority?: boolean
}) => {
  const [failed, setFailed] = useState(false)
  const url = assetUrl(src)
  const showPlaceholder = !url || failed

  return (
    <div
      className={cn(
        'bg-ink-100 relative overflow-hidden',
        ratio,
        className,
      )}
    >
      {showPlaceholder ? (
        <div
          className="text-ink-300 absolute inset-0 flex items-center justify-center"
          // The alt text already names the product, so the placeholder itself
          // is decorative.
          aria-hidden="true"
        >
          <ImageOff className="size-8" />
        </div>
      ) : (
        <img
          src={url}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          // Tells the browser it may decode off the main thread, which keeps
          // a long grid from janking as it scrolls.
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
    </div>
  )
}
