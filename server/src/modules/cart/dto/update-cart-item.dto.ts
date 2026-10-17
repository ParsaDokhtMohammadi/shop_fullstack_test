import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// The new quantity, not a delta: sending 2 makes the line 2, whatever it was.
// That keeps the cart page's stepper idempotent — a double tap cannot add twice.
export class UpdateCartItemDto {
  @ApiProperty({ minimum: 1, maximum: 100, example: 2 })
  @IsInt({ message: VALIDATION_MESSAGES.QUANTITY_INVALID })
  @Min(1, { message: VALIDATION_MESSAGES.QUANTITY_INVALID })
  @Max(100, { message: VALIDATION_MESSAGES.QUANTITY_INVALID })
  quantity!: number;
}
