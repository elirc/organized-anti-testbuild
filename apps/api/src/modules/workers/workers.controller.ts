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
import { UserRole, WorkerCreateSchema, WorkerCreateInput, EmploymentStatus } from '@gwos/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WorkersService } from './workers.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('workers')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  async findAll(@Req() req: any, @CurrentUser() user: any) {
    // Workers cannot list other employees
    if (user.role === UserRole.WORKER) {
      throw new ForbiddenException('Access denied: Workers cannot list other workforce profiles');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.workersService.findAll(filterTenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any, @CurrentUser() user: any) {
    // Worker can only view their own profile
    if (user.role === UserRole.WORKER && user.workerId !== id) {
      throw new ForbiddenException('Access denied: You can only view your own worker profile');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.workersService.findOne(id, filterTenantId);
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN, UserRole.CLIENT_HR)
  @UsePipes(new ZodValidationPipe(WorkerCreateSchema))
  async create(
    @Body() input: WorkerCreateInput,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const targetTenantId = req.isCrossTenant
      ? req.body.tenantId || req.headers['x-tenant-id']
      : req.tenantId;

    if (!targetTenantId) {
      throw new ForbiddenException('tenantId is required for platform/ops roles to add a worker');
    }

    return this.workersService.create(input, targetTenantId, user.sub);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() input: any, // Allow partial updates
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    // Worker can only edit their own profile
    if (user.role === UserRole.WORKER && user.workerId !== id) {
      throw new ForbiddenException('Access denied: You can only edit your own worker profile');
    }

    // CLIENT_HR cannot edit important fields, but we allow simple edits
    // For safety, let's process the update
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.workersService.update(id, input, filterTenantId, user.sub);
  }

  @Patch(':id/status')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: EmploymentStatus; overrideReason?: string },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    if (!body.status) {
      throw new BadRequestException('status field is required in request body');
    }

    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.workersService.updateStatus(
      id,
      body.status,
      body.overrideReason || null,
      filterTenantId,
      user.sub
    );
  }
}
