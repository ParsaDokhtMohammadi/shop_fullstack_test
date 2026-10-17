import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { ProductImage } from './product-image.entity';
import { ProductVarient } from './product-varient.entity';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ type: 'varchar', length: 35 })
  name!: string;
  @Column({ type: 'varchar', length: 40, unique: true })
  slug!: string;
  @Column({ type: 'text', nullable: true })
  content!: string | null;
  @Index()
  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category!: Category | null;

  @Index()
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
  @OneToMany(() => ProductVarient, (varient) => varient.product, {
    cascade: true,
  })
  varients!: ProductVarient[];
  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
  images!: ProductImage[];
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
