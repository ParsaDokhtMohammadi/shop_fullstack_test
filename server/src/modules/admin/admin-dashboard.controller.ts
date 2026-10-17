import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Admin · Dashboard')
@Controller('admin/stats')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Everything the panel’s landing page shows',
    description:
      'No parameters. Money is digit strings in Toman, like everywhere else. The windows are rolling — last24h counts back 24 hours from now, not since midnight — so there is no shop timezone to configure. revenue and the orders counts include only paid, processing, shipped and delivered, matching what the CRM calls a customer’s spend; byStatus covers every status, so pending_payment and paid double as the work queue and failed shows a broken gateway. lowStock echoes the threshold from the settings row next to the count, and the rows behind it are at GET /admin/inventory/low-stock. paymentsNeedingAttention is the only number here that is a job rather than a statistic: payments the gateway confirmed on orders that were already closed, so the shop owes a refund or a re-open. It should be 0; the rows behind it are at GET /admin/payments?needsAttention=true.',
  })
  stats() {
    return this.dashboardService.stats();
  }
}
