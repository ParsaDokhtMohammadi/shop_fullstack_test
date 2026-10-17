import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class UpdateTrackingDto {
  // An empty string clears it — a tracking number typed in wrong has to be
  // removable, and null in a JSON body is easy to send by accident.
  @ApiProperty({
    example: '12345678901234567890',
    description: 'Send "" to clear the current number.',
  })
  @IsString({ message: VALIDATION_MESSAGES.TRACKING_NUMBER_INVALID })
  @Length(0, 60, { message: VALIDATION_MESSAGES.TRACKING_NUMBER_INVALID })
  trackingNumber!: string;
}
