import { ProductListing } from '@/features/catalog/components/ProductListing'

/** `/products` — the whole catalogue, with search and sorting from the URL. */
export const ProductsPage = () => (
  <ProductListing
    title="همه محصولات"
    description="در میان همه کالاهای فروشگاه جستجو کنید."
  />
)
