import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Site search. Submits to the products page as a `?search=` query parameter
 * rather than holding the term in component state, which means a search result
 * page can be bookmarked, shared and reloaded — and the back button works.
 *
 * The API matches anywhere in the product name (`ILIKE %term%`) and searches
 * nothing else, so there is no point offering filters here that it cannot
 * honour.
 */
export const SearchBox = ({
  className,
  autoFocus = false,
  onSubmitted,
}: {
  className?: string
  autoFocus?: boolean
  /** Lets the mobile drawer close itself once a search is submitted. */
  onSubmitted?: () => void
}) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Seeded from the URL so the box still shows the term after a reload.
  const [term, setTerm] = useState(() => searchParams.get('search') ?? '')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = term.trim()

    // An empty search means "show everything", which is the plain products
    // page — not `?search=`, which would be a filter on nothing.
    navigate(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : '/products')
    onSubmitted?.()
  }

  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <label htmlFor="site-search" className="sr-only">
        جستجوی محصولات
      </label>
      <Search
        className="text-ink-400 pointer-events-none absolute inset-y-0 start-0 my-auto size-5 ms-3.5"
        aria-hidden="true"
      />
      <input
        id="site-search"
        type="search"
        value={term}
        autoFocus={autoFocus}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="نام محصول را جستجو کنید…"
        className={cn(
          'border-ink-200 bg-ink-50 h-11 w-full rounded-control border ps-11 pe-10 text-sm',
          'placeholder:text-ink-400 text-ink-900',
          'transition-colors hover:border-ink-300 hover:bg-white',
          'focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-600/20 focus:outline-none',
          // Safari draws its own clear button on type="search"; ours is below.
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {term && (
        <button
          type="button"
          onClick={() => setTerm('')}
          aria-label="پاک کردن جستجو"
          className="text-ink-400 hover:text-ink-700 absolute inset-y-0 end-0 my-auto flex size-9 cursor-pointer items-center justify-center me-1"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </form>
  )
}
