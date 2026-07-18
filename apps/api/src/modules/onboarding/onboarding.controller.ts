import {
  Controller,
  Get,
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
import { OnboardingTaskStatus, UserRole } from '@gwos/shared';
import { OnboardingService } from './onboarding.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('workers/:workerId/onboarding')
  async findPlanByWorker(
    @Param('workerId') workerId: string,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    // Workers can only see their own onboarding plan
    if (user.role === UserRole.WORKER && user.workerId !== workerId) {
      throw new ForbiddenException('Access denied: You can only view your own onboarding plan');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.onboardingService.findPlanByWorker(workerId, filterTenantId);
  }

  @Patch('onboarding/tasks/:taskId')
  async updateTaskStatus(
    @Param('taskId') taskId: string,
    @Body() body: { status: OnboardingTaskStatus },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    if (!body.status) {
      throw new BadRequestException('status field is required in request body');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.onboardingService.updateTaskStatus(taskId, body.status, filterTenantId, user);
  }
}
