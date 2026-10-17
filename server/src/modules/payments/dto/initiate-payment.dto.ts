import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class InitiatePaymentDto {
  // The order id and nothing else. No amount: the amount is read from the
  // order server-side, because a client that can name its own price will.
  @ApiProperty({ description: 'The order to pay for.' })
  @IsUUID('4', { message: VALIDATION_MESSAGES.ORDER_ID_INVALID })
  orderId!: string;
}
