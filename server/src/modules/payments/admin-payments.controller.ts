import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { AdminListPaymentsDto } from './dto/admin-list-payments.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

// Read-only on purpose. Nothing here writes, because the two ways out of a
// stuck payment are already routes: re-open the order with
// PATCH /admin/orders/:id/status, or refund by hand in the gateway's panel and
// move the order to `refunded`. A payment row is never edited — it records
// what the bank did, which is not ours to change.
@ApiTags('Admin · Payments')
@Controller('admin/payments')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Every payment attempt, newest first',
    description:
      'Paginated. Filter with ?status=, ?userId=, a ?from=/?to= range, and ?search= which matches part of the order number, the gateway reference or the bank receipt number. Each row carries the order’s number and current status next to the attempt’s own, so the case worth finding is visible in the list: status=success on an order that is cancelled or failed means the shop took the money and the order gave its stock back. ?needsAttention=true leaves only those. The same count is on the dashboard as paymentsNeedingAttention.',
  })
  findAll(@Query() query: AdminListPaymentsDto) {
    return this.paymentsService.findAllForAdmin(query);
  }
}
