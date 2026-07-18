import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@gwos/shared';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async getLogs(@Req() req: any) {
    // If tenantId is present on request (e.g. from TenantGuard bound for client admin or header override), filter it.
    // Otherwise cross-tenant reads all logs.
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.auditLogService.findAll(filterTenantId);
  }
}
