import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { AddressService } from '../address/address.service';
import {
  OrderStatsService,
  emptyOrderStats,
} from '../order/order-stats.service';
import { ListCustomersDto } from './dto/list-customers.dto';
import { paginated } from '../../common/dto';
import { CUSTOMER_MESSAGES } from '../../common/messages';

// How many of a customer's orders the detail page shows inline. Past that the
// panel links to GET /admin/orders?userId=…, which is paginated — no reason to
// build a second paginated order list in here.
const RECENT_ORDERS = 10;

// Read-only: the CRM reports on data the other modules own. It has no entity
// and no table, and every number in it comes from a service — the users from
// UserService, the money from OrderStatsService, the addresses from
// AddressService. That is why it can be deleted without breaking anything.
@Injectable()
export class CustomerService {
  constructor(
    private readonly userService: UserService,
    private readonly orderStatsService: OrderStatsService,
    private readonly addressService: AddressService,
  ) {}

  // Two queries, not a join: the page of users comes from the user module and
  // the totals from the order module, then they are zipped by id here. A join
  // would be one query, but it would also mean this module writing SQL against
  // another module's table.
  async findAll(dto: ListCustomersDto) {
    const [users, total] = await this.userService.findPage(
      dto.search,
      dto.skip,
      dto.take,
    );

    const stats = await this.orderStatsService.statsForUsers(
      users.map((user) => user.id),
    );

    return {
      message: CUSTOMER_MESSAGES.FETCHED,
      ...paginated(
        users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          createdAt: user.createdAt,
          ...(stats.get(user.id) ?? emptyOrderStats()),
        })),
        total,
        dto,
      ),
    };
  }

  // The addresses come along because that is where a support call gets its
  // details — and the names on them are per delivery, which can differ from
  // the one name on the account.
  async findOne(id: string) {
    const user = await this.userService.findById(id);
    if (!user) throw new NotFoundException(CUSTOMER_MESSAGES.NOT_FOUND);

    const [stats, addresses, recentOrders] = await Promise.all([
      this.orderStatsService.statsForUser(id),
      this.addressService.findForUser(id),
      this.orderStatsService.recentForUser(id, RECENT_ORDERS),
    ]);

    return {
      message: CUSTOMER_MESSAGES.FETCHED_ONE,
      payload: {
        id: user.id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        createdAt: user.createdAt,
        stats,
        addresses,
        recentOrders,
      },
    };
  }
}
