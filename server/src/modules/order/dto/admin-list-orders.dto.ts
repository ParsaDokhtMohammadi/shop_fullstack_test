import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { ListOrdersDto } from './list-orders.dto';
import { VALIDATION_MESSAGES } from '../../../common/messages';

// The admin list adds what support actually needs to find an order: a date
// range for "what came in today", and one search box for the two things a
// customer can read out on the phone.
export class AdminListOrdersDto extends ListOrdersDto {
  @ApiPropertyOptional({
    description:
      'Order number or the recipient phone number on the order. Matches part of either.',
  })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.ORDER_SEARCH_INVALID })
  @Length(1, 40, { message: VALIDATION_MESSAGES.ORDER_SEARCH_INVALID })
  search?: string;

  // Lets the admin CRM link to the full order history of one customer without
  // a second paginated order list living in the customer module.
  @ApiPropertyOptional({
    description: 'Only the orders placed by this customer.',
  })
  @IsOptional()
  @IsUUID('4', { message: VALIDATION_MESSAGES.CUSTOMER_ID_INVALID })
  userId?: string;

  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Orders placed at or after this moment.',
  })
  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: VALIDATION_MESSAGES.ORDER_DATE_INVALID },
  )
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-31T23:59:59.000Z',
    description: 'Orders placed at or before this moment.',
  })
  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: VALIDATION_MESSAGES.ORDER_DATE_INVALID },
  )
  to?: string;
}
