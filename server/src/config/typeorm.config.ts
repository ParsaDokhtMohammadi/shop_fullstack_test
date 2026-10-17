import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConnection } from './db.config';
import { env } from './env.config';


export const typeOrmConfig = TypeOrmModule.forRoot({
  ...dbConnection,
  autoLoadEntities: true,
  synchronize: env.db.synchronize,
});
