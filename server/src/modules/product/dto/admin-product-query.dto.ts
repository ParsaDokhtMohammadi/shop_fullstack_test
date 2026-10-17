import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class AdminProductQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Matches anywhere in the product name.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: VALIDATION_MESSAGES.CATEGORY_ID_INVALID })
  categoryId?: string;
}
