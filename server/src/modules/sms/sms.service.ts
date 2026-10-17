import { Inject, Injectable } from '@nestjs/common';
import { SMS_SENDER } from './sms-sender.interface';
// `import type`: the interface is erased at compile time, and with
// emitDecoratorMetadata on, a value import here would make Nest try to resolve
// a non-existent class. The SMS_SENDER token is what actually injects.
import type { SmsSender } from './sms-sender.interface';
import { SMS_MESSAGES } from '../../common/messages';

// What the rest of the app calls. It knows nothing about any provider: the
// sender is injected by token, so auth (and later an order-status notice) is
// unaffected by which one is wired in.
//
// Its one job of its own is the opt-out line. Iranian operators require every
// message to end with it, so it is appended here rather than left to each
// caller to remember — forgetting it on one message is how a sender line gets
// suspended.
@Injectable()
export class SmsService {
  constructor(@Inject(SMS_SENDER) private readonly sender: SmsSender) {}

  send(phone: string, message: string): Promise<void> {
    return this.sender.send(phone, SMS_MESSAGES.withOptOut(message));
  }
}
