import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpCode } from './entities/otp-code.entity';
import { MAX_VERIFY_ATTEMPTS } from './auth.service';

// otp_code only ever grows on its own. A row is deleted the moment a code is
// used, and replaced when a new one is sent to the same number — but a number
// that asked for a code and never came back leaves its row sitting there
// forever. One row per phone is not much, yet over a few years of a shop it is
// a table of every number that ever started a login and never finished, which
// is both dead weight and personal data nobody needs kept.
@Injectable()
export class OtpCleanupTask {
  private readonly logger = new Logger(OtpCleanupTask.name);

  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepository: Repository<OtpCode>,
  ) {}

  // Every 30 minutes. Nothing depends on this running promptly — a dead row is
  // harmless, it just takes space — so this is deliberately infrequent rather
  // than matched to the 120s code lifetime.
  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'DELETE_DEAD_OTP_CODES' })
  async deleteDeadCodes() {
    try {
      const removed = await this.deleteDead();
      if (removed) this.logger.log(`Deleted ${removed} dead otp code(s).`);
    } catch (error) {
      // A throw out of a cron handler is an unhandled rejection, and the job
      // must still run in half an hour — so it is logged and swallowed here.
      this.logger.error(
        'Deleting dead otp codes failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // Two kinds of dead row, and they are not the same thing: a code can be past
  // its 120s expiry, or it can still be inside it having burnt all five of its
  // attempts. Either way nothing can be done with it again.
  //
  // now() is the database's clock, not the app's, so a container whose time has
  // drifted cannot delete codes that are still live.
  private async deleteDead(): Promise<number> {
    const result = await this.otpRepository
      .createQueryBuilder()
      .delete()
      .from(OtpCode)
      .where('"expiresAt" <= now()')
      .orWhere('attempts >= :max', { max: MAX_VERIFY_ATTEMPTS })
      .execute();

    return result.affected ?? 0;
  }
}
