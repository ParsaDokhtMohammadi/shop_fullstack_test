import { Injectable } from '@nestjs/common';
import { OrderStatsService } from '../order/order-stats.service';
import { InventoryService } from '../product/inventory.service';
import { UserService } from '../user/user.service';
import { PaymentsService } from '../payments/payments.service';
import { DASHBOARD_MESSAGES } from '../../common/messages';

const DAY_MS = 24 * 60 * 60 * 1000;

// The landing page of the admin panel, in one request. A dashboard that fires
// six calls flickers while it fills in, so everything on it is gathered here.
//
// Read-only and owns no table: the money comes from the order module, the
// signups from the user module, the stock from the product module. Nothing is
// computed twice — in particular "revenue" means exactly what it means in the
// CRM, because both ask OrderStatsService.
@Injectable()
export class DashboardService {
  constructor(
    private readonly orderStatsService: OrderStatsService,
    private readonly userService: UserService,
    private readonly inventoryService: InventoryService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async stats() {
    const now = Date.now();

    // Independent queries, so they go together rather than one after another.
    const [
      orders,
      customersTotal,
      customersDay,
      customersMonth,
      lowStock,
      paymentsNeedingAttention,
    ] = await Promise.all([
      this.orderStatsService.dashboard(),
      this.userService.count(),
      this.userService.countSince(new Date(now - DAY_MS)),
      this.userService.countSince(new Date(now - 30 * DAY_MS)),
      this.inventoryService.countLowStock(),
      this.paymentsService.countNeedingAttention(),
    ]);

    return {
      message: DASHBOARD_MESSAGES.FETCHED,
      payload: {
        revenue: orders.revenue,
        orders: orders.orders,
        byStatus: orders.byStatus,
        customers: {
          total: customersTotal,
          last24h: customersDay,
          last30Days: customersMonth,
        },
        lowStock,
        // Money the shop has been paid for an order it then closed. Almost
        // always zero, and the one number here that is a job rather than a
        // statistic — it is a refund or a re-open somebody has to do, and
        // before this it was only visible by grepping the logs against the
        // gateway's panel. GET /api/admin/payments?needsAttention=true is the
        // list behind it.
        paymentsNeedingAttention,
      },
    };
  }
}
