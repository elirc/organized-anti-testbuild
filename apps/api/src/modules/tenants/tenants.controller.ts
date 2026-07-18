import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@gwos/shared';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS)
  async findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':tenantId')
  async findOne(@Param('tenantId') tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }
}
