import type { Role } from './common'

/** The logged-in account, as `GET /api/auth/me` and the profile endpoints return it. */
export interface User {
  id: string
  /** Null until the customer fills it in — OTP signup only captures a phone. */
  fullName: string | null
  /** Normalised by the backend to `+98…`. */
  phoneNumber: string
  role: Role
  createdAt: string
}

/**
 * `GET /api/auth/me`. Note there is no `message` key on this one, and it is
 * **always HTTP 200** — the endpoint is deliberately unguarded. `user` is null
 * when there is no cookie, when it is expired or malformed, and when the token
 * is valid but the account behind it is gone. Branch on `user`, never on the
 * status code.
 */
export interface SessionResponse {
  user: User | null
}

/** `POST /api/auth/otp/request`. */
export interface SendOtpInput {
  phoneNumber: string
}

/** The code is not returned, only how long it lives. */
export interface SendOtpResult {
  message: string
  /** The normalised number the code went to, e.g. `+989123456789`. */
  phoneNumber: string
  /** Seconds until the code expires. */
  expiresIn: number
}

/** `POST /api/auth/otp/verify`. The code is exactly five digits. */
export interface VerifyOtpInput {
  phoneNumber: string
  code: string
}

/**
 * The session cookie is set by this response's `Set-Cookie` header — the token
 * is never in the body, so there is nothing for the frontend to store.
 */
export interface VerifyOtpResult {
  message: string
  user: Pick<User, 'id' | 'fullName' | 'phoneNumber' | 'role'>
}

/** `PATCH /api/me/profile`. Both fields are optional. */
export interface UpdateProfileInput {
  fullName?: string
}
