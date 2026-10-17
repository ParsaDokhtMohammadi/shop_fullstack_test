import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { Role } from '../common/enums/role.enum';
import { normalizePhone } from '../common/utils/phone.util';

// Creates the first admin, since nothing in the API ever sets role = 'admin'.
// Idempotent: run it again to re-promote the same number, or on a number that
// already logged in as a normal user.
//
//   pnpm seed:admin 09123456789
//   ADMIN_PHONE=09123456789 pnpm seed:admin
async function seedAdmin() {
  const input = process.argv[2] ?? process.env.ADMIN_PHONE;
  if (!input) {
    console.error(
      'Usage: pnpm seed:admin <phoneNumber>   (or set ADMIN_PHONE)',
    );
    process.exit(1);
  }

  const phone = normalizePhone(input);
  if (!phone) {
    console.error(`Not a valid phone number: ${input}`);
    process.exit(1);
  }

  // Boots the app's providers without opening an HTTP port, so the seed reuses
  // the same entities, connection and services as the running API.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const users = app.get(UserService);
    const user = await users.findOrCreateByPhone(phone);
    await users.setRole(user.id, Role.Admin);
    console.log(`Admin ready: ${phone} (${user.id})`);
    console.log('Log in with this number — the role is read from the token.');
  } finally {
    await app.close();
  }
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
