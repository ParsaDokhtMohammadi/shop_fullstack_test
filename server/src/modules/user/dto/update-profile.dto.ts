import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class UpdateProfileDto {
  // The only editable field on the account. The phone number is the login
  // identity and is not changeable by the customer; the role is never
  // client-settable.
  @ApiPropertyOptional({
    example: 'پرسا دخت محمدی',
    description:
      'Send an empty string to clear the name. Whitespace is trimmed before the length is checked.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.NAME_INVALID })
  @Length(0, 120, { message: VALIDATION_MESSAGES.FULL_NAME_LENGTH })
  fullName?: string;
}
