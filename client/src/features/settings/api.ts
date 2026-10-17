import { http } from '@/api/client'
import type { PayloadResponse, PublicSettings } from '@/types'

/**
 * `GET /api/settings` — public, no session needed. The storefront calls this
 * before anyone logs in, for the shop name, logo, contact details and the
 * shipping rule. It always returns a row, even on a shop where no admin has
 * saved settings yet, so there is no empty state to handle.
 */
export const fetchSettings = async (signal?: AbortSignal): Promise<PublicSettings> => {
  const response = await http.get<PayloadResponse<PublicSettings>>('/settings', {
    signal,
  })

  return response.payload
}
