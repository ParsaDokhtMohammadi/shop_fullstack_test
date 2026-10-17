import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  In,
  Not,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { AdminListOrdersDto } from './dto/admin-list-orders.dto';
import { CartItem } from '../cart/entities/cart-item.entity';
import { ProductVarient } from '../product/entities/product-varient.entity';
import { Address } from '../address/entities/address.entity';
import { ProductService } from '../product/product.service';
import { SettingsService } from '../settings/settings.service';
import { DiscountService } from '../discount/discount.service';
import { OrderReservationService } from './order-reservation.service';
import { RELEASES_RESERVATION } from './order-status.rules';
import {
  DISCOUNT_MESSAGES,
  ORDER_MESSAGES,
  ORDER_STATUS_LABELS,
} from '../../common/messages';
import { paginated } from '../../common/dto';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { finalPrice, shippingFor } from '../../common/utils/price.util';
import { generateOrderNumber } from '../../common/utils/order-number.util';

// Order numbers are random, so a collision is possible and worth a retry
// rather than failing a checkout the customer already committed to.
const ORDER_NUMBER_ATTEMPTS = 3;

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly productService: ProductService,
    private readonly settingsService: SettingsService,
    private readonly discountService: DiscountService,
    // Placing an order can now also close one: a customer who changed their
    // basket has their obsolete pending order cancelled, which has to give
    // back its stock and coupon use exactly like the expiry job does.
    private readonly reservationService: OrderReservationService,
  ) {}

  // The one write in the API that must be all-or-nothing: stock, the coupon
  // counter, the order rows and the cart all move together, so a crash halfway
  // cannot leave stock sold with no order against it.
  //
  // Nothing priced here comes from the client — not the items, not the unit
  // prices, not the totals. The request only names an address, a coupon and a
  // payment method.
  async create(userId: string, dto: CreateOrderDto) {
    // Read outside the transaction: neither row is contended, and holding the
    // variant locks for less time matters more than the extra round trip.
    const address = await this.dataSource.getRepository(Address).findOneBy({
      id: dto.addressId,
      userId,
    });
    if (!address) throw new NotFoundException(ORDER_MESSAGES.ADDRESS_NOT_FOUND);

    const settings = await this.settingsService.get();

    return this.dataSource.transaction(async (manager) => {
      const cartItems = await manager.getRepository(CartItem).find({
        where: { userId },
        order: { createdAt: 'ASC' },
      });
      if (!cartItems.length)
        throw new BadRequestException(ORDER_MESSAGES.EMPTY_CART);

      const varientIds = [
        ...new Set(cartItems.map((item) => item.productVarientId)),
      ];
      let varientOf = await lockVarients(manager, varientIds);

      // One unpaid order at a time, but never by telling the customer to wait
      // ten minutes for the old one to expire.
      //
      // Read after lockVarients, and that ordering is what makes it work: the
      // variant locks serialise two simultaneous checkouts of the same cart,
      // so by the time the second one reaches this line the first has
      // committed and its order is visible here. Reading before the locks
      // would let both see nothing and both place an order.
      const pending = await manager.getRepository(Order).findOne({
        where: { userId, status: OrderStatus.PendingPayment },
        relations: { items: true },
      });

      if (pending) {
        // Asking for the same thing again: hand back the order they already
        // have instead of placing a second one. A double-tapped button lands
        // here, and so does a customer who abandoned the gateway and came
        // back — both end up at the payment page for one order.
        //
        // Reusing it charges the total that order already states. That is not
        // a new exposure: paying a pending order through POST
        // /payments/initiate does exactly the same thing, which is what the
        // customer would otherwise click.
        if (isSameAsPending(pending, cartItems, dto))
          return { message: ORDER_MESSAGES.ALREADY_PENDING, payload: pending };

        // A different basket, so the old order is obsolete. Cancelling it
        // gives its stock and its coupon use back before the new one takes
        // them — which is what lets the customer add an item and check out
        // immediately. false means the expiry job closed it first, and that
        // already released everything, so there is nothing to do about it.
        await this.reservationService.closeAndRelease(
          manager,
          pending,
          OrderStatus.PendingPayment,
          OrderStatus.Cancelled,
        );

        // The release just put stock back, so the numbers read a moment ago
        // are stale and the re-check below would use the old, lower ones. The
        // rows are already locked, so this is only a re-read.
        varientOf = await lockVarients(manager, varientIds);
      }

      const covers = await this.productService.findCoverImages([
        ...new Set([...varientOf.values()].map((varient) => varient.productId)),
      ]);

      // Re-price and re-check every line against the rows just locked. A
      // variant that went inactive or lost stock while it sat in the cart is
      // refused by name, so the frontend can say which line to fix.
      const items: OrderItem[] = [];
      let subTotal = 0;

      for (const cartItem of cartItems) {
        const varient = varientOf.get(cartItem.productVarientId);
        // The variant did not come back from the lock query at all, so it was
        // deleted between reading the cart and locking. Nearly unreachable —
        // cart_item cascades from product_varient, so the cart row normally
        // goes with it — but it cannot name the product, because the row that
        // held the name is what is missing. ITEM_UNAVAILABLE would have
        // produced a message with an empty gap where the name should be.
        if (!varient?.product)
          throw new BadRequestException(ORDER_MESSAGES.ITEM_GONE);

        const product = varient.product;
        // category === null means uncategorised, which is buyable; only a
        // category that exists and is switched off blocks the sale.
        if (
          !varient.isActive ||
          !product.isActive ||
          product.category?.isActive === false
        )
          throw new BadRequestException(
            ORDER_MESSAGES.ITEM_UNAVAILABLE(product.name),
          );

        if (varient.stock < cartItem.quantity)
          throw new BadRequestException(
            ORDER_MESSAGES.STOCK_CHANGED(product.name, varient.stock),
          );

        const unitPrice = finalPrice(varient.price, varient.discountPercent);
        const lineTotal = Number(unitPrice) * cartItem.quantity;
        subTotal += lineTotal;

        items.push(
          manager.getRepository(OrderItem).create({
            varientId: varient.id,
            productName: product.name,
            varientLabel: varientLabel(varient),
            imageUrl: covers.get(product.id) ?? null,
            unitPrice,
            quantity: cartItem.quantity,
            lineTotal: String(lineTotal),
          }),
        );
      }

      // The use is taken here, not at payment — a coupon use is reserved
      // exactly like stock is. Holding it means two customers at checkout with
      // the last use of a code cannot both pay: the conditional update in
      // consume() hands it to one of them and rolls the other back now, while
      // nobody has paid anything. The expiry job gives the use back if this
      // order is never paid for, the same way it gives the stock back.
      let discountTotal = 0;
      let discountId: string | null = null;
      let discountCode: string | null = null;

      if (dto.discountCode) {
        const { discount, amount } =
          await this.discountService.validateForSubtotal(
            dto.discountCode,
            String(subTotal),
          );

        await this.discountService.consume(manager, discount.id);

        // Deliberately after consume(), and that ordering is the whole
        // guarantee. consume()'s UPDATE holds a row lock on the discount for
        // the rest of this transaction, so any other checkout using this code
        // is stuck there until we commit — which is what makes the answer
        // below stable. Checking first would let a double-tapped checkout
        // button put two orders through, since both would see no prior order.
        //
        // Throwing here rolls the whole transaction back, consume() included,
        // so the use is not quietly burnt by a refusal.
        if (await this.hasUsedDiscount(userId, discount.id, manager))
          throw new BadRequestException(DISCOUNT_MESSAGES.ALREADY_USED);

        discountTotal = Number(amount);
        discountId = discount.id;
        discountCode = discount.code;
      }

      // Shipping is charged on what is actually payable, so a coupon can be
      // what tips an order over the free-shipping threshold.
      const payableSubtotal = subTotal - discountTotal;
      const shippingTotal = Number(
        shippingFor(String(payableSubtotal), settings),
      );

      const order = manager.getRepository(Order).create({
        userId,
        status: OrderStatus.PendingPayment,
        subTotal: String(subTotal),
        discountTotal: String(discountTotal),
        shippingTotal: String(shippingTotal),
        grandTotal: String(payableSubtotal + shippingTotal),
        discountId,
        discountCode,
        // The address id is a reference for "ship here again"; the ship*
        // columns are the copy that actually gets printed.
        addressId: address.id,
        shipFirstName: address.firstName,
        shipLastName: address.lastName,
        shipPhone: address.phoneNumber,
        shipProvince: address.province,
        shipCity: address.city,
        shipAddress: address.address,
        shipPostalCode: address.postalCode,
        paymentMethod: PaymentMethod.Online,
        note: dto.note ?? null,
        items,
      });

      const saved = await saveWithOrderNumber(manager, order);

      // Stock comes off per line, each with its own quantity. The rows are
      // already locked, so this cannot oversell.
      for (const cartItem of cartItems) {
        await manager.decrement(
          ProductVarient,
          { id: cartItem.productVarientId },
          'stock',
          cartItem.quantity,
        );
      }

      // The cart is deliberately NOT emptied here. The order is only
      // pending_payment, so the customer may still abandon it or let it
      // expire — and then the cart they came back to would be gone. It is
      // cleared when the payment succeeds, by whoever marks the order paid.
      return { message: ORDER_MESSAGES.CREATED, payload: saved };
    });
  }

  // Called by the payments module when a gateway has confirmed the money.
  //
  // The status check is in the WHERE, not an if: the expiry job may be
  // closing this very order while the callback runs, and only one of the two
  // may win. Zero rows means it already lost — the caller must not conclude
  // the payment succeeded, which is why this returns a boolean.
  //
  // This is also where the cart is emptied. Order creation deliberately
  // leaves it alone, so a customer who abandons the gateway still has their
  // basket; once the money has arrived the basket has served its purpose.
  async markPaid(manager: EntityManager, orderId: string): Promise<boolean> {
    const result = await manager
      .getRepository(Order)
      .update(
        { id: orderId, status: OrderStatus.PendingPayment },
        { status: OrderStatus.Paid, paidAt: new Date() },
      );
    if (!result.affected) return false;

    const order = await manager
      .getRepository(Order)
      .findOne({ where: { id: orderId }, select: { userId: true } });

    // A guest order has no cart to clear. The repository is reached through
    // the caller's manager so the delete is inside the same transaction —
    // the one documented exception to going through the owning service.
    if (order?.userId)
      await manager.getRepository(CartItem).delete({ userId: order.userId });

    return true;
  }

  // Has this customer already spent this coupon? One code, one use, per person.
  //
  // "Spent" is any order that still holds its reservation — pending_payment
  // included. Only cancelled, failed and refunded give it back, which is
  // exactly the set release() hands the use back for, so this can never
  // disagree with the global "usage" counter on the discount row.
  //
  // Checking only for *paid* orders would be a hole: an unpaid order does not
  // block, so the customer could place several with the same code inside the
  // ten-minute payment window and then pay all of them.
  //
  // The manager is passed in from inside the order transaction, so the binding
  // check reads through the same transaction that holds the discount row lock.
  // Without one it reads on its own connection, which is all the cart preview
  // needs.
  hasUsedDiscount(
    userId: string,
    discountId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repository = manager
      ? manager.getRepository(Order)
      : this.orderRepository;

    return repository.exists({
      where: { userId, discountId, status: Not(In(RELEASES_RESERVATION)) },
    });
  }

  // The orders page. Summaries only — the snapshots are heavy and a list that
  // joined every order_item would grow with the customer's history rather than
  // with the page size. The detail endpoint is one click away.
  async findAllForUser(userId: string, dto: ListOrdersDto) {
    const [orders, total] = await this.orderRepository.findAndCount({
      where: {
        userId,
        ...(dto.status ? { status: dto.status } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: dto.skip,
      take: dto.take,
    });

    // One query for the counts instead of one per order: without it, a page of
    // 20 orders is 21 queries.
    const counts = await this.countItems(orders.map((order) => order.id));

    return {
      message: ORDER_MESSAGES.FETCHED,
      ...paginated(
        orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
          grandTotal: order.grandTotal,
          itemsCount: counts.get(order.id) ?? 0,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
        })),
        total,
        dto,
      ),
    };
  }

  // Scoped by userId as well as id, so a guessed order id is a 404 rather than
  // somebody else's address and phone number.
  async findOneForUser(userId: string, id: string) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException(ORDER_MESSAGES.NOT_FOUND);

    return { message: ORDER_MESSAGES.FETCHED_ONE, payload: toDetail(order) };
  }

  // The admin list. A query builder rather than a `where` object because the
  // search has to match either of two columns, which an object cannot express.
  async findAllForAdmin(dto: AdminListOrdersDto) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .orderBy('order.createdAt', 'DESC')
      .skip(dto.skip)
      .take(dto.take);

    if (dto.status)
      query.andWhere('order.status = :status', { status: dto.status });

    // Where the CRM's "all orders by this customer" link lands.
    if (dto.userId)
      query.andWhere('order.userId = :userId', { userId: dto.userId });

    // Half-open ranges are allowed on purpose: "everything since Monday" is a
    // from with no to.
    if (dto.from)
      query.andWhere('order.createdAt >= :from', { from: new Date(dto.from) });
    if (dto.to)
      query.andWhere('order.createdAt <= :to', { to: new Date(dto.to) });

    // One box for both, because a customer on the phone reads out whichever
    // they have to hand. Bracketed so the OR cannot swallow the filters above.
    if (dto.search) {
      const search = `%${dto.search.trim()}%`;
      query.andWhere(
        new Brackets((where) =>
          where
            .where('order.orderNumber ILIKE :search', { search })
            .orWhere('order.shipPhone ILIKE :search', { search }),
        ),
      );
    }

    const [orders, total] = await query.getManyAndCount();
    const counts = await this.countItems(orders.map((order) => order.id));

    return {
      message: ORDER_MESSAGES.FETCHED,
      ...paginated(
        orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
          grandTotal: order.grandTotal,
          itemsCount: counts.get(order.id) ?? 0,
          paymentMethod: order.paymentMethod,
          // The panel lists who it is going to; the customer's own list does
          // not need to be told its own name.
          customerName: `${order.shipFirstName} ${order.shipLastName}`,
          customerPhone: order.shipPhone,
          createdAt: order.createdAt,
        })),
        total,
        dto,
      ),
    };
  }

  // Not scoped to a user, and unlike the customer's own view it keeps the
  // internal references: an admin chasing a problem needs to know which user,
  // address and coupon row the order came from.
  async findOneForAdmin(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException(ORDER_MESSAGES.NOT_FOUND);

    return {
      message: ORDER_MESSAGES.FETCHED_ONE,
      payload: {
        ...toDetail(order),
        userId: order.userId,
        addressId: order.addressId,
        discountId: order.discountId,
        updatedAt: order.updatedAt,
      },
    };
  }

  private async countItems(orderIds: string[]): Promise<Map<string, number>> {
    if (!orderIds.length) return new Map();

    const rows = await this.dataSource
      .getRepository(OrderItem)
      .createQueryBuilder('item')
      .select('item.orderId', 'orderId')
      .addSelect('SUM(item.quantity)', 'count')
      .where('item.orderId IN (:...orderIds)', { orderIds })
      .groupBy('item.orderId')
      .getRawMany<{ orderId: string; count: string }>();

    return new Map(rows.map((row) => [row.orderId, Number(row.count)]));
  }
}

