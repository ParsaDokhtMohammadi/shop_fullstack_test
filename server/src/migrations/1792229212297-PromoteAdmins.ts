import { MigrationInterface, QueryRunner } from 'typeorm';
import { env } from '../config/env.config';
import { normalizePhone } from '../common/utils/phone.util';

export class PromoteAdmins1792229212297 implements MigrationInterface {
  name = 'PromoteAdmins1792229212297';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const phones = normalize(env.adminPhoneNumbers);
    if (!phones.length) {
      const cause = env.adminPhoneNumbers.length
        ? 'no usable number in ADMIN_PHONE_NUMBERS (see the skipped entries above)'
        : 'ADMIN_PHONE_NUMBERS is not set';
      console.warn(
        `  ! PromoteAdmins: ${cause}, so no admin was created. ` +
          'Fix it and write a new migration, or promote a row by hand: ' +
          `UPDATE "user" SET role = 'admin' WHERE "phoneNumber" = '+98…';`,
      );

      return;
    }
    const values = phones.map((_, i) => `($${i + 1}, 'admin')`).join(', ');
    const promoted = (await queryRunner.query(
      `INSERT INTO "user" ("phoneNumber", "role")
       VALUES ${values}
       ON CONFLICT ("phoneNumber") DO UPDATE
         SET "role" = 'admin', "updatedAt" = now()
       RETURNING "phoneNumber", ("createdAt" = "updatedAt") AS created`,
      phones,
    )) as { phoneNumber: string; created: boolean }[];

    for (const row of promoted)
      console.log(
        `  + ${row.phoneNumber} is now an admin${row.created ? ' (new account)' : ''}`,
      );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const phones = normalize(env.adminPhoneNumbers);
    if (!phones.length) return;

    await queryRunner.query(
      `UPDATE "user"
          SET "role" = 'user', "updatedAt" = now()
        WHERE "phoneNumber" = ANY($1) AND "role" = 'admin'`,
      [phones],
    );
  }
}
const normalize = (raw: string[]): string[] => {
  const phones = new Set<string>();

  for (const entry of raw) {
    const phone = normalizePhone(entry);

    if (!phone) {
      console.warn(
        `  ! PromoteAdmins: skipping "${entry}" — not a valid Iranian mobile number.`,
      );
      continue;
    }

    phones.add(phone);
  }
  return [...phones];
};
