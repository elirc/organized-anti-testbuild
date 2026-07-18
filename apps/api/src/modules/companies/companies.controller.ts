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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, CompanyCreateSchema, CompanyCreateInput } from '@gwos/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CompaniesService } from './companies.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('companies')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async findAll(@Req() req: any) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.companiesService.findAll(filterTenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.companiesService.findOne(id, filterTenantId);
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  @UsePipes(new ZodValidationPipe(CompanyCreateSchema))
  async create(
    @Body() input: CompanyCreateInput,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    // For Platform/Ops, a tenantId is required in the body or header. For tenant users, it is automatically bound.
    const targetTenantId = req.isCrossTenant
      ? req.body.tenantId || req.headers['x-tenant-id']
      : req.tenantId;

    if (!targetTenantId) {
      throw new ForbiddenException('tenantId is required for platform/ops users to create a company');
    }

    return this.companiesService.create(input, targetTenantId, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS, UserRole.CLIENT_ADMIN)
  @UsePipes(new ZodValidationPipe(CompanyCreateSchema))
  async update(
    @Param('id') id: string,
    @Body() input: CompanyCreateInput,
    @Req() req: any,
    @CurrentUser() user: any
  ) {
    const filterTenantId = req.isCrossTenant ? undefined : req.tenantId;
    return this.companiesService.update(id, input, filterTenantId, user.sub);
  }
}
