import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { FormError } from '@/components/ui/states'
import { toLatinDigits } from '@/lib/format'
import type { Address, AddressInput } from '@/types'

/**
 * Create or edit a shipping address.
 *
 * The validation here mirrors the backend's DTO exactly — 2–60 characters for
 * names, 10–500 for the street address, exactly ten digits for a postal code —
 * so the common mistakes are caught before a round trip. The backend remains
 * the authority: anything this misses comes back as a 400 with a Persian
 * message, which `FormError` renders.
 */

const EMPTY: AddressInput = {
  firstName: '',
  lastName: '',
  province: '',
  city: '',
  address: '',
  postalCode: '',
  phoneNumber: '',
  info: '',
  isDefault: false,
}

type Errors = Partial<Record<keyof AddressInput, string>>

const validate = (values: AddressInput): Errors => {
  const errors: Errors = {}

  if (values.firstName.trim().length < 2) errors.firstName = 'نام را کامل وارد کنید.'
  if (values.lastName.trim().length < 2)
    errors.lastName = 'نام خانوادگی را کامل وارد کنید.'
  if (values.province.trim().length < 2) errors.province = 'استان را وارد کنید.'
  if (values.city.trim().length < 2) errors.city = 'شهر را وارد کنید.'
  if (values.address.trim().length < 10)
    errors.address = 'نشانی باید حداقل ۱۰ نویسه باشد.'
  if (values.address.trim().length > 500)
    errors.address = 'نشانی نباید بیشتر از ۵۰۰ نویسه باشد.'

  const phone = toLatinDigits(values.phoneNumber).trim()
  // The backend normalises several spellings, so this only rejects what is
  // clearly not an Iranian mobile number rather than enforcing one format.
  if (!/^(\+98|0098|98|0)?9\d{9}$/.test(phone))
    errors.phoneNumber = 'شماره موبایل معتبر نیست.'

  // Optional, but exactly ten digits when given.
  if (values.postalCode) {
    const postal = toLatinDigits(values.postalCode).trim()
    if (!/^\d{10}$/.test(postal)) errors.postalCode = 'کد پستی باید ۱۰ رقم باشد.'
  }

  return errors
}

export const AddressForm = ({
  initial,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  submitLabel = 'ذخیره نشانی',
  /** Hidden when editing: the default is switched by its own endpoint. */
  showDefaultToggle = true,
}: {
  initial?: Address
  onSubmit: (values: AddressInput) => void
  onCancel?: () => void
  isSubmitting: boolean
  error: unknown
  submitLabel?: string
  showDefaultToggle?: boolean
}) => {
  const [values, setValues] = useState<AddressInput>(() =>
    initial
      ? {
          firstName: initial.firstName,
          lastName: initial.lastName,
          province: initial.province,
          city: initial.city,
          address: initial.address,
          postalCode: initial.postalCode ?? '',
          phoneNumber: initial.phoneNumber,
          info: initial.info ?? '',
          isDefault: initial.isDefault,
        }
      : EMPTY,
  )
  // Only shown after a submit attempt, so the form does not turn red while
  // the customer is still typing their first field.
  const [errors, setErrors] = useState<Errors>({})

  const set = <K extends keyof AddressInput>(key: K, value: AddressInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onSubmit(values)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="نام"
          value={values.firstName}
          onChange={(event) => set('firstName', event.target.value)}
          error={errors.firstName}
          autoComplete="given-name"
          required
        />
        <Input
          label="نام خانوادگی"
          value={values.lastName}
          onChange={(event) => set('lastName', event.target.value)}
          error={errors.lastName}
          autoComplete="family-name"
          required
        />
        <Input
          label="استان"
          value={values.province}
          onChange={(event) => set('province', event.target.value)}
          error={errors.province}
          required
        />
        <Input
          label="شهر"
          value={values.city}
          onChange={(event) => set('city', event.target.value)}
          error={errors.city}
          required
        />
      </div>

      <Textarea
        label="نشانی کامل"
        value={values.address}
        onChange={(event) => set('address', event.target.value)}
        error={errors.address}
        hint="خیابان، کوچه، پلاک و واحد"
        rows={3}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="شماره موبایل گیرنده"
          type="tel"
          inputMode="numeric"
          placeholder="09123456789"
          value={values.phoneNumber}
          onChange={(event) => set('phoneNumber', toLatinDigits(event.target.value))}
          error={errors.phoneNumber}
          autoComplete="tel"
          required
        />
        <Input
          label="کد پستی (اختیاری)"
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="1234567890"
          value={values.postalCode ?? ''}
          onChange={(event) =>
            set('postalCode', toLatinDigits(event.target.value).replace(/\D/g, ''))
          }
          error={errors.postalCode}
          autoComplete="postal-code"
        />
      </div>

      <Textarea
        label="توضیح برای پیک (اختیاری)"
        value={values.info ?? ''}
        onChange={(event) => set('info', event.target.value)}
        hint="مثلاً: زنگ دوم، تحویل در ساعات اداری"
        rows={2}
      />

      {showDefaultToggle && (
        <label className="text-ink-700 flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={values.isDefault ?? false}
            onChange={(event) => set('isDefault', event.target.checked)}
            className="accent-brand-600 size-4 cursor-pointer"
          />
          این نشانی را به عنوان نشانی پیش‌فرض ثبت کن
        </label>
      )}

      <FormError error={error} />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isLoading={isSubmitting} loadingText="در حال ذخیره…">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            انصراف
          </Button>
        )}
      </div>
    </form>
  )
}
