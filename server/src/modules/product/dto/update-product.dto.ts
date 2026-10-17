import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// Left out on purpose: varients have their own routes, and isActive belongs to
// PATCH /:id/toggle. content and categoryId are re-declared so they accept
// null — this is JSON, so null is how the frontend clears them.
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, [
    'varients',
    'isActive',
    'content',
    'categoryId',
  ] as const),
) {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Send null to clear it.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.PRODUCT_CONTENT_INVALID })
  content?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Send null to remove the product from its category.',
  })
  @IsOptional()
  @IsUUID('4', { message: VALIDATION_MESSAGES.CATEGORY_ID_INVALID })
  categoryId?: string | null;
}
