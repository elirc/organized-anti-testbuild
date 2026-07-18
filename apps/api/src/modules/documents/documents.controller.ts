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
  DocumentUploadSchema,
  DocumentUploadInput,
  DocumentRejectSchema,
  DocumentRejectInput,
} from '@gwos/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async findAll(@Req() req: any, @CurrentUser() user: any) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;

    // Worker can only see their own documents
    if (user.role === UserRole.WORKER) {
      if (!user.workerId) {
        throw new ForbiddenException('Access denied: User is a worker but has no linked worker profile');
      }
      return this.documentsService.findAll(filterTenantId, user.workerId);
    }

    // Clients/Admin list
    const workerIdQuery = req.query.workerId;
    return this.documentsService.findAll(filterTenantId, workerIdQuery);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(DocumentUploadSchema))
  async create(
    @Body() input: DocumentUploadInput,
    @Body('workerId') bodyWorkerId: string,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    // Workers can only upload documents for themselves
    let targetWorkerId = bodyWorkerId;
    if (user.role === UserRole.WORKER) {
      if (!user.workerId) {
        throw new ForbiddenException('Access denied: You do not have a linked worker profile');
      }
      targetWorkerId = user.workerId;
    }

    if (!targetWorkerId) {
      throw new BadRequestException('workerId is required in the request body');
    }

    const targetTenantId = req.isCrossTenant
      ? req.body.tenantId || req.headers['x-tenant-id']
      : req.tenantId;

    if (!targetTenantId) {
      throw new ForbiddenException('tenantId is required');
    }

    return this.documentsService.create(input, targetTenantId, targetWorkerId, user.sub);
  }

  @Patch(':id/approve')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS)
  async approve(@Param('id') id: string, @Req() req: any, @CurrentUser() user: any) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.documentsService.approve(id, filterTenantId, user.sub);
  }

  @Patch(':id/reject')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS)
  async reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(DocumentRejectSchema)) body: DocumentRejectInput,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.documentsService.reject(id, body.rejectionReason, filterTenantId, user.sub);
  }
}
