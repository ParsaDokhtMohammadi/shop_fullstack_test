import { ThrottlerModule, minutes } from '@nestjs/throttler';
import { COMMON_MESSAGES } from 'src/common/messages';
export const throttlerConfig = ThrottlerModule.forRoot({
  throttlers: [{ ttl: minutes(5), limit: 100 }],
  errorMessage: (_context, detail) =>
    COMMON_MESSAGES.TOO_MANY_REQUESTS(detail.timeToBlockExpire),
});
