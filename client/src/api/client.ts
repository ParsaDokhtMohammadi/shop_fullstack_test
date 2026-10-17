import axios from 'axios'
import { API_BASE_URL } from '@/lib/env'
import { toApiError } from './errors'

/**
 * The single HTTP client. Every request in the app goes through this, which is
 * what makes the base URL, the credentials setting and the error shape
 * configurable in one place.
 *
 * `withCredentials` is the important line. The backend authenticates with an
 * httpOnly cookie (`access_token`) rather than an Authorization header, so
 * there is no token for JavaScript to read or attach — the browser has to be
 * told to send the cookie, and for a cross-origin API it will not do so
 * unless this is on.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: 'application/json' },
  // Long enough for an image upload on a slow connection, short enough that a
  // dead backend fails visibly instead of spinning forever.
  timeout: 30_000,
})

/**
 * Normalise failures as they leave the client, so nothing downstream — hooks,
 * components, error boundaries — has to know about axios or handle the
 * backend's two possible `message` shapes.
 */
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)

/**
 * Thin typed helpers. They exist so endpoint functions read as one line and
 * unwrap `response.data` in one place rather than in every call site.
 *
 * `signal` is threaded through on reads: React Query hands each query function
 * an AbortSignal, and passing it on means a query that is no longer needed —
 * the user typed another search letter, or left the page — actually cancels
 * its request instead of finishing it and being thrown away.
 */
export const http = {
  get: async <T>(url: string, config?: { signal?: AbortSignal; params?: unknown }) =>
    (await api.get<T>(url, config)).data,

  post: async <T>(url: string, body?: unknown, config?: { signal?: AbortSignal }) =>
    (await api.post<T>(url, body, config)).data,

  patch: async <T>(url: string, body?: unknown) => (await api.patch<T>(url, body)).data,

  delete: async <T>(url: string) => (await api.delete<T>(url)).data,
}
