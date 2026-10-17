import { http } from '@/api/client'
import type { Address, AddressInput, ApiMessage, PayloadResponse } from '@/types'
import { toLatinDigits } from '@/lib/format'

/**
 * Saved shipping addresses. All five routes are behind AuthGuard.
 *
 * Phone and postal codes go through `toLatinDigits` first: the backend's
 * validators require Latin digits and a postal code of exactly ten of them, so
 * a customer typing ۱۲۳۴۵۶۷۸۹۰ on a Persian keyboard would otherwise get a
 * validation error with no visible cause.
 */

const normalise = <T extends Omit<AddressInput, 'isDefault'>>(input: T) => ({
  ...input,
  phoneNumber: toLatinDigits(input.phoneNumber).trim(),
  // An empty postal code is omitted rather than sent as "", which would fail
  // the ten-digit rule instead of being treated as absent.
  postalCode: input.postalCode
    ? toLatinDigits(input.postalCode).trim()
    : undefined,
})

/** `GET /api/addresses` — default address first, then newest. */
export const fetchAddresses = async (signal?: AbortSignal): Promise<Address[]> => {
  const response = await http.get<PayloadResponse<Address[]>>('/addresses', {
    signal,
  })

  return response.payload
}

/** `POST /api/addresses`. */
export const createAddress = async (input: AddressInput): Promise<Address> => {
  const response = await http.post<PayloadResponse<Address>>(
    '/addresses',
    normalise(input),
  )

  return response.payload
}

/**
 * `PATCH /api/addresses/:id` — every field is optional, and `isDefault` is
 * **not accepted here**. Switching the default has its own endpoint so that
 * only one code path touches the partial unique index; sending it to this one
 * would be stripped silently by the whitelist and appear to have worked.
 */
export const updateAddress = async (
  id: string,
  input: Omit<AddressInput, 'isDefault'>,
): Promise<Address> => {
  const response = await http.patch<PayloadResponse<Address>>(
    `/addresses/${id}`,
    normalise(input),
  )

  return response.payload
}

/**
 * `PATCH /api/addresses/:id/default` — a dedicated route because only one
 * address per user may be the default, which a partial unique index enforces.
 */
export const setDefaultAddress = async (id: string): Promise<Address> => {
  const response = await http.patch<PayloadResponse<Address>>(
    `/addresses/${id}/default`,
  )

  return response.payload
}

/** `DELETE /api/addresses/:id`. */
export const deleteAddress = (id: string): Promise<ApiMessage> =>
  http.delete<ApiMessage>(`/addresses/${id}`)
