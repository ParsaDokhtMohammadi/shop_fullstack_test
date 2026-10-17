/**
 * Persian formatting. Everything the UI shows a number or a date through lives
 * here, so the whole app agrees on digits, separators and the calendar.
 *
 * No date library is needed: `Intl.DateTimeFormat` with the `fa-IR` locale
 * already converts to the Jalali (Solar Hijri) calendar and renders Persian
 * digits, in every current browser and in Node. That is one less dependency
 * to keep patched, and it is more correct than a hand-rolled conversion.
 */

/** `fa-IR` gives Persian digits (۰۱۲) and the ٬ thousands separator. */
const LOCALE = 'fa-IR'

const numberFormatter = new Intl.NumberFormat(LOCALE)

/** Jalali, e.g. "۲۵ مهر ۱۴۰۴". */
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

/** Jalali with a 24-hour clock, e.g. "۲۵ مهر ۱۴۰۴، ساعت ۱۴:۳۰". */
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** A number with Persian digits and separators: 1250000 → "۱٬۲۵۰٬۰۰۰". */
export const formatNumber = (value: number | string): string => {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(numeric)) return '—'

  return numberFormatter.format(numeric)
}

/**
 * A price, with its unit. Money arrives from the API as a digits-only string
 * in Toman, so it is only ever converted for display and never parsed and sent
 * back.
 */
export const formatPrice = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'

  return `${numberFormatter.format(numeric)} تومان`
}

/** The amount without the unit, for places that render "تومان" separately. */
export const formatAmount = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—'

  return formatNumber(value)
}

/** Free, rather than "۰ تومان", which reads as a missing value. */
export const formatShipping = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—'

  return Number(value) === 0 ? 'رایگان' : formatPrice(value)
}

/** An ISO timestamp as a Jalali date: "۲۵ مهر ۱۴۰۴". */
export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return dateFormatter.format(date)
}

/** An ISO timestamp as a Jalali date and time. */
export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return dateTimeFormatter.format(date).replace(',', '،')
}

/**
 * "۳ روز پیش" and friends, via `Intl.RelativeTimeFormat` — used next to an
 * absolute date, not instead of it, so nothing important depends on it.
 */
const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

export const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  let duration = (date.getTime() - Date.now()) / 1000
  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount)
      return relativeFormatter.format(Math.round(duration), division.unit)
    duration /= division.amount
  }

  return formatDate(iso)
}

/**
 * The backend normalises phone numbers to `+989123456789`. Iranians read and
 * write them as `09123456789`, so that is what the UI shows.
 *
 * The result stays in Latin digits and is rendered inside a `.ltr` element:
 * converting a phone number to Persian digits makes it harder to read back to
 * a courier, and letting RTL reorder it is worse.
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '—'
  if (phone.startsWith('+98')) return `0${phone.slice(3)}`
  if (phone.startsWith('0098')) return `0${phone.slice(4)}`

  return phone
}

/**
 * Turns Persian and Arabic digits into Latin ones before a value is sent to
 * the API. Necessary because a Persian keyboard produces ۰۹۱۲…, and the
 * backend's phone and OTP validators only accept Latin digits — without this,
 * a customer typing their own number in their own script gets a validation
 * error they cannot see the cause of.
 */
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

export const toLatinDigits = (value: string): string =>
  value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = PERSIAN_DIGITS.indexOf(digit)
    if (persian > -1) return String(persian)

    return String(ARABIC_DIGITS.indexOf(digit))
  })

/** A percentage badge: "۱۵٪". */
export const formatPercent = (value: string | number): string =>
  `${formatNumber(value)}٪`

/**
 * How much a variant's discount saves, as a percentage, for the badge on a
 * card. Returns null when there is no discount, so the caller renders nothing
 * rather than a "۰٪" badge.
 */
export const discountPercentOf = (
  price: string,
  finalPrice: string,
): number | null => {
  const listed = Number(price)
  const final = Number(finalPrice)
  if (!Number.isFinite(listed) || !Number.isFinite(final)) return null
  if (listed <= 0 || final >= listed) return null

  return Math.round(((listed - final) / listed) * 100)
}