// What the customer is allowed to see of their own order: everything they
// agreed to, and nothing internal. The addressId and discountId references are
// left out — they point at rows that may since have changed, and the snapshot
// is the truth here.
const toDetail = (order: Order) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
  subTotal: order.subTotal,
  discountTotal: order.discountTotal,
  shippingTotal: order.shippingTotal,
  grandTotal: order.grandTotal,
  discountCode: order.discountCode,
  paymentMethod: order.paymentMethod,
  trackingNumber: order.trackingNumber,
  note: order.note,
  paidAt: order.paidAt,
  createdAt: order.createdAt,
  shipping: {
    firstName: order.shipFirstName,
    lastName: order.shipLastName,
    phoneNumber: order.shipPhone,
    province: order.shipProvince,
    city: order.shipCity,
    address: order.shipAddress,
    postalCode: order.shipPostalCode,
  },
  items: order.items.map((item) => ({
    id: item.id,
    // Kept so the frontend can offer "buy again". A hint, not a promise: it
    // does not go null when the variant is deleted, and a variant that was
    // discontinued keeps its id either way. So show the button optimistically
    // and let POST /cart/items be the authority — it answers 404 when the
    // variant is gone, discontinued or its product is unpublished.
    varientId: item.varientId,
    productName: item.productName,
    varientLabel: item.varientLabel,
    imageUrl: item.imageUrl,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  })),
});

