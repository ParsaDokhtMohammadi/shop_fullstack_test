import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { PaginationDto } from '../../../common/dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class ListDiscountsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Matches anywhere in the code.' })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.DISCOUNT_CODE_INVALID })
  @Length(1, 40, { message: VALIDATION_MESSAGES.DISCOUNT_CODE_INVALID })
  search?: string;

  @ApiPropertyOptional({
    description: 'Omit to get both the live and the switched-off codes.',
  })
  @IsOptional()
  // A query string carries "true", never a boolean.
  @ToBoolean()
  @IsBoolean({ message: VALIDATION_MESSAGES.IS_ACTIVE_INVALID })
  isActive?: boolean;
}
