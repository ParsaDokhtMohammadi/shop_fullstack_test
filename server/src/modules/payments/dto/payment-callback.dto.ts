import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Zarinpal's own query parameters, capitalised exactly as they send them.
// Nothing here is trusted beyond "which attempt are we talking about" — the
// amount and the outcome are re-fetched from the gateway in the verify call.
export class PaymentCallbackDto {
  @ApiPropertyOptional({ description: 'The gateway reference (authority).' })
  @IsOptional()
  @IsString()
  // The route is public and unauthenticated — it has to be, since it arrives
  // as a browser redirect from the gateway's domain. So whatever lands here is
  // a stranger's string, and handleCallback writes it into a warning line when
  // it matches no payment row. Unbounded, that line is the caller's to compose:
  // a newline forges a second log entry, and megabytes of text are megabytes of
  // log. Both are shut by constraining the value rather than the log call.
  //
  // 120 is payment.reference's column width, so a longer value could not match
  // a row even if it were allowed through. The charset covers every reference
  // this app can see — Zarinpal's 36-character alphanumeric authority and the
  // mock driver's `MOCK-<hex>` — while excluding the newlines and control
  // characters that make log injection work. Kept deliberately wider than
  // either format, because the gateway behind this route is swappable and a
  // pattern matched to one provider would break the next.
  @MaxLength(120)
  @Matches(/^[A-Za-z0-9._-]+$/)
  Authority?: string;

  @ApiPropertyOptional({ description: '"OK" or "NOK".' })
  @IsOptional()
  @IsString()
  // Left unconstrained on purpose: this one is only ever compared against
  // 'OK', never logged and never stored, so there is nothing for a hostile
  // value to reach — and a tighter rule would only risk rejecting whatever the
  // next gateway sends in its place.
  Status?: string;
}
