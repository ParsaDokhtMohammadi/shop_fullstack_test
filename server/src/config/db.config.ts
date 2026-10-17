import type { DataSourceOptions } from 'typeorm';
import { env } from './env.config';

// The connection, and nothing else. Two separate processes need it — the Nest
// app (via typeorm.config.ts) and the typeorm CLI (via typeorm-cli.config.ts)
// — and everything they disagree about is layered on top at each end. Keeping
// it here means one place reads the database env vars, so a changed password
// or host cannot be half-applied.
//
// Deliberately no `entities`, `migrations` or `synchronize`: those are exactly
// the keys the two ends must set differently.
export const dbConnection = {
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  logging: env.db.logging,

  // `false` rather than undefined when it is off: pg treats the key as absent
  // either way, but false says the plaintext connection is a decision.
  ssl: env.db.ssl ? { rejectUnauthorized: env.db.sslRejectUnauthorized } : false,
} satisfies DataSourceOptions;
