import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { MapPin, Pencil, Plus, Star, Trash2, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Surface'
import { Input } from '@/components/ui/Field'
import { PaymentStatusBadge } from '@/components/ui/Badge'
import { ErrorState, FormError, LoadingState } from '@/components/ui/states'
import { formatDate, formatPhone, formatPrice } from '@/lib/format'
import { useProfile, useSession, useUpdateProfile } from '@/features/auth/queries'
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
} from '@/features/addresses/queries'
import { AddressForm } from '@/features/addresses/components/AddressForm'
import { usePayments } from '@/features/payments/queries'
import type { Address } from '@/types'

/**
 * `/account` — profile, saved addresses and payment history.
 *
 * What is *not* here, because the backend does not support it: changing the
 * phone number (it is the login identity and there is no change-phone flow),
 * setting an email or a password (neither exists on the user row), and
 * deleting the account. `fullName` is the only editable field on the profile.
 */
export const AccountPage = () => {
  const { user } = useSession()
  const profile = useProfile()

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">حساب کاربری</h1>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-5">
          <ProfileCard
            isLoading={profile.isPending}
            error={profile.isError ? profile.error : null}
            fullName={profile.data?.fullName ?? user?.fullName ?? null}
            phoneNumber={profile.data?.phoneNumber ?? user?.phoneNumber ?? ''}
            createdAt={profile.data?.createdAt ?? user?.createdAt ?? null}
          />
          <PaymentsCard />
        </div>

        <AddressesCard />
      </div>
    </div>
  )
}

const ProfileCard = ({
  isLoading,
  error,
  fullName,
  phoneNumber,
  createdAt,
}: {
  isLoading: boolean
  error: unknown
  fullName: string | null
  phoneNumber: string
  createdAt: string | null
}) => {
  const [isEditing, setEditing] = useState(false)
  const [name, setName] = useState(fullName ?? '')
  const updateProfile = useUpdateProfile()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    updateProfile.mutate(
      // Trimmed because the backend trims before checking the length, so a
      // name of only spaces would be stored as an empty string anyway.
      { fullName: name.trim() },
      { onSuccess: () => setEditing(false) },
    )
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-bold">
          <UserIcon className="text-brand-600 size-5" aria-hidden="true" />
          اطلاعات من
        </h2>
        {!isEditing && !isLoading && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setName(fullName ?? '')
              setEditing(true)
            }}
            icon={<Pencil className="size-4" aria-hidden="true" />}
          >
            ویرایش
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="در حال بارگذاری…" />
      ) : error ? (
        <ErrorState error={error} />
      ) : isEditing ? (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Input
            label="نام و نام خانوادگی"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            hint="برای حذف نام، این فیلد را خالی بگذارید."
            autoFocus
          />
          <FormError error={updateProfile.error} />
          <div className="flex gap-3">
            <Button type="submit" isLoading={updateProfile.isPending} loadingText="ذخیره…">
              ذخیره
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(false)
                updateProfile.reset()
              }}
            >
              انصراف
            </Button>
          </div>
        </form>
      ) : (
        <dl className="space-y-3.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-600">نام</dt>
            <dd className="font-medium">
              {fullName?.trim() || <span className="text-ink-400">ثبت نشده</span>}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-600">شماره موبایل</dt>
            {/* Not editable: the phone number is the login identity, and the
                backend has no change-phone flow. */}
            <dd className="ltr font-medium">{formatPhone(phoneNumber)}</dd>
          </div>
          {createdAt && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-600">تاریخ عضویت</dt>
              <dd className="font-medium">{formatDate(createdAt)}</dd>
            </div>
          )}
        </dl>
      )}
    </Card>
  )
}

