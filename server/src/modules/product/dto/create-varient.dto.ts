import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// One purchasable row: a colour, a size, both, or neither.
export class CreateVarientDto {
  @ApiPropertyOptional({
    example: 'قرمز',
    description: 'Omit for a product with no colour options.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.VARIENT_COLOR_LENGTH })
  @Length(1, 60, { message: VALIDATION_MESSAGES.VARIENT_COLOR_LENGTH })
  color?: string;

  @ApiPropertyOptional({ example: '#e02424' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: VALIDATION_MESSAGES.VARIENT_COLOR_CODE_INVALID,
  })
  colorCode?: string;

  @ApiPropertyOptional({
    example: 'XL',
    description: 'Omit for a product with no size options.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.VARIENT_SIZE_LENGTH })
  @Length(1, 60, { message: VALIDATION_MESSAGES.VARIENT_SIZE_LENGTH })
  size?: string;

  // Digits only, in Toman — not Rial, and not a currency's minor unit. The
  // column is varchar, so this validator is the only thing standing between
  // the DB and "12,000 تومان".
  @ApiProperty({
    example: '1290000',
    description:
      'Price in Toman, digits only. 1290000 means ۱٬۲۹۰٬۰۰۰ تومان — not Rial.',
  })
  @IsNumberString(
    { no_symbols: true },
    { message: VALIDATION_MESSAGES.PRICE_INVALID },
  )
  @Length(1, 20, { message: VALIDATION_MESSAGES.PRICE_INVALID })
  price!: string;

  @ApiPropertyOptional({ example: '15', default: '0', description: '0-100.' })
  @IsOptional()
  @IsNumberString(
    { no_symbols: true },
    { message: VALIDATION_MESSAGES.DISCOUNT_INVALID },
  )
  @Matches(/^(100|[1-9]?[0-9])$/, {
    message: VALIDATION_MESSAGES.DISCOUNT_INVALID,
  })
  discountPercent?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt({ message: VALIDATION_MESSAGES.STOCK_INVALID })
  @Min(0, { message: VALIDATION_MESSAGES.STOCK_INVALID })
  stock?: number;
}
