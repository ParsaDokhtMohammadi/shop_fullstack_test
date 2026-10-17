import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

// Every product has at least one variant. A product with no options gets a
// single row with color and size null; colors only, sizes only, or both are
// just more rows. Price and stock live here, never on the product.
//
// Table name keeps the schema's misspelling: product_varient.
@Entity('product_varient')
export class ProductVarient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.varients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product!: Product;
  @Column({ type: 'varchar', length: 60, nullable: true })
  color!: string | null;
  // Hex the frontend paints the swatch with, e.g. #1a1a1a.
  @Column({ type: 'varchar', length: 20, nullable: true })
  colorCode!: string | null;
  @Column({ type: 'varchar', length: 60, nullable: true })
  size!: string | null;
  @Column({ type: 'varchar', length: 20 })
  price!: string;
  @Column({ type: 'varchar', length: 3, default: '0' })
  discountPercent!: string;
  @Column({ type: 'int', default: 0 })
  stock!: number;
  // Discontinued, not sold out — stock = 0 is "sold out".
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
