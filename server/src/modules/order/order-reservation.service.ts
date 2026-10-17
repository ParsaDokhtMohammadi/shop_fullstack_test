import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ProductVarient } from '../product/entities/product-varient.entity';
import { DiscountService } from '../discount/discount.service';
import { OrderStatus } from '../../common/enums/order-status.enum';

// Placing an order takes two things off the shelf before any money moves: the
// stock of each variant, and one use of the coupon. Together those are the
// order's *reservation* — the thing that stops a second customer buying the
// same last item while the first is still at the gateway.
//
// Every way an order can die without being paid for has to put that
// reservation back: the expiry job when the payment window runs out, and an
// admin cancelling or refunding. They all share this service, so "give it
// back" is written once and the rules cannot drift apart between them.
//
// There is no customer-facing cancel, by design: a customer who changes their
// mind phones the shop and an admin cancels it. So every release is either the
// sweep or a deliberate admin action.
@Injectable()
export class OrderReservationService {
  constructor(private readonly discountService: DiscountService) {}

  // Moves the order to `to` and releases its reservation — but only if it is
  // still in `from`. Returns false when it was not, which is not an error:
  // something else got there first.
  //
  // The status check is in the WHERE rather than an if, and that is the whole
  // point of this method: a payment can complete between reading the order and
  // writing it, and the loser of that race must not hand back stock for an
  // order that is now paid. One row updated is permission to release; zero
  // rows means somebody else owns this order's fate.
  async closeAndRelease(
    manager: EntityManager,
    order: { id: string; discountId: string | null },
    from: OrderStatus,
    to: OrderStatus,
  ): Promise<boolean> {
    const result = await manager
      .getRepository(Order)
      .update({ id: order.id, status: from }, { status: to });
    if (!result.affected) return false;

    await this.release(manager, order);

    return true;
  }

  // The reverse of what OrderService.create took. Call it inside the caller's
  // transaction and only once per order — closeAndRelease is what guarantees
  // that, so prefer it over calling this directly.
  async release(
    manager: EntityManager,
    order: { id: string; discountId: string | null },
  ): Promise<void> {
    // A deleted coupon simply updates nothing, which is why the id is read off
    // the order row rather than taken from a request.
    if (order.discountId)
      await this.discountService.release(manager, order.discountId);

    const items = await manager.getRepository(OrderItem).find({
      where: { orderId: order.id },
      select: { varientId: true, quantity: true },
    });

    // Per line, each with its own quantity. A variant that has since been
    // deleted has nothing to give back to.
    for (const item of items) {
      if (!item.varientId) continue;
      await manager.increment(
        ProductVarient,
        { id: item.varientId },
        'stock',
        item.quantity,
      );
    }
  }
}
