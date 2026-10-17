import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { REVENUE_STATUSES } from './order-status.rules';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { ORDER_STATUS_LABELS } from '../../common/messages';

export interface CustomerOrderStats {
  ordersCount: number;
  totalSpent: string;
  lastOrderAt: Date | null;
}

export interface OrderDashboard {
  revenue: Record<DashboardWindow, string>;
  orders: Record<DashboardWindow, number>;
  byStatus: Record<OrderStatus, number>;
}

type DashboardWindow = 'last24h' | 'last7Days' | 'last30Days' | 'allTime';

const DAY_MS = 24 * 60 * 60 * 1000;

const ROLLING: Record<'last24h' | 'last7Days' | 'last30Days', number> = {
  last24h: DAY_MS,
  last7Days: 7 * DAY_MS,
  last30Days: 30 * DAY_MS,
};

// COUNT(*) and the money SUM for one window, as two aliased aggregates. The
// date itself is a bound parameter the caller sets, not inlined SQL.
const windowAggregates = (name: string): [string, string][] => [
  [`COUNT(*) FILTER (WHERE "order"."createdAt" >= :${name})`, `orders_${name}`],
  [
    `COALESCE(SUM(CAST("order"."grandTotal" AS numeric)) FILTER (WHERE "order"."createdAt" >= :${name}), 0)`,
    `revenue_${name}`,
  ],
];

export const emptyOrderStats = (): CustomerOrderStats => ({
  ordersCount: 0,
  totalSpent: '0',
  lastOrderAt: null,
});

// What a customer looks like in numbers. It lives in the order module because
// it is order data: the CRM asks for it through this service instead of
// joining `order` from its own query builder, which would make the customer
// module depend on this table's columns and statuses.
@Injectable()
export class OrderStatsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  // One grouped query for a whole page of customers, so the CRM list is two
  // queries rather than one per row.
  async statsForUsers(
    userIds: string[],
  ): Promise<Map<string, CustomerOrderStats>> {
    if (!userIds.length) return new Map();

    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.userId', 'userId')
      .addSelect('COUNT(*)', 'ordersCount')
      // grandTotal is a digits-only varchar, so the SUM needs the cast — text
      // does not add up, and text ordering would put 900 above 1000.
      .addSelect('SUM(CAST(order.grandTotal AS numeric))', 'totalSpent')
      .addSelect('MAX(order.createdAt)', 'lastOrderAt')
      .where('order.userId IN (:...userIds)', { userIds })
      .andWhere('order.status IN (:...statuses)', {
        statuses: REVENUE_STATUSES,
      })
      .groupBy('order.userId')
      .getRawMany<{
        userId: string;
        ordersCount: string;
        totalSpent: string;
        lastOrderAt: Date;
      }>();

    // A customer with no counting order has no row here at all; the caller
    // fills those in with emptyOrderStats().
    return new Map(
      rows.map((row) => [
        row.userId,
        {
          ordersCount: Number(row.ordersCount),
          totalSpent: row.totalSpent,
          lastOrderAt: row.lastOrderAt,
        },
      ]),
    );
  }

  // The order half of the admin dashboard, in two queries.
  //
  // The windows are rolling — 24 hours back from now, not "today" — so there
  // is no shop timezone to configure and no DST edge. "Today" in +03:30 would
  // need a setting, and a dashboard that is wrong for three and a half hours
  // every morning is worse than one that is honest about counting back.
  async dashboard(): Promise<OrderDashboard> {
    const now = Date.now();
    const since = Object.fromEntries(
      Object.entries(ROLLING).map(([name, ms]) => [name, new Date(now - ms)]),
    );

    // One pass over the table for all four windows. Postgres FILTER applies a
    // condition per aggregate, so this replaces eight separate queries — and
    // the SUM needs the same CAST as everywhere else, with a COALESCE so an
    // empty window answers '0' instead of null.
    const query = this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(*)', 'orders_allTime')
      .addSelect(
        `COALESCE(SUM(CAST("order"."grandTotal" AS numeric)), 0)`,
        'revenue_allTime',
      )
      .where('order.status IN (:...statuses)', { statuses: REVENUE_STATUSES })
      .setParameters(since);

    for (const name of Object.keys(ROLLING))
      for (const [expression, alias] of windowAggregates(name))
        query.addSelect(expression, alias);

    const totals = await query.getRawOne<Record<string, string>>();

    // Every status, not only the counting ones: `pending_payment` and `paid`
    // are the admin's work queue, and `failed` is how they notice the gateway
    // is broken.
    const statusRows = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany<{ status: string; count: string }>();

    const counted = new Map(
      statusRows.map((row) => [row.status, Number(row.count)]),
    );

    return {
      revenue: {
        last24h: totals?.revenue_last24h ?? '0',
        last7Days: totals?.revenue_last7Days ?? '0',
        last30Days: totals?.revenue_last30Days ?? '0',
        allTime: totals?.revenue_allTime ?? '0',
      },
      orders: {
        last24h: Number(totals?.orders_last24h ?? 0),
        last7Days: Number(totals?.orders_last7Days ?? 0),
        last30Days: Number(totals?.orders_last30Days ?? 0),
        allTime: Number(totals?.orders_allTime ?? 0),
      },
      // Spelled out from the enum so a status nobody has reached yet is a 0
      // rather than a missing key the frontend has to guard.
      byStatus: Object.fromEntries(
        Object.values(OrderStatus).map((status) => [
          status,
          counted.get(status) ?? 0,
        ]),
      ) as Record<OrderStatus, number>,
    };
  }

  async statsForUser(userId: string): Promise<CustomerOrderStats> {
    const stats = await this.statsForUsers([userId]);

    return stats.get(userId) ?? emptyOrderStats();
  }

  // Unlike the stats, this is every status: an admin looking at one customer
  // wants to see the abandoned and the cancelled attempts too — that is often
  // the reason they opened the page.
  async recentForUser(userId: string, limit: number) {
    const orders = await this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
      grandTotal: order.grandTotal,
      createdAt: order.createdAt,
    }));
  }
}
