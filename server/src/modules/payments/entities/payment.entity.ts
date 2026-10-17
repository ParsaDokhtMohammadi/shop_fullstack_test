import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { PaymentProvider } from '../../../common/enums/payment-provider.enum';

// One row per attempt at paying for an order, not one per order: a customer
// who gives up at the gateway and comes back gets a second row, and the shop
// can see both.
@Entity('payment')
@Index('payment_order_index', ['orderId'])
@Index('payment_user_index', ['userId', 'createdAt'])
// The idempotency guarantee. The gateway's own id for the attempt, unique per
// provider — so a callback that fires twice cannot create a second success
// row, and two providers are free to hand out the same string.
@Index('payment_provider_reference_unique', ['provider', 'reference'], {
  unique: true,
})
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  orderId!: string;

  // Nullable for the same reason as order.userId: the shop's financial history
  // has to outlive the account. No FK here, and none on orderId either — see
  // UNCONSTRAINED REFERENCES in docs/schema.sql.
  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 40 })
  provider!: PaymentProvider;

  // Zarinpal calls this the "authority". It is what identifies the attempt in
  // every later conversation with the gateway, including the verify call.
  @Column({ type: 'varchar', length: 120 })
  reference!: string;

  // What we asked the gateway to charge, snapshotted. The verify step compares
  // this against the order's current grandTotal before anything is marked
  // paid, so a price edit mid-checkout cannot be exploited.
  @Column({ type: 'varchar', length: 20 })
  amount!: string;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.Pending })
  status!: PaymentStatus;

  // The bank's receipt number, which is what a customer quotes in a dispute.
  // Null until the payment is verified.
  @Column({ type: 'varchar', length: 60, nullable: true })
  refId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
