import { http } from '@/api/client'
import type {
  PayloadResponse,
  SendOtpInput,
  SendOtpResult,
  SessionResponse,
  UpdateProfileInput,
  User,
  VerifyOtpInput,
  VerifyOtpResult,
} from '@/types'
import { toLatinDigits } from '@/lib/format'

/**
 * Authentication is phone + OTP, with no password. The session is an httpOnly
 * cookie set by the verify response, so there is nothing here that stores or
 * reads a token — the browser does it, and `withCredentials` on the axios
 * instance is what makes it send the cookie back.
 */

/**
 * `GET /api/auth/me` — who is logged in, or null.
 *
 * Deliberately unguarded and **always HTTP 200**, so this never throws for a
 * logged-out visitor. A 401 here would mean something genuinely wrong.
 */
export const fetchSession = (signal?: AbortSignal): Promise<SessionResponse> =>
  http.get<SessionResponse>('/auth/me', { signal })

/**
 * `POST /api/auth/otp/request` — login and signup in one: an unknown number
 * gets an account, a known one just receives a code.
 *
 * Rate limited to **2 requests per 2 minutes per IP** by the backend, because
 * an unprotected OTP endpoint is a direct SMS bill. A 429 here is expected
 * behaviour, not a bug, and the UI shows a countdown rather than a retry.
 *
 * Digits are converted to Latin first: a Persian keyboard produces ۰۹۱۲…, and
 * the backend's phone validator only accepts Latin digits.
 */
export const requestOtp = (input: SendOtpInput): Promise<SendOtpResult> =>
  http.post<SendOtpResult>('/auth/otp/request', {
    phoneNumber: toLatinDigits(input.phoneNumber).trim(),
  })

/**
 * `POST /api/auth/otp/verify` — checks the five-digit code and sets the
 * session cookie. The token is never in the response body.
 */
export const verifyOtp = (input: VerifyOtpInput): Promise<VerifyOtpResult> =>
  http.post<VerifyOtpResult>('/auth/otp/verify', {
    phoneNumber: toLatinDigits(input.phoneNumber).trim(),
    code: toLatinDigits(input.code).trim(),
  })

/** `POST /api/auth/logout` — clears the cookie server-side. */
export const logout = (): Promise<{ message: string }> =>
  http.post<{ message: string }>('/auth/logout')

/** `GET /api/me/profile`. */
export const fetchProfile = async (signal?: AbortSignal): Promise<User> => {
  const response = await http.get<PayloadResponse<User>>('/me/profile', { signal })

  return response.payload
}

/**
 * `PATCH /api/me/profile` — `fullName` is the only editable field. The phone
 * number is the login identity and the role is never client-settable; the
 * backend strips any other field silently, so sending one looks like it
 * succeeded and changes nothing.
 */
export const updateProfile = async (input: UpdateProfileInput): Promise<User> => {
  const response = await http.patch<PayloadResponse<User>>('/me/profile', input)

  return response.payload
}
