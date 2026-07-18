import { Controller, Get, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@gwos/shared';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN, UserRole.CLIENT_HR)
  async getSummary(@Req() req: any, @CurrentUser() user: any) {
    if (user.role === UserRole.WORKER) {
      throw new ForbiddenException('Access denied: Workers cannot fetch operations dashboards');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.dashboardService.getSummary(filterTenantId);
  }
}
