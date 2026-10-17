import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

// One line of a placed order, frozen. Every column except varientId is a copy
// made at purchase time — the product can be renamed, re-priced, re-imaged or
// deleted and this row still renders exactly what was bought.
@Entity('order_item')
@Index('order_item_order_index', ['orderId'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;

  // Reference only, for "buy again", with no FK behind it. It does NOT go null
  // when the variant disappears — a deleted variant leaves this id dangling,
  // and a discontinued one (isActive = false, which is how variants are
  // actually retired) keeps a perfectly resolvable id it is no longer legal to
  // buy. So this is a hint, never a promise: the cart is what decides. See
  // UNCONSTRAINED REFERENCES in docs/schema.sql.
  @Column({ type: 'uuid', nullable: true })
  varientId!: string | null;

  @Column({ type: 'varchar', length: 200 })
  productName!: string;

  // "قرمز / L", or null for a product with no options.
  @Column({ type: 'varchar', length: 120, nullable: true })
  varientLabel!: string | null;

  @Column({ type: 'text', nullable: true })
  imageUrl!: string | null;

  // What was actually charged per unit — after any variant discount.
  @Column({ type: 'varchar', length: 20 })
  unitPrice!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'varchar', length: 20 })
  lineTotal!: string;
}
