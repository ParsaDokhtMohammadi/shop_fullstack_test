import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// Exactly one of the two, checked in the service rather than here: a
// class-validator cross-field rule would be a custom decorator, and the error
// is clearer as a sentence than as a field error on both.
export class SetStockDto {
  @ApiPropertyOptional({
    example: 24,
    minimum: 0,
    description:
      'The new absolute stock, for a stock-take. Overwrites whatever is there.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: VALIDATION_MESSAGES.STOCK_INVALID })
  @Min(0, { message: VALIDATION_MESSAGES.STOCK_INVALID })
  set?: number;

  @ApiPropertyOptional({
    example: 12,
    description:
      'Add to the current stock; negative takes away. Use this for a delivery or a write-off — it is applied in the database, so it cannot overwrite a sale that lands at the same moment.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: VALIDATION_MESSAGES.STOCK_ADJUST_INVALID })
  adjust?: number;
}
