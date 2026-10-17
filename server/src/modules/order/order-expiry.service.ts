import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderReservationService } from './order-reservation.service';
import { OrderStatus } from '../../common/enums/order-status.enum';

// How long an unpaid order holds its reservation. Short on purpose: it is what
// stops two customers buying the same last item, so an abandoned checkout must
// not sit on it. Long enough to finish a gateway redirect.
const PAYMENT_WINDOW_MS = 10 * 60 * 1000;

// Capped so one sweep cannot hold the database for minutes if a backlog built
// up while the app was down; the next run takes the rest.
const EXPIRY_BATCH = 100;

// Closes the orders whose payment never arrived. The giving-back itself lives
// in OrderReservationService, shared with cancel and refund — this service only
// decides which orders are out of time.
@Injectable()
export class OrderExpiryService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly reservationService: OrderReservationService,
  ) {}

  // One transaction per order rather than one for all of them: a single bad
  // row then cannot roll back everyone else's, and the lock is held for one
  // order at a time instead of across the whole batch.
  async expirePendingOrders(): Promise<string[]> {
    const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MS);

    const stale = await this.orderRepository.find({
      where: {
        status: OrderStatus.PendingPayment,
        createdAt: LessThan(cutoff),
      },
      select: { id: true, orderNumber: true, discountId: true },
      order: { createdAt: 'ASC' },
      take: EXPIRY_BATCH,
    });

    const expired: string[] = [];
    for (const order of stale) {
      // pending_payment -> failed, which ORDER_TRANSITIONS allows and
      // RELEASES_RESERVATION says must give the reservation back. A false
      // means the payment landed while this sweep was running.
      const closed = await this.dataSource.transaction((manager) =>
        this.reservationService.closeAndRelease(
          manager,
          order,
          OrderStatus.PendingPayment,
          OrderStatus.Failed,
        ),
      );

      if (closed) expired.push(order.orderNumber);
    }

    return expired;
  }
}
