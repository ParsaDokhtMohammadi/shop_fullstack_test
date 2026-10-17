import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Keyed by phone, not by user: the account does not exist yet when the first
// code is sent, because proving you own the number is what creates it. The
// phone is the login identity and is unique on "user", so it is the whole
// link — every lookup here is by phone, and the index matches.
// One live code per (phone, purpose). The resend cooldown is read-then-write,
// so two requests can both pass it; this index is what refuses the second
// insert instead of letting both send a message.
@Entity('otp_code')
@Index('otp_code_phone_purpose_unique', ['phone', 'purpose'], { unique: true })
export class OtpCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ type: 'varchar', length: 20 })
  phone!: string;
  @Column({ type: 'varchar', length: 255 })
  codeHash!: string;
  @Column({ type: 'varchar', length: 20, default: 'login' })
  purpose!: string;
  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
  @Column({ type: 'int', default: 0 })
  attempts!: number;
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
