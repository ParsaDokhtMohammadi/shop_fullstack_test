import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BannerPosition } from '../../../common/enums/banner-position.enum';

// No foreign keys, by design: a banner points at a url, not at a product, so
// deleting a product can never break the homepage.
@Entity('banner')
// Partial index: the public endpoint only ever reads active banners in order,
// and that is the one query worth an index here.
@Index('banner_active_index', ['position', 'sortOrder'], {
  where: '"isActive"',
})
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  imageUrl!: string;

  // Optional: a banner can be decoration rather than a link.
  @Column({ type: 'text', nullable: true })
  linkUrl!: string | null;

  // Shown as the image's alt text, so a banner is not invisible to a screen
  // reader or when the image fails to load.
  @Column({ type: 'varchar', length: 160, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: 40, default: BannerPosition.HomeSlider })
  position!: BannerPosition;

  // Soft switch, like categories: a seasonal banner is turned off and back on
  // next year rather than re-uploaded.
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
