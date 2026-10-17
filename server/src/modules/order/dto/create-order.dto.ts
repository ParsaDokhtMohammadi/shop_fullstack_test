import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// Deliberately tiny: the only things the client gets to choose are which
// address, which coupon and how to pay. Items, prices and totals all come from
// the user's own cart rows, priced from the database inside the transaction.
export class CreateOrderDto {
  @ApiProperty({ description: 'One of the addresses saved by this user.' })
  @IsUUID('4', { message: VALIDATION_MESSAGES.ADDRESS_ID_INVALID })
  addressId!: string;

  @ApiPropertyOptional({
    example: 'SUMMER10',
    description:
      'The code is sent here, not stored on the cart, and is re-validated and re-priced at this moment.',
  })
  @IsOptional()
  @Length(3, 40, { message: VALIDATION_MESSAGES.DISCOUNT_CODE_INVALID })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: VALIDATION_MESSAGES.DISCOUNT_CODE_INVALID,
  })
  discountCode?: string;

  @ApiPropertyOptional({ description: 'A note for the courier.' })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.ORDER_NOTE_LENGTH })
  @Length(0, 500, { message: VALIDATION_MESSAGES.ORDER_NOTE_LENGTH })
  note?: string;
}
