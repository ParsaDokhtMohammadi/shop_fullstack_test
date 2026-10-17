import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// isActive is left out on purpose: PATCH /:id/toggle already owns it. parentId
// is re-declared below so it can also accept null.
export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['isActive', 'parentId'] as const),
) {
  // This is JSON now, so a real null works. The transform stays because an
  // empty string is still what an HTML form sends for "no value", and both
  // should mean "promote this back to a root". @IsOptional skips @IsUUID once
  // either has become null.
  @ApiPropertyOptional({
    description:
      'Parent category id. Send null (or an empty string) to promote it back to a root.',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? null : value))
  @IsUUID('4', { message: VALIDATION_MESSAGES.CATEGORY_PARENT_INVALID })
  parentId?: string | null;
}
