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

@Entity('address')
@Index('address_user_index', ['userId'])
@Index('address_one_default_per_user', ['userId'], {
  unique: true,
  where: '"isDefault"',
})
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ type: 'uuid' })
  userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
  @Column({ type: 'varchar', length: 60 })
  firstName!: string;
  @Column({ type: 'varchar', length: 60 })
  lastName!: string;
  @Column({ type: 'varchar', length: 80 })
  province!: string;
  @Column({ type: 'varchar', length: 80 })
  city!: string;
  @Column({ type: 'text' })
  address!: string;
  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode!: string | null;
  @Column({ type: 'varchar', length: 20 })
  phoneNumber!: string;
  @Column({ type: 'text', nullable: true })
  info!: string | null;
  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
