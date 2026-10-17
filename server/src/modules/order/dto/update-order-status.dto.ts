import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class UpdateOrderStatusDto {
  // Which hops are legal is not a DTO concern — ORDER_TRANSITIONS decides that
  // against the order's current status, which only the service can see.
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus, { message: VALIDATION_MESSAGES.ORDER_STATUS_INVALID })
  status!: OrderStatus;
}
