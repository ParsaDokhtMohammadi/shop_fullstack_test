import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowRight, LogIn, ShieldCheck, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Surface'
import { Input } from '@/components/ui/Field'
import { Alert, FormError } from '@/components/ui/states'
import { formatNumber, formatPhone, toLatinDigits } from '@/lib/format'
import { useRequestOtp, useSession, useVerifyOtp } from '@/features/auth/queries'

/**
 * `/login` — phone + OTP, which is login and signup in one: an unknown number
 * gets an account, a known one just receives a code. There is no password
 * anywhere in this backend.
 *
 * Two steps in one page rather than two routes, because the second step is
 * meaningless without the state of the first — a reload on a `/login/verify`
 * route would land on a form with no code on its way.
 */
export const LoginPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isLoggedIn, isResolved } = useSession()

  /**
   * Where to go after logging in. Set by the route guard when it bounces a
   * visitor away from a protected page, so checkout resumes where it left off.
   * Only a path is accepted — an absolute URL here would be an open redirect,
   * letting a crafted link send someone to another site that looks like login.
   */
  const rawNext = searchParams.get('next')
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
    ? rawNext
    : '/'

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  /** When the code sent by the backend stops being valid. */
  const [codeDeadline, setCodeDeadline] = useState(0)

  const requestOtp = useRequestOtp()
  const verifyOtp = useVerifyOtp()

  // Already logged in: nothing to do here.
  useEffect(() => {
    if (isResolved && isLoggedIn) void navigate(next, { replace: true })
  }, [isResolved, isLoggedIn, navigate, next])

  const onRequest = (event: FormEvent) => {
    event.preventDefault()
    requestOtp.mutate(
      { phoneNumber: phone },
      {
        onSuccess: (result) => {
          // The backend normalises the number (+98…); showing its version back
          // avoids "I typed 0912… but it says +98912…" confusion later.
          setPhone(result.phoneNumber)
          // `expiresIn` is in seconds, from the backend's own OTP TTL.
          setCodeDeadline(Date.now() + result.expiresIn * 1000)
          setStep('code')
        },
      },
    )
  }

  const onVerify = (event: FormEvent) => {
    event.preventDefault()
    verifyOtp.mutate(
      { phoneNumber: phone, code },
      { onSuccess: () => void navigate(next, { replace: true }) },
    )
  }

  return (
    <div className="page-container flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <Card className="flex flex-col gap-6">
          <div className="text-center">
            <span className="bg-brand-50 text-brand-700 mx-auto mb-4 flex size-14 items-center justify-center rounded-full">
              {step === 'phone' ? (
                <Smartphone className="size-6" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-6" aria-hidden="true" />
              )}
            </span>
            <h1 className="text-xl font-bold">
              {step === 'phone' ? 'ورود یا ثبت‌نام' : 'کد تأیید را وارد کنید'}
            </h1>
            <p className="text-ink-500 mt-2 text-sm leading-6">
              {step === 'phone'
                ? 'شماره موبایل خود را وارد کنید تا کد ورود برایتان ارسال شود.'
                : 'کد پنج‌رقمی ارسال‌شده به شماره زیر را وارد کنید.'}
            </p>
            {step === 'code' && (
              <p className="text-ink-800 ltr mt-1 text-sm font-medium">
                {formatPhone(phone)}
              </p>
            )}
          </div>

          {step === 'phone' ? (
            <form onSubmit={onRequest} className="flex flex-col gap-4" noValidate>
              <Input
                label="شماره موبایل"
                type="tel"
                name="phone"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="09123456789"
                value={phone}
                // Converted as the customer types, so a Persian keyboard does
                // not produce a value the backend rejects.
                onChange={(event) => setPhone(toLatinDigits(event.target.value))}
                hint="مثلاً ۰۹۱۲۳۴۵۶۷۸۹"
                required
                autoFocus
              />

              <RateLimitNote error={requestOtp.error} />
              <FormError error={requestOtp.error} />

              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={requestOtp.isPending}
                loadingText="در حال ارسال کد…"
                icon={<LogIn className="size-5" aria-hidden="true" />}
              >
                ارسال کد تأیید
              </Button>
            </form>
          ) : (
            <form onSubmit={onVerify} className="flex flex-col gap-4" noValidate>
              <OtpInput value={code} onChange={setCode} />

              <ExpiryCountdown deadline={codeDeadline} />

              <FormError error={verifyOtp.error} />

              <Button
                type="submit"
                size="lg"
                fullWidth
                // The code is exactly five digits, so the button stays off
                // until there are five — one fewer wasted attempt against the
                // five the backend allows per code.
                disabled={code.length !== 5}
                isLoading={verifyOtp.isPending}
                loadingText="در حال بررسی…"
              >
                ورود به حساب
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone')
                  setCode('')
                  verifyOtp.reset()
                }}
                className="text-ink-600 hover:text-brand-700 inline-flex cursor-pointer items-center justify-center gap-1.5 text-sm transition-colors"
              >
                <ArrowRight className="size-4" aria-hidden="true" />
                تغییر شماره موبایل
              </button>
            </form>
          )}
        </Card>

        <p className="text-ink-500 mt-5 text-center text-xs leading-6">
          با ورود به حساب،{' '}
          <Link to="/" className="text-brand-700 hover:underline">
            قوانین فروشگاه
          </Link>{' '}
          را می‌پذیرید.
        </p>
      </div>
    </div>
  )
}

