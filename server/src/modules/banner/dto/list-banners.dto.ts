import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BannerPosition } from '../../../common/enums/banner-position.enum';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class ListBannersDto {
  @ApiPropertyOptional({
    enum: BannerPosition,
    description: 'Only this slot. Omit to get every position, grouped.',
  })
  @IsOptional()
  @IsEnum(BannerPosition, {
    message: VALIDATION_MESSAGES.BANNER_POSITION_INVALID,
  })
  position?: BannerPosition;
}
