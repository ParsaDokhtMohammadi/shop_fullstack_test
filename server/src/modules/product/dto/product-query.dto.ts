import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export enum ProductSort {
  Newest = 'newest',
  Oldest = 'oldest',
  Name = 'name',
}

// ?page=1&limit=20&search=تی‌شرت&categoryId=...&sort=newest
export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Matches anywhere in the product name.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'A root category also returns the products of its subcategories.',
  })
  @IsOptional()
  @IsUUID('4', { message: VALIDATION_MESSAGES.CATEGORY_ID_INVALID })
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductSort, default: ProductSort.Newest })
  @IsOptional()
  @IsEnum(ProductSort, { message: VALIDATION_MESSAGES.SORT_INVALID })
  sort: ProductSort = ProductSort.Newest;
}
