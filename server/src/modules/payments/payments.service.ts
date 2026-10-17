import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';
import type {
  InitiatePaymentResult,
  PaymentGateway,
  VerifyPaymentResult,
} from './payment-gateway.interface';
import { PaymentRefusedError, PaymentUnknownError } from './payment.errors';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import { AdminListPaymentsDto } from './dto/admin-list-payments.dto';
import { Order } from '../order/entities/order.entity';
import { OrderService } from '../order/order.service';
import { SettingsService } from '../settings/settings.service';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PAYMENT_MESSAGES, ORDER_STATUS_LABELS } from '../../common/messages';
import { PaginationDto, paginated } from '../../common/dto';
import { toLocalPhone } from '../../common/utils/phone.util';
import { env } from '../../config/env.config';

// What the callback hands back to the controller, which turns it into a
// redirect. Deliberately not an exception for the failure cases: a customer
// coming back from the gateway has to land on a shop page either way.
export interface CallbackOutcome {
  ok: boolean;
  message: string;
  orderNumber: string | null;
  refId: string | null;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payment');

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly dataSource: DataSource,
    private readonly orderService: OrderService,
    private readonly settingsService: SettingsService,
  ) {}

  // Step one: ask the gateway for a url, and remember the attempt.
  async initiate(userId: string, phoneNumber: string, dto: InitiatePaymentDto) {
    // Scoped by userId as well as id, so a guessed order id cannot be paid for
    // by somebody else.
    const order = await this.dataSource
      .getRepository(Order)
      .findOne({ where: { id: dto.orderId, userId } });
    if (!order) throw new NotFoundException(PAYMENT_MESSAGES.ORDER_NOT_FOUND);

    if (order.status === OrderStatus.Paid)
      throw new BadRequestException(PAYMENT_MESSAGES.ALREADY_PAID);
    // Anything other than pending_payment means cancelled, expired or already
    // on its way — none of which should take money.
    if (order.status !== OrderStatus.PendingPayment)
      throw new BadRequestException(PAYMENT_MESSAGES.ORDER_NOT_PAYABLE);

    const settings = await this.settingsService.get();

    let result: InitiatePaymentResult;
    try {
      result = await this.gateway.initiate({
        // From the order row. The client sent an id and nothing else.
        amount: order.grandTotal,
        description: `${settings.name} - سفارش ${order.orderNumber}`,
        mobile: toLocalPhone(phoneNumber),
        callbackUrl: env.payment.callbackUrl,
      });
    } catch (error) {
      this.logger.error(
        `initiate failed for order ${order.orderNumber}: ${(error as Error).message}`,
      );
      throw new BadRequestException(PAYMENT_MESSAGES.GATEWAY_FAILED);
    }

    await this.paymentRepository.save(
      this.paymentRepository.create({
        orderId: order.id,
        userId,
        provider: this.gateway.provider,
        reference: result.reference,
        // Snapshotted, so the verify step can compare it against the order's
        // total and notice if anything moved underneath.
        amount: order.grandTotal,
        status: PaymentStatus.Pending,
      }),
    );

    return {
      message: PAYMENT_MESSAGES.INITIATED,
      payload: {
        redirectUrl: result.redirectUrl,
        reference: result.reference,
        amount: order.grandTotal,
        orderNumber: order.orderNumber,
      },
    };
  }

  // Step two: the customer's browser comes back here. The route is public —
  // anyone can hit it — so nothing in the query is trusted beyond "which
  // attempt are we talking about".
  async handleCallback(dto: PaymentCallbackDto): Promise<CallbackOutcome> {
    if (!dto.Authority)
      return outcome(false, PAYMENT_MESSAGES.VERIFY_FAILED, null, null);

    const payment = await this.paymentRepository.findOne({
      where: { provider: this.gateway.provider, reference: dto.Authority },
    });
    if (!payment) {
      this.logger.warn(`callback for an unknown reference ${dto.Authority}`);
      return outcome(false, PAYMENT_MESSAGES.NOT_FOUND, null, null);
    }

    const order = await this.dataSource
      .getRepository(Order)
      .findOneBy({ id: payment.orderId });
    const orderNumber = order?.orderNumber ?? null;

    // Idempotency, first line. A callback that fires twice — a refresh, or a
    // retry from the gateway — finds the attempt already paid and reports what
    // it was, with no second verify call and no second write.
    if (payment.status === PaymentStatus.Success)
      return outcome(
        true,
        PAYMENT_MESSAGES.SUCCESS,
        orderNumber,
        payment.refId,
      );

    // A failed attempt is deliberately *not* a dead end. Only the gateway
    // knows whether money arrived, and this route is public, so a local
    // 'failed' is a conclusion we drew — possibly from a forged cancel — not a
    // fact. We ask again; Zarinpal's "already verified" keeps it idempotent.

    if (!order) {
      this.logger.error(`payment ${payment.id} points at a missing order`);
      return outcome(false, PAYMENT_MESSAGES.ORDER_NOT_FOUND, null, null);
    }

    // The money is only real once the gateway says so. `Status` in the query
    // string is the customer's browser talking, and that is forgeable, so it
    // decides nothing here — not even a cancel. The Authority is no secret
    // either: it sits in the customer's url bar, their history and the Referer
    // sent to the result page. If a claimed cancel skipped the verify call,
    // anyone holding it could close a live attempt, and the customer's real
    // callback would arrive to a settled row with the money already taken.
    //
    // So the only thing Status is used for is wording the message.
    const cancelled = dto.Status !== 'OK';

    let verified: VerifyPaymentResult;
    try {
      verified = await this.gateway.verify({
        reference: payment.reference,
        amount: payment.amount,
      });
    } catch (error) {
      // Unknown, so nothing is written: the attempt stays pending and the order
      // stays unpaid. A later callback, or an admin checking the gateway's
      // panel, settles it. Marking it failed here is how a shop ends up
      // keeping the money and denying the order.
      if (error instanceof PaymentUnknownError) {
        this.logger.error(
          `verify unresolved for ${payment.reference}: ${error.message}`,
        );

        return outcome(
          false,
          PAYMENT_MESSAGES.GATEWAY_FAILED,
          orderNumber,
          null,
        );
      }

      // Refused: the gateway answered, and the answer was no. The attempt is
      // dead — but the order is left alone on purpose, so the customer can try
      // again inside the payment window instead of rebuilding their basket.
      if (error instanceof PaymentRefusedError) await this.fail(payment.id);

      return outcome(
        false,
        cancelled
          ? PAYMENT_MESSAGES.CANCELLED_BY_USER
          : PAYMENT_MESSAGES.VERIFY_FAILED,
        orderNumber,
        null,
      );
    }

    // Verified — but against what? What the gateway collected is what we
    // snapshotted at initiate. If the order's total has moved since, this is
    // not a payment for this order and must not pass.
    if (payment.amount !== order.grandTotal) {
      this.logger.error(
        `amount mismatch on ${order.orderNumber}: charged ${payment.amount}, order is ${order.grandTotal}`,
      );
      await this.paymentRepository.update(
        { id: payment.id },
        { status: PaymentStatus.Failed, refId: verified.refId },
      );

      return outcome(
        false,
        PAYMENT_MESSAGES.AMOUNT_MISMATCH,
        order.orderNumber,
        verified.refId,
      );
    }

    // One transaction for the two writes that have to agree: this attempt
    // becomes a success, and the order becomes paid with its cart emptied.
    await this.dataSource.transaction(async (manager) => {
      // Idempotency, second line — the one that holds under concurrency. The
      // status is in the WHERE, so two callbacks arriving at the same instant
      // produce exactly one winner; the loser updates zero rows and stops.
      // 'failed' is claimable as well: the gateway has just confirmed the money
      // arrived, which outranks whatever an earlier callback concluded.
      const claimed = await manager.getRepository(Payment).update(
        {
          id: payment.id,
          status: In([PaymentStatus.Pending, PaymentStatus.Failed]),
        },
        {
          status: PaymentStatus.Success,
          refId: verified.refId,
          paidAt: new Date(),
        },
      );
      if (!claimed.affected) return;

      // False means the expiry job closed the order first. The payment row
      // still records the money, but the order is not quietly resurrected
      // behind the sweep's back — this needs a human.
      const paid = await this.orderService.markPaid(manager, order.id);
      if (!paid)
        this.logger.error(
          `order ${order.orderNumber} was already closed when payment ${verified.refId} verified — needs a manual refund or re-open`,
        );
    });

    // Success from the customer's point of view either way: the money has been
    // taken and the receipt number is theirs.
    return outcome(
      true,
      PAYMENT_MESSAGES.SUCCESS,
      order.orderNumber,
      verified.refId,
    );
  }

  // The customer's own payment history.
  async findAllForUser(userId: string, dto: PaginationDto) {
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: dto.skip,
      take: dto.take,
    });

    const orders = await this.orderSummaries(payments);

    return {
      message: PAYMENT_MESSAGES.FETCHED,
      ...paginated(
        payments.map((payment) => ({
          id: payment.id,
          orderId: payment.orderId,
          orderNumber: orders.get(payment.orderId)?.orderNumber ?? null,
          amount: payment.amount,
          status: payment.status,
          provider: payment.provider,
          refId: payment.refId,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
        })),
        total,
        dto,
      ),
    };
  }

  // The admin list. Every attempt, not scoped to a user, and deliberately
  // including the abandoned ones: the question an admin is answering is
  // usually "did this customer's money go somewhere we cannot see".
  async findAllForAdmin(dto: AdminListPaymentsDto) {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .orderBy('payment.createdAt', 'DESC')
      .skip(dto.skip)
      .take(dto.take);

    if (dto.status)
      query.andWhere('payment.status = :status', { status: dto.status });

    if (dto.userId)
      query.andWhere('payment.userId = :userId', { userId: dto.userId });

    // Half-open ranges are allowed on purpose: "everything since this morning"
    // is a from with no to.
    if (dto.from)
      query.andWhere('payment.createdAt >= :from', {
        from: new Date(dto.from),
      });
    if (dto.to)
      query.andWhere('payment.createdAt <= :to', { to: new Date(dto.to) });

    // The filter this endpoint exists for. An EXISTS subquery rather than a
    // join, so the paging stays on payment rows — a join would let one payment
    // appear twice if the condition ever matched more than one order row, and
    // getManyAndCount would then count wrong.
    if (dto.needsAttention) {
      query
        .andWhere('payment.status = :successOnly', {
          successOnly: PaymentStatus.Success,
        })
        .andWhere(STUCK_ORDER_EXISTS, { stuck: STUCK_STATUSES });
    }

    // One box for the three strings anybody might have to hand: the order
    // number off the customer's email, the authority out of a url, or the
    // receipt number the bank gave them. Bracketed so the OR cannot swallow
    // the filters above.
    if (dto.search) {
      const search = `%${dto.search.trim()}%`;
      query.andWhere(
        new Brackets((where) =>
          where
            .where('payment.reference ILIKE :search', { search })
            .orWhere('payment.refId ILIKE :search', { search })
            .orWhere(
              // "order" is a reserved word and orderNumber is camelCase, so
              // both have to be quoted in raw SQL.
              `EXISTS (SELECT 1 FROM "order" o WHERE o.id = payment."orderId" AND o."orderNumber" ILIKE :search)`,
              { search },
            ),
        ),
      );
    }

    const [payments, total] = await query.getManyAndCount();
    const orders = await this.orderSummaries(payments);

    return {
      message: PAYMENT_MESSAGES.FETCHED,
      ...paginated(
        payments.map((payment) => {
          const order = orders.get(payment.orderId);

          return {
            id: payment.id,
            orderId: payment.orderId,
            orderNumber: order?.orderNumber ?? null,
            // The whole point of the row: the attempt's status next to the
            // order's, which is where the mismatch shows up.
            orderStatus: order?.status ?? null,
            orderStatusLabel: order
              ? (ORDER_STATUS_LABELS[order.status] ?? order.status)
              : null,
            userId: payment.userId,
            amount: payment.amount,
            status: payment.status,
            provider: payment.provider,
            reference: payment.reference,
            refId: payment.refId,
            needsAttention: needsAttention(payment, order),
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
          };
        }),
        total,
        dto,
      ),
    };
  }

  // The dashboard's number. Counts the one error path in this module that
  // involves real money: handleCallback verified a payment, but markPaid found
  // the order already closed by the expiry sweep — so the shop has been paid
  // for an order that gave its stock and its coupon use back.
  //
  // Derived from the two status columns rather than stored on the payment row:
  // there is nothing to set, so nothing can be forgotten, and it needed no
  // schema change. Resolving it is an existing route either way — re-open with
  // PATCH /admin/orders/:id/status, or refund by hand in the gateway's panel,
  // which moves the order to `refunded` and drops it out of this count.
  async countNeedingAttention(): Promise<number> {
    return this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.status = :status', { status: PaymentStatus.Success })
      .andWhere(STUCK_ORDER_EXISTS, { stuck: STUCK_STATUSES })
      .getCount();
  }

  // Only ever from pending, so a success cannot be walked backwards by a stray
  // second callback.
  private async fail(id: string): Promise<void> {
    await this.paymentRepository.update(
      { id, status: PaymentStatus.Pending },
      { status: PaymentStatus.Failed },
    );
  }

  // One query for the page's orders rather than a join, for the same reason as
  // the CRM: the number and the status are all a payment row shows of the
  // order it belongs to.
  //
  // A missing entry is normal, not an error — payment.orderId carries no FK on
  // purpose, so a deleted order leaves a dangling id here.
  private async orderSummaries(
    payments: Payment[],
  ): Promise<Map<string, OrderSummary>> {
    if (!payments.length) return new Map();

    const orders = await this.dataSource.getRepository(Order).find({
      where: { id: In(payments.map((payment) => payment.orderId)) },
      select: { id: true, orderNumber: true, status: true },
    });

    return new Map(
      orders.map((order) => [
        order.id,
        { orderNumber: order.orderNumber, status: order.status },
      ]),
    );
  }
}

