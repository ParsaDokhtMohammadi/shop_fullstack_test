import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class ReorderImagesDto {
  @ApiProperty({
    type: [String],
    description:
      'Every image id of the product, in display order. The first one is the cover.',
  })
  @IsArray({ message: VALIDATION_MESSAGES.IMAGE_IDS_INVALID })
  @ArrayMinSize(1, { message: VALIDATION_MESSAGES.IMAGE_IDS_INVALID })
  @ArrayUnique({ message: VALIDATION_MESSAGES.IMAGE_IDS_INVALID })
  @IsUUID('4', { each: true, message: VALIDATION_MESSAGES.IMAGE_IDS_INVALID })
  imageIds!: string[];
}
