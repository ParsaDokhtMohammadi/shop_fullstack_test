import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class CreateAddressDto {
  @ApiProperty({ example: 'پارسا' })
  @IsString({ message: VALIDATION_MESSAGES.FIRST_NAME_REQUIRED })
  @Length(2, 60, { message: VALIDATION_MESSAGES.FIRST_NAME_LENGTH })
  firstName!: string;

  @ApiProperty({ example: 'محمدی' })
  @IsString({ message: VALIDATION_MESSAGES.LAST_NAME_REQUIRED })
  @Length(2, 60, { message: VALIDATION_MESSAGES.LAST_NAME_LENGTH })
  lastName!: string;

  @ApiProperty({ example: 'تهران' })
  @IsString({ message: VALIDATION_MESSAGES.PROVINCE_REQUIRED })
  @Length(2, 80, { message: VALIDATION_MESSAGES.PROVINCE_LENGTH })
  province!: string;

  @ApiProperty({ example: 'تهران' })
  @IsString({ message: VALIDATION_MESSAGES.CITY_REQUIRED })
  @Length(2, 80, { message: VALIDATION_MESSAGES.CITY_LENGTH })
  city!: string;

  @ApiProperty({ example: 'خیابان ولیعصر، کوچه ۱۲، پلاک ۵، واحد ۳' })
  @IsString({ message: VALIDATION_MESSAGES.ADDRESS_REQUIRED })
  @Length(10, 500, { message: VALIDATION_MESSAGES.ADDRESS_LENGTH })
  address!: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @Matches(/^\d{10}$/, { message: VALIDATION_MESSAGES.POSTAL_CODE_INVALID })
  postalCode?: string;

  @ApiProperty({ example: '09123456789' })
  @IsString({ message: VALIDATION_MESSAGES.PHONE_REQUIRED })
  phoneNumber!: string;

  @ApiPropertyOptional({
    example: 'زنگ دوم، تحویل در ساعات اداری',
    description: 'Any note for the courier.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.ADDRESS_INFO_INVALID })
  @Length(0, 500, { message: VALIDATION_MESSAGES.ADDRESS_INFO_LENGTH })
  info?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Makes this the default address. The first address is always the default regardless.',
  })
  @IsOptional()
  @IsBoolean({ message: VALIDATION_MESSAGES.IS_DEFAULT_INVALID })
  isDefault?: boolean;
}
