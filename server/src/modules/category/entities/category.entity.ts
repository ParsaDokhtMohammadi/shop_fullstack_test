import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 140, unique: true })
  slug!: string;

  // No image. A category is a navigation label, not a tile — the storefront
  // renders these as text, and the one thing a picture here ever did was leave
  // an orphaned file behind on every edit.

  // null = a root category, otherwise the id of the category it sits under.
  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentId!: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
