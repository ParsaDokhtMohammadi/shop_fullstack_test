import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { DiscountType } from '../../../common/enums/discount-type.enum';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class CreateDiscountDto {
  @ApiProperty({
    example: 'SUMMER10',
    description: 'Case-insensitive; stored upper-cased.',
  })
  @IsNotEmpty({ message: VALIDATION_MESSAGES.DISCOUNT_CODE_REQUIRED })
  @Length(3, 40, { message: VALIDATION_MESSAGES.DISCOUNT_CODE_INVALID })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: VALIDATION_MESSAGES.DISCOUNT_CODE_INVALID,
  })
  code!: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType, {
    message: VALIDATION_MESSAGES.DISCOUNT_TYPE_INVALID,
  })
  type!: DiscountType;

  // The range check against `type` cannot live here — a validator sees one
  // field at a time — so the service rejects percent > 100.
  @ApiProperty({
    example: '10',
    description:
      'Digits only. percent -> 1..100; fixed -> an amount in Toman, not Rial.',
  })
  @IsNumberString(
    { no_symbols: true },
    { message: VALIDATION_MESSAGES.DISCOUNT_VALUE_INVALID },
  )
  @Length(1, 20, { message: VALIDATION_MESSAGES.DISCOUNT_VALUE_INVALID })
  value!: string;

  @ApiPropertyOptional({
    example: '2000000',
    default: '0',
    description: 'Subtotal in Toman the cart must reach. 0 = no minimum.',
  })
  @IsOptional()
  @Matches(/^\d+$/, { message: VALIDATION_MESSAGES.MIN_ORDER_TOTAL_INVALID })
  @Length(1, 20, { message: VALIDATION_MESSAGES.MIN_ORDER_TOTAL_INVALID })
  minOrderTotal?: string;

  @ApiPropertyOptional({ example: 100, description: 'Omit for unlimited.' })
  @IsOptional()
  @IsInt({ message: VALIDATION_MESSAGES.USAGE_LIMIT_INVALID })
  @Min(1, { message: VALIDATION_MESSAGES.USAGE_LIMIT_INVALID })
  usageLimit?: number;

  @ApiPropertyOptional({
    example: '2026-12-31T20:30:00.000Z',
    description: 'ISO date. Omit for a code that never expires.',
  })
  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: VALIDATION_MESSAGES.EXPIRATION_DATE_INVALID },
  )
  expirationDate?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: VALIDATION_MESSAGES.IS_ACTIVE_INVALID })
  isActive?: boolean;
}
