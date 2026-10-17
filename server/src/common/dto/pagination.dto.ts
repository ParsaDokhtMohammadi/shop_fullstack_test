import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { VALIDATION_MESSAGES } from '../messages';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Query params for any list endpoint: ?page=2&limit=20
// Extend this in a module when a list needs its own filters.
export class PaginationDto {
  // Query strings are always text, so @Type converts "2" to 2 before @IsInt
  // sees it. Needs transform: true on the global ValidationPipe, which is set.
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: VALIDATION_MESSAGES.PAGE_INVALID })
  @Min(1, { message: VALIDATION_MESSAGES.PAGE_MIN })
  page: number = 1;

  // Capped so nobody can ask for the whole table with ?limit=999999.
  @ApiPropertyOptional({
    default: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: VALIDATION_MESSAGES.LIMIT_INVALID })
  @Min(1, { message: VALIDATION_MESSAGES.LIMIT_MIN })
  @Max(MAX_LIMIT, { message: VALIDATION_MESSAGES.LIMIT_MAX })
  limit: number = DEFAULT_LIMIT;

  // Hand these straight to repository.findAndCount({ skip, take }).
  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  get take(): number {
    return this.limit;
  }
}
