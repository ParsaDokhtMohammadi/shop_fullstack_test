import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { OrderItem } from './order-item.entity';

// Everything the customer agreed to is copied in here. userId, addressId and
// discountId are plain ids with no FK behind them — references kept for "buy
// again" and for reporting. Nothing renders from them, so editing or deleting
// an address, a coupon or a user later cannot change what this order says; it
// only leaves one of those ids pointing at a row that is gone. Deliberate:
// see UNCONSTRAINED REFERENCES in docs/schema.sql.
@Entity('order')
@Index('order_user_index', ['userId', 'createdAt'])
@Index('order_status_index', ['status', 'createdAt'])
// One coupon per customer is enforced by asking this table whether they have
// an order holding that code, which happens inside the checkout transaction —
// so it wants an index rather than a scan of every order ever placed.
@Index('order_discount_user_index', ['discountId', 'userId'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // What the customer reads out to support. The uuid stays the real key.
  @Index('order_number_unique', { unique: true })
  @Column({ type: 'varchar', length: 20 })
  orderNumber!: string;

  // Nullable because the shop's sales history has to outlive the account. No
  // FK and no delete-account endpoint today, so in practice it is always set;
  // an account deletion added later would have to blank it itself.
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PendingPayment })
  status!: OrderStatus;

  // Money, digits-only strings of Toman, same as everywhere else.
  // grandTotal is the one the gateway is verified against.
  @Column({ type: 'varchar', length: 20 })
  subTotal!: string;

  @Column({ type: 'varchar', length: 20, default: '0' })
  discountTotal!: string;

  @Column({ type: 'varchar', length: 20, default: '0' })
  shippingTotal!: string;

  @Column({ type: 'varchar', length: 20 })
  grandTotal!: string;

  @Column({ type: 'uuid', nullable: true })
  discountId!: string | null;

  // Snapshot of the code text: the coupon row can be renamed or deleted.
  @Column({ type: 'varchar', length: 40, nullable: true })
  discountCode!: string | null;

  // Reference only, no FK. The ship* columns below are what gets printed on
  // the box, and they keep working after the address row is deleted — this id
  // just stops resolving.
  //
  // Not indexed, deliberately: nothing filters orders by it. It is read back
  // out on the admin detail payload and followed to the address table by its
  // own primary key, so an index here would slow every order write and serve
  // no query. If a "all orders to this address" view ever appears, add one.
  @Column({ type: 'uuid', nullable: true })
  addressId!: string | null;

  @Column({ type: 'varchar', length: 60 })
  shipFirstName!: string;

  @Column({ type: 'varchar', length: 60 })
  shipLastName!: string;

  @Column({ type: 'varchar', length: 20 })
  shipPhone!: string;

  @Column({ type: 'varchar', length: 80 })
  shipProvince!: string;

  @Column({ type: 'varchar', length: 80 })
  shipCity!: string;

  @Column({ type: 'text' })
  shipAddress!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  shipPostalCode!: string | null;

  @Column({ type: 'varchar', length: 20, default: PaymentMethod.Online })
  paymentMethod!: PaymentMethod;

  // Null until the order ships.
  @Column({ type: 'varchar', length: 60, nullable: true })
  trackingNumber!: string | null;

  // Whatever the customer typed at checkout ("leave it with the neighbour").
  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  items!: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
