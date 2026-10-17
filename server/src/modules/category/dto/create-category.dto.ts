import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

// JSON. The @Type / @ToBoolean on the number and boolean fields are kept
// anyway: they are no-ops for a real number or boolean, and they let the same
// DTO accept the stringly-typed values a form would send.
export class CreateCategoryDto {
  @ApiProperty({ example: 'لوازم خانگی' })
  @IsString({ message: VALIDATION_MESSAGES.CATEGORY_NAME_REQUIRED })
  @Length(2, 120, { message: VALIDATION_MESSAGES.CATEGORY_NAME_LENGTH })
  name!: string;

  @ApiPropertyOptional({ description: 'Generated from the name when omitted.' })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.CATEGORY_SLUG_LENGTH })
  @Length(2, 140, { message: VALIDATION_MESSAGES.CATEGORY_SLUG_LENGTH })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Parent category id. Omit for a root category.',
  })
  @IsOptional()
  @IsUUID('4', { message: VALIDATION_MESSAGES.CATEGORY_PARENT_INVALID })
  parentId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: VALIDATION_MESSAGES.SORT_ORDER_INVALID })
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: VALIDATION_MESSAGES.IS_ACTIVE_INVALID })
  isActive?: boolean;
}
