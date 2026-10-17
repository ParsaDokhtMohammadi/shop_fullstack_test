import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { useSession } from '@/features/auth/queries'
import type { AddressInput } from '@/types'
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  setDefaultAddress,
  updateAddress,
} from './api'

/** The customer's saved addresses. Behind AuthGuard, so gated on a session. */
export const useAddresses = () => {
  const { isLoggedIn } = useSession()

  return useQuery({
    queryKey: queryKeys.addresses,
    queryFn: ({ signal }) => fetchAddresses(signal),
    enabled: isLoggedIn,
    staleTime: STALE_TIME.live,
  })
}

/**
 * All four writes invalidate the one list. Setting a default changes two rows
 * — the old default is cleared and the new one set, in a transaction — so
 * patching a single entry in the cache would leave two addresses both claiming
 * to be the default until the next refetch.
 */
const useAddressMutation = <TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses }),
  })
}

export const useCreateAddress = () =>
  useAddressMutation((input: AddressInput) => createAddress(input))

export const useUpdateAddress = () =>
  useAddressMutation(
    ({ id, input }: { id: string; input: Omit<AddressInput, 'isDefault'> }) =>
      updateAddress(id, input),
  )

export const useSetDefaultAddress = () =>
  useAddressMutation((id: string) => setDefaultAddress(id))

export const useDeleteAddress = () =>
  useAddressMutation((id: string) => deleteAddress(id))
