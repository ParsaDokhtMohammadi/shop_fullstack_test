import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { OrderStatus, PaymentStatus } from '@/types'

type Tone = 'neutral' | 'brand' | 'success' | 'warn' | 'info' | 'sale'

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-success-700',
  warn: 'bg-warn-50 text-warn-700',
  info: 'bg-info-50 text-info-700',
  sale: 'bg-sale-50 text-sale-700',
}

interface BadgeProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

export const Badge = ({ tone = 'neutral', children, className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium whitespace-nowrap',
      TONES[tone],
      className,
    )}
  >
    {children}
  </span>
)

/**
 * The colour each order status gets. Centralised because the same status
 * appears on the orders list, the order detail and the payment result page,
 * and they must agree.
 *
 * The *label* is not here: the backend already sends a Persian `statusLabel`
 * with every order, so translating it again in the frontend would be a second
 * source of truth that could drift.
 */
const ORDER_STATUS_TONES: Record<OrderStatus, Tone> = {
  pending_payment: 'warn',
  paid: 'success',
  processing: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'neutral',
  // Never paid: the checkout window ran out. Distinct from cancelled, which
  // was somebody's decision.
  failed: 'sale',
  refunded: 'neutral',
}

export const OrderStatusBadge = ({
  status,
  label,
}: {
  status: OrderStatus
  /** The Persian label from the API. */
  label: string
}) => <Badge tone={ORDER_STATUS_TONES[status] ?? 'neutral'}>{label}</Badge>

const PAYMENT_STATUS_TONES: Record<PaymentStatus, Tone> = {
  pending: 'warn',
  success: 'success',
  failed: 'sale',
}

/** Payment attempts have no label in the API response, so these are ours. */
const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'در انتظار پرداخت',
  success: 'پرداخت شده',
  failed: 'ناموفق',
}

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <Badge tone={PAYMENT_STATUS_TONES[status] ?? 'neutral'}>
    {PAYMENT_STATUS_LABELS[status] ?? status}
  </Badge>
)
