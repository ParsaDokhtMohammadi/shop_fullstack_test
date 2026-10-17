import { Injectable, Logger } from '@nestjs/common';
import { KavenegarApi, KavenegarApiInstance } from 'kavenegar';
import { SmsSender } from '../sms-sender.interface';
import { toLocalPhone } from '../../../common/utils/phone.util';
import { env } from '../../../config/env.config';
import { SmsUnknownError } from '../sms.errors';

// The SDK sets no socket timeout, so a hung connection would hold the OTP
// request open forever. This is only a backstop against that: Kavenegar
// answering slowly is normal, and it has been seen to deliver the message and
// acknowledge it well after ten seconds — so the window is generous, and
// running out of it is reported as SmsUnknownError rather than as a failure.
const SEND_TIMEOUT_MS = 30_000;

@Injectable()
export class KavenegarSmsSender implements SmsSender {
  private readonly logger = new Logger('SMS');

  // One API object for the process. It holds nothing but the key and builds a
  // fresh HTTPS request per call, so there is no connection to go stale.
  private readonly api: KavenegarApiInstance = KavenegarApi({
    apikey: env.sms.kavenegarApiKey,
  });

  async send(phone: string, message: string): Promise<void> {
    // Kavenegar wants 09xxxxxxxxx. We store +989xxxxxxxxx.
    const receptor = toLocalPhone(phone);

    await Promise.race([this.call(receptor, message), this.timeout(receptor)]);
  }

  private call(receptor: string, message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.api.Send(
        { receptor, sender: env.sms.kavenegarSender, message },
        (_entries, status, statusMessage) => {
          // Kavenegar answers with its own status code inside a 200 HTTP
          // response: 200 is sent, 418 is out of credit, 426 is a plan
          // problem, 412 a bad sender line. A transport error gives no status
          // at all, which is why this is a range check and not `!== 200`.
          if (status && status >= 200 && status < 300) return resolve();

          // No status at all means the connection itself failed, which is the
          // same unknown as a timeout — the POST may have been written before
          // it broke. Only an explicit status from Kavenegar is a real "no".
          if (!status) {
            this.logger.warn(
              `Kavenegar connection failed to=${receptor} — delivery unknown`,
            );
            return reject(new SmsUnknownError('kavenegar transport error'));
          }

          this.logger.error(
            `Kavenegar refused to=${receptor} status=${status} message=${statusMessage ?? '-'}`,
          );
          reject(new Error(`kavenegar status ${status}`));
        },
      );
    });
  }

  private timeout(receptor: string): Promise<never> {
    return new Promise((_resolve, reject) =>
      setTimeout(() => {
        // warn, not error: the message has probably gone out. Nothing is
        // broken, we just stopped waiting for the receipt.
        this.logger.warn(
          `Kavenegar did not answer within ${SEND_TIMEOUT_MS / 1000}s to=${receptor} — the message may still have been delivered`,
        );
        reject(new SmsUnknownError('kavenegar timeout'));
      }, SEND_TIMEOUT_MS).unref(),
    );
  }
}
