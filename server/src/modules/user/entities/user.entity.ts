import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ type: 'varchar', length: 20, unique: true })
  phoneNumber!: string;

  // One field rather than first/last: the account name is only ever displayed,
  // and the names that get printed on a parcel live on `address` anyway, typed
  // per delivery. Null until the customer fills their profile in — signup asks
  // for a phone number and nothing else.
  @Column({ type: 'varchar', length: 120, nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', length: 10, default: Role.User })
  role!: Role;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