// Takes the write locks, then returns the variants with their products. Two
// queries because Postgres refuses FOR UPDATE on a join — but the first only
// needs the ids, so it locks without hydrating anything. The ORDER BY is the
// point of it: two carts holding the same two variants would otherwise be able
// to take them in opposite orders and deadlock.
const lockVarients = async (
  manager: EntityManager,
  varientIds: string[],
): Promise<Map<string, ProductVarient>> => {
  await manager
    .getRepository(ProductVarient)
    .createQueryBuilder('varient')
    .select('varient.id')
    .where('varient.id IN (:...varientIds)', { varientIds })
    .orderBy('varient.id', 'ASC')
    .setLock('pessimistic_write')
    .getRawMany();

  // The category comes along because checkout re-checks it: a line added
  // before its category was deactivated is still sitting in the cart, and this
  // is the step that actually takes the money.
  const varients = await manager.getRepository(ProductVarient).find({
    where: { id: In(varientIds) },
    relations: { product: { category: true } },
  });

  return new Map(varients.map((varient) => [varient.id, varient]));
};

// The order number is random, so a duplicate is bad luck rather than a bad
// request: regenerate and try again instead of failing a checkout.
const saveWithOrderNumber = async (
  manager: EntityManager,
  order: Order,
): Promise<Order> => {
  for (let attempt = 0; attempt < ORDER_NUMBER_ATTEMPTS; attempt++) {
    order.orderNumber = generateOrderNumber();
    try {
      // Each attempt gets its own savepoint, and that is what makes the retry
      // real. In Postgres a failed statement poisons the entire transaction:
      // every statement after it is refused with 25P02 until a rollback, so a
      // plain retry in here would hit "current transaction is aborted" even
      // on a number that is completely free — and 25P02 is not 23505, so it
      // would not look like a collision, would be rethrown, and would reach
      // the customer as a 500 on a checkout that was about to succeed.
      //
      // manager.transaction() while already inside a transaction reuses this
      // connection and issues SAVEPOINT rather than START TRANSACTION, so a
      // failed attempt rolls back only itself and leaves the locks, the
      // re-priced lines, the coupon and the stock decrements intact.
      return await manager.transaction((attemptManager) =>
        attemptManager.getRepository(Order).save(order),
      );
    } catch (error) {
      if (!isOrderNumberCollision(error)) throw error;
    }
  }

  throw new InternalServerErrorException(ORDER_MESSAGES.ORDER_NUMBER_FAILED);
};

