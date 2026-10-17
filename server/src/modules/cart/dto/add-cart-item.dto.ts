import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class AddCartItemDto {
  @ApiProperty({ description: 'The variant being bought, not the product.' })
  @IsUUID('4', { message: VALIDATION_MESSAGES.VARIENT_ID_INVALID })
  productVarientId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt({ message: VALIDATION_MESSAGES.QUANTITY_INVALID })
  @Min(1, { message: VALIDATION_MESSAGES.QUANTITY_INVALID })
  @Max(100, { message: VALIDATION_MESSAGES.QUANTITY_INVALID })
  quantity?: number;
}
