import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class SendOtpDto {
  @ApiProperty({ example: '09123456789' })
  @IsString({ message: VALIDATION_MESSAGES.PHONE_REQUIRED })
  phoneNumber!: string;
}
