import { AxiosError } from 'axios'

/**
 * The one error shape the backend produces, from its global exception filter:
 *
 *   { statusCode, message, path, timestamp }
 *
 * `message` is a string for a thrown exception and an **array** of strings for
 * a validation failure, because NestJS's ValidationPipe puts one entry per
 * failed rule. Both are already user-facing Persian, so they can be shown as
 * they are rather than mapped to our own copy.
 */
interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  path?: string
  timestamp?: string
}

/** Shown when the server said nothing useful, or never answered at all. */
const FALLBACK_MESSAGE = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'
const NETWORK_MESSAGE =
  'ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.'
/**
 * For a 5xx. The body of one of these is not our API's JSON — it is nginx's
 * or the dev proxy's own error page — so its text must never reach the
 * customer. Verified against a real 502: with the backend stopped, the dev
 * server answers with a plain-text gateway error, which without this check
 * was being rendered as the error message.
 */
const SERVER_MESSAGE =
  'سرور در حال حاضر پاسخ نمی‌دهد. چند لحظه بعد دوباره تلاش کنید.'

/**
 * A normalised API failure. Every request rejects with one of these, so no
 * component ever has to know that axios exists or dig through
 * `error.response.data.message` and handle both of its shapes.
 */
export class ApiError extends Error {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number
  /** Every message the server sent, always as an array. */
  readonly messages: string[]
  /** The request path, for logs. */
  readonly path?: string

  constructor(status: number, messages: string[], path?: string) {
    super(messages[0] ?? FALLBACK_MESSAGE)
    this.name = 'ApiError'
    this.status = status
    this.messages = messages.length > 0 ? messages : [FALLBACK_MESSAGE]
    this.path = path
  }

  /** No session, or it expired. The caller should send the user to login. */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /**
   * Not found — but on an `/api/admin/*` route this is also what a
   * non-admin gets. AdminGuard answers 404 rather than 403 on purpose, so
   * admin routes are not discoverable. Treat a 404 from an admin endpoint as
   * "you are not an admin", not as a broken URL.
   */
  get isNotFound(): boolean {
    return this.status === 404
  }

  /** A failed validation or a rejected business rule — worth showing in full. */
  get isValidation(): boolean {
    return this.status === 400 || this.status === 422
  }

  /** Rate limited. The backend throttles OTP requests and discount previews. */
  get isTooManyRequests(): boolean {
    return this.status === 429
  }

  /** The request never got an answer: server down, wrong URL, DNS, offline. */
  get isNetworkError(): boolean {
    return this.status === 0
  }
}

/** Normalises anything axios throws into an ApiError. */
export const toApiError = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error

  if (error instanceof AxiosError) {
    const response = error.response

    // No response at all: the server is down, unreachable, or CORS blocked
    // the request before the browser would let us read it.
    if (!response) return new ApiError(0, [NETWORK_MESSAGE])

    const body = response.data as ApiErrorBody | string | null

    // A proxy or load balancer in front of the API answers 5xx with its own
    // HTML or plain text, so only the API's own JSON shape is trusted to
    // supply a message. Anything else gets our wording for that status.
    const isApiBody =
      typeof body === 'object' && body !== null && 'message' in body

    if (!isApiBody)
      return new ApiError(response.status, [
        response.status >= 500 ? SERVER_MESSAGE : FALLBACK_MESSAGE,
      ])

    const raw = body.message
    const messages = Array.isArray(raw)
      ? raw.filter((entry): entry is string => typeof entry === 'string')
      : typeof raw === 'string'
        ? [raw]
        : []

    return new ApiError(response.status, messages, body.path)
  }

  return new ApiError(0, [error instanceof Error ? error.message : FALLBACK_MESSAGE])
}