// "قرمز / L", or null when the product has no options at all.
// Is this checkout request the same one that produced the pending order?
//
// "Same" has to mean everything the customer would notice: the lines, the
// address it ships to, the coupon and the courier note. Anything else and the
// pending order is not what they just asked for, so it gets cancelled and
// replaced rather than quietly paid for.
//
// Erring towards "different" is the safe direction. A false "different" costs
// a cancelled order and a new order number; a false "same" would charge
// somebody for a basket they changed.
const isSameAsPending = (
  pending: Order,
  cartItems: CartItem[],
  dto: CreateOrderDto,
): boolean => {
  if (pending.addressId !== dto.addressId) return false;
  if (normaliseCode(dto.discountCode) !== (pending.discountCode ?? null))
    return false;
  if (normaliseNote(dto.note) !== normaliseNote(pending.note)) return false;

  // Sorted, because cart order and order_item order are not related. A
  // varientId of null is a variant that has since been deleted, and the empty
  // string it produces cannot match any cart line — which is correct: that
  // order can no longer be reproduced.
  const wanted = cartItems
    .map((item) => `${item.productVarientId}:${item.quantity}`)
    .sort();
  const held = pending.items
    .map((item) => `${item.varientId ?? ''}:${item.quantity}`)
    .sort();

  return (
    wanted.length === held.length &&
    wanted.every((line, index) => line === held[index])
  );
};

// discount.code is stored trimmed and upper-cased, so the incoming one is put
// in the same shape before comparing.
const normaliseCode = (code: string | undefined): string | null =>
  code ? code.trim().toUpperCase() : null;

const normaliseNote = (note: string | null | undefined): string | null =>
  note?.trim() || null;

const varientLabel = (varient: ProductVarient): string | null => {
  const parts = [varient.color, varient.size].filter(Boolean);

  return parts.length ? parts.join(' / ') : null;
};

// 23505 on this one index only — any other unique violation is a real error
// and must not be retried.
const isOrderNumberCollision = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as
    { code?: string; constraint?: string } | undefined;

  return (
    driverError?.code === '23505' &&
    driverError?.constraint === 'order_number_unique'
  );
};
