import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsISO8601, IsInt, Min, ValidateIf } from 'class-validator';
import { CreateDiscountDto } from './create-discount.dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// Everything optional. The two "limit" fields are also nullable, which is the
// only way to go back to unlimited / never-expires once a value is set —
// omitting a field means "unchanged", so it cannot mean "clear" as well.
export class UpdateDiscountDto extends PartialType(
  // Both are re-declared below as nullable, so the inherited
  // non-null versions are left out rather than overridden.
  OmitType(CreateDiscountDto, ['usageLimit', 'expirationDate'] as const),
) {
  @ApiPropertyOptional({
    example: 100,
    nullable: true,
    description: 'null = unlimited.',
  })
  @ValidateIf(
    (dto: UpdateDiscountDto) =>
      dto.usageLimit !== null && dto.usageLimit !== undefined,
  )
  @IsInt({ message: VALIDATION_MESSAGES.USAGE_LIMIT_INVALID })
  @Min(1, { message: VALIDATION_MESSAGES.USAGE_LIMIT_INVALID })
  usageLimit?: number | null;

  @ApiPropertyOptional({
    example: '2026-12-31T20:30:00.000Z',
    nullable: true,
    description: 'null = never expires.',
  })
  @ValidateIf(
    (dto: UpdateDiscountDto) =>
      dto.expirationDate !== null && dto.expirationDate !== undefined,
  )
  @IsISO8601(
    { strict: true },
    { message: VALIDATION_MESSAGES.EXPIRATION_DATE_INVALID },
  )
  expirationDate?: string | null;
}
