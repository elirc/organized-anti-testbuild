import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, PayrollCycleStatus, PayrollItemStatus } from '@gwos/shared';
import { PayrollService } from './payroll.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('payroll-cycles')
  async findAllCycles(@Req() req: any, @CurrentUser() user: any) {
    if (user.role === UserRole.WORKER) {
      throw new ForbiddenException('Access denied: Workers cannot access payroll logs');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.payrollService.findAllCycles(filterTenantId);
  }

  @Get('payroll-cycles/:id')
  async findCycle(@Param('id') id: string, @Req() req: any, @CurrentUser() user: any) {
    if (user.role === UserRole.WORKER) {
      throw new ForbiddenException('Access denied: Workers cannot access payroll logs');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.payrollService.findCycle(id, filterTenantId);
  }

  @Post('payroll-cycles')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  async createCycle(
    @Body()
    body: {
      companyId: string;
      countryId: string;
      periodStart: string;
      periodEnd: string;
      payDate: string;
    },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    if (!body.companyId || !body.countryId || !body.periodStart || !body.periodEnd || !body.payDate) {
      throw new BadRequestException('Missing required fields for payroll cycle creation');
    }

    const targetTenantId = req.isCrossTenant
      ? req.body.tenantId || req.headers['x-tenant-id']
      : req.tenantId;

    if (!targetTenantId) {
      throw new ForbiddenException('tenantId is required');
    }

    return this.payrollService.createCycle(
      targetTenantId,
      body.companyId,
      body.countryId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
      new Date(body.payDate),
      user.sub
    );
  }

  @Patch('payroll-cycles/:id/status')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  async updateCycleStatus(
    @Param('id') id: string,
    @Body() body: { status: PayrollCycleStatus },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    if (!body.status) {
      throw new BadRequestException('status field is required in request body');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.payrollService.updateCycleStatus(id, body.status, filterTenantId, user.sub);
  }

  @Post('payroll-cycles/:id/items')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  async addCustomPayrollItem(
    @Param('id') cycleId: string,
    @Body()
    body: {
      workerId: string;
      grossAmount: number;
      currency: string;
      notes?: string;
    },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    if (!body.workerId || !body.grossAmount || !body.currency) {
      throw new BadRequestException('Missing required fields for payroll item');
    }

    const targetTenantId = req.isCrossTenant
      ? req.body.tenantId || req.headers['x-tenant-id']
      : req.tenantId;

    if (!targetTenantId) {
      throw new ForbiddenException('tenantId is required');
    }

    return this.payrollService.addCustomPayrollItem(
      cycleId,
      body.workerId,
      Number(body.grossAmount),
      body.currency,
      body.notes || null,
      targetTenantId,
      user.sub
    );
  }

  @Patch('payroll-items/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  async updatePayrollItem(
    @Param('id') id: string,
    @Body()
    body: {
      status: PayrollItemStatus;
      grossAmount?: number;
      notes?: string;
    },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    if (!body.status) {
      throw new BadRequestException('status field is required in request body');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.payrollService.updatePayrollItemStatus(
      id,
      body.status,
      body.grossAmount !== undefined ? Number(body.grossAmount) : undefined,
      body.notes !== undefined ? body.notes : undefined,
      filterTenantId,
      user.sub
    );
  }
}
