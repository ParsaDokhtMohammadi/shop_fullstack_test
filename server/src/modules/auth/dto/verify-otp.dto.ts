import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class VerifyOtpDto {
  @ApiProperty({ example: '09123456789' })
  @IsString({ message: VALIDATION_MESSAGES.PHONE_REQUIRED })
  phoneNumber!: string;

  @ApiProperty({ example: '12345' })
  @IsString({ message: VALIDATION_MESSAGES.CODE_REQUIRED })
  @Matches(/^\d{5}$/, { message: VALIDATION_MESSAGES.CODE_FORMAT })
  code!: string;
}
