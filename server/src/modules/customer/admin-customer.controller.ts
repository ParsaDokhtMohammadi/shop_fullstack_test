import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { ListCustomersDto } from './dto/list-customers.dto';
import {
  CustomerDetailResponseDto,
  CustomerListResponseDto,
} from './dto/customer-response.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Admin · Customers')
@Controller('admin/customers')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminCustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({
    summary: 'Every customer, newest first',
    description:
      'Paginated. ?search= matches part of a phone number in any spelling. Each row carries ordersCount, totalSpent and lastOrderAt, counting only orders in paid, processing, shipped or delivered — money the shop is still holding, so a cancelled, expired or refunded order adds nothing. Note the stats are flat on a list row and nested under `stats` on the detail route.',
  })
  @ApiOkResponse({ type: CustomerListResponseDto })
  findAll(@Query() query: ListCustomersDto) {
    return this.customerService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'One customer',
    description:
      'The same stats — nested under `stats` here, unlike the list — plus every saved address, which is where the customer’s name lives, since `user` holds only the phone number, and their 10 newest orders in every status, abandoned attempts included. For the full history call GET /admin/orders?userId=.',
  })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customerService.findOne(id);
  }
}