const outcome = (
  ok: boolean,
  message: string,
  orderNumber: string | null,
  refId: string | null,
): CallbackOutcome => ({ ok, message, orderNumber, refId });

interface OrderSummary {
  orderNumber: string;
  status: OrderStatus;
}

// A paid-for order that ended up at a dead end. `refunded` is deliberately not
// here: a success payment on a refunded order is the *resolved* state, and a
// counter that can never reach zero is a counter nobody looks at. Nor is
// `pending_payment`, which cannot happen — the success write and markPaid share
// one transaction, so there is no window where only one of them landed.
const STUCK_STATUSES = [OrderStatus.Cancelled, OrderStatus.Failed];

// Shared by the filter and the count so the two can never drift into
// disagreeing about what "needs attention" means.
const STUCK_ORDER_EXISTS = `EXISTS (
  SELECT 1 FROM "order" o
  WHERE o.id = payment."orderId" AND o.status IN (:...stuck)
)`;

// The same rule again, per row, for the list. Not shared with the SQL above
// because one asks the database and the other reads two values already in
// hand — but they are the same sentence, and STUCK_STATUSES is the one copy of
// the part that matters.
const needsAttention = (
  payment: Payment,
  order: OrderSummary | undefined,
): boolean =>
  payment.status === PaymentStatus.Success &&
  order !== undefined &&
  STUCK_STATUSES.includes(order.status);
