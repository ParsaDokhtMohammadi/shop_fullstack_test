import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { ProductService } from '../product/product.service';
import { DiscountService } from '../discount/discount.service';
import { ApplyDiscountDto } from '../discount/dto/apply-discount.dto';
import { OrderService } from '../order/order.service';
import { CART_MESSAGES, DISCOUNT_MESSAGES } from '../../common/messages';
import { finalPrice } from '../../common/utils/price.util';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly productService: ProductService,
    private readonly discountService: DiscountService,
    private readonly orderService: OrderService,
  ) {}

  // Adding a variant that is already in the cart bumps its quantity instead of
  // creating a second row — that is what the unique index enforces anyway.
  // Stock is checked against the total quantity, not just the added amount.
  async addItem(userId: string, dto: AddCartItemDto) {
    const quantity = dto.quantity ?? 1;

    const varient = await this.productService.findBuyableVarient(
      dto.productVarientId,
    );
    if (!varient) throw new NotFoundException(CART_MESSAGES.VARIENT_NOT_FOUND);
    if (varient.stock < 1)
      throw new BadRequestException(CART_MESSAGES.OUT_OF_STOCK);

    const existing = await this.cartItemRepository.findOne({
      where: { userId, productVarientId: varient.id },
    });

    const total = (existing?.quantity ?? 0) + quantity;
    if (total > varient.stock)
      throw new BadRequestException(
        CART_MESSAGES.STOCK_EXCEEDED(varient.stock),
      );

    const item = await this.cartItemRepository.save(
      existing
        ? Object.assign(existing, { quantity: total })
        : this.cartItemRepository.create({
            userId,
            productVarientId: varient.id,
            quantity,
          }),
    );

    return { message: CART_MESSAGES.ITEM_ADDED, payload: item };
  }

  // Called once, right after a guest logs in: the browser hands over whatever
  // it was holding in localStorage and this folds it into the saved cart.
  //
  // Nothing here throws on a bad line. A visitor who has just logged in should
  // land on their cart, not on an error because something they added last week
  // has since sold out — so unusable lines are skipped and reported, and the
  // frontend can tell them what did not make it.
  async merge(userId: string, dto: MergeCartDto) {
    const existing = await this.cartItemRepository.find({ where: { userId } });
    const byVarient = new Map(
      existing.map((item) => [item.productVarientId, item]),
    );

    const skipped: { productVarientId: string; reason: string }[] = [];
    let mergedCount = 0;

    for (const line of dedupe(dto.items)) {
      const varient = await this.productService.findBuyableVarient(
        line.productVarientId,
      );

      if (!varient) {
        skipped.push({
          productVarientId: line.productVarientId,
          reason: CART_MESSAGES.VARIENT_NOT_FOUND,
        });
        continue;
      }

      if (varient.stock < 1) {
        skipped.push({
          productVarientId: line.productVarientId,
          reason: CART_MESSAGES.OUT_OF_STOCK,
        });
        continue;
      }

      const wanted = line.quantity ?? 1;
      const current = byVarient.get(varient.id);

      // The higher of the two, not the sum. A merge that added would double a
      // line every time the frontend retried it — and "2 in the browser, 3
      // saved" means the customer wanted 3, not 5. Capped at what is on the
      // shelf, so a stale localStorage quantity cannot exceed stock.
      const quantity = Math.min(
        Math.max(wanted, current?.quantity ?? 0),
        varient.stock,
      );

      // Already right: no write, and not counted as merged.
      if (current?.quantity === quantity) continue;

      await this.cartItemRepository.save(
        current
          ? Object.assign(current, { quantity })
          : this.cartItemRepository.create({
              userId,
              productVarientId: varient.id,
              quantity,
            }),
      );
      mergedCount += 1;
    }

    // The whole cart back, priced and with availability flags, so the frontend
    // can clear its local copy and render from one response.
    const cart = await this.getCart(userId);

    return {
      message: CART_MESSAGES.MERGED,
      payload: { ...cart.payload, merged: mergedCount, skipped },
    };
  }

  // The cart is recomputed from the variants on every read, never stored: a
  // price change, a sold-out variant or a discontinued product shows up here
  // before the customer reaches checkout.
  async getCart(userId: string) {
    const items = await this.cartItemRepository.find({
      where: { userId },
      // The category is loaded because a deactivated one makes its products
      // unbuyable, and this list is where the customer is told so.
      relations: { productVarient: { product: { category: true } } },
      order: { createdAt: 'ASC' },
    });

    // One cover per product rather than every image of every product in the
    // cart — the cart line only ever shows one.
    const covers = await this.productService.findCoverImages([
      ...new Set(items.map((item) => item.productVarient.productId)),
    ]);

    const lines = items.map((item) => this.toLine(item, covers));

    // Unavailable lines stay in the list so the frontend can show why, but
    // they are worth nothing: the order endpoint will refuse them anyway.
    const payable = lines.filter((line) => line.isAvailable);

    return {
      message: CART_MESSAGES.FETCHED,
      payload: {
        items: lines,
        totals: {
          itemsCount: payable.reduce((sum, line) => sum + line.quantity, 0),
          subtotal: String(
            payable.reduce((sum, line) => sum + Number(line.lineTotal), 0),
          ),
          // What the discounts on the variants themselves already saved.
          discountTotal: String(
            payable.reduce(
              (sum, line) =>
                sum +
                (Number(line.price) - Number(line.finalPrice)) * line.quantity,
              0,
            ),
          ),
        },
      },
    };
  }

  // Shows what a code would do to this cart. Nothing is stored: the code is
  // sent again with the order request and re-validated there, so a preview can
  // never be the thing that decides what someone pays.
  async previewDiscount(userId: string, dto: ApplyDiscountDto) {
    // Priced from the user's own rows, not from the request body.
    const { payload } = await this.getCart(userId);
    const subtotal = payload.totals.subtotal;

    const { discount, amount } = await this.discountService.validateForSubtotal(
      dto.code,
      subtotal,
    );

    // Advisory, like every other check here: the binding one is inside the
    // order transaction, where the discount row is locked. Worth doing anyway
    // so a customer is told at the basket that they have already used this
    // code, rather than at the end of checkout.
    if (await this.orderService.hasUsedDiscount(userId, discount.id))
      throw new BadRequestException(DISCOUNT_MESSAGES.ALREADY_USED);

    return {
      message: CART_MESSAGES.DISCOUNT_PREVIEWED,
      payload: {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        subtotal,
        discountAmount: amount,
        // Shipping is not part of this yet, exactly like GET /cart: the cart
        // has no address, so there is no shipping cost to add here.
        payableTotal: String(Number(subtotal) - Number(amount)),
      },
    };
  }

  // Sets the quantity outright instead of adding to it, and re-checks the
  // variant: it may have gone inactive or lost stock since it was added.
  async updateQuantity(userId: string, id: string, dto: UpdateCartItemDto) {
    const item = await this.cartItemRepository.findOne({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException(CART_MESSAGES.ITEM_NOT_FOUND);

    const varient = await this.productService.findBuyableVarient(
      item.productVarientId,
    );
    if (!varient) throw new NotFoundException(CART_MESSAGES.VARIENT_NOT_FOUND);
    if (varient.stock < 1)
      throw new BadRequestException(CART_MESSAGES.OUT_OF_STOCK);
    if (dto.quantity > varient.stock)
      throw new BadRequestException(
        CART_MESSAGES.STOCK_EXCEEDED(varient.stock),
      );

    item.quantity = dto.quantity;
    const saved = await this.cartItemRepository.save(item);

    return { message: CART_MESSAGES.ITEM_UPDATED, payload: saved };
  }

  // Scoped by userId as well as id: a guessed cart item id must not let one
  // user delete another user's line.
  async removeItem(userId: string, id: string) {
    const result = await this.cartItemRepository.delete({ id, userId });
    if (!result.affected)
      throw new NotFoundException(CART_MESSAGES.ITEM_NOT_FOUND);

    return { message: CART_MESSAGES.ITEM_REMOVED, payload: { id } };
  }

  // Empties the cart. Also what the order transaction calls once an order is
  // placed, so it stays on the service rather than in the controller.
  async clear(userId: string) {
    const result = await this.cartItemRepository.delete({ userId });

    return {
      message: CART_MESSAGES.CLEARED,
      payload: { removed: result.affected ?? 0 },
    };
  }

  // One cart line, priced server-side. Nothing here comes from the client.
  private toLine(item: CartItem, covers: Map<string, string>) {
    const varient = item.productVarient;
    const product = varient.product;
    const unitPrice = finalPrice(varient.price, varient.discountPercent);
    // Mirrors what the order transaction will refuse, so a line that cannot be
    // checked out is shown as unavailable here instead of failing at payment.
    // A null category is uncategorised, which is fine; only a switched-off one
    // counts against the line.
    const isAvailable =
      varient.isActive &&
      product.isActive &&
      product.category?.isActive !== false &&
      varient.stock >= item.quantity;

    return {
      id: item.id,
      quantity: item.quantity,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      coverImage: covers.get(product.id) ?? null,
      varientId: varient.id,
      color: varient.color,
      colorCode: varient.colorCode,
      size: varient.size,
      price: varient.price,
      discountPercent: varient.discountPercent,
      finalPrice: unitPrice,
      lineTotal: String(Number(unitPrice) * item.quantity),
      stock: varient.stock,
      isAvailable,
    };
  }
}

// A guest cart can legitimately hold the same variant twice — two tabs, or a
// frontend that appends rather than merges. Collapsing to the largest wanted
// quantity keeps the loop above doing one lookup and one write per variant.
const dedupe = (items: MergeCartDto['items']): MergeCartDto['items'] => {
  const byVarient = new Map<string, MergeCartDto['items'][number]>();

  for (const item of items) {
    const seen = byVarient.get(item.productVarientId);
    if (!seen || (item.quantity ?? 1) > (seen.quantity ?? 1))
      byVarient.set(item.productVarientId, item);
  }

  return [...byVarient.values()];
};