/**
 * The five-digit code input.
 *
 * One field rather than five boxes: five separate inputs break paste, confuse
 * password managers and need focus juggling, and the SMS autofill hint below
 * does the useful part on its own.
 */
const OtpInput = ({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) => {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <Input
      ref={ref}
      label="کد تأیید"
      type="text"
      inputMode="numeric"
      // Lets iOS and Android offer the code straight from the SMS.
      autoComplete="one-time-code"
      maxLength={5}
      placeholder="—————"
      value={value}
      onChange={(event) =>
        onChange(toLatinDigits(event.target.value).replace(/\D/g, '').slice(0, 5))
      }
      className="ltr text-center text-2xl font-bold tracking-[0.5em]"
      required
    />
  )
}

/**
 * Counts the code's two-minute life down, so waiting is not a guess.
 *
 * Driven by an absolute deadline rather than a decrementing counter: the only
 * state written is "what time is it", from inside the timer callback, which is
 * the legitimate shape for subscribing to something outside React. A counter
 * seeded in an effect would also drift whenever the tab was backgrounded and
 * the interval throttled.
 */
const ExpiryCountdown = ({ deadline }: { deadline: number }) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(timer)
  }, [])

  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000))

  if (remaining <= 0)
    return (
      <p className="text-warn-700 text-center text-sm">
        اعتبار کد به پایان رسیده است. شماره را تغییر دهید و کد تازه بگیرید.
      </p>
    )

  const minutes = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <p className="text-ink-500 text-center text-sm tabular-nums">
      اعتبار کد: {formatNumber(minutes)}:
      {secs < 10 ? `۰${formatNumber(secs)}` : formatNumber(secs)}
    </p>
  )
}

/**
 * A 429 on the OTP request is the backend protecting itself — two requests per
 * two minutes per IP — and it is expected behaviour, not a fault. Saying so is
 * more useful than repeating the generic throttler message.
 */
const RateLimitNote = ({ error }: { error: unknown }) => {
  const isThrottled =
    typeof error === 'object' &&
    error !== null &&
    'isTooManyRequests' in error &&
    (error as { isTooManyRequests: boolean }).isTooManyRequests

  if (!isThrottled) return null

  return (
    <Alert tone="warn">
      برای جلوگیری از ارسال پیامک تکراری، چند دقیقه صبر کنید و سپس دوباره تلاش
      کنید.
    </Alert>
  )
}
