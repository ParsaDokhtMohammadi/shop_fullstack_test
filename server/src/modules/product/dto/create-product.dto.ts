import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';
import { CreateVarientDto } from './create-varient.dto';

// JSON, not multipart: images are uploaded separately against the created
// product, so a product can exist with none.
export class CreateProductDto {
  @ApiProperty({ example: 'تی‌شرت نخی' })
  @IsString({ message: VALIDATION_MESSAGES.PRODUCT_NAME_REQUIRED })
  @Length(2, 35, { message: VALIDATION_MESSAGES.PRODUCT_NAME_LENGTH })
  name!: string;

  @ApiPropertyOptional({ description: 'Generated from the name when omitted.' })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.PRODUCT_SLUG_LENGTH })
  @Length(2, 40, { message: VALIDATION_MESSAGES.PRODUCT_SLUG_LENGTH })
  slug?: string;

  @ApiPropertyOptional({ description: 'Long description, HTML or plain text.' })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.PRODUCT_CONTENT_INVALID })
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: VALIDATION_MESSAGES.CATEGORY_ID_INVALID })
  categoryId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: VALIDATION_MESSAGES.IS_ACTIVE_INVALID })
  isActive?: boolean;

  // At least one, always. A product with no options sends a single entry with
  // just a price and stock.
  @ApiProperty({ type: [CreateVarientDto], minItems: 1 })
  @IsArray({ message: VALIDATION_MESSAGES.VARIENTS_REQUIRED })
  @ArrayMinSize(1, { message: VALIDATION_MESSAGES.VARIENTS_REQUIRED })
  @ValidateNested({ each: true })
  @Type(() => CreateVarientDto)
  varients!: CreateVarientDto[];
}
