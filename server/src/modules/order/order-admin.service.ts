import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderService } from './order.service';
import { OrderReservationService } from './order-reservation.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { assertTransition, RELEASES_RESERVATION } from './order-status.rules';
import { ORDER_MESSAGES, ORDER_STATUS_LABELS } from '../../common/messages';
import { OrderStatus } from '../../common/enums/order-status.enum';

// The admin writes. Kept out of OrderService, which owns the checkout
// transaction and the reads: moving an order along is a different job with
// different rules, and the two have nothing to share but the table.
@Injectable()
export class OrderAdminService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly reservationService: OrderReservationService,
    // For markPaid: becoming paid means more than a status change, and the
    // gateway callback and an admin confirming a bank transfer must do exactly
    // the same thing.
    private readonly orderService: OrderService,
  ) {}

  // Moves an order to the next status, if the move is one ORDER_TRANSITIONS
  // allows from where it is now. A status that gives the reservation back goes
  // through the shared helper, so cancelling or refunding returns the stock and
  // the coupon use exactly like the expiry job does.
  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.findOneOrFail(id);

    // Throws with both statuses named, so an admin whose click lost a race is
    // told what the order actually is now.
    assertTransition(order.status, dto.status);

    const moved = await this.applyStatus(order, dto.status);

    // The update was conditional on the status we read, so zero rows means
    // somebody else — another admin, or the gateway callback — moved it in
    // between. Nothing was written, and the transaction rolled back.
    if (!moved) throw new BadRequestException(ORDER_MESSAGES.STATUS_RACED);

    const updated = await this.findOneOrFail(id);

    return {
      message: ORDER_MESSAGES.STATUS_UPDATED,
      payload: {
        id: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
        statusLabel: ORDER_STATUS_LABELS[updated.status] ?? updated.status,
        paidAt: updated.paidAt,
      },
    };
  }

  // The courier's number, typed in by hand once the parcel is handed over.
  // Not a status change: a shop may have the number before it ships, and
  // flipping the status is the admin's separate, deliberate click.
  async updateTracking(id: string, dto: UpdateTrackingDto) {
    const order = await this.findOneOrFail(id);

    // A tracking number on an order that was cancelled, refunded or never paid
    // for is a mistake, not a state worth storing.
    if (RELEASES_RESERVATION.includes(order.status))
      throw new BadRequestException(ORDER_MESSAGES.TRACKING_NOT_ALLOWED);

    const trackingNumber = dto.trackingNumber.trim() || null;
    await this.orderRepository.update({ id }, { trackingNumber });

    return {
      message: ORDER_MESSAGES.TRACKING_UPDATED,
      payload: { id, trackingNumber },
    };
  }

  // Three kinds of move, and only the last is just a status change.
  private applyStatus(order: Order, to: OrderStatus): Promise<boolean> {
    // Cancelled, failed and refunded hand the stock and the coupon use back,
    // through the same helper the expiry job uses.
    if (RELEASES_RESERVATION.includes(to))
      return this.dataSource.transaction((manager) =>
        this.reservationService.closeAndRelease(
          manager,
          order,
          order.status,
          to,
        ),
      );

    // Paid is not just a status either: it stamps paidAt and empties the
    // customer's basket, because the things they just bought should not still
    // be sitting in it. That is all in OrderService.markPaid, which the
    // gateway callback already calls — a bank transfer an admin confirms by
    // hand has to end up in exactly the same state as a card payment, so it
    // goes through the same method rather than a second copy of the rules.
    //
    // markPaid's own WHERE requires pending_payment, which is the only status
    // ORDER_TRANSITIONS allows into paid, so the guard matches assertTransition.
    if (to === OrderStatus.Paid)
      return this.dataSource.transaction((manager) =>
        this.orderService.markPaid(manager, order.id),
      );

    // Everything else is one conditional UPDATE.
    return this.orderRepository
      .update({ id: order.id, status: order.status }, { status: to })
      .then((result) => Boolean(result.affected));
  }

  private async findOneOrFail(id: string): Promise<Order> {
    const order = await this.orderRepository.findOneBy({ id });
    if (!order) throw new NotFoundException(ORDER_MESSAGES.NOT_FOUND);

    return order;
  }
}
