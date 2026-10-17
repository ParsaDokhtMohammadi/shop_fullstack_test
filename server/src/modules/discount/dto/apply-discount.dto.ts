import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length, Matches } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// Just the code. The subtotal it is checked against is always computed from
// the user's own cart rows, never sent by the client.
export class ApplyDiscountDto {
  @ApiProperty({ example: 'SUMMER10' })
  @IsNotEmpty({ message: VALIDATION_MESSAGES.DISCOUNT_CODE_REQUIRED })
  @Length(3, 40, { message: VALIDATION_MESSAGES.DISCOUNT_CODE_INVALID })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: VALIDATION_MESSAGES.DISCOUNT_CODE_INVALID,
  })
  code!: string;
}
