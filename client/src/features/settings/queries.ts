import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { fetchSettings } from './api'

/**
 * The shop's public settings. Used by the header, the footer and the
 * free-shipping notice, so it is cached for half an hour — these values change
 * when an admin edits them, which is not during a visit.
 */
export const useSettings = () =>
  useQuery({
    queryKey: queryKeys.settings,
    queryFn: ({ signal }) => fetchSettings(signal),
    staleTime: STALE_TIME.settings,
  })
