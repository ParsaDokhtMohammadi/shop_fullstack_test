import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';
import { VALIDATION_MESSAGES } from '../../../common/messages';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

// What support actually needs when a customer says "I paid and my order is
// gone": the attempt, the receipt number they are reading out, and whether
// the shop already owes them a refund.
export class AdminListPaymentsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: 'Only attempts in this status. Omit for all of them.',
  })
  @IsOptional()
  @IsEnum(PaymentStatus, {
    message: VALIDATION_MESSAGES.PAYMENT_STATUS_INVALID,
  })
  status?: PaymentStatus;

  // The one filter this endpoint exists for. See countNeedingAttention in the
  // service for what makes an attempt "needs attention" — it is derived from
  // the two status columns, so there is no flag anybody has to remember to set.
  @ApiPropertyOptional({
    description:
      'true leaves only the attempts where the money arrived but the order is closed — a refund or a re-open somebody still has to do.',
  })
  @IsOptional()
  // A query string carries "true", never a boolean — same as ListDiscountsDto.
  @ToBoolean()
  @IsBoolean({ message: VALIDATION_MESSAGES.NEEDS_ATTENTION_INVALID })
  needsAttention?: boolean;

  @ApiPropertyOptional({
    description:
      'Order number, the gateway reference (Zarinpal’s authority) or the bank receipt number. Matches part of any of the three.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.PAYMENT_SEARCH_INVALID })
  @Length(1, 120, { message: VALIDATION_MESSAGES.PAYMENT_SEARCH_INVALID })
  search?: string;

  // Lets the CRM link straight to one customer's attempts.
  @ApiPropertyOptional({ description: "Only this customer's attempts." })
  @IsOptional()
  @IsUUID('4', { message: VALIDATION_MESSAGES.CUSTOMER_ID_INVALID })
  userId?: string;

  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Attempts started at or after this moment.',
  })
  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: VALIDATION_MESSAGES.ORDER_DATE_INVALID },
  )
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-31T23:59:59.000Z',
    description: 'Attempts started at or before this moment.',
  })
  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: VALIDATION_MESSAGES.ORDER_DATE_INVALID },
  )
  to?: string;
}
