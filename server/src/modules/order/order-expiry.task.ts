import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderExpiryService } from './order-expiry.service';

// Stock is reserved the moment an order is placed, so an abandoned checkout
// holds items nobody can buy. This closes those orders and puts the stock back.
@Injectable()
export class OrderExpiryTask {
  private readonly logger = new Logger(OrderExpiryTask.name);

  constructor(private readonly orderExpiryService: OrderExpiryService) {}

  // Every minute, not every ten: the window is ten minutes from each order's
  // own createdAt, and a job that only woke every ten minutes would let an
  // order sit for nearly twenty. The query is indexed on (status, createdAt)
  // and matches nothing most of the time, so this is cheap.
  @Cron(CronExpression.EVERY_MINUTE, { name: 'EXPIRE_PENDING_ORDERS' })
  async expirePendingOrders() {
    try {
      const expired = await this.orderExpiryService.expirePendingOrders();
      if (expired.length)
        this.logger.log(
          `Expired ${expired.length} unpaid order(s): ${expired.join(', ')}`,
        );
    } catch (error) {
      // A throw out of a cron handler is an unhandled rejection, and the job
      // must still run next minute — so it is logged and swallowed here.
      this.logger.error(
        'Expiring pending orders failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