const AddressesCard = () => {
  const addresses = useAddresses()
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const setDefault = useSetDefaultAddress()
  const deleteAddress = useDeleteAddress()

  const [isAdding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-bold">
          <MapPin className="text-brand-600 size-5" aria-hidden="true" />
          نشانی‌های من
        </h2>
        {!isAdding && !editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
            icon={<Plus className="size-4" aria-hidden="true" />}
          >
            نشانی جدید
          </Button>
        )}
      </div>

      {isAdding ? (
        <AddressForm
          isSubmitting={createAddress.isPending}
          error={createAddress.error}
          onCancel={() => setAdding(false)}
          onSubmit={(values) =>
            createAddress.mutate(values, { onSuccess: () => setAdding(false) })
          }
        />
      ) : editing ? (
        <AddressForm
          initial={editing}
          // isDefault is not accepted by PATCH /addresses/:id — switching the
          // default has its own endpoint, so the toggle is hidden here.
          showDefaultToggle={false}
          submitLabel="ذخیره تغییرات"
          isSubmitting={updateAddress.isPending}
          error={updateAddress.error}
          onCancel={() => setEditing(null)}
          onSubmit={(values) =>
            updateAddress.mutate(
              // isDefault is dropped rather than destructured away: PATCH
              // /addresses/:id does not accept it, and the whitelist would
              // strip it silently.
              {
                id: editing.id,
                input: {
                  firstName: values.firstName,
                  lastName: values.lastName,
                  province: values.province,
                  city: values.city,
                  address: values.address,
                  postalCode: values.postalCode,
                  phoneNumber: values.phoneNumber,
                  info: values.info,
                },
              },
              { onSuccess: () => setEditing(null) },
            )
          }
        />
      ) : addresses.isPending ? (
        <LoadingState label="در حال بارگذاری نشانی‌ها…" />
      ) : addresses.isError ? (
        <ErrorState error={addresses.error} onRetry={() => void addresses.refetch()} />
      ) : addresses.data.length === 0 ? (
        <p className="text-ink-500 py-6 text-center text-sm">
          هنوز نشانی‌ای ثبت نکرده‌اید.
        </p>
      ) : (
        <>
          <FormError error={setDefault.error ?? deleteAddress.error} />
          <ul className="flex flex-col gap-3">
            {addresses.data.map((address) => (
              <li
                key={address.id}
                className="border-ink-200 rounded-control border p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">
                    {address.firstName} {address.lastName}
                    {address.isDefault && (
                      <span className="bg-brand-100 text-brand-800 ms-2 rounded-pill px-2 py-0.5 text-xs font-medium">
                        پیش‌فرض
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-1">
                    {!address.isDefault && (
                      <IconButton
                        label="انتخاب به عنوان پیش‌فرض"
                        onClick={() => setDefault.mutate(address.id)}
                        isDisabled={setDefault.isPending}
                      >
                        <Star className="size-4" aria-hidden="true" />
                      </IconButton>
                    )}
                    <IconButton label="ویرایش نشانی" onClick={() => setEditing(address)}>
                      <Pencil className="size-4" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label="حذف نشانی"
                      tone="danger"
                      isDisabled={deleteAddress.isPending}
                      onClick={() => deleteAddress.mutate(address.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>

                <p className="text-ink-600 mt-2 leading-6">
                  {address.province}، {address.city}، {address.address}
                </p>
                <p className="text-ink-500 ltr mt-1 text-xs">
                  {formatPhone(address.phoneNumber)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

const IconButton = ({
  label,
  onClick,
  children,
  tone = 'neutral',
  isDisabled = false,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  tone?: 'neutral' | 'danger'
  isDisabled?: boolean
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isDisabled}
    aria-label={label}
    title={label}
    className={`flex size-8 cursor-pointer items-center justify-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      tone === 'danger'
        ? 'text-ink-400 hover:bg-sale-50 hover:text-sale-600'
        : 'text-ink-400 hover:bg-ink-100 hover:text-brand-700'
    }`}
  >
    {children}
  </button>
)

/**
 * Payment history. Every attempt, including abandoned ones — which is the
 * point: a customer asking "did my money go?" is usually looking at one of
 * those, and `refId` is the receipt number to quote.
 */
const PaymentsCard = () => {
  const payments = usePayments({ page: 1, limit: 5 })

  return (
    <Card>
      <h2 className="mb-4 text-base font-bold">آخرین پرداخت‌ها</h2>

      {payments.isPending ? (
        <LoadingState label="در حال بارگذاری…" />
      ) : payments.isError ? (
        <ErrorState error={payments.error} onRetry={() => void payments.refetch()} />
      ) : payments.data.items.length === 0 ? (
        <p className="text-ink-500 py-6 text-center text-sm">
          تراکنشی ثبت نشده است.
        </p>
      ) : (
        <ul className="divide-ink-100 divide-y text-sm">
          {payments.data.items.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  {payment.orderNumber ? (
                    <Link
                      to={`/orders/${payment.orderId}`}
                      className="hover:text-brand-700 ltr font-medium transition-colors"
                    >
                      {payment.orderNumber}
                    </Link>
                  ) : (
                    <span className="text-ink-400">سفارش حذف‌شده</span>
                  )}
                  <PaymentStatusBadge status={payment.status} />
                </p>
                <p className="text-ink-500 mt-1 text-xs">
                  {formatDate(payment.createdAt)}
                  {payment.refId && (
                    <>
                      {' · '}
                      <span className="ltr">{payment.refId}</span>
                    </>
                  )}
                </p>
              </div>
              <span className="font-semibold">{formatPrice(payment.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
