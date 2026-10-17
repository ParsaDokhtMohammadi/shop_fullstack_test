import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { PaginationDto } from '../../../common/dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class ListCustomersDto extends PaginationDto {
  @ApiPropertyOptional({
    example: '0912',
    description:
      'Part of a name or of a phone number — one box for both. Any phone spelling works (0912…, 912…, +98912…): the separators and the prefix are stripped before matching.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.CUSTOMER_SEARCH_INVALID })
  @Length(1, 20, { message: VALIDATION_MESSAGES.CUSTOMER_SEARCH_INVALID })
  search?: string;
}
