import { createContext, useContext } from 'react'
import type { GuestCartLine } from './guest-cart'

/**
 * The context object and its hook, kept apart from the provider component.
 *
 * Not an arbitrary split: Vite's fast refresh can only replace a module that
 * exports components and nothing else, so a file holding both the provider and
 * this hook loses hot reloading for the whole subtree on every edit.
 */
export interface GuestCartContextValue {
  lines: GuestCartLine[]
  /** Total quantity, for the header badge. */
  count: number
  add: (productVarientId: string, slug: string, quantity?: number) => void
  setQuantity: (productVarientId: string, quantity: number) => void
  remove: (productVarientId: string) => void
  clear: () => void
}

export const GuestCartContext = createContext<GuestCartContextValue | null>(null)

export const useGuestCart = (): GuestCartContextValue => {
  const context = useContext(GuestCartContext)
  if (!context)
    throw new Error('useGuestCart must be used inside a GuestCartProvider')

  return context
}
