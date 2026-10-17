import { Logger, Module, Provider } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SMS_SENDER } from './sms-sender.interface';
import { MockSmsSender } from './senders/mock-sms.sender';
import { KavenegarSmsSender } from './senders/kavenegar-sms.sender';
import { SmsProvider } from '../../common/enums/sms-provider.enum';
import { env } from '../../config/env.config';

// The swap, in one provider. SMS_PROVIDER decides which class answers the
// token, once, at boot — so a wrong value or a missing key is a startup
// failure rather than a customer stuck at a login screen.
const smsSenderProvider: Provider = {
  provide: SMS_SENDER,
  useFactory: () => {
    const logger = new Logger('SMS');

    // Turn the raw env string into the enum once. A typo lands here as
    // undefined and stops the boot, instead of silently falling through to a
    // default that sends nothing.
    const provider = Object.values(SmsProvider).find(
      // String(), because the env value is a plain string and the enum
      // members are not: comparing them directly is exactly the mistake the
      // no-unsafe-enum-comparison rule exists to catch.
      (value) => String(value) === env.sms.provider,
    );

    if (!provider)
      throw new Error(
        `Unknown SMS_PROVIDER "${env.sms.provider}". Use one of: ${Object.values(SmsProvider).join(', ')}.`,
      );

    if (provider === SmsProvider.Kavenegar) {
      if (!env.sms.kavenegarApiKey)
        throw new Error(
          'SMS_PROVIDER=kavenegar but SMS_KAVENEGAR_API_KEY is empty.',
        );
      if (!env.sms.kavenegarSender)
        throw new Error(
          'SMS_PROVIDER=kavenegar but SMS_KAVENEGAR_SENDER is empty.',
        );

      logger.log('Sending through Kavenegar.');
      return new KavenegarSmsSender();
    }

    // Loud, because a production deployment left on mock sends no codes at all
    // while looking perfectly healthy in the logs.
    if (env.isProduction)
      logger.warn(
        'SMS_PROVIDER=mock in production — no real messages are sent.',
      );
    else logger.log('Mock sender: codes are logged, not sent.');

    return new MockSmsSender();
  },
};

@Module({
  providers: [SmsService, smsSenderProvider],
  exports: [SmsService],
})
export class SmsModule {}
