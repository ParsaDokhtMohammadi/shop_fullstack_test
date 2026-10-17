import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { ORDER_MESSAGES } from '../../common/messages';

// The single source of truth for which hop is legal. Cancel, the admin status
// endpoint, the expiry job and the payments module all ask this table instead
// of each inventing its own rules — three places with their own idea of what
// `delivered` can become is how an order ends up going backwards.
//
// Read as: from this status, these are the only statuses it can become.
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Either the payment lands, somebody gives up, or the window runs out.
  [OrderStatus.PendingPayment]: [
    OrderStatus.Paid,
    OrderStatus.Cancelled,
    OrderStatus.Failed,
  ],
  // Paid can still be cancelled — the shop has not touched it yet — which is
  // a refund case rather than a plain cancel once money has moved.
  [OrderStatus.Paid]: [
    OrderStatus.Processing,
    OrderStatus.Cancelled,
    OrderStatus.Refunded,
  ],
  [OrderStatus.Processing]: [
    OrderStatus.Shipped,
    OrderStatus.Cancelled,
    OrderStatus.Refunded,
  ],
  // Once it is with the courier it cannot be cancelled, only refunded when it
  // comes back.
  [OrderStatus.Shipped]: [OrderStatus.Delivered, OrderStatus.Refunded],
  [OrderStatus.Delivered]: [OrderStatus.Refunded],
  // Ends. Nothing moves out of these — an order that needs to live again is a
  // new order, so history stays readable.
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Failed]: [],
  [OrderStatus.Refunded]: [],
};

// The statuses that hand back what the order was holding: its stock, and the
// coupon use it reserved at checkout. Whoever moves an order into one of these
// has to release the reservation in the same transaction.
//
// `refunded` is in here deliberately, including from `shipped` and
// `delivered`. It looks wrong — returning stock for goods that already went
// out — but the shop only marks an order refunded once the goods are back on
// the shelf, so by then the stock is real. Marking it refunded while the
// parcel is still with the customer is the mistake, not this list.
export const RELEASES_RESERVATION: OrderStatus[] = [
  OrderStatus.Cancelled,
  OrderStatus.Failed,
  OrderStatus.Refunded,
];

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  ORDER_TRANSITIONS[from].includes(to);

// Throws rather than returns, because every caller does the same thing with a
// false. The current status is in the message: an admin clicking "ship" on an
// order somebody just cancelled needs to know what it is now, not only that
// the click failed.
export const assertTransition = (from: OrderStatus, to: OrderStatus): void => {
  if (!canTransition(from, to))
    throw new BadRequestException(ORDER_MESSAGES.INVALID_TRANSITION(from, to));
};

// The statuses where the shop is holding the customer's money. Anything the
// CRM reports as "spent" counts only these: `pending_payment` and `failed`
// never paid, `cancelled` was called off, and `refunded` was given back, so
// counting any of them would overstate what a customer is worth.
export const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.Paid,
  OrderStatus.Processing,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
];
