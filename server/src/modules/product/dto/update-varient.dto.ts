import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { CreateVarientDto } from './create-varient.dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// color, colorCode and size are re-declared so they accept null — sending null
// removes that option from the variant (e.g. a sized shirt that loses its size).
export class UpdateVarientDto extends PartialType(
  OmitType(CreateVarientDto, ['color', 'colorCode', 'size'] as const),
) {
  @ApiPropertyOptional({
    nullable: true,
    example: 'قرمز',
    description: 'Send null to remove the colour.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.VARIENT_COLOR_LENGTH })
  @Length(1, 60, { message: VALIDATION_MESSAGES.VARIENT_COLOR_LENGTH })
  color?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '#e02424' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: VALIDATION_MESSAGES.VARIENT_COLOR_CODE_INVALID,
  })
  colorCode?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'XL',
    description: 'Send null to remove the size.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.VARIENT_SIZE_LENGTH })
  @Length(1, 60, { message: VALIDATION_MESSAGES.VARIENT_SIZE_LENGTH })
  size?: string | null;
}
