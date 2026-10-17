import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class ListOrdersDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Only orders in this status. Omit for all of them.',
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: VALIDATION_MESSAGES.ORDER_STATUS_INVALID })
  status?: OrderStatus;
}
