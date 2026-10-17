import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';
import { IsSocials } from '../../../common/decorators/is-socials.decorator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

// Sent as multipart/form-data because the logo is a file, so every field
// arrives as a string and needs an explicit @Type / @ToBoolean / @Transform
// before its validator runs.
//
// Every field is optional: this is a single row that always exists, so a write
// only ever changes the fields it was given.
export class UpsertSettingsDto {
  @ApiPropertyOptional({ example: 'دیجی‌کالا' })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.SHOP_NAME_REQUIRED })
  @Length(2, 120, { message: VALIDATION_MESSAGES.SHOP_NAME_LENGTH })
  name?: string;

  // Swagger only: this is where the file picker comes from. The value is read
  // from the upload, not the body, so it has no validator.
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  logo?: unknown;

  @ApiPropertyOptional({ example: '02112345678' })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.SUPPORT_NUMBER_INVALID })
  @Length(0, 20, { message: VALIDATION_MESSAGES.SUPPORT_NUMBER_INVALID })
  supportNumber?: string;

  @ApiPropertyOptional({ example: 'support@shop.ir' })
  @IsOptional()
  @IsEmail({}, { message: VALIDATION_MESSAGES.SUPPORT_EMAIL_INVALID })
  @Length(0, 160, { message: VALIDATION_MESSAGES.SUPPORT_EMAIL_INVALID })
  supportEmail?: string;

  @ApiPropertyOptional({
    description: "The shop's own address, for the contact page.",
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.SHOP_ADDRESS_INVALID })
  @Length(0, 500, { message: VALIDATION_MESSAGES.SHOP_ADDRESS_INVALID })
  address?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: '{"instagram":"https://instagram.com/shop"}',
    description:
      'A JSON object of network -> url, at most 20 of them. Every value must be an absolute http or https url — a javascript: or protocol-relative value is refused here rather than left for the storefront to render into an href. Sent as a JSON string because the body is multipart.',
  })
  @IsOptional()
  // Left as the raw string when it is not valid JSON, so @IsSocials rejects it
  // with the normal validation message instead of a 500 from the parse.
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  // No `message` override: the decorator builds its own, naming the network
  // whose url is bad when it can work out which one that is.
  @IsSocials()
  socials?: Record<string, string>;

  @ApiPropertyOptional({
    example: '500000',
    description: 'Shipping cost in Toman, digits only.',
  })
  @IsOptional()
  @Matches(/^\d+$/, { message: VALIDATION_MESSAGES.SHIPPING_COST_INVALID })
  @Length(1, 20, { message: VALIDATION_MESSAGES.SHIPPING_COST_INVALID })
  shippingCost?: string;

  @ApiPropertyOptional({
    example: '5000000',
    description:
      'Order total in Toman above which shipping is free. Send "" to turn it off.',
  })
  @IsOptional()
  @Matches(/^\d*$/, { message: VALIDATION_MESSAGES.FREE_SHIPPING_INVALID })
  @Length(0, 20, { message: VALIDATION_MESSAGES.FREE_SHIPPING_INVALID })
  freeShippingThreshold?: string;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: VALIDATION_MESSAGES.LOW_STOCK_INVALID })
  @Min(0, { message: VALIDATION_MESSAGES.LOW_STOCK_INVALID })
  lowStockThreshold?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: VALIDATION_MESSAGES.BANNER_TOGGLE_INVALID })
  bannerToggle?: boolean;
}
