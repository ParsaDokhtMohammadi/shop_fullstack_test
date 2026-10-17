import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// One row, forever. The primary key is a boolean whose only allowed value is
// true, so a second row is a primary key conflict rather than something the
// code has to remember not to insert. Nothing ever asks "which settings row".
//
// Everything that differs between client shops lives here so the code stays
// identical across deployments. API keys stay in env vars — this table is
// readable by any admin.
@Entity('settings')
export class Settings {
  @PrimaryColumn({ type: 'boolean', default: true })
  id!: boolean;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  logoUrl!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  supportNumber!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  supportEmail!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  // Free-form: { instagram: '...', telegram: '...' }. A client that wants a
  // network nobody else has needs no migration for it.
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  socials!: Record<string, string>;

  // Money as a digits-only string of Toman, same as product_varient.price,
  // so price.util works on it unchanged.
  @Column({ type: 'varchar', length: 20, default: '0' })
  shippingCost!: string;

  // null = shipping is never free.
  @Column({ type: 'varchar', length: 20, nullable: true })
  freeShippingThreshold!: string | null;

  // There is deliberately no paymentProvider or smsProvider here. Both are
  // chosen from env at boot, where they can be checked against the merchant id
  // or api key that has to agree with them, and wired into the DI container
  // once. A copy in this table could only ever disagree with the running app —
  // an admin would set it, see it saved, and nothing would change.
  @Column({ type: 'int', default: 5 })
  lowStockThreshold!: number;

  // Lets a client turn the homepage banner strip off without deleting banners.
  @Column({ type: 'boolean', default: true })
  bannerToggle!: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
