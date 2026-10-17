import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, ILike, Repository } from 'typeorm';
import { Discount } from './entities/discount.entity';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ListDiscountsDto } from './dto/list-discounts.dto';
import { paginated } from '../../common/dto';
import { DISCOUNT_MESSAGES } from '../../common/messages';
import { DiscountType } from '../../common/enums/discount-type.enum';

@Injectable()
export class DiscountService {
  constructor(
    @InjectRepository(Discount)
    private readonly discountRepository: Repository<Discount>,
  ) {}

  // Admin list: every code, expired and switched-off ones included — the panel
  // has to show them to reopen or edit them. Paginated like every other list;
  // a shop that has been running campaigns for years has plenty of rows.
  async findAll(dto: ListDiscountsDto) {
    const [discounts, total] = await this.discountRepository.findAndCount({
      where: {
        ...(dto.search ? { code: ILike(`%${dto.search}%`) } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: dto.skip,
      take: dto.take,
    });

    return {
      message: DISCOUNT_MESSAGES.FETCHED,
      ...paginated(discounts, total, dto),
    };
  }

  // The one place a code is turned into an amount. The cart preview and the
  // order transaction both call this, so a coupon can never be worth one thing
  // at preview and another at checkout. The subtotal is always passed in from
  // rows the server priced itself.
  async validateForSubtotal(code: string, subtotal: string) {
    const discount = await this.discountRepository.findOneBy({
      code: normalizeCode(code),
    });

    // Four dead ends, one answer. A code that does not exist, one that was
    // switched off, one that has expired and one whose uses are gone all come
    // back as "not valid" — because the difference between them is not
    // something the customer can act on, and naming it confirms to anyone
    // guessing that they have found a real code. The two checks below stay
    // distinct because those a customer CAN act on: add more to the basket.
    //
    // This is not a complete defence. An empty cart still answers EMPTY_CART
    // for a real code and INVALID_CODE for a wrong one, so the endpoint can
    // still be used to tell a live code from a made-up one; closing that would
    // mean giving up the messages that are actually useful. The rate limit on
    // the route is what makes grinding through guesses expensive.
    const expired =
      discount?.expirationDate != null &&
      discount.expirationDate.getTime() <= Date.now();

    // Advisory only: the binding check is the conditional update in consume(),
    // inside the order transaction, which is what stops two checkouts taking
    // the last use.
    const exhausted =
      discount?.usageLimit != null && discount.usage >= discount.usageLimit;

    if (!discount || !discount.isActive || expired || exhausted)
      throw new BadRequestException(DISCOUNT_MESSAGES.INVALID_CODE);

    const total = Number(subtotal);
    if (total <= 0) throw new BadRequestException(DISCOUNT_MESSAGES.EMPTY_CART);
    if (total < Number(discount.minOrderTotal))
      throw new BadRequestException(
        DISCOUNT_MESSAGES.MIN_ORDER_NOT_MET(discount.minOrderTotal),
      );

    return { discount, amount: discountAmount(discount, total) };
  }

  // Takes one use of the code, inside the caller's transaction. Called when
  // the order is placed: a use is reserved like stock, so a pending order holds
  // it and release() puts it back if that order is never paid for.
  //
  // This is the binding limit check — validateForSubtotal only reads, so two
  // checkouts can both see the last use available. The WHERE does the
  // deciding: no row updated means somebody else took it and the caller's
  // transaction must roll back, which happens before anyone has paid.
  async consume(manager: EntityManager, discountId: string) {
    const result = await manager
      .createQueryBuilder()
      .update(Discount)
      .set({ usage: () => '"usage" + 1' })
      .where('id = :discountId', { discountId })
      .andWhere('("usageLimit" IS NULL OR "usage" < "usageLimit")')
      .execute();

    // Zero rows has two causes and they are not the same thing. Either the
    // WHERE on the limit failed — the race this method exists to settle — or
    // the row is gone, because an admin deleted the coupon in the seconds
    // between validateForSubtotal reading it and the order transaction
    // reaching here. Telling a customer that a coupon which no longer exists
    // is "fully used" sends them to support over a limit that is not real, so
    // the two answer differently. INVALID_CODE already covers "unknown".
    if (!result.affected) {
      const stillExists = await manager
        .getRepository(Discount)
        .exists({ where: { id: discountId } });

      throw new BadRequestException(
        stillExists
          ? DISCOUNT_MESSAGES.USAGE_LIMIT_REACHED
          : DISCOUNT_MESSAGES.INVALID_CODE,
      );
    }
  }

  // Puts a use back when an order that was holding one is cancelled or expires
  // unpaid. GREATEST keeps a double release from pushing the counter negative,
  // though the callers guard against that with a conditional status update.
  //
  // Unlike consume(), this one does not check `affected`, and the asymmetry is
  // deliberate rather than an oversight. The id comes off the order row, where
  // it may be dangling: "order"."discountId" carries no FK (see UNCONSTRAINED
  // REFERENCES in docs/schema.sql), so a deleted coupon leaves the id pointing
  // at nothing. There is then no counter left to give the use back to, and
  // nothing has been lost — the row that was tracking it is gone. Zero rows is
  // a normal outcome here, where in consume() it means the order must fail.
  async release(manager: EntityManager, discountId: string) {
    await manager
      .createQueryBuilder()
      .update(Discount)
      .set({ usage: () => 'GREATEST("usage" - 1, 0)' })
      .where('id = :discountId', { discountId })
      .execute();
  }

  async create(dto: CreateDiscountDto) {
    const code = normalizeCode(dto.code);

    // Checked here for a readable 409; the unique index is still what makes
    // it true when two admins submit the same code at once.
    const existing = await this.discountRepository.findOneBy({ code });
    if (existing) throw new ConflictException(DISCOUNT_MESSAGES.DUPLICATE_CODE);

    // value depends on type, which no single-field validator can see.
    const value = Number(dto.value);
    if (value <= 0)
      throw new BadRequestException(DISCOUNT_MESSAGES.PERCENT_OUT_OF_RANGE);
    if (dto.type === DiscountType.Percent && value > 100)
      throw new BadRequestException(DISCOUNT_MESSAGES.PERCENT_OUT_OF_RANGE);

    // A code that is already expired cannot be used by anyone, so it is a
    // mistake worth refusing rather than storing.
    const expirationDate = dto.expirationDate
      ? new Date(dto.expirationDate)
      : null;
    if (expirationDate && expirationDate.getTime() <= Date.now())
      throw new BadRequestException(DISCOUNT_MESSAGES.EXPIRATION_IN_PAST);

    const discount = await this.discountRepository.save(
      this.discountRepository.create({
        code,
        type: dto.type,
        value: String(value),
        minOrderTotal: dto.minOrderTotal ?? '0',
        usageLimit: dto.usageLimit ?? null,
        expirationDate,
        isActive: dto.isActive ?? true,
      }),
    );

    return { message: DISCOUNT_MESSAGES.CREATED, payload: discount };
  }

  // Only the fields sent are touched. usage is never editable — it is a
  // counter the order transaction owns, not a setting.
  async update(id: string, dto: UpdateDiscountDto) {
    const discount = await this.findOneOrFail(id);

    if (dto.code !== undefined) {
      const code = normalizeCode(dto.code);

      // Only look for a clash when the code actually changed, otherwise a
      // no-op edit would collide with the row being edited.
      if (code !== discount.code) {
        const existing = await this.discountRepository.findOneBy({ code });
        if (existing)
          throw new ConflictException(DISCOUNT_MESSAGES.DUPLICATE_CODE);
      }

      discount.code = code;
    }

    // type and value are checked together against whatever the row ends up
    // with: changing the type alone can make an existing value illegal.
    const type = dto.type ?? discount.type;
    const value = Number(dto.value ?? discount.value);
    if (value <= 0 || (type === DiscountType.Percent && value > 100))
      throw new BadRequestException(DISCOUNT_MESSAGES.PERCENT_OUT_OF_RANGE);

    discount.type = type;
    discount.value = String(value);

    if (dto.minOrderTotal !== undefined)
      discount.minOrderTotal = dto.minOrderTotal;

    // null means "go back to unlimited / never expires"; omitted means
    // unchanged. See UpdateDiscountDto.
    if (dto.usageLimit !== undefined) discount.usageLimit = dto.usageLimit;

    if (dto.expirationDate !== undefined) {
      const expirationDate = dto.expirationDate
        ? new Date(dto.expirationDate)
        : null;
      if (expirationDate && expirationDate.getTime() <= Date.now())
        throw new BadRequestException(DISCOUNT_MESSAGES.EXPIRATION_IN_PAST);

      discount.expirationDate = expirationDate;
    }

    if (dto.isActive !== undefined) discount.isActive = dto.isActive;

    const saved = await this.discountRepository.save(discount);

    return { message: DISCOUNT_MESSAGES.UPDATED, payload: saved };
  }

  // A hard delete is safe here: an order snapshots the code text in its own
  // "discountCode" column, so removing a coupon can never rewrite what a past
  // order says it paid. There is no FK behind "order"."discountId" — see
  // UNCONSTRAINED REFERENCES in docs/schema.sql — so the order is left holding
  // a dangling id. Harmless, because the only thing that still reads it is
  // OrderReservationService.release(), whose conditional UPDATE then matches
  // no rows. Switching isActive off is still the better move for a campaign
  // that may come back.
  async remove(id: string) {
    await this.findOneOrFail(id);

    await this.discountRepository.delete({ id });

    return { message: DISCOUNT_MESSAGES.DELETED, payload: { id } };
  }

  private async findOneOrFail(id: string) {
    const discount = await this.discountRepository.findOneBy({ id });
    if (!discount) throw new NotFoundException(DISCOUNT_MESSAGES.NOT_FOUND);

    return discount;
  }
}

// What the code takes off a subtotal. A fixed coupon is capped at the subtotal
// so a 500,000 code on a 200,000 cart makes it free, never negative.
const discountAmount = (discount: Discount, subtotal: number) => {
  const value = Number(discount.value);
  const amount =
    discount.type === DiscountType.Percent
      ? Math.round((subtotal * value) / 100)
      : value;

  return String(Math.min(amount, subtotal));
};

// SUMMER10 and " summer10 " are the same coupon.
const normalizeCode = (code: string) => code.trim().toUpperCase();
