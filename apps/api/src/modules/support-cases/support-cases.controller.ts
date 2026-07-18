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
  SupportCaseCreateSchema,
  SupportCaseCreateInput,
  SupportCaseCommentCreateSchema,
  SupportCaseCommentCreateInput,
  SupportStatus,
} from '@gwos/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SupportCasesService } from './support-cases.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('support-cases')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class SupportCasesController {
  constructor(private readonly supportCasesService: SupportCasesService) {}

  @Get()
  async findAll(@Req() req: any, @CurrentUser() user: any) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;

    // Worker role can only retrieve support cases created by themselves
    if (user.role === UserRole.WORKER) {
      return this.supportCasesService.findAll(filterTenantId, user.sub);
    }

    // Client/Ops roles
    const createdByQuery = req.query.createdByUserId;
    return this.supportCasesService.findAll(filterTenantId, createdByQuery);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any, @CurrentUser() user: any) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    const ticket = await this.supportCasesService.findOne(id, filterTenantId, user.role);

    // Worker can only view their own support case
    if (user.role === UserRole.WORKER && ticket.createdByUserId !== user.sub) {
      throw new ForbiddenException('Access denied: You can only view your own support cases');
    }

    return ticket;
  }

  @Post()
  @UsePipes(new ZodValidationPipe(SupportCaseCreateSchema))
  async create(
    @Body() input: SupportCaseCreateInput,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const targetTenantId = req.isCrossTenant
      ? req.body.tenantId || req.headers['x-tenant-id']
      : req.tenantId;

    if (!targetTenantId) {
      throw new ForbiddenException('tenantId is required');
    }

    return this.supportCasesService.create(input, targetTenantId, user.sub, user.role);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { status?: SupportStatus; priority?: string; assignedToUserId?: string | null },
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;

    // Worker can only close their own case
    if (user.role === UserRole.WORKER) {
      const ticket = await this.supportCasesService.findOne(id, filterTenantId, user.role);
      if (ticket.createdByUserId !== user.sub) {
        throw new ForbiddenException('Access denied: You can only edit your own support cases');
      }
      if (body.status && body.status !== SupportStatus.CLOSED) {
        throw new ForbiddenException('Access denied: Workers are only permitted to update ticket status to CLOSED');
      }
    }

    return this.supportCasesService.update(id, body, filterTenantId, user.sub);
  }

  @Post(':id/comments')
  @UsePipes(new ZodValidationPipe(SupportCaseCommentCreateSchema))
  async addComment(
    @Param('id') id: string,
    @Body() input: SupportCaseCommentCreateInput,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;

    // Worker can only comment on their own case
    if (user.role === UserRole.WORKER) {
      const ticket = await this.supportCasesService.findOne(id, filterTenantId, user.role);
      if (ticket.createdByUserId !== user.sub) {
        throw new ForbiddenException('Access denied: You can only comment on your own support cases');
      }
    }

    return this.supportCasesService.addComment(id, input, filterTenantId, user.sub, user.role);
  }
}
