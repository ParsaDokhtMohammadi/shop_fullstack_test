import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ProductVarient } from '../../product/entities/product-varient.entity';

// There is no "cart" table: a cart is just this user's rows. No price column
// either — totals are always recomputed from the variant, so a price change
// before checkout is reflected instead of frozen.
@Entity('cart_item')
@Index('cart_item_user_varient_unique', ['userId', 'productVarientId'], {
  unique: true,
})
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  productVarientId!: string;

  @ManyToOne(() => ProductVarient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productVarientId' })
  productVarient!: ProductVarient;

  @Column({ type: 'int' })
  quantity!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
