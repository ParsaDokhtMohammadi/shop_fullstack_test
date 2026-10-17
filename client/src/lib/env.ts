/**
 * Deployment configuration, read once at module load.
 *
 * Vite replaces `import.meta.env.VITE_*` with a literal string at build time,
 * so these are compile-time values, not runtime lookups. That has two
 * consequences worth knowing: a change needs a rebuild, not a restart, and
 * anything here ends up readable in the browser's JavaScript — so no secrets.
 */

/** Trailing slashes would produce `//api` once we append a path. */
const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

/**
 * The API origin, e.g. `http://192.168.1.50:3000`, or an empty string for a
 * same-origin deployment (nginx serving this app and proxying /api).
 *
 * Empty is the default and the recommended setup, because the session is an
 * httpOnly cookie: same-origin means no CORS allow-list to maintain and no
 * sameSite edge cases.
 */
export const API_ORIGIN = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ?? '',
)

/**
 * Where HTTP requests go. The backend mounts every route under `/api`, so that
 * prefix belongs here rather than being repeated in every endpoint function.
 */
export const API_BASE_URL = `${API_ORIGIN}/api`

/**
 * Turns a stored file path into a URL the browser can load.
 *
 * NestJS serves uploads off disk at `/uploads/...` — deliberately outside the
 * `/api` prefix, because they are files and not endpoints. So an image path
 * resolves against the API *origin*, never against API_BASE_URL.
 *
 * Returns null for a missing image so callers can render a placeholder instead
 * of a broken one; `coverImage` and `logoUrl` are both nullable in the API.
 */
export const assetUrl = (path: string | null | undefined): string | null => {
  if (!path) return null
  // Already absolute (a future S3-style storage driver would return this).
  if (/^https?:\/\//i.test(path)) return path

  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
