import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DiscountType } from '../../../common/enums/discount-type.enum';

// A coupon. It is never stored on the cart — the code travels with the order
// request and is re-validated and re-priced server-side at that moment.
@Entity('discount')
export class Discount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Always saved upper-cased and trimmed, so SUMMER10 and summer10 are the
  // same coupon and a plain unique index is enough to enforce it.
  @Index('discount_code_unique', { unique: true })
  @Column({ type: 'varchar', length: 40 })
  code!: string;

  @Column({ type: 'varchar', length: 10 })
  type!: DiscountType;

  // percent -> 1..100, fixed -> an amount in Toman. Money is a digits-only string
  // here like everywhere else, so the maths happens in one place.
  @Column({ type: 'varchar', length: 20 })
  value!: string;

  // Below this subtotal the code is refused. '0' = no minimum.
  @Column({ type: 'varchar', length: 20, default: '0' })
  minOrderTotal!: string;

  // null = unlimited uses. Incremented inside the order transaction, so two
  // simultaneous checkouts cannot both take the last use.
  @Column({ type: 'int', nullable: true })
  usageLimit!: number | null;

  @Column({ type: 'int', default: 0 })
  usage!: number;

  // null = never expires.
  @Column({ type: 'timestamptz', nullable: true })
  expirationDate!: Date | null;

  // Soft switch: a campaign is turned off rather than deleted, so the orders
  // that used it still point at a real row.
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
