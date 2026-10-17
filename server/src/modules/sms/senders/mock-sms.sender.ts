import { Injectable, Logger } from '@nestjs/common';
import { SmsSender } from '../sms-sender.interface';

// Development. Prints what would have been sent, so an OTP can be read out of
// the console with no API key and no credit spent.
@Injectable()
export class MockSmsSender implements SmsSender {
  private readonly logger = new Logger('SMS');

  send(phone: string, message: string): Promise<void> {
    // One line, both fields labelled: easy to grep for while testing a login.
    this.logger.log(
      `[mock] to=${phone} message=${message.replace(/\n/g, ' | ')}`,
    );

    return Promise.resolve();
  }
}
