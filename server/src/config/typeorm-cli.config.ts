import { DataSource } from 'typeorm';
import { dbConnection } from './db.config';

// The CLI's end of the connection. `typeorm migration:*` runs as its own
// process and cannot boot Nest, so it cannot read the config held in the DI
// container — it needs a plain DataSource it can import. Hence this file
// rather than reuse of typeorm.config.ts, which exports a Nest module.
//
// Exactly one DataSource export: the CLI scans every export of this file and
// refuses it if it finds two.
export default new DataSource({
  ...dbConnection,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
});
