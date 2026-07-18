import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  UsePipes,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UserRole,
  BenefitEnrollmentUpdateSchema,
  BenefitEnrollmentUpdateInput,
  BenefitType,
  BenefitStatus,
} from '@gwos/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BenefitsService } from './benefits.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class BenefitsController {
  constructor(private readonly benefitsService: BenefitsService) {}

  @Get('workers/:workerId/benefits')
  async findByWorker(
    @Param('workerId') workerId: string,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    // Workers can only see their own benefits
    if (user.role === UserRole.WORKER && user.workerId !== workerId) {
      throw new ForbiddenException('Access denied: You can only view your own benefit enrollments');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.benefitsService.findByWorker(workerId, filterTenantId);
  }

  @Post('workers/:workerId/benefits')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  async create(
    @Param('workerId') workerId: string,
    @Body()
    body: {
      benefitType: BenefitType;
      providerName: string;
      status: BenefitStatus;
      effectiveDate?: string;
    },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    if (!body.benefitType || !body.providerName || !body.status) {
      throw new BadRequestException('Missing required fields for benefits enrollment');
    }

    const targetTenantId = req.isCrossTenant
      ? req.body.tenantId || req.headers['x-tenant-id']
      : req.tenantId;

    if (!targetTenantId) {
      throw new ForbiddenException('tenantId is required');
    }

    return this.benefitsService.createEnrollment(
      workerId,
      body.benefitType,
      body.providerName,
      body.status,
      body.effectiveDate ? new Date(body.effectiveDate) : null,
      targetTenantId,
      user.sub
    );
  }

  @Patch('benefits/:id')
  @UsePipes(new ZodValidationPipe(BenefitEnrollmentUpdateSchema))
  async update(
    @Param('id') id: string,
    @Body() input: BenefitEnrollmentUpdateInput,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;

    // Workers can only update their own benefits enrollment (e.g. waiving or enrolling during sign-on)
    if (user.role === UserRole.WORKER) {
      const enrollment = await this.benefitsService.findOne(id, filterTenantId);
      if (enrollment.workerId !== user.workerId) {
        throw new ForbiddenException('Access denied: You can only modify your own benefit enrollment');
      }
    }

    return this.benefitsService.updateEnrollment(id, input, filterTenantId, user.sub);
  }
}
