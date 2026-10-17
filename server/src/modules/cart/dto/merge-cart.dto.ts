import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { AddCartItemDto } from './add-cart-item.dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// The most lines a guest cart may carry over. A browser's localStorage can
// hold anything, and every line costs a variant lookup — so the request is
// bounded rather than trusted.
const MAX_MERGE_ITEMS = 50;

export class MergeCartDto {
  // Each line is exactly an AddCartItemDto, so the validation rules for a
  // variant id and a quantity are written once.
  @ApiProperty({
    type: [AddCartItemDto],
    description:
      'The lines the browser was holding while the visitor was logged out.',
  })
  @IsArray({ message: VALIDATION_MESSAGES.MERGE_ITEMS_INVALID })
  @ArrayMaxSize(MAX_MERGE_ITEMS, {
    message: VALIDATION_MESSAGES.MERGE_ITEMS_TOO_MANY(MAX_MERGE_ITEMS),
  })
  // Without @ValidateNested + @Type the array members stay plain objects and
  // none of AddCartItemDto's rules run.
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  items!: AddCartItemDto[];
}
